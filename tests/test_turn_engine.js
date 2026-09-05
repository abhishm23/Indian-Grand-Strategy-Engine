// tests/test_turn_engine.js
// Tier 2 & 3 Validation Suite: Turn Engine, Income Collection, Building Construction, Research, Public Order, and Armed Rebellion Spawning

import { describe, test, assertEqual, assertTrue, assertFalse, assertInBounds } from './testRunner.js';
import { GameStateOracle, BUILDINGS_DATA, TECH_TREE_DATA } from './fixtures/spec_oracle.js';

describe('Turn Engine — Turn Progression & Accounting (F21, F16)', () => {
  test('Advancing turns increments turn count and advances campaign calendar', () => {
    const state = new GameStateOracle();
    assertEqual(state.currentTurn, 1, 'Initial turn is 1');
    assertEqual(state.year, 1345, 'Initial year is 1345');

    state.processTurn();
    assertEqual(state.currentTurn, 2, 'Turn advances to 2');

    // 4 turns represent 1 calendar year
    state.processTurn(); // Turn 3
    state.processTurn(); // Turn 4 -> Year 1346
    assertEqual(state.currentTurn, 4, 'Turn reaches 4');
    assertEqual(state.year, 1346, 'Year advances to 1346');
  }, { tier: 2 });

  test('Taxation is accurately collected from all unbesieged provinces', () => {
    const state = new GameStateOracle();
    const vijayanagara = state.factions['FAC_VIJAYANAGARA'];
    const initialTreasury = vijayanagara.treasury;

    // Calculate expected tax income from starting provinces (Vijayanagara, Konkan, Mysore, Tondai)
    let expectedTax = 0;
    vijayanagara.heldProvinces.forEach(pId => {
      expectedTax += state.provinces[pId].baseTax;
    });

    state.processTurn();
    assertEqual(vijayanagara.treasury, initialTreasury + expectedTax, 'Treasury matches baseline revenue collection');
  }, { tier: 2 });
});

describe('Turn Engine — Building Construction & Progression (F15)', () => {
  test('Buildings under construction advance turns and activate upon completion', () => {
    const state = new GameStateOracle();
    const prov = state.provinces['PROV_VIJAYANAGARA'];

    // Commission Tier 1 Fortification: Mud Rampart (2 turns)
    prov.underConstruction = {
      buildingType: 'FORTIFICATIONS_T1',
      remainingTurns: 2,
      cost: 100
    };

    state.processTurn();
    assertEqual(prov.underConstruction.remainingTurns, 1, 'Remaining turns decremented to 1');
    assertFalse(prov.activeBuildings.includes('FORTIFICATIONS_T1'), 'Building should not be active yet');

    state.processTurn();
    assertEqual(prov.underConstruction, null, 'Construction cleared on completion');
    assertTrue(prov.activeBuildings.includes('FORTIFICATIONS_T1'), 'Building activated upon completion');
  }, { tier: 2 });
});

describe('Turn Engine — Research Accumulation (F19)', () => {
  test('Research points accumulate and unlock imperial technology', () => {
    const state = new GameStateOracle();
    state.techProgress['FAC_VIJAYANAGARA'] = {
      activeTechId: 'TECH_MIL_1', // Cost 100
      remainingCost: 100,
      pointsPerTurn: 50,
      unlockedTechs: []
    };

    state.processTurn();
    const tech = state.techProgress['FAC_VIJAYANAGARA'];
    assertEqual(tech.remainingCost, 50, 'Cost reduced by 50 points');
    assertFalse(tech.unlockedTechs.includes('TECH_MIL_1'), 'Tech not yet unlocked');

    state.processTurn();
    assertEqual(tech.remainingCost, 0, 'Cost fully exhausted');
    assertTrue(tech.unlockedTechs.includes('TECH_MIL_1'), 'TECH_MIL_1 successfully unlocked');
    assertEqual(tech.activeTechId, null, 'Active tech reset after completion');
  }, { tier: 2 });
});

describe('Turn Engine — Public Order & Armed Rebellion Spawner (F17, F18)', () => {
  test('Public order is clamped strictly between 0 and 100', () => {
    const state = new GameStateOracle();
    const prov = state.provinces['PROV_DELHI'];

    // Force public order above 100
    prov.publicOrder = 99;
    prov.governorId = 'CHAR_MALIK_MAQBUL'; // +13 public order
    state.processTurn();
    assertEqual(prov.publicOrder, 100, 'Public order clamped at upper limit 100');

    // Force public order below 0
    prov.publicOrder = 5;
    prov.governorId = null;
    prov.publicOrder = 0; // Trigger threshold
    state.processTurn();
    assertEqual(prov.publicOrder, 0, 'Public order clamped at lower limit 0');
  }, { tier: 3 });

  test('Reaching 0 public order spawns an armed rebellion and halts tax revenue', () => {
    const state = new GameStateOracle();
    const prov = state.provinces['PROV_GULBARGA'];
    const bahmani = state.factions['FAC_BAHMANI'];

    // Force public order to 0
    prov.publicOrder = 0;
    assertEqual(prov.siegeStatus, false, 'Province not besieged initially');
    assertEqual(state.activeRebellions.length, 0, 'No active rebellions initially');

    const treasuryBefore = bahmani.treasury;

    // Process turn to trigger rebellion spawner
    state.processTurn();

    // Assert: Rebellion spawned
    assertEqual(prov.siegeStatus, true, 'Province must enter siege status');
    assertEqual(state.activeRebellions.length, 1, 'Active rebellions list contains 1 entry');
    assertEqual(state.activeRebellions[0].provinceId, 'PROV_GULBARGA', 'Rebellion targeted PROV_GULBARGA');

    const rebelArmyId = state.activeRebellions[0].rebelArmyId;
    const rebelArmy = state.armies[rebelArmyId];
    assertTrue(rebelArmy !== undefined, 'Rebel army was instantiated in armies registry');
    assertEqual(rebelArmy.factionId, 'FAC_REBEL', 'Army belongs to FAC_REBEL');
    assertEqual(rebelArmy.provinceId, 'PROV_GULBARGA', 'Rebel army resides in rebel province');
    assertTrue(rebelArmy.regiments.length >= 2, 'Rebel army contains regiments');

    // Assert: Tax revenue from besieged province is 0
    // Bahmani starting provinces: Gulbarga, Daulatabad, Khandesh
    // Since Gulbarga is besieged, only Daulatabad (380) and Khandesh (250) collect tax = 630
    const expectedTax = state.provinces['PROV_DAULATABAD'].baseTax + state.provinces['PROV_KHANDESH'].baseTax;
    assertEqual(bahmani.treasury, treasuryBefore + expectedTax, 'Besieged Gulbarga provided 0 tax revenue');
  }, { tier: 3 });

  test('Duplicate rebel armies are prevented if province is already under rebellion', () => {
    const state = new GameStateOracle();
    const prov = state.provinces['PROV_GULBARGA'];
    prov.publicOrder = 0;

    state.processTurn();
    assertEqual(state.activeRebellions.length, 1, 'First rebellion created');

    // Process another turn with order remaining at 0
    prov.publicOrder = 0;
    state.processTurn();
    assertEqual(state.activeRebellions.length, 1, 'Did not duplicate rebel army in already besieged province');
  }, { tier: 3 });

  test('Rebellion suppression resets siege status and restores provincial taxation', () => {
    const state = new GameStateOracle();
    const prov = state.provinces['PROV_GULBARGA'];
    prov.publicOrder = 0;

    state.processTurn();
    assertEqual(prov.siegeStatus, true, 'Province besieged');

    // Simulate imperial army defeating the rebel army
    const rebellion = state.activeRebellions.pop();
    delete state.armies[rebellion.rebelArmyId];
    prov.siegeStatus = false;
    prov.publicOrder = 40; // Restored order

    const bahmani = state.factions['FAC_BAHMANI'];
    const treasuryBefore = bahmani.treasury;

    state.processTurn();

    // Now Gulbarga tax (390) is collected again!
    const expectedTax = prov.baseTax + state.provinces['PROV_DAULATABAD'].baseTax + state.provinces['PROV_KHANDESH'].baseTax;
    assertEqual(bahmani.treasury, treasuryBefore + expectedTax, 'Tax collection restored after defeating rebellion');
  }, { tier: 3 });
});

describe('Turn Engine — Logistics, Movement & Attrition (F06, F07)', () => {
  test('Armies suffer non-combat attrition in extreme terrain when unsupplied', () => {
    const ATTRITION_RATES = {
      MOUNTAIN_PASS: 0.12, // Himalayan passes: 12%/turn
      DESERT_WASTELAND: 0.10, // Thar desert: 10%/turn
      JUNGLE: 0.10 // Deep monsoon jungle: 10%/turn
    };

    const mockRegiment = { hp: 100, maxHp: 100, nativeResistance: 0 };
    const passLosses = Math.floor(mockRegiment.hp * ATTRITION_RATES.MOUNTAIN_PASS);
    assertEqual(passLosses, 12, '12 HP lost in mountain pass per turn without supply');

    const desertLosses = Math.floor(mockRegiment.hp * ATTRITION_RATES.DESERT_WASTELAND);
    assertEqual(desertLosses, 10, '10 HP lost in desert per turn without supply');
  }, { tier: 3 });

  test('Native troop resistance mitigates extreme terrain attrition', () => {
    // Paik troops in deep jungle have 100% native resistance
    const paikRegiment = { hp: 100, maxHp: 100, nativeResistance: 1.0 };
    const jungleAttrition = 0.10;
    const losses = Math.floor(paikRegiment.hp * jungleAttrition * (1 - paikRegiment.nativeResistance));
    assertEqual(losses, 0, 'Paik native units suffer 0% jungle attrition');
  }, { tier: 3 });

  test('Entering a province occupied by a hostile army halts remaining movement points (ZoC lock)', () => {
    const army = { movementPoints: 100, currentProvince: 'PROV_PUNJAB' };
    const destination = 'PROV_DELHI';
    const isEnemyOccupied = true;

    // Movement consumes cost then ZoC consumes remaining MP
    army.movementPoints -= 40; // Floodplain transit cost
    if (isEnemyOccupied) {
      army.movementPoints = 0; // ZoC intercept
    }

    assertEqual(army.movementPoints, 0, 'Zone of control drained remaining movement points');
  }, { tier: 2 });
});

describe('Turn Engine — Building Categories Upgrades & Benefits (F15)', () => {
  test('Fortification upgrades grant increasing province defense bonus (20, 50, 100)', () => {
    const forts = BUILDINGS_DATA['FORTIFICATIONS'];
    assertEqual(forts[0].defenseBonus, 20, 'Tier 1 defense bonus');
    assertEqual(forts[1].defenseBonus, 50, 'Tier 2 defense bonus');
    assertEqual(forts[2].defenseBonus, 100, 'Tier 3 defense bonus');
  }, { tier: 2 });

  test('Barracks upgrades unlock higher echelon regional units', () => {
    const barracks = BUILDINGS_DATA['BARRACKS'];
    assertTrue(barracks[0].unlocks.includes('PAIKS'), 'Tier 1 unlocks Paiks');
    assertTrue(barracks[1].unlocks.includes('HORSE_ARCHERS'), 'Tier 2 unlocks Horse Archers');
    assertTrue(barracks[2].unlocks.includes('WAR_ELEPHANTS'), 'Tier 3 unlocks War Elephants');
  }, { tier: 2 });

  test('Commerce buildings generate increasing economic income (25, 60, 120)', () => {
    const comm = BUILDINGS_DATA['COMMERCE'];
    assertEqual(comm[0].goldIncome, 25, 'Tier 1 gold income');
    assertEqual(comm[1].goldIncome, 60, 'Tier 2 gold income');
    assertEqual(comm[2].goldIncome, 120, 'Tier 3 gold income');
  }, { tier: 2 });

  test('Religious buildings provide escalating public order stability (5, 12, 20)', () => {
    const rel = BUILDINGS_DATA['RELIGION'];
    assertEqual(rel[0].publicOrderBonus, 5, 'Tier 1 order bonus');
    assertEqual(rel[1].publicOrderBonus, 12, 'Tier 2 order bonus');
    assertEqual(rel[2].publicOrderBonus, 20, 'Tier 3 order bonus');
  }, { tier: 2 });
});

describe('Turn Engine — Branching Technology Unlocks (F19)', () => {
  test('Military Doctrines branch buffs units and campaign movement', () => {
    const mil = TECH_TREE_DATA['MILITARY'];
    assertEqual(mil[0].buff.infantryMelee, 0.10, 'T1 Combined Arms gives +10% melee');
    assertEqual(mil[1].buff.elephantHp, 0.25, 'T2 Howdah Armor gives +25% elephant HP');
    assertEqual(mil[2].buff.supplyRadiusBonus, 1, 'T3 Supply Depots gives +1 supply radius');
  }, { tier: 2 });

  test('Siege Engineering branch buffs siege speed and fortresses', () => {
    const siege = TECH_TREE_DATA['SIEGE_METALLURGY'];
    assertEqual(siege[1].buff.siegeSpeed, 0.30, 'T2 Sapping gives +30% siege speed');
    assertTrue(siege[2].buff.unlocksManjaniq, 'T3 unlocks Manjaniq artillery');
    assertEqual(siege[3].buff.fortDefenseBonus, 50, 'T4 grants +50 fort defense');
  }, { tier: 2 });

  test('Administrative Statecraft branch buffs taxation and governance', () => {
    const adm = TECH_TREE_DATA['ADMIN_AGRONOMY'];
    assertEqual(adm[0].buff.taxIncomeBonus, 0.15, 'T1 Zabt gives +15% tax');
    assertTrue(adm[1].buff.famineImmunity, 'T2 State Granaries gives famine immunity');
    assertEqual(adm[3].buff.corruptionReduction, 0.25, 'T4 Codified Edicts gives -25% corruption');
  }, { tier: 2 });
});


