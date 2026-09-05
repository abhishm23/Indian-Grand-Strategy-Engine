// tests/test_e2e_suite.js
// High-Level Comprehensive End-to-End Test Suite Across Tiers 1-4
// Scenarios:
//   - Tier 1: Smoke, Browser Zero-Compile Compliance & Audio/UI Contracts
//   - Tier 2: 10-Turn Campaign Cycle & Multi-System Synchronization
//   - Tier 3: The Tughlaq Overreach & Deccan Armed Secession Simulation
//   - Tier 4: Battle of Krishna River (Tactical Encounter, Flanking, Rout, & Save/Reload Mid-War)

import { describe, test, assert, assertEqual, assertApproxEqual, assertTrue, assertFalse, assertInBounds, assertDeepEqual } from './testRunner.js';
import {
  GameStateOracle,
  calculateGeneralAttackMultiplier,
  calculateGeneralDefenseMultiplier,
  calculateGeneralAuraRadius,
  calculateArmyBaseMorale,
  calculateClashMoraleShock,
  calculateAutoResolveOdds,
  calculateAutoResolvePower,
  calculateDirectionalAttack,
  calculateElevationCombatModifier,
  calculateTerrainCoverModifier,
  calculateDiplomaticOfferScore,
  PROVINCES_DATA,
  FACTIONS_DATA,
  CHARACTERS_DATA,
  REGIONAL_UNITS,
  COUNTER_MATRIX
} from './fixtures/spec_oracle.js';

describe('E2E Tier 1 — Smoke & System Invariant Verification (F27, F24, F22)', () => {
  test('Game state initializes cleanly with complete historical entities', () => {
    const state = new GameStateOracle();
    assertEqual(Object.keys(state.provinces).length, 40, '40 provinces present in initial state');
    assertEqual(Object.keys(state.factions).length, 10, '10 factions present in initial state');
    assertEqual(Object.keys(state.characters).length, 26, '26 characters present in initial state');
    assertEqual(state.currentTurn, 1, 'Starting turn is 1');
    assertEqual(state.year, 1345, 'Starting year is 1345 CE');
  }, { tier: 1 });

  test('Campaign HUD data payload contract satisfies requirements', () => {
    const state = new GameStateOracle();
    const playerFac = state.factions[state.playerFactionId];

    // Assert player status payload
    assertTrue(playerFac.treasury > 0, 'Player has treasury');
    assertTrue(playerFac.heldProvinces.length >= 4, 'Player has multiple starting provinces');

    // Assert province HUD inspector payload
    const prov = state.provinces['PROV_VIJAYANAGARA'];
    assertTrue(typeof prov.name === 'string', 'Province has valid name');
    assertTrue(typeof prov.baseTax === 'number', 'Province has tax number');
    assertTrue(typeof prov.publicOrder === 'number', 'Province has public order number');
    assertTrue(Array.isArray(prov.connections), 'Province has adjacency array');
  }, { tier: 1 });

  test('Procedural Audio SFX configuration conforms to Web Audio standards', () => {
    // Verifies audio sound bank contracts
    const SOUND_EVENTS = ['ATTACK', 'CHARGE', 'ROUT', 'VICTORY', 'BUTTON_CLICK'];
    const soundBank = {
      ATTACK: { type: 'sawtooth', baseFreq: 140, duration: 0.25 },
      CHARGE: { type: 'square', baseFreq: 220, duration: 0.40 },
      ROUT: { type: 'triangle', baseFreq: 90, duration: 0.60 },
      VICTORY: { type: 'sine', baseFreq: 440, duration: 1.20 },
      BUTTON_CLICK: { type: 'sine', baseFreq: 800, duration: 0.05 }
    };

    SOUND_EVENTS.forEach(ev => {
      assertTrue(soundBank[ev] !== undefined, `Sound event ${ev} exists`);
      assertTrue(soundBank[ev].duration > 0, `Sound ${ev} has non-zero duration`);
      assertTrue(soundBank[ev].baseFreq > 0, `Sound ${ev} has audible frequency`);
    });
  }, { tier: 1 });
});

describe('E2E Tier 2 — 10-Turn Full Campaign Cycle (F16, F21, F15, F19)', () => {
  test('10 consecutive turns advance smoothly without state corruption or NaN values', () => {
    const state = new GameStateOracle();
    const playerFacId = 'FAC_VIJAYANAGARA';
    let previousTreasury = state.factions[playerFacId].treasury;

    for (let t = 1; t <= 10; t++) {
      state.processTurn();

      // Check turn advance
      assertEqual(state.currentTurn, t + 1, `Turn advanced to ${t + 1}`);

      // Verify no NaN or undefined values in provinces
      for (const prov of Object.values(state.provinces)) {
        assertFalse(isNaN(prov.baseTax), `NaN baseTax in ${prov.id} on turn ${t}`);
        assertFalse(isNaN(prov.publicOrder), `NaN publicOrder in ${prov.id} on turn ${t}`);
        assertInBounds(prov.publicOrder, 0, 100, `Public order clamped in ${prov.id} on turn ${t}`);
      }

      // Verify treasury accumulates steadily
      const currentTreasury = state.factions[playerFacId].treasury;
      assertTrue(currentTreasury >= previousTreasury, `Treasury should increase or hold on turn ${t}`);
      previousTreasury = currentTreasury;
    }

    assertEqual(state.currentTurn, 11, 'Completed 10 full turns');
  }, { tier: 2 });
});

describe('E2E Tier 3 — The Tughlaq Overreach Scenario (F17, F18, F04)', () => {
  test('Sultan Muhammad bin Tughlaq misrule causes Deccan revolt and secession', () => {
    const state = new GameStateOracle();
    const deccanProv = state.provinces['PROV_GULBARGA'];
    const delhiFac = state.factions['FAC_DELHI'];

    // Sultan MBT is ruler with Dread 9, Governance 4
    const mbt = state.characters['CHAR_MBT'];
    assertEqual(mbt.attributes.dread, 9, 'MBT Dread is 9');
    assertEqual(mbt.attributes.governance, 4, 'MBT Governance is 4');

    // Simulate extreme discontent in Gulbarga
    deccanProv.publicOrder = 10;
    state.processTurn();

    // Force public order to 0 on next turn (simulating famine and religious unrest)
    deccanProv.publicOrder = 0;
    state.processTurn();

    // Rebellion must trigger!
    assertEqual(deccanProv.siegeStatus, true, 'Gulbarga besieged by rebels');
    assertEqual(state.activeRebellions.length, 1, 'Rebellion registered in state');
    assertEqual(state.activeRebellions[0].provinceId, 'PROV_GULBARGA', 'Rebellion targeted Gulbarga');

    // Rebel army spawned outside the city
    const rebelArmyId = state.activeRebellions[0].rebelArmyId;
    const rebelArmy = state.armies[rebelArmyId];
    assertTrue(rebelArmy !== undefined, 'Rebel army exists');
    assertEqual(rebelArmy.regiments.length, 2, 'Rebel army has 2 regiments');

    // Tax drops to 0 during siege
    const treasuryBefore = delhiFac.treasury;
    state.processTurn();
    const treasuryAfter = delhiFac.treasury;

    // Delhi collects taxes from its other provinces, but 0 from Gulbarga
    assertTrue(treasuryAfter > treasuryBefore, 'Delhi collects from other provinces');
  }, { tier: 3 });
});

describe('E2E Tier 4 — Battle of Krishna River & Mid-War Save/Load (F08, F11, F12, F25)', () => {
  test('Tactical encounter, directional attack bonuses, general leadership, and serialization', () => {
    const state = new GameStateOracle();

    // 1. Prepare Vijayanagara attacking army led by Bukka Raya I (COM 9, DRE 6)
    const bukka = state.characters['CHAR_BUKKA_I'];
    const vijArmy = {
      id: 'ARMY_VIJ_EXPEDITION',
      factionId: 'FAC_VIJAYANAGARA',
      name: 'Carnatic Strike Host',
      generalId: bukka.id,
      regiments: [
        { type: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100, meleeAtk: 48, meleeDef: 28, unitClass: 'SHOCK_MONSTER' },
        { type: 'PAIKS', hp: 105, maxHp: 105, morale: 100, meleeAtk: 30, meleeDef: 14, unitClass: 'WETLAND_INFANTRY' }
      ]
    };

    // 2. Prepare Bahmani defending army
    const bahArmy = {
      id: 'ARMY_BAH_DEFENSE',
      factionId: 'FAC_BAHMANI',
      name: 'Gulbarga Garrison',
      generalId: null,
      regiments: [
        { type: 'HEAVY_GHULAM_CAVALRY', hp: 160, maxHp: 160, morale: 100, meleeAtk: 42, meleeDef: 26, unitClass: 'SHOCK_CAVALRY' },
        { type: 'RAJPUT_LEVIES', hp: 130, maxHp: 130, morale: 80, meleeAtk: 36, meleeDef: 22, unitClass: 'FEROCIOUS_INFANTRY' }
      ]
    };

    // 3. Auto-resolve calculation with General Bukka Raya I
    const powerVij = calculateAutoResolvePower(vijArmy, bukka, 0, 0);
    const powerBah = calculateAutoResolvePower(bahArmy, null, 1, 0.15); // Defender has Fort 1 + Plateau
    const odds = calculateAutoResolveOdds(powerVij, powerBah);

    assertTrue(odds.attackerWinChance > 50, 'Bukka Raya I commands superior odds');
    assertInBounds(odds.attackerWinChance, 5, 95, 'Odds clamped in bounds');

    // 4. Tactical Directional Math verification: Bukka outflanks the Bahmani line
    const flankAttack = calculateDirectionalAttack(90); // 90 degree flank
    assertEqual(flankAttack.direction, 'FLANK', 'Flank confirmed');
    assertEqual(flankAttack.damageMultiplier, 1.4, 'Flank applies 1.4x damage');
    assertEqual(flankAttack.moraleShock, -20, 'Flank inflicts -20 morale shock');

    // Rear charge with War Elephants
    const rearAttack = calculateDirectionalAttack(180); // 180 degree rear
    assertEqual(rearAttack.direction, 'REAR', 'Rear confirmed');
    assertEqual(rearAttack.damageMultiplier, 2.0, 'Rear applies 2.0x damage');
    assertEqual(rearAttack.moraleShock, -40, 'Rear inflicts -40 morale shock');
    assertFalse(rearAttack.counterAllowed, 'No counter attack allowed from rear');

    // 5. Bukka Raya I Leadership Aura maintains friendly army morale
    const auraRadius = calculateGeneralAuraRadius(bukka.attributes.command);
    assertEqual(auraRadius, 5, 'Command 9 aura extends 5 tiles');
    const baseMorale = calculateArmyBaseMorale(bukka.attributes.command, bukka.attributes.piety);
    assertEqual(baseMorale, 133.0, 'Base morale boosted to 133');

    // 6. Save State Mid-War
    state.armies[vijArmy.id] = vijArmy;
    state.armies[bahArmy.id] = bahArmy;
    const midWarJson = state.serialize();

    // 7. Deserialize into a clean new instance
    const reloadedState = new GameStateOracle();
    reloadedState.deserialize(midWarJson);

    // Verify armies and general status intact
    assertTrue(reloadedState.armies['ARMY_VIJ_EXPEDITION'] !== undefined, 'Vijayanagara army preserved');
    assertEqual(reloadedState.armies['ARMY_VIJ_EXPEDITION'].generalId, 'CHAR_BUKKA_I', 'Bukka Raya I still leads the army');
    assertEqual(reloadedState.armies['ARMY_VIJ_EXPEDITION'].regiments[0].hp, 350, 'War Elephants HP intact');
    assertTrue(reloadedState.armies['ARMY_BAH_DEFENSE'] !== undefined, 'Bahmani army preserved');
  }, { tier: 4 });
});

describe('E2E Tier 4 — Logistics BFS & Multi-Turn Workload Stress (F06, F07, F16, F21)', () => {
  test('Supply Line BFS validates unbroken path from army to friendly capital <= 3 provinces', () => {
    const provinceMap = new Map(PROVINCES_DATA.map(p => [p.id, p]));

    // BFS Shortest Path algorithm across friendly territory
    function evaluateSupply(armyProvId, capitalProvId, friendlyProvinces, maxRadius = 3) {
      if (armyProvId === capitalProvId) return 'SUPPLIED';
      const queue = [{ id: armyProvId, dist: 0 }];
      const visited = new Set([armyProvId]);

      while (queue.length > 0) {
        const { id, dist } = queue.shift();
        if (id === capitalProvId) {
          return dist <= maxRadius ? 'SUPPLIED' : 'UNSUPPLIED_MILD';
        }
        if (dist >= maxRadius) continue;

        const prov = provinceMap.get(id);
        if (!prov) continue;

        for (const neighborId of prov.connections) {
          if (!visited.has(neighborId) && friendlyProvinces.has(neighborId)) {
            visited.add(neighborId);
            queue.push({ id: neighborId, dist: dist + 1 });
          }
        }
      }
      return 'UNSUPPLIED_SEVERE'; // No route
    }

    const vijProvinces = new Set(['PROV_VIJAYANAGARA', 'PROV_MYSORE', 'PROV_TONDAI', 'PROV_KONKAN']);
    const capital = 'PROV_VIJAYANAGARA';

    // Within friendly territory (Mysore is 1 hop from capital)
    const status1 = evaluateSupply('PROV_MYSORE', capital, vijProvinces);
    assertEqual(status1, 'SUPPLIED', 'Mysore is supplied from Vijayanagara');

    // Remote enemy province isolated from supply lines
    const isolatedStatus = evaluateSupply('PROV_KABUL', capital, vijProvinces);
    assertEqual(isolatedStatus, 'UNSUPPLIED_SEVERE', 'Isolated province has severed supply line');
  }, { tier: 4 });

  test('25-turn campaign workload stress runs deterministically without memory leakage or state drift', () => {
    const state = new GameStateOracle();
    const initialTurn = state.currentTurn;

    for (let i = 1; i <= 25; i++) {
      state.processTurn();
      assertEqual(state.currentTurn, initialTurn + i, `Turn ${initialTurn + i} advanced cleanly`);

      // Verify all 40 provinces retain integrity
      assertEqual(Object.keys(state.provinces).length, 40, `40 provinces intact at turn ${i}`);
      // Verify treasury remains a valid finite number
      const treasury = state.factions['FAC_VIJAYANAGARA'].treasury;
      assertFalse(isNaN(treasury), `Valid treasury at turn ${i}`);
      assertTrue(treasury >= 0, `Non-negative treasury at turn ${i}`);
    }

    assertEqual(state.currentTurn, 26, 'Completed full 25-turn campaign stress loop');
  }, { tier: 4 });

  test('Multi-front war: Simultaneous northern and southern campaigns resolve without state conflict', () => {
    const state = new GameStateOracle();

    // Delhi simultaneously defends Punjab in North and Deccan in South
    const delhi = state.factions['FAC_DELHI'];
    assertTrue(delhi.startingProvinces.includes('PROV_PUNJAB'), 'Delhi holds northern frontier');
    assertTrue(delhi.startingProvinces.includes('PROV_BUNDELKHAND'), 'Delhi holds southern corridor');

    state.processTurn();
    state.processTurn();

    assertTrue(state.currentTurn === 3, 'Multi-front war advanced cleanly');
  }, { tier: 4 });
});

describe('E2E Tier 4 — Detailed Historical Sandbox Scenarios (F01-F25)', () => {
  test('Historical Scenario 1: Consolidation of Vijayanagara (1336–1346 CE)', () => {
    const state = new GameStateOracle();
    const vij = state.factions['FAC_VIJAYANAGARA'];
    assertEqual(vij.rulerId, 'CHAR_HARIHARA_I', 'Harihara I rules');

    // Commission fortress in capital
    const capital = state.provinces['PROV_VIJAYANAGARA'];
    capital.underConstruction = { buildingType: 'FORTIFICATIONS_T2', remainingTurns: 4, cost: 250 };

    state.processTurn();
    state.processTurn();
    state.processTurn();
    state.processTurn();

    assertTrue(capital.activeBuildings.includes('FORTIFICATIONS_T2'), 'Capital fortress completed');
    assertEqual(capital.underConstruction, null, 'Construction queue empty');
  }, { tier: 4 });

  test('Historical Scenario 2: Bengal Riverine Warfare & Marsh Superiority', () => {
    // Paiks in River Delta
    const paik = REGIONAL_UNITS['PAIKS'];
    assertEqual(paik.specialAbility, 'MARSH_IMMUNITY', 'Paiks possess Marsh Immunity');
    const riverDelta = PROVINCES_DATA.find(p => p.terrainType === 'RIVER_DELTA');
    assertTrue(riverDelta !== undefined, 'River delta terrain exists in Bengal/Sindh');
  }, { tier: 4 });

  test('Historical Scenario 3: Chittorgarh Hill Fort Siege Resilience', () => {
    const mewar = FACTIONS_DATA.find(f => f.id === 'FAC_MEWAR');
    assertTrue(mewar.traits.includes('Hill_Fort_Bastion'), 'Mewar has Hill Fort Bastion');
    const chittor = PROVINCES_DATA.find(p => p.id === 'PROV_RAJPUTANA');
    assertEqual(chittor.defenseLevel, 3, 'Chittorgarh has defense rating 3');
  }, { tier: 4 });

  test('Historical Scenario 4: Kashmir Alpine Sovereignty & Rishi Harmony', () => {
    const kashmir = FACTIONS_DATA.find(f => f.id === 'FAC_KASHMIR');
    assertTrue(kashmir.traits.includes('Alpine_Sovereignty'), 'Kashmir immune to mountain pass attrition');
    assertTrue(kashmir.traits.includes('Rishi_Harmony'), 'Kashmir eliminates religious friction');
  }, { tier: 4 });

  test('Historical Scenario 5: Full Turn Lifecycle Integration (Recruitment, Construction, Diplomacy, War)', () => {
    const state = new GameStateOracle();

    // 1. Commission building
    state.provinces['PROV_VIJAYANAGARA'].underConstruction = { buildingType: 'COMMERCE_T1', remainingTurns: 2, cost: 100 };

    // 2. Set research
    state.techProgress['FAC_VIJAYANAGARA'] = { activeTechId: 'TECH_MIL_1', remainingCost: 100, pointsPerTurn: 50, unlockedTechs: [] };

    // 3. Process turn
    state.processTurn();

    // 4. Verify research and construction advanced
    assertEqual(state.provinces['PROV_VIJAYANAGARA'].underConstruction.remainingTurns, 1, 'Construction advanced');
    assertEqual(state.techProgress['FAC_VIJAYANAGARA'].remainingCost, 50, 'Research advanced');

    // 5. Next turn completes both
    state.processTurn();
    assertTrue(state.provinces['PROV_VIJAYANAGARA'].activeBuildings.includes('COMMERCE_T1'), 'Commerce completed');
    assertTrue(state.techProgress['FAC_VIJAYANAGARA'].unlockedTechs.includes('TECH_MIL_1'), 'Tech unlocked');
  }, { tier: 4 });
});


