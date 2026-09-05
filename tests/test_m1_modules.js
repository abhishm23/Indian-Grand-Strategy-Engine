/**
 * Comprehensive Verification Test Suite for Milestone 1 Implementation
 * Validates:
 * - js/data/provinces.js
 * - js/data/factions.js
 * - js/data/characters.js
 * - js/data/units.js
 * - js/data/buildings.js
 * - js/data/techTree.js
 * - js/data/religions.js
 * - js/engine/gameState.js
 */

import assert from 'node:assert';

// 1. Import Data Modules
import {
  PROVINCES,
  PROVINCE_LIST,
  PROVINCES_DATA,
  TERRAIN_TYPES,
  STRATEGIC_RESOURCES,
  getProvinceById,
  getProvincesByFaction,
  areProvincesAdjacent
} from '../js/data/provinces.js';

import {
  FACTIONS,
  FACTION_LIST,
  FACTIONS_DATA,
  AI_PERSONALITIES,
  getFactionById,
  getAllFactions
} from '../js/data/factions.js';

import {
  CHARACTERS,
  CHARACTER_LIST,
  CHARACTERS_DATA,
  CHARACTER_ROLES,
  getCharacterById,
  getCharactersByFaction,
  getCharactersByRole
} from '../js/data/characters.js';

import {
  UNIT_TYPES,
  REGIONAL_UNITS,
  UNIT_TYPE_LIST,
  COUNTER_MATRIX,
  getUnitType,
  getAllUnitTypes,
  getCounterMultiplier
} from '../js/data/units.js';

import {
  BUILDING_CATEGORIES,
  BUILDINGS,
  BUILDINGS_DATA,
  getBuilding,
  getBuildingsByCategory,
  getBuildingByTier,
  getNextUpgrade,
  calculateProvinceBuildingBonuses,
  getRecruitableUnits,
  canConstructBuilding
} from '../js/data/buildings.js';

import {
  TECH_BRANCHES,
  TECH_TREE,
  TECH_TREE_DATA,
  getTech,
  getTechsByBranch,
  canResearchTech,
  getAvailableTechs,
  calculateEmpireTechModifiers,
  getBranchProgress,
  validateTechGraph
} from '../js/data/techTree.js';

import {
  RELIGIOUS_TRADITIONS,
  RELIGIONS,
  HOLY_SHRINES,
  TOLERANCE_POLICIES,
  getReligion,
  getTradition,
  getHolyShrine,
  getShrinesInProvince,
  getShrinesControlledByFaction,
  getTolerancePolicy,
  calculateReligiousPublicOrderModifier,
  calculateDiplomaticReligiousModifier,
  calculateShrineFactionBonuses
} from '../js/data/religions.js';

// 2. Import GameState Engine
import {
  GameState,
  MemoryStorageAdapter,
  getStorage,
  deepClone,
  sortKeysDeterministic
} from '../js/engine/gameState.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

console.log('\n=== RUNNING MILESTONE 1 VERIFICATION SUITE ===\n');

// ----------------------------------------------------
// Section 1: Provinces
// ----------------------------------------------------
console.log('--- 1. Testing Provinces (provinces.js) ---');

it('has exactly 40 historical provinces', () => {
  assert.strictEqual(Object.keys(PROVINCES).length, 40);
  assert.strictEqual(PROVINCE_LIST.length, 40);
  assert.strictEqual(PROVINCES_DATA.length, 40);
});

it('all provinces conform to 1200x900 coordinate bounds and attribute ranges', () => {
  for (const p of PROVINCE_LIST) {
    assert(p.id.startsWith('PROV_'), `Invalid prefix: ${p.id}`);
    assert(p.canvasCoords.x >= 0 && p.canvasCoords.x <= 1200, `X coordinate out of bounds for ${p.id}: ${p.canvasCoords.x}`);
    assert(p.canvasCoords.y >= 0 && p.canvasCoords.y <= 900, `Y coordinate out of bounds for ${p.id}: ${p.canvasCoords.y}`);
    assert(p.baseTax >= 50 && p.baseTax <= 600, `Tax out of bounds: ${p.baseTax}`);
    assert(p.baseManpower >= 100 && p.baseManpower <= 3000, `Manpower out of bounds: ${p.baseManpower}`);
    assert(p.defenseLevel >= 0 && p.defenseLevel <= 5, `Defense out of bounds: ${p.defenseLevel}`);
    assert(TERRAIN_TYPES[p.terrainType], `Unknown terrain: ${p.terrainType}`);
    assert(STRATEGIC_RESOURCES[p.strategicResource], `Unknown resource: ${p.strategicResource}`);
  }
});

it('province connection graph is strictly reciprocal and bidirectional', () => {
  for (const p of PROVINCE_LIST) {
    assert(p.connections.length > 0, `Province ${p.id} has no connections`);
    for (const neighborId of p.connections) {
      const neighbor = PROVINCES[neighborId];
      assert(neighbor, `Province ${p.id} references non-existent neighbor ${neighborId}`);
      assert(
        neighbor.connections.includes(p.id),
        `Graph not reciprocal: ${p.id} connects to ${neighborId}, but ${neighborId} does not connect to ${p.id}`
      );
    }
  }
});

it('province graph is fully connected via Breadth-First Search (BFS)', () => {
  const visited = new Set();
  const queue = ['PROV_DELHI'];
  visited.add('PROV_DELHI');

  while (queue.length > 0) {
    const currentId = queue.shift();
    const prov = PROVINCES[currentId];
    for (const neighborId of prov.connections) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push(neighborId);
      }
    }
  }

  assert.strictEqual(visited.size, 40, `BFS from PROV_DELHI visited ${visited.size}/40 provinces`);
});

// ----------------------------------------------------
// Section 2: Factions
// ----------------------------------------------------
console.log('\n--- 2. Testing Factions (factions.js) ---');

it('has exactly 10 historical factions', () => {
  assert.strictEqual(Object.keys(FACTIONS).length, 10);
  assert.strictEqual(FACTION_LIST.length, 10);
});

it('all factions have valid capitals, colors, treasuries, and personalities', () => {
  const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
  for (const f of FACTION_LIST) {
    assert(f.id.startsWith('FAC_'), `Invalid faction ID: ${f.id}`);
    assert(PROVINCES[f.capitalProvinceId], `Capital ${f.capitalProvinceId} not found`);
    assert(hexColorRegex.test(f.primaryColor), `Invalid primary color: ${f.primaryColor}`);
    assert(hexColorRegex.test(f.secondaryColor), `Invalid secondary color: ${f.secondaryColor}`);
    assert(f.treasury >= 1000, `Treasury too low for ${f.id}: ${f.treasury}`);
    assert(f.startingProvinces.length >= 1, `No starting provinces for ${f.id}`);
    assert(AI_PERSONALITIES[f.aiPersonality], `Unknown AI personality: ${f.aiPersonality}`);
  }
});

it('the 10 factions cleanly partition all 40 provinces with no overlaps', () => {
  const allClaimedProvinces = [];
  for (const f of FACTION_LIST) {
    for (const pId of f.startingProvinces) {
      assert(PROVINCES[pId], `Starting province ${pId} of ${f.id} does not exist`);
      assert.strictEqual(PROVINCES[pId].controllingFaction, f.id, `Province ${pId} controllingFaction mismatch`);
      allClaimedProvinces.push(pId);
    }
    // Capital province must be in starting provinces
    assert(f.startingProvinces.includes(f.capitalProvinceId), `Capital ${f.capitalProvinceId} must be owned by ${f.id}`);
  }

  assert.strictEqual(allClaimedProvinces.length, 40, 'Sum of all starting provinces must be 40');
  const uniqueSet = new Set(allClaimedProvinces);
  assert.strictEqual(uniqueSet.size, 40, 'All 40 provinces must be unique with zero overlaps');
});

// ----------------------------------------------------
// Section 3: Characters
// ----------------------------------------------------
console.log('\n--- 3. Testing Characters (characters.js) ---');

it('has exactly 26 authentic 14th-century historical figures', () => {
  assert.strictEqual(Object.keys(CHARACTERS).length, 26);
  assert.strictEqual(CHARACTER_LIST.length, 26);
});

it('all characters have valid attributes, age, and loyalty ratings', () => {
  for (const c of CHARACTER_LIST) {
    assert(c.id.startsWith('CHAR_'), `Invalid character ID: ${c.id}`);
    assert(c.attributes.command >= 1 && c.attributes.command <= 10, `Command out of bounds for ${c.id}`);
    assert(c.attributes.governance >= 1 && c.attributes.governance <= 10, `Governance out of bounds for ${c.id}`);
    assert(c.attributes.diplomacy >= 1 && c.attributes.diplomacy <= 10, `Diplomacy out of bounds for ${c.id}`);
    assert(c.attributes.dread >= 0 && c.attributes.dread <= 10, `Dread out of bounds for ${c.id}`);
    assert(c.attributes.piety >= 0 && c.attributes.piety <= 10, `Piety out of bounds for ${c.id}`);
    assert(c.loyalty >= 0 && c.loyalty <= 100, `Loyalty out of bounds for ${c.id}`);
    assert(c.age >= 18 && c.age <= 75, `Age out of bounds for ${c.id}`);
    assert(PROVINCES[c.locationProvinceId], `Location province ${c.locationProvinceId} not found for ${c.id}`);
    assert(CHARACTER_ROLES[c.currentRole], `Unknown role: ${c.currentRole}`);
  }
});

it('every faction ruler exists in character roster with role RULER and 100 loyalty', () => {
  for (const f of FACTION_LIST) {
    const ruler = CHARACTERS[f.rulerId];
    assert(ruler, `Ruler ${f.rulerId} of ${f.id} not found`);
    assert.strictEqual(ruler.currentRole, 'RULER');
    assert.strictEqual(ruler.loyalty, 100);
    assert.strictEqual(ruler.factionId, f.id);
  }
});

it('Ahsan Shah has low loyalty (<= 25) to model historical rebellion triggers', () => {
  const ahsan = CHARACTERS.CHAR_AHSAN_SHAH;
  assert(ahsan, 'CHAR_AHSAN_SHAH not found');
  assert(ahsan.loyalty <= 25, `Ahsan Shah loyalty should be <= 25, found ${ahsan.loyalty}`);
});

// ----------------------------------------------------
// Section 4: Units & Counter Matrix
// ----------------------------------------------------
console.log('\n--- 4. Testing Units & Counter Matrix (units.js) ---');

it('has all 6 regional unit archetypes with positive combat stats', () => {
  const expectedUnits = ['WAR_ELEPHANTS', 'HORSE_ARCHERS', 'RAJPUT_LEVIES', 'PAIKS', 'HEAVY_CAVALRY', 'SIEGE_ENGINES'];
  for (const uId of expectedUnits) {
    const u = UNIT_TYPES[uId];
    assert(u, `Unit ${uId} not found`);
    assert(u.maxHp > 0);
    assert(u.meleeAttack > 0);
    assert(u.meleeDefense > 0);
    assert(u.recruitmentCost > 0);
    assert(u.upkeepCost > 0);
  }
});

it('6x6 counter matrix matches tactical combat requirements', () => {
  // Rajput Levies (Spears) counter Heavy Cavalry (2.0x) and hold against Elephants (1.5x)
  assert.strictEqual(getCounterMultiplier('RAJPUT_LEVIES', 'HEAVY_CAVALRY'), 2.0);
  assert.strictEqual(getCounterMultiplier('RAJPUT_LEVIES', 'WAR_ELEPHANTS'), 1.5);

  // Heavy Cavalry counters Paiks (2.2x) and Siege Engines (2.5x)
  assert.strictEqual(getCounterMultiplier('HEAVY_CAVALRY', 'PAIKS'), 2.2);
  assert.strictEqual(getCounterMultiplier('HEAVY_CAVALRY', 'SIEGE_ENGINES'), 2.5);

  // War Elephants trample foot formations (1.8x) and smash Siege (2.0x)
  assert.strictEqual(getCounterMultiplier('WAR_ELEPHANTS', 'RAJPUT_LEVIES'), 1.8);
  assert.strictEqual(getCounterMultiplier('WAR_ELEPHANTS', 'PAIKS'), 1.8);
  assert.strictEqual(getCounterMultiplier('WAR_ELEPHANTS', 'SIEGE_ENGINES'), 2.0);

  // Foot Paiks outshoot Horse Archers (1.6x)
  assert.strictEqual(getCounterMultiplier('PAIKS', 'HORSE_ARCHERS'), 1.6);

  // Horse Archers kite Levies (1.4x) and pick off Siege (1.8x)
  assert.strictEqual(getCounterMultiplier('HORSE_ARCHERS', 'RAJPUT_LEVIES'), 1.4);
  assert.strictEqual(getCounterMultiplier('HORSE_ARCHERS', 'SIEGE_ENGINES'), 1.8);

  // Siege Engines destroy Elephants at distance (2.0x)
  assert.strictEqual(getCounterMultiplier('SIEGE_ENGINES', 'WAR_ELEPHANTS'), 2.0);
});

it('supports class names in COUNTER_MATRIX.getMultiplier', () => {
  assert.strictEqual(COUNTER_MATRIX.getMultiplier('SPEARMAN', 'SHOCK_CAVALRY'), 2.5);
  assert.strictEqual(COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'ARCHER', true), 2.2);
  assert.strictEqual(COUNTER_MATRIX.getMultiplier('SHOCK_MONSTER', 'SWORDSMAN'), 1.8);
  assert.strictEqual(COUNTER_MATRIX.getMultiplier('ARCHER', 'SKIRMISH_CAVALRY'), 1.6);
  assert.strictEqual(COUNTER_MATRIX.getMultiplier('ARTILLERY_ENGINE', 'SHOCK_MONSTER'), 2.0);
  assert.strictEqual(COUNTER_MATRIX.getMultiplier('SWORDSMAN', 'SWORDSMAN'), 1.0);
});

// ----------------------------------------------------
// Section 5: Buildings
// ----------------------------------------------------
console.log('\n--- 5. Testing Buildings (buildings.js) ---');

it('has 15 buildings across 5 categories and 3 tiers', () => {
  const cats = Object.keys(BUILDING_CATEGORIES);
  assert.strictEqual(cats.length, 5);
  assert.strictEqual(Object.keys(BUILDINGS).length, 15);

  for (const cat of cats) {
    const list = getBuildingsByCategory(cat);
    assert.strictEqual(list.length, 3);
    assert(list[0].cost < list[1].cost && list[1].cost < list[2].cost);
    assert(list[0].buildTime < list[1].buildTime && list[1].buildTime < list[2].buildTime);
  }
});

it('getNextUpgrade progresses T1 -> T2 -> T3 -> null', () => {
  assert.strictEqual(getNextUpgrade('barracks_t1')?.id, 'barracks_t2');
  assert.strictEqual(getNextUpgrade('barracks_t2')?.id, 'barracks_t3');
  assert.strictEqual(getNextUpgrade('barracks_t3'), null);
});

it('calculateProvinceBuildingBonuses correctly aggregates bonuses', () => {
  const bonuses = calculateProvinceBuildingBonuses(['walls_t2', 'irrigation_t2', 'market_t1']);
  assert.strictEqual(bonuses.defenseRating, 50);
  assert.strictEqual(bonuses.taxBonus, 35 + 25);
  assert.strictEqual(bonuses.publicOrderBonus, 3 + 3); // walls_t2 (+3) + irrigation_t2 (+3)
  assert.strictEqual(bonuses.hasFamineImmunity, true);
});

// ----------------------------------------------------
// Section 6: Tech Tree
// ----------------------------------------------------
console.log('\n--- 6. Testing Tech Tree (techTree.js) ---');

it('has 12 technologies across 3 branches and 4 tiers', () => {
  assert.strictEqual(Object.keys(TECH_TREE).length, 12);
  const branches = Object.keys(TECH_BRANCHES);
  assert.strictEqual(branches.length, 3);

  for (const b of branches) {
    const techs = getTechsByBranch(b);
    assert.strictEqual(techs.length, 4);
    for (let i = 1; i < techs.length; i++) {
      assert(techs[i].researchCost > techs[i - 1].researchCost);
      assert(techs[i].prerequisites.includes(techs[i - 1].id));
    }
  }
});

it('DAG validation passes with zero errors', () => {
  const validation = validateTechGraph();
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.errors.length, 0);
});

it('calculateEmpireTechModifiers aggregates numerical and boolean bonuses', () => {
  const mods = calculateEmpireTechModifiers(['TECH_COMBINED_ARMS', 'TECH_ELEPHANT_ARMOR']);
  assert.strictEqual(mods.infantryAttackModifier, 0.10);
  assert.strictEqual(mods.levyMoraleBonus, 5);
  assert.strictEqual(mods.elephantHpModifier, 0.25);
  assert.strictEqual(mods.elephantPanicResistance, 0.20);
});

// ----------------------------------------------------
// Section 7: Religions & Shrines
// ----------------------------------------------------
console.log('\n--- 7. Testing Religions & Shrines (religions.js) ---');

it('contains 8 holy shrines bound to authentic provinces', () => {
  assert.strictEqual(Object.keys(HOLY_SHRINES).length, 8);
  for (const s of Object.values(HOLY_SHRINES)) {
    assert(PROVINCES[s.provinceId], `Shrine ${s.id} province ${s.provinceId} not found`);
    assert(s.controllerBonus.pietyBonus > 0);
    assert(s.controllerBonus.pilgrimRevenue > 0);
  }
});

it('calculates public order delta across tolerance policies', () => {
  const p1 = calculateReligiousPublicOrderModifier('HINDUISM_SHAIVITE', 'HINDUISM_SHAIVITE', 'STRICT_ORTHODOXY');
  assert.strictEqual(p1, 15);

  const p2 = calculateReligiousPublicOrderModifier('HINDUISM_SHAIVITE', 'ISLAM_SUNNI', 'STRICT_ORTHODOXY');
  assert.strictEqual(p2, -20);

  const p3 = calculateReligiousPublicOrderModifier('HINDUISM_SHAIVITE', 'ISLAM_SUNNI', 'PLURALISTIC_SYNCRETISM');
  assert.strictEqual(p3, 15); // +15 in minority provinces under pluralistic syncretism
});


// ----------------------------------------------------
// Section 8: GameState Engine & Entity Queries
// ----------------------------------------------------
console.log('\n--- 8. Testing GameState Engine (gameState.js) ---');

it('initializes new game state with all entities populated', () => {
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  assert.strictEqual(state.currentTurn, 1);
  assert.strictEqual(state.playerFactionId, 'FAC_VIJAYANAGARA');
  assert.strictEqual(Object.keys(state.provinces).length, 40);
  assert.strictEqual(Object.keys(state.factions).length, 10);
  assert.strictEqual(Object.keys(state.characters).length, 26);
  assert(Object.keys(state.armies).length >= 5, 'Should have spawned starting armies');
});

it('supports normalized ID lookups for provinces, factions, and characters', () => {
  const state = new GameState();
  state.initNewGame();

  // Province
  assert.strictEqual(state.getProvince('PROV_DELHI')?.name, 'Delhi & Upper Doab');
  assert.strictEqual(state.getProvince('delhi')?.id, 'PROV_DELHI');
  assert.strictEqual(state.getProvince('PROV_VIJAYANAGARA')?.id, 'PROV_VIJAYANAGARA');

  // Faction
  assert.strictEqual(state.getFaction('FAC_VIJAYANAGARA')?.name, 'Vijayanagara Empire');
  assert.strictEqual(state.getFaction('vijayanagara')?.id, 'FAC_VIJAYANAGARA');
  assert.strictEqual(state.getFaction('delhi')?.id, 'FAC_DELHI');

  // Character
  assert.strictEqual(state.getCharacter('CHAR_BUKKA_I')?.name, 'Bukka Raya I');
  assert.strictEqual(state.getCharacter('bukka_i')?.id, 'CHAR_BUKKA_I');
});

it('manages imperial treasuries with get, set, modify, and getter', () => {
  const state = new GameState();
  state.initNewGame();

  const initial = state.getTreasury('FAC_VIJAYANAGARA');
  assert.strictEqual(initial, 5200);

  state.modifyTreasury('FAC_VIJAYANAGARA', 500);
  assert.strictEqual(state.getTreasury('FAC_VIJAYANAGARA'), 5700);

  state.setTreasury('FAC_VIJAYANAGARA', 10000);
  assert.strictEqual(state.getTreasury('FAC_VIJAYANAGARA'), 10000);

  const allTreasuries = state.imperialTreasuries;
  assert.strictEqual(allTreasuries['FAC_VIJAYANAGARA'], 10000);
  assert.strictEqual(Object.keys(allTreasuries).length, 10);
});

it('creates and deletes armies dynamically', () => {
  const state = new GameState();
  state.initNewGame();

  const army = state.createArmy('FAC_VIJAYANAGARA', 'PROV_MYSORE', [
    { id: 'R1', unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100 }
  ], 'CHAR_KAMPANA', 'Expeditionary Force');

  assert(army);
  assert(army.id.startsWith('ARMY_FAC_VIJAYANAGARA'));
  assert.strictEqual(state.getArmy(army.id)?.name, 'Expeditionary Force');
  assert.strictEqual(state.getCharacter('CHAR_KAMPANA')?.currentRole, 'GENERAL');

  const deleted = state.deleteArmy(army.id);
  assert.strictEqual(deleted, true);
  assert.strictEqual(state.getArmy(army.id), null);
  assert.strictEqual(state.getCharacter('CHAR_KAMPANA')?.currentRole, 'IDLE');
});

it('assigns character roles cleanly with previous assignment cleanup', () => {
  const state = new GameState();
  state.initNewGame();

  state.assignCharacterRole('CHAR_KAMPANA', 'GOVERNOR', 'PROV_MYSORE');
  assert.strictEqual(state.getCharacter('CHAR_KAMPANA')?.currentRole, 'GOVERNOR');
  assert.strictEqual(state.getProvince('PROV_MYSORE')?.governorId, 'CHAR_KAMPANA');

  // Reassign to IDLE
  state.assignCharacterRole('CHAR_KAMPANA', 'IDLE');
  assert.strictEqual(state.getCharacter('CHAR_KAMPANA')?.currentRole, 'IDLE');
  assert.strictEqual(state.getProvince('PROV_MYSORE')?.governorId, null);
});

it('transfers province control and resets opposing governors', () => {
  const state = new GameState();
  state.initNewGame();

  // Delhi owns Madurai with Ahsan Shah as governor
  assert.strictEqual(state.getProvince('PROV_MADURAI')?.controllingFaction, 'FAC_DELHI');
  assert.strictEqual(state.getProvince('PROV_MADURAI')?.governorId, 'CHAR_AHSAN_SHAH');

  // Vijayanagara conquers Madurai
  state.transferProvinceControl('PROV_MADURAI', 'FAC_VIJAYANAGARA');
  assert.strictEqual(state.getProvince('PROV_MADURAI')?.controllingFaction, 'FAC_VIJAYANAGARA');
  assert.strictEqual(state.getProvince('PROV_MADURAI')?.governorId, null);
  assert.strictEqual(state.getCharacter('CHAR_AHSAN_SHAH')?.currentRole, 'IDLE');
});

// ----------------------------------------------------
// Section 9: Character Stat Mathematical Formulas
// ----------------------------------------------------
console.log('\n--- 9. Testing Character Stat Formulas (gameState.js) ---');

it('calculateGeneralCombatBonus computes exact benchmarks for Bukka Raya I', () => {
  const state = new GameState();
  state.initNewGame();

  // Bukka Raya I: COM 9, GOV 7, DIP 6, DRE 6, PIE 7
  const stats = state.calculateGeneralCombatBonus('CHAR_BUKKA_I');
  assert.strictEqual(stats.attackMultiplier, 1.315);
  assert.strictEqual(stats.defenseMultiplier, 1.240);
  assert.strictEqual(stats.autoResolveModifier, 1.480);
  assert.strictEqual(stats.auraRadius, 5);
  assert.strictEqual(stats.baseMoraleBonus, 33.0);
  assert.strictEqual(stats.dreadMoraleShock, 14.0);
  assert.strictEqual(stats.movementPointsBonus, 6);
});

it('calculateGeneralCombatBonus computes exact benchmarks for Muhammad bin Tughlaq', () => {
  const state = new GameState();
  state.initNewGame();

  // MBT: COM 8, GOV 4, DIP 3, DRE 9, PIE 4
  const stats = state.calculateGeneralCombatBonus('CHAR_MBT');
  assert.strictEqual(stats.attackMultiplier, 1.280);
  assert.strictEqual(stats.defenseMultiplier, 1.250);
  assert.strictEqual(stats.dreadMoraleShock, 18.5);
});

it('calculateGovernorTaxModifier computes exact benchmarks for Malik Maqbul & Firuz Tughlaq', () => {
  const state = new GameState();
  state.initNewGame();

  // Malik Maqbul: GOV 10, DRE 5, PIE 6
  const maqbul = state.calculateGovernorTaxModifier('CHAR_MALIK_MAQBUL');
  assert.strictEqual(maqbul.corruption, 0.0);
  assert.strictEqual(maqbul.grossBonus, 0.60);
  assert.strictEqual(maqbul.taxMultiplier, 1.60);

  // Firuz Shah Tughlaq: GOV 9, DRE 2, PIE 8
  const firuz = state.calculateGovernorTaxModifier('CHAR_FIRUZ_TUG');
  assert.strictEqual(firuz.corruption, 0.0);
  assert.strictEqual(firuz.grossBonus, 0.49);
  assert.strictEqual(firuz.taxMultiplier, 1.49);
});

it('calculateGovernorPublicOrderModifier computes exact benchmarks for Lalleshwari', () => {
  const state = new GameState();
  state.initNewGame();

  // Lalleshwari: GOV 7, DRE 0, PIE 10
  const lalla = state.calculateGovernorPublicOrderModifier('CHAR_LALLESHWARI');
  assert.strictEqual(lalla.totalOrderModifier, 11.2);
  assert.strictEqual(lalla.nullifiesReligiousFriction, true);
  assert.strictEqual(lalla.governanceBonus, 4.2);
  assert.strictEqual(lalla.dreadBonus, 0.0);
  assert.strictEqual(lalla.pietyBonus, 7.0);
});

it('calculateMinisterDiplomacyModifier computes exact benchmarks for Ibn Battuta & Vidyaranya', () => {
  const state = new GameState();
  state.initNewGame();

  // Ibn Battuta: DIP 10, GOV 7, PIE 8
  const battuta = state.calculateMinisterDiplomacyModifier('CHAR_IBN_BATTUTA');
  assert.strictEqual(battuta.treatyScoreBonus, 45.0);
  assert.strictEqual(battuta.researchModifier, 1.520);

  // Sage Vidyaranya: DIP 9, GOV 9, PIE 10
  const vidya = state.calculateMinisterDiplomacyModifier('CHAR_VIDYARANYA');
  assert.strictEqual(vidya.treatyScoreBonus, 40.5);
  assert.strictEqual(vidya.researchModifier, 1.660);
});

// ----------------------------------------------------
// Section 10: Serialization, Deserialization & Storage
// ----------------------------------------------------
console.log('\n--- 10. Testing Serialization & Storage (gameState.js) ---');

it('serializes and deserializes initial game state with 100% data fidelity', () => {
  const original = new GameState();
  original.initNewGame('FAC_VIJAYANAGARA');

  const jsonStr = original.serialize();
  assert(typeof jsonStr === 'string' && jsonStr.length > 1000);

  const restored = new GameState();
  restored.deserialize(jsonStr);

  assert.strictEqual(restored.currentTurn, original.currentTurn);
  assert.strictEqual(restored.year, original.year);
  assert.strictEqual(restored.playerFactionId, original.playerFactionId);
  assert.deepStrictEqual(restored.provinces, original.provinces);
  assert.deepStrictEqual(restored.factions, original.factions);
  assert.deepStrictEqual(restored.characters, original.characters);
  assert.deepStrictEqual(restored.armies, original.armies);
});

it('serialization is idempotent and byte-for-byte deterministic across cycles', () => {
  const state1 = new GameState();
  state1.initNewGame('FAC_DELHI');
  state1.advanceTurn();
  state1.advanceTurn();

  const json1 = state1.serialize();
  const state2 = new GameState();
  state2.deserialize(json1);
  const json2 = state2.serialize();

  assert.strictEqual(json1, json2, 'Second serialization must be byte-for-byte identical to first');
});

it('mutated state roundtrips losslessly through export and import', () => {
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  state.advanceTurn();
  state.advanceTurn();
  state.modifyTreasury('FAC_VIJAYANAGARA', 25000);
  state.provinces['PROV_VIJAYANAGARA'].publicOrder = 99;
  state.provinces['PROV_VIJAYANAGARA'].buildings.push('walls_t2');

  state.createArmy('FAC_VIJAYANAGARA', 'PROV_KONKAN', [
    { id: 'REG_TEST_1', hp: 120, maxHp: 160, unitTypeId: 'HEAVY_CAVALRY' }
  ], null, 'Konkan Defense Force');

  const json = state.serialize();
  const reloaded = new GameState();
  reloaded.deserialize(json);

  assert.strictEqual(reloaded.currentTurn, 3);
  assert.strictEqual(reloaded.getTreasury('FAC_VIJAYANAGARA'), 30200);
  assert.strictEqual(reloaded.getProvince('PROV_VIJAYANAGARA')?.publicOrder, 99);
  assert(reloaded.getProvince('PROV_VIJAYANAGARA')?.buildings.includes('walls_t2'));
  const foundArmy = Object.values(reloaded.armies).find(a => a.name === 'Konkan Defense Force');
  assert(foundArmy);
  assert.strictEqual(foundArmy.regiments[0].hp, 120);
});

it('saveToLocalStorage and loadFromLocalStorage operate flawlessly with MemoryStorageAdapter', () => {
  const state = new GameState();
  state.initNewGame('FAC_BAHMANI');
  state.advanceTurn();

  const saveRes = state.saveToLocalStorage('test_save_slot');
  assert.strictEqual(saveRes.success, true);
  assert.strictEqual(saveRes.slotKey, 'test_save_slot');

  const savesList = state.listSavedGames();
  assert(savesList.length >= 1);
  assert.strictEqual(savesList[0].slotKey, 'test_save_slot');
  assert.strictEqual(savesList[0].currentTurn, 2);

  const loadedState = new GameState();
  const loadOk = loadedState.loadFromLocalStorage('test_save_slot');
  assert.strictEqual(loadOk, true);
  assert.strictEqual(loadedState.playerFactionId, 'FAC_BAHMANI');
  assert.strictEqual(loadedState.currentTurn, 2);

  state.deleteSaveFromLocalStorage('test_save_slot');
  const afterDelete = state.listSavedGames();
  assert.strictEqual(afterDelete.find(s => s.slotKey === 'test_save_slot'), undefined);
});

it('throws descriptive error on malformed or corrupted JSON string', () => {
  const state = new GameState();
  assert.throws(() => {
    state.deserialize('{ not valid json ');
  }, /JSON/);
});

console.log(`\n========================================`);
console.log(`Summary: ${passed} / ${total} tests passed successfully!`);
console.log(`========================================\n`);

if (passed !== total) {
  process.exit(1);
}
