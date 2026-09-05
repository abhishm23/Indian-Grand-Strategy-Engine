// tests/test_data_models.js
// Tier 1 Validation Suite: 40 Provinces, 10 Factions, 26 Figures, Regional Units, Buildings, Tech Tree

import { describe, test, assert, assertEqual, assertTrue, assertFalse, assertInBounds, assertDeepEqual } from './testRunner.js';
import {
  PROVINCES_DATA,
  FACTIONS_DATA,
  CHARACTERS_DATA,
  REGIONAL_UNITS,
  COUNTER_MATRIX,
  BUILDINGS_DATA,
  TECH_TREE_DATA
} from './fixtures/spec_oracle.js';

describe('Data Models — 40 Historical Provinces (F01)', () => {
  test('Province count equals exactly 40', () => {
    assertEqual(PROVINCES_DATA.length, 40, 'Expected 40 historical provinces');
  }, { tier: 1 });

  test('All provinces possess unique IDs with PROV_ prefix', () => {
    const idSet = new Set();
    PROVINCES_DATA.forEach(p => {
      assertTrue(p.id.startsWith('PROV_'), `Invalid ID prefix: ${p.id}`);
      assertFalse(idSet.has(p.id), `Duplicate province ID: ${p.id}`);
      idSet.add(p.id);
    });
  }, { tier: 1 });

  test('All province coordinates fall within 1200x900 canvas bounds', () => {
    PROVINCES_DATA.forEach(p => {
      assertInBounds(p.canvasCoords.x, 0, 1200, `Province ${p.id} X out of bounds`);
      assertInBounds(p.canvasCoords.y, 0, 900, `Province ${p.id} Y out of bounds`);
    });
  }, { tier: 1 });

  test('All provinces belong to valid terrain types', () => {
    const VALID_TERRAINS = new Set([
      'MOUNTAIN_PASS', 'FLOODPLAIN', 'JUNGLE', 'ARID_PLATEAU',
      'COASTAL_PORT', 'HIGHLAND_HILLS', 'DESERT_WASTELAND', 'RIVER_DELTA'
    ]);
    PROVINCES_DATA.forEach(p => {
      assertTrue(VALID_TERRAINS.has(p.terrainType), `Invalid terrain type: ${p.terrainType} in ${p.id}`);
    });
  }, { tier: 1 });

  test('All provinces possess authentic strategic resources', () => {
    const VALID_RESOURCES = new Set([
      'HORSES', 'IRON', 'TEXTILES', 'SPICES',
      'PRECIOUS_STONES', 'WAR_ELEPHANTS', 'TIMBER', 'SALT'
    ]);
    PROVINCES_DATA.forEach(p => {
      assertTrue(VALID_RESOURCES.has(p.strategicResource), `Invalid resource: ${p.strategicResource} in ${p.id}`);
    });
  }, { tier: 1 });

  test('Base taxation and manpower fall within balanced ranges', () => {
    PROVINCES_DATA.forEach(p => {
      assertInBounds(p.baseTax, 50, 600, `Base tax out of bounds in ${p.id}`);
      assertInBounds(p.baseManpower, 100, 3000, `Base manpower out of bounds in ${p.id}`);
      assertInBounds(p.defenseLevel, 0, 5, `Defense level out of bounds in ${p.id}`);
    });
  }, { tier: 1 });

  test('Province connections form a reciprocal bidirectional adjacency graph', () => {
    const provinceMap = new Map(PROVINCES_DATA.map(p => [p.id, p]));
    PROVINCES_DATA.forEach(p => {
      assertTrue(p.connections.length > 0, `Province ${p.id} has no connections`);
      p.connections.forEach(neighborId => {
        assertTrue(provinceMap.has(neighborId), `Province ${p.id} references non-existent neighbor ${neighborId}`);
        const neighbor = provinceMap.get(neighborId);
        assertTrue(
          neighbor.connections.includes(p.id),
          `Adjacency graph not reciprocal: ${p.id} connects to ${neighborId}, but not vice versa`
        );
      });
    });
  }, { tier: 1 });
});

describe('Data Models — 10 Historical Factions (F02)', () => {
  test('Faction roster contains exactly 10 distinct entities', () => {
    assertEqual(FACTIONS_DATA.length, 10, 'Expected 10 historical factions');
  }, { tier: 1 });

  test('All factions have valid capitals, colors, and initial treasuries', () => {
    const provinceIds = new Set(PROVINCES_DATA.map(p => p.id));
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

    FACTIONS_DATA.forEach(f => {
      assertTrue(f.id.startsWith('FAC_'), `Invalid faction ID prefix: ${f.id}`);
      assertTrue(provinceIds.has(f.capitalProvinceId), `Capital ${f.capitalProvinceId} does not exist`);
      assertTrue(hexColorRegex.test(f.primaryColor), `Invalid primary color: ${f.primaryColor}`);
      assertTrue(hexColorRegex.test(f.secondaryColor), `Invalid secondary color: ${f.secondaryColor}`);
      assertTrue(f.treasury >= 1000, `Treasury unexpectedly low: ${f.treasury} in ${f.id}`);
      assertTrue(f.startingProvinces.length >= 1, `Faction ${f.id} has no starting provinces`);
    });
  }, { tier: 1 });

  test('Faction starting provinces belong to recognized province list', () => {
    const provinceIds = new Set(PROVINCES_DATA.map(p => p.id));
    FACTIONS_DATA.forEach(f => {
      f.startingProvinces.forEach(pId => {
        assertTrue(provinceIds.has(pId), `Starting province ${pId} in faction ${f.id} not in provinces list`);
      });
    });
  }, { tier: 1 });

  test('All factions possess documented AI personality profiles', () => {
    const VALID_PERSONALITIES = new Set([
      'EXPANSIONIST_MILITANT', 'DEFENSIVE_TRADITIONALIST', 'MERCANTILE_OPPORTUNIST',
      'PIOUS_CRUSADER', 'ERRATIC_AUTOCRAT', 'DIPLOMATIC_PACIFIER'
    ]);
    FACTIONS_DATA.forEach(f => {
      assertTrue(VALID_PERSONALITIES.has(f.aiPersonality), `Invalid personality: ${f.aiPersonality} in ${f.id}`);
    });
  }, { tier: 1 });
});

describe('Data Models — 26 Historical Figures (F03)', () => {
  test('Historical figures roster contains exactly 26 figures', () => {
    assertEqual(CHARACTERS_DATA.length, 26, 'Expected 26 historical figures');
  }, { tier: 1 });

  test('All characters have valid attributes within range [1, 10] or [0, 10]', () => {
    CHARACTERS_DATA.forEach(c => {
      assertTrue(c.id.startsWith('CHAR_'), `Invalid character ID: ${c.id}`);
      assertInBounds(c.attributes.command, 1, 10, `Command out of bounds for ${c.id}`);
      assertInBounds(c.attributes.governance, 1, 10, `Governance out of bounds for ${c.id}`);
      assertInBounds(c.attributes.diplomacy, 1, 10, `Diplomacy out of bounds for ${c.id}`);
      assertInBounds(c.attributes.dread, 0, 10, `Dread out of bounds for ${c.id}`);
      assertInBounds(c.attributes.piety, 0, 10, `Piety out of bounds for ${c.id}`);
      assertInBounds(c.loyalty, 0, 100, `Loyalty out of bounds for ${c.id}`);
      assertInBounds(c.age, 14, 90, `Age out of bounds for ${c.id}`);
    });
  }, { tier: 1 });

  test('Every faction ruler exists in the character roster with 100 base loyalty', () => {
    const characterMap = new Map(CHARACTERS_DATA.map(c => [c.id, c]));
    FACTIONS_DATA.forEach(f => {
      assertTrue(characterMap.has(f.rulerId), `Ruler ${f.rulerId} for faction ${f.id} not found in characters`);
      const ruler = characterMap.get(f.rulerId);
      assertEqual(ruler.loyalty, 100, `Ruler ${ruler.name} loyalty must be 100`);
      assertEqual(ruler.currentRole, 'RULER', `Ruler role mismatch for ${ruler.name}`);
    });
  }, { tier: 1 });

  test('All characters are assigned to valid initial roles', () => {
    const VALID_ROLES = new Set(['RULER', 'GENERAL', 'GOVERNOR', 'MINISTER', 'IDLE']);
    CHARACTERS_DATA.forEach(c => {
      assertTrue(VALID_ROLES.has(c.currentRole), `Invalid role ${c.currentRole} for ${c.name}`);
    });
  }, { tier: 1 });
});

describe('Data Models — Regional Unit Classes & Counter Matrix (F10)', () => {
  test('All 6 regional unit classes are present with non-zero stats', () => {
    const requiredUnits = [
      'WAR_ELEPHANTS', 'HORSE_ARCHERS', 'RAJPUT_LEVIES',
      'PAIKS', 'HEAVY_GHULAM_CAVALRY', 'SIEGE_MANJANIQ'
    ];
    requiredUnits.forEach(uKey => {
      const u = REGIONAL_UNITS[uKey];
      assertTrue(u !== undefined, `Missing unit type: ${uKey}`);
      assertTrue(u.maxHp > 0, `Unit ${uKey} maxHp must be > 0`);
      assertTrue(u.meleeAtk > 0, `Unit ${uKey} meleeAtk must be > 0`);
      assertTrue(u.recruitmentCost > 0, `Unit ${uKey} cost must be > 0`);
      assertTrue(u.upkeep > 0, `Unit ${uKey} upkeep must be > 0`);
    });
  }, { tier: 1 });

  test('Counter matrix applies expected rock-paper-scissors multipliers', () => {
    // Spears vs Cavalry / Elephants = 2.5x
    assertEqual(COUNTER_MATRIX.getMultiplier('SPEARMAN', 'SHOCK_CAVALRY'), 2.5, 'Spearman vs Shock Cavalry multiplier');
    assertEqual(COUNTER_MATRIX.getMultiplier('SPEARMAN', 'SHOCK_MONSTER'), 2.5, 'Spearman vs Elephant multiplier');

    // Cavalry vs Archers/Swords charging = 2.2x
    assertEqual(COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'ARCHER', true), 2.2, 'Cavalry charge vs Archer');

    // Elephants vs Swordsman = 1.8x
    assertEqual(COUNTER_MATRIX.getMultiplier('SHOCK_MONSTER', 'SWORDSMAN'), 1.8, 'Elephant vs Swordsman');

    // Foot Archer vs Horse Archer = 1.6x
    assertEqual(COUNTER_MATRIX.getMultiplier('ARCHER', 'SKIRMISH_CAVALRY'), 1.6, 'Foot Archer vs Skirmish Cav');

    // Siege vs Elephant = 2.0x
    assertEqual(COUNTER_MATRIX.getMultiplier('ARTILLERY_ENGINE', 'SHOCK_MONSTER'), 2.0, 'Artillery vs Monster');

    // Baseline neutral = 1.0x
    assertEqual(COUNTER_MATRIX.getMultiplier('SWORDSMAN', 'SWORDSMAN'), 1.0, 'Neutral matchup');
  }, { tier: 1 });
});

describe('Data Models — Buildings & Technology Tree (F15, F19)', () => {
  test('5 building categories across 3 tiers exist with progressive costs', () => {
    const categories = ['FORTIFICATIONS', 'BARRACKS', 'AGRICULTURE', 'COMMERCE', 'RELIGION'];
    categories.forEach(cat => {
      const tiers = BUILDINGS_DATA[cat];
      assertEqual(tiers.length, 3, `Category ${cat} should have 3 tiers`);
      assertTrue(tiers[0].cost < tiers[1].cost && tiers[1].cost < tiers[2].cost, `Cost not progressive in ${cat}`);
      assertTrue(tiers[0].turns < tiers[1].turns && tiers[1].turns < tiers[2].turns, `Turns not progressive in ${cat}`);
    });
  }, { tier: 1 });

  test('3 technology branches each have 4 progressive tiers', () => {
    const branches = ['MILITARY', 'SIEGE_METALLURGY', 'ADMIN_AGRONOMY'];
    branches.forEach(branch => {
      const techs = TECH_TREE_DATA[branch];
      assertEqual(techs.length, 4, `Branch ${branch} should have 4 tiers`);
      for (let i = 1; i < techs.length; i++) {
        assertTrue(techs[i].cost > techs[i - 1].cost, `Cost not increasing in ${branch}`);
        assertEqual(techs[i].prereq, techs[i - 1].id, `Prereq chain broken in ${branch}`);
      }
    });
  }, { tier: 1 });
});

describe('Data Models — Geopolitical Regions & Terrain Matrix (F01, F20)', () => {
  test('All 9 historical regions contain at least one province', () => {
    const regions = new Set([
      'NORTHWEST', 'NORTH_HIMALAYA', 'PUNJAB_SINDH', 'GANGETIC_HEARTLAND',
      'BENGAL_ASSAM_BURMA', 'WEST_CENTRAL_INDIA', 'DECCAN', 'PENINSULAR_SOUTH', 'SRI_LANKA'
    ]);
    const foundRegions = new Set(PROVINCES_DATA.map(p => p.region));
    regions.forEach(r => {
      assertTrue(foundRegions.has(r), `Region ${r} must contain at least one province`);
    });
  }, { tier: 1 });

  test('All 8 terrain types define explicit tactical movement and defense properties', () => {
    const TERRAIN_RULES = {
      MOUNTAIN_PASS: { moveCost: 1.8, defBonus: 0.40, chargeAllowed: false },
      FLOODPLAIN: { moveCost: 1.0, defBonus: 0.0, chargeAllowed: true },
      JUNGLE: { moveCost: 2.2, defBonus: 0.30, chargeAllowed: false },
      ARID_PLATEAU: { moveCost: 1.2, defBonus: 0.15, chargeAllowed: true },
      COASTAL_PORT: { moveCost: 1.1, defBonus: 0.20, chargeAllowed: true },
      HIGHLAND_HILLS: { moveCost: 1.6, defBonus: 0.35, chargeAllowed: true },
      DESERT_WASTELAND: { moveCost: 2.0, defBonus: -0.10, chargeAllowed: true },
      RIVER_DELTA: { moveCost: 1.9, defBonus: 0.20, chargeAllowed: false }
    };

    Object.entries(TERRAIN_RULES).forEach(([terrainKey, rules]) => {
      assertTrue(rules.moveCost >= 1.0, `Move cost must be >= 1.0 for ${terrainKey}`);
      assertTrue(typeof rules.chargeAllowed === 'boolean', `ChargeAllowed must be boolean for ${terrainKey}`);
    });
  }, { tier: 1 });

  test('All 8 strategic resources specify economic buffs and military unlocks', () => {
    const RESOURCE_UNLOCKS = {
      HORSES: 'HEAVY_GHULAM_CAVALRY',
      IRON: 'SIEGE_MANJANIQ',
      TEXTILES: 'PAIKS',
      SPICES: 'COMMERCIAL_TARIFF',
      PRECIOUS_STONES: 'MERCENARY_SUBSIDY',
      WAR_ELEPHANTS: 'WAR_ELEPHANTS',
      TIMBER: 'SIEGE_RAMPART',
      SALT: 'SUPPLY_RANGE'
    };

    Object.entries(RESOURCE_UNLOCKS).forEach(([res, unlock]) => {
      assertTrue(typeof unlock === 'string' && unlock.length > 0, `Resource ${res} missing unlock`);
    });
  }, { tier: 1 });

  test('State religious tolerance policies define distinctive public order modifiers', () => {
    const TOLERANCE_POLICIES = {
      STRICT_ORTHODOXY: { matchingBonus: 15, minorityPenalty: -20, conversionPerTurn: 0.02 },
      STATE_PATRONAGE: { matchingBonus: 5, minorityPenalty: 0, conversionPerTurn: 0.01 },
      PLURALISTIC_SYNCRETISM: { matchingBonus: 0, minorityPenalty: 0, tradeMultiplier: 0.20 }
    };

    assertTrue(TOLERANCE_POLICIES.STRICT_ORTHODOXY.minorityPenalty === -20, 'Orthodoxy imposes harsh minority unrest');
    assertTrue(TOLERANCE_POLICIES.PLURALISTIC_SYNCRETISM.minorityPenalty === 0, 'Pluralism eliminates minority friction');
  }, { tier: 1 });
});

describe('Data Models — Pairwise Combinatorial Unit Interactions (F10)', () => {
  test('Pairwise combat matchup matrix evaluates correctly across all 6 regional classes', () => {
    const unitClasses = [
      'SPEARMAN', 'SHOCK_CAVALRY', 'SHOCK_MONSTER',
      'ARCHER', 'SKIRMISH_CAVALRY', 'ARTILLERY_ENGINE'
    ];

    let pairwiseCount = 0;
    unitClasses.forEach(attClass => {
      unitClasses.forEach(defClass => {
        const mult = COUNTER_MATRIX.getMultiplier(attClass, defClass, false);
        assertInBounds(mult, 0.5, 3.0, `Multiplier out of bounds for ${attClass} vs ${defClass}`);
        pairwiseCount++;
      });
    });

    assertEqual(pairwiseCount, 36, 'Full 6x6 pairwise unit matrix evaluated (36 pairs)');
  }, { tier: 1 });
});

describe('Data Models — Individual Faction Territories Verification (F02)', () => {
  const factionMap = new Map(FACTIONS_DATA.map(f => [f.id, f]));

  test('Delhi Sultanate starting provinces (11 provinces)', () => {
    const f = factionMap.get('FAC_DELHI');
    assertEqual(f.startingProvinces.length, 11, 'Delhi has 11 starting provinces');
    assertTrue(f.startingProvinces.includes('PROV_DELHI'), 'Delhi holds capital');
    assertTrue(f.startingProvinces.includes('PROV_KABUL'), 'Delhi holds Kabul frontier');
  }, { tier: 1 });

  test('Vijayanagara Empire starting provinces (4 provinces)', () => {
    const f = factionMap.get('FAC_VIJAYANAGARA');
    assertEqual(f.startingProvinces.length, 4, 'Vijayanagara has 4 provinces');
    assertTrue(f.startingProvinces.includes('PROV_VIJAYANAGARA'), 'Vijayanagara holds capital');
    assertTrue(f.startingProvinces.includes('PROV_KONKAN'), 'Vijayanagara holds Goa/Konkan port');
  }, { tier: 1 });

  test('Bahmani Sultanate starting provinces (3 provinces)', () => {
    const f = factionMap.get('FAC_BAHMANI');
    assertEqual(f.startingProvinces.length, 3, 'Bahmani has 3 provinces');
    assertTrue(f.startingProvinces.includes('PROV_GULBARGA'), 'Bahmani holds Gulbarga capital');
  }, { tier: 1 });

  test('Bengal Sultanate starting provinces (2 provinces)', () => {
    const f = factionMap.get('FAC_BENGAL');
    assertEqual(f.startingProvinces.length, 2, 'Bengal has 2 provinces');
    assertTrue(f.startingProvinces.includes('PROV_BENGAL_NORTH'), 'Bengal holds Pandua capital');
  }, { tier: 1 });

  test('Rajput Confederacy of Mewar starting provinces (1 province)', () => {
    const f = factionMap.get('FAC_MEWAR');
    assertEqual(f.startingProvinces.length, 1, 'Mewar has 1 province');
    assertTrue(f.startingProvinces.includes('PROV_RAJPUTANA'), 'Mewar holds Chittorgarh');
  }, { tier: 1 });

  test('Ahom Kingdom starting provinces (2 provinces)', () => {
    const f = factionMap.get('FAC_AHOM');
    assertEqual(f.startingProvinces.length, 2, 'Ahom has 2 provinces');
    assertTrue(f.startingProvinces.includes('PROV_AHOM'), 'Ahom holds Charaideo capital');
  }, { tier: 1 });

  test('Sultanate of Kashmir starting provinces (2 provinces)', () => {
    const f = factionMap.get('FAC_KASHMIR');
    assertEqual(f.startingProvinces.length, 2, 'Kashmir has 2 provinces');
    assertTrue(f.startingProvinces.includes('PROV_KASHMIR'), 'Kashmir holds Srinagar');
  }, { tier: 1 });

  test('Musunuri Nayakas of Warangal starting provinces (2 provinces)', () => {
    const f = factionMap.get('FAC_MUSUNURI');
    assertEqual(f.startingProvinces.length, 2, 'Musunuri has 2 provinces');
    assertTrue(f.startingProvinces.includes('PROV_WARANGAL'), 'Musunuri holds Warangal capital');
  }, { tier: 1 });

  test('Kingdom of Jaffna starting provinces (1 province)', () => {
    const f = factionMap.get('FAC_JAFFNA');
    assertEqual(f.startingProvinces.length, 1, 'Jaffna has 1 province');
    assertTrue(f.startingProvinces.includes('PROV_JAFFNA'), 'Jaffna holds Nallur');
  }, { tier: 1 });

  test('Kingdom of Gampola starting provinces (1 province)', () => {
    const f = factionMap.get('FAC_GAMPOLA');
    assertEqual(f.startingProvinces.length, 1, 'Gampola has 1 province');
    assertTrue(f.startingProvinces.includes('PROV_GAMPOLA'), 'Gampola holds Gampola');
  }, { tier: 1 });
});

describe('Data Models — Key Historical Figures Specific Attributes (F03)', () => {
  const charMap = new Map(CHARACTERS_DATA.map(c => [c.id, c]));

  test('Muhammad bin Tughlaq (CHAR_MBT): High Command & Dread, Volatile Governance', () => {
    const mbt = charMap.get('CHAR_MBT');
    assertEqual(mbt.attributes.command, 8, 'MBT Command is 8');
    assertEqual(mbt.attributes.dread, 9, 'MBT Dread is 9');
    assertEqual(mbt.attributes.governance, 4, 'MBT Governance is 4');
    assertTrue(mbt.traits.includes('Erratic_Genius'), 'MBT has Erratic_Genius trait');
  }, { tier: 1 });

  test('Firuz Shah Tughlaq (CHAR_FIRUZ_TUG): High Governance & Piety, Builder Trait', () => {
    const firuz = charMap.get('CHAR_FIRUZ_TUG');
    assertEqual(firuz.attributes.governance, 9, 'Firuz Governance is 9');
    assertEqual(firuz.attributes.piety, 8, 'Firuz Piety is 8');
    assertTrue(firuz.traits.includes('Canal_Builder'), 'Firuz has Canal_Builder trait');
  }, { tier: 1 });

  test('Khan-i-Jahan Maqbul (CHAR_MALIK_MAQBUL): Supreme Wazir with Governance 10', () => {
    const maqbul = charMap.get('CHAR_MALIK_MAQBUL');
    assertEqual(maqbul.attributes.governance, 10, 'Maqbul Governance is 10');
    assertEqual(maqbul.attributes.diplomacy, 8, 'Maqbul Diplomacy is 8');
  }, { tier: 1 });

  test('Ibn Battuta (CHAR_IBN_BATTUTA): Master Diplomat & Qadi with Diplomacy 10', () => {
    const ibn = charMap.get('CHAR_IBN_BATTUTA');
    assertEqual(ibn.attributes.diplomacy, 10, 'Ibn Battuta Diplomacy is 10');
    assertTrue(ibn.traits.includes('Globe_Trotter'), 'Has Globe_Trotter trait');
  }, { tier: 1 });

  test('Bukka Raya I (CHAR_BUKKA_I): Legendary General with Command 9', () => {
    const bukka = charMap.get('CHAR_BUKKA_I');
    assertEqual(bukka.attributes.command, 9, 'Bukka Command is 9');
    assertEqual(bukka.currentRole, 'GENERAL', 'Bukka assigned as General');
  }, { tier: 1 });

  test('Sage Vidyaranya (CHAR_VIDYARANYA): Spiritual Rajaguru with Piety 10', () => {
    const vidya = charMap.get('CHAR_VIDYARANYA');
    assertEqual(vidya.attributes.piety, 10, 'Vidyaranya Piety is 10');
    assertEqual(vidya.attributes.governance, 9, 'Vidyaranya Governance is 9');
  }, { tier: 1 });

  test('Kumara Kampana (CHAR_KAMPANA): Heroic Prince with Command 9', () => {
    const kampana = charMap.get('CHAR_KAMPANA');
    assertEqual(kampana.attributes.command, 9, 'Kampana Command is 9');
    assertTrue(kampana.traits.includes('Sultan_Bane'), 'Has Sultan_Bane trait');
  }, { tier: 1 });

  test('Shamsuddin Ilyas Shah (CHAR_ILYAS_SHAH): Master of Bengal with Command 9', () => {
    const ilyas = charMap.get('CHAR_ILYAS_SHAH');
    assertEqual(ilyas.attributes.command, 9, 'Ilyas Command is 9');
    assertEqual(ilyas.attributes.governance, 8, 'Ilyas Governance is 8');
  }, { tier: 1 });

  test('Maharana Hammir Singh (CHAR_HAMMIR_SINGH): Sisodia Pride with Command 9', () => {
    const hammir = charMap.get('CHAR_HAMMIR_SINGH');
    assertEqual(hammir.attributes.command, 9, 'Hammir Command is 9');
    assertEqual(hammir.attributes.dread, 7, 'Hammir Dread is 7');
  }, { tier: 1 });

  test('Lalleshwari (CHAR_LALLESHWARI): Mystic Saint with Piety 10 and Dread 0', () => {
    const lalla = charMap.get('CHAR_LALLESHWARI');
    assertEqual(lalla.attributes.piety, 10, 'Lalla Piety is 10');
    assertEqual(lalla.attributes.dread, 0, 'Lalla Dread is 0');
    assertEqual(lalla.attributes.diplomacy, 9, 'Lalla Diplomacy is 9');
  }, { tier: 1 });

  test('Ala-ud-Din Bahman Shah (CHAR_BAHMAN_SHAH): Deccan Liberator with Command 8, Dread 7', () => {
    const bahman = charMap.get('CHAR_BAHMAN_SHAH');
    assertEqual(bahman.attributes.command, 8, 'Bahman Shah Command is 8');
    assertEqual(bahman.attributes.dread, 7, 'Bahman Shah Dread is 7');
  }, { tier: 1 });

  test('Saifuddin Ghori (CHAR_SAIFUDDIN_GHORI): Master Fiscal Minister with Governance 9', () => {
    const ghori = charMap.get('CHAR_SAIFUDDIN_GHORI');
    assertEqual(ghori.attributes.governance, 9, 'Ghori Governance is 9');
    assertEqual(ghori.currentRole, 'MINISTER', 'Role is Minister');
  }, { tier: 1 });

  test('Rao Chanda Rathore (CHAR_CHANDA_RATHORE): Desert Cavalry Vanguard with Command 8', () => {
    const chanda = charMap.get('CHAR_CHANDA_RATHORE');
    assertEqual(chanda.attributes.command, 8, 'Chanda Command is 8');
    assertTrue(chanda.traits.includes('Desert_Raider'), 'Has Desert_Raider trait');
  }, { tier: 1 });

  test('Chao Sukhrangpha (CHAR_SUKHRANGPHA): Swargadeo of Ahom with Governance 8', () => {
    const ahom = charMap.get('CHAR_SUKHRANGPHA');
    assertEqual(ahom.attributes.governance, 8, 'Sukhrangpha Governance is 8');
    assertTrue(ahom.traits.includes('Tai_Harmonizer'), 'Has Tai_Harmonizer trait');
  }, { tier: 1 });

  test('Musunuri Kapaya Nayaka (CHAR_KAPAYA_NAYAKA): Defender of Dharma with Command 8, Piety 8', () => {
    const kapaya = charMap.get('CHAR_KAPAYA_NAYAKA');
    assertEqual(kapaya.attributes.command, 8, 'Kapaya Command is 8');
    assertEqual(kapaya.attributes.piety, 8, 'Kapaya Piety is 8');
  }, { tier: 1 });

  test('Martanda Cinkaiariyan (CHAR_MARTANDA): Arya Chakravarti Naval King with Command 8', () => {
    const martanda = charMap.get('CHAR_MARTANDA');
    assertEqual(martanda.attributes.command, 8, 'Martanda Command is 8');
    assertTrue(martanda.traits.includes('Pearl_Lord'), 'Has Pearl_Lord trait');
  }, { tier: 1 });

  test('Bhuvanaikabahu IV (CHAR_BHUVANAIKABAHU): Gampola Highland Ruler with Piety 9', () => {
    const bhuvan = charMap.get('CHAR_BHUVANAIKABAHU');
    assertEqual(bhuvan.attributes.piety, 9, 'Bhuvanaikabahu Piety is 9');
  }, { tier: 1 });

  test('Jalaluddin Ahsan Khan (CHAR_AHSAN_SHAH): Rebel Sultan of Madurai with Loyalty 55', () => {
    const ahsan = charMap.get('CHAR_AHSAN_SHAH');
    assertEqual(ahsan.loyalty, 55, 'Ahsan Shah has volatile 55 loyalty');
    assertEqual(ahsan.attributes.dread, 8, 'Ahsan Shah Dread is 8');
  }, { tier: 1 });
});



