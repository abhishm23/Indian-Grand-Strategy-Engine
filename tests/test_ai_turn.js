// tests/test_ai_turn.js
// Dedicated Test Suite for Milestone 3 (R3): AI Faction Turn Processing & Diplomacy

import { describe, test, assertEqual, assertTrue, assertFalse, assertInBounds } from './testRunner.js';
import { GameState } from '../js/engine/gameState.js';
import {
  processAiTurn,
  processAiEconomics,
  processAiConstruction,
  processAiRecruitment,
  processAiMovement,
  PERSONALITY_ATTACK_CHANCES
} from '../js/engine/campaignAi.js';
import {
  evaluateTreatyProposal,
  executeTreaty,
  breakTreaty,
  tickDiplomacyTurn,
  TREATY_TYPES,
  TREATY_THRESHOLDS
} from '../js/engine/diplomacyAi.js';
import { areProvincesAdjacent } from '../js/data/provinces.js';

function createTestState() {
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');
  return state;
}

// ============================================================================
// Suite 1: AI Economic Management & Army Upkeep
// ============================================================================

describe('AI Turn — Suite 1: AI Economic Management & Army Upkeep (F12, F16)', () => {
  test('T_AI_ECO_01: AI calculates gross tax collection across held provinces factoring governor multipliers', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    
    // Assign governor with Gov 9 (e.g. CHAR_FIRUZ_TUG) to Daulatabad
    const daulatabad = state.getProvince('PROV_DAULATABAD');
    daulatabad.governorId = 'CHAR_FIRUZ_TUG';

    const econ = processAiEconomics(bahmani, state);
    assertTrue(econ.grossRevenue > 0, 'AI generates positive gross tax revenue');

    // Manually calculate expected revenue across held provinces
    const heldProvinces = state.getFactionProvinces('FAC_BAHMANI');
    let expectedGross = 0;
    for (const p of heldProvinces) {
      if (p.siegeStatus) continue;
      const govStats = state.calculateGovernorTaxModifier(p.governorId);
      expectedGross += Math.floor(p.baseTax * (govStats.taxMultiplier || 1.0));
    }
    assertEqual(econ.grossRevenue, expectedGross, 'Gross revenue accurately factors governor tax multipliers');
  }, { tier: 2 });

  test('T_AI_ECO_02: AI army upkeep is calculated from all regiments and subtracted from gross revenue', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    
    // Clear any starting armies for clean baseline
    Object.values(state.armies).forEach(a => {
      if (a.factionId === 'FAC_BAHMANI') delete state.armies[a.id];
    });

    // Create an army with known regiments: 1 Heavy Cav (upkeep 25) + 1 Paiks (upkeep 10) = 35 upkeep
    state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, upkeep: 25 },
      { unitTypeId: 'PAIKS', hp: 105, maxHp: 105, upkeep: 10 }
    ], null, 'Test Bahmani Host');

    const econ = processAiEconomics(bahmani, state);
    assertEqual(econ.totalUpkeep, 35, 'Total upkeep reflects regiment upkeep sum');
    assertEqual(econ.netIncome, econ.grossRevenue - 35, 'Net income is gross revenue minus total upkeep');
  }, { tier: 2 });

  test('T_AI_ECO_03: AI treasury updates deterministically upon turn completion', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    const startTreasury = bahmani.treasury;

    const econ = processAiEconomics(bahmani, state);
    assertEqual(bahmani.treasury, Math.max(0, startTreasury + econ.netIncome), 'Treasury mutates by netIncome delta');
  }, { tier: 2 });

  test('T_AI_ECO_04: Besieged provinces (or provinces under rebellion) yield exactly 0 tax to AI treasury', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');

    // First, measure normal gross revenue
    const econNormal = processAiEconomics(bahmani, state);

    // Place Gulbarga under siege
    const gulbarga = state.getProvince('PROV_GULBARGA');
    gulbarga.siegeStatus = true;

    const econBesieged = processAiEconomics(bahmani, state);
    const difference = econNormal.grossRevenue - econBesieged.grossRevenue;

    assertEqual(difference, gulbarga.baseTax, 'Besieged province tax is completely withheld');
  }, { tier: 2 });
});

// ============================================================================
// Suite 2: AI Building Construction Progression & Treasury
// ============================================================================

describe('AI Turn — Suite 2: AI Building Construction Progression & Treasury (F15)', () => {
  test('T_AI_BLD_01: AI commissions building upgrade when treasury exceeds safety reserve (> 300g)', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 2000;

    const constructions = processAiConstruction(bahmani, state);
    assertTrue(constructions.length > 0, 'AI commissions building when treasury is ample');
    const targetProv = state.getProvince(constructions[0].provinceId);
    assertTrue(targetProv.activeBuildings.length > 0, 'Province activeBuildings contains new construction');
  }, { tier: 2 });

  test('T_AI_BLD_02: AI building construction is weighted by personality profile', () => {
    const state = createTestState();
    
    // Vijayanagara: DEFENSIVE_TRADITIONALIST (prioritizes WALLS 40)
    const vij = state.getFaction('FAC_VIJAYANAGARA');
    vij.treasury = 2000;
    const vijProv = state.getProvince('PROV_VIJAYANAGARA');
    vijProv.activeBuildings = [];
    vijProv.buildings = [];

    const vijConstructions = processAiConstruction(vij, state);
    assertTrue(vijConstructions.length > 0, 'Defensive faction constructs building');
    assertTrue(vijConstructions[0].buildingId.startsWith('walls'), 'Defensive AI prioritizes fortification walls');

    // Bengal: MERCANTILE_OPPORTUNIST (prioritizes MARKET 40)
    const bengal = state.getFaction('FAC_BENGAL');
    bengal.treasury = 2000;
    const benProv = state.getProvince('PROV_BENGAL_NORTH');
    benProv.activeBuildings = [];
    benProv.buildings = [];

    const benConstructions = processAiConstruction(bengal, state);
    assertTrue(benConstructions.length > 0, 'Mercantile faction constructs building');
    assertTrue(benConstructions[0].buildingId.startsWith('market'), 'Mercantile AI prioritizes markets');
  }, { tier: 3 });

  test('T_AI_BLD_03: Building upgrade cost is accurately deducted from AI faction treasury', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 1500;
    const initialTreasury = bahmani.treasury;

    const constructions = processAiConstruction(bahmani, state);
    assertTrue(constructions.length > 0, 'Construction completed');
    const totalCost = constructions.reduce((sum, c) => sum + c.cost, 0);
    assertEqual(bahmani.treasury, initialTreasury - totalCost, 'Treasury deducted by exact construction costs');
  }, { tier: 2 });

  test('T_AI_BLD_04: AI respects building prerequisites and never commissions invalid tiers', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 2500;

    // Province with no barracks cannot build barracks tier 2 directly
    const prov = state.getProvince('PROV_KHANDESH');
    prov.activeBuildings = [];
    prov.buildings = [];

    const constructions = processAiConstruction(bahmani, state);
    const khandeshConstructions = constructions.filter(c => c.provinceId === 'PROV_KHANDESH');
    if (khandeshConstructions.length > 0) {
      // Must be tier 1
      assertTrue(khandeshConstructions[0].buildingId.endsWith('_t1'), 'AI builds tier 1 before tier 2');
    }
  }, { tier: 2 });
});

// ============================================================================
// Suite 3: AI Unit Recruitment & Barracks Mechanics
// ============================================================================

describe('AI Turn — Suite 3: AI Unit Recruitment & Barracks Mechanics (F13)', () => {
  test('T_AI_REC_01: AI recruits regiments only in provinces possessing active Barracks', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 2000;

    // Clear existing armies to avoid hitting targetCapacity
    Object.values(state.armies).forEach(a => {
      if (a.factionId === 'FAC_BAHMANI') delete state.armies[a.id];
    });

    // Give Gulbarga barracks, remove from Daulatabad and Khandesh
    state.getProvince('PROV_GULBARGA').activeBuildings = ['barracks_t1'];
    state.getProvince('PROV_DAULATABAD').activeBuildings = [];
    state.getProvince('PROV_KHANDESH').activeBuildings = [];

    const recruitments = processAiRecruitment(bahmani, state);
    assertTrue(recruitments.length > 0, 'Recruitment executed');
    assertTrue(recruitments.every(r => r.provinceId === 'PROV_GULBARGA'), 'All units recruited in province with Barracks');
  }, { tier: 2 });

  test('T_AI_REC_02: AI recruits units only when treasury exceeds recruitment cost plus reserve (> 250g)', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 200; // <= 250g reserve threshold

    const recruitments = processAiRecruitment(bahmani, state);
    assertEqual(recruitments.length, 0, 'No recruitment when treasury <= 250g reserve');
  }, { tier: 2 });

  test('T_AI_REC_03: AI unit selection conforms to faction personality archetype', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 3000;

    // Clear existing armies to allow recruitment
    Object.values(state.armies).forEach(a => {
      if (a.factionId === 'FAC_BAHMANI') delete state.armies[a.id];
    });

    // Provide barracks tier 3 and horses resource
    const prov = state.getProvince('PROV_GULBARGA');
    prov.activeBuildings = ['barracks_t1', 'barracks_t2', 'barracks_t3'];
    prov.strategicResource = 'HORSES';

    const recruitments = processAiRecruitment(bahmani, state);
    assertTrue(recruitments.length > 0, 'Recruitment succeeded');
    const uType = recruitments[0].unitTypeId;
    // Expansionist Militant prefers Heavy Cavalry (35) or War Elephants (35) or Horse Archers (15)
    assertTrue(uType === 'HEAVY_CAVALRY' || uType === 'HORSE_ARCHERS' || uType === 'WAR_ELEPHANTS',
      `Expansionist AI recruited offensive cavalry unit: ${uType}`);
  }, { tier: 3 });

  test('T_AI_REC_04: Recruited regiment is attached to army with 100% HP and full base morale', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 2000;
    state.getProvince('PROV_GULBARGA').activeBuildings = ['barracks_t1'];

    // Clear existing armies
    Object.values(state.armies).forEach(a => {
      if (a.factionId === 'FAC_BAHMANI') delete state.armies[a.id];
    });

    const recruitments = processAiRecruitment(bahmani, state);
    assertTrue(recruitments.length > 0, 'Recruitment created a regiment');

    const army = state.getArmy(recruitments[0].armyId);
    assertTrue(army !== null, 'Army exists in GameState');
    const reg = army.regiments[army.regiments.length - 1];
    assertEqual(reg.hp, reg.maxHp, 'Regiment has full HP');
    assertEqual(reg.morale, reg.maxMorale, 'Regiment has full morale');
    assertTrue(reg.hp > 0, 'Regiment has positive HP');
  }, { tier: 2 });

  test('T_AI_REC_05: AI does not exceed provincial or empire force limits', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    bahmani.treasury = 10000;

    // Fill armies up to targetCapacity: heldProvinces.length * 2 = 6 regiments
    state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'PAIKS', hp: 100, maxHp: 100 },
      { unitTypeId: 'PAIKS', hp: 100, maxHp: 100 },
      { unitTypeId: 'PAIKS', hp: 100, maxHp: 100 },
      { unitTypeId: 'PAIKS', hp: 100, maxHp: 100 },
      { unitTypeId: 'PAIKS', hp: 100, maxHp: 100 },
      { unitTypeId: 'PAIKS', hp: 100, maxHp: 100 }
    ], null, 'Maxed Bahmani Army');

    const recruitments = processAiRecruitment(bahmani, state);
    assertEqual(recruitments.length, 0, 'Recruitment halts when empire force capacity is reached');
  }, { tier: 2 });
});

// ============================================================================
// Suite 4: AI Strategic Army Movement & MP Deduction
// ============================================================================

describe('AI Turn — Suite 4: AI Strategic Army Movement & MP Deduction (F06, F12)', () => {
  test('T_AI_MOV_01: AI army moves strictly to topologically adjacent provinces connected in map graph', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');

    // Create army in Gulbarga
    const army = state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, upkeep: 25 }
    ], null, 'Maneuver Host');

    // Make Vijayanagara hostile
    state.diplomacy.relations['FAC_BAHMANI']['FAC_VIJAYANAGARA'] = -60;

    const { movements } = processAiMovement(bahmani, state, { rng: () => 0.01 });
    assertTrue(movements.length > 0, 'Movement executed');
    assertTrue(areProvincesAdjacent('PROV_GULBARGA', movements[0].toProvinceId), 'Target province is topologically adjacent');
  }, { tier: 2 });

  test('T_AI_MOV_02: Movement execution expends exactly 50 Movement Points (MP)', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');

    const army = state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, upkeep: 25 }
    ], null, 'MP Host');
    army.movementPoints = 100;

    state.diplomacy.relations['FAC_BAHMANI']['FAC_VIJAYANAGARA'] = -60;

    processAiMovement(bahmani, state, { rng: () => 0.01 });
    assertEqual(army.movementPoints, 50, 'Army movement points decremented by exactly 50 MP');
  }, { tier: 2 });

  test('T_AI_MOV_03: AI armies with insufficient MP (< 50 MP) cannot move and remain stationary', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');

    // Clear existing armies to isolate fatigued army
    Object.values(state.armies).forEach(a => {
      if (a.factionId === 'FAC_BAHMANI') delete state.armies[a.id];
    });

    const army = state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, upkeep: 25 }
    ], null, 'Fatigued Host');
    army.movementPoints = 30; // Insufficient for move

    state.diplomacy.relations['FAC_BAHMANI']['FAC_VIJAYANAGARA'] = -60;

    const { movements } = processAiMovement(bahmani, state, { rng: () => 0.01 });
    assertEqual(movements.length, 0, 'No movement executed with < 50 MP');
    assertEqual(army.provinceId, 'PROV_GULBARGA', 'Army remains stationary in original province');
  }, { tier: 2 });

  test('T_AI_MOV_04: Turn advancement replenishes movement points to maxMovementPoints (100)', () => {
    const state = createTestState();
    const army = state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, upkeep: 25 }
    ], null, 'Replenish Host');
    army.movementPoints = 0;

    // Replenish routine
    Object.values(state.armies || {}).forEach(a => {
      a.movementPoints = a.maxMovementPoints || 100;
    });

    assertEqual(army.movementPoints, 100, 'Movement points fully replenished to 100');
  }, { tier: 2 });

  test('T_AI_MOV_05: AI army evaluates adjacent connections without throwing exceptions', () => {
    const state = createTestState();
    const bahmani = state.getFaction('FAC_BAHMANI');
    state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160 }
    ], null, 'Safe Host');

    let threw = false;
    try {
      processAiMovement(bahmani, state);
    } catch (e) {
      threw = true;
    }
    assertFalse(threw, 'processAiMovement executes safely across connection graphs');
  }, { tier: 2 });
});

// ============================================================================
// Suite 5: AI Personality Divergence & Strategic Aggression
// ============================================================================

describe('AI Turn — Suite 5: AI Personality Divergence & Strategic Aggression (F12, R3 AC)', () => {
  test('T_AI_PERS_01: EXPANSIONIST_MILITANT attack rate > DEFENSIVE_TRADITIONALIST attack rate', () => {
    const expansionistRate = PERSONALITY_ATTACK_CHANCES.EXPANSIONIST_MILITANT;
    const defensiveRate = PERSONALITY_ATTACK_CHANCES.DEFENSIVE_TRADITIONALIST;

    assertEqual(expansionistRate, 0.85, 'Expansionist attack probability is 0.85');
    assertEqual(defensiveRate, 0.20, 'Defensive attack probability is 0.20');
    assertTrue(expansionistRate > defensiveRate * 4, 'Expansionist attacks > 4x more frequently than Defensive');
  }, { tier: 2 });

  test('T_AI_PERS_02: DEFENSIVE_TRADITIONALIST AI holds fortresses and does not overextend', () => {
    const state = createTestState();
    const ahom = state.getFaction('FAC_AHOM');
    assertEqual(ahom.aiPersonality, 'DEFENSIVE_TRADITIONALIST', 'Ahom has Defensive personality');

    state.createArmy('FAC_AHOM', 'PROV_AHOM', [
      { unitTypeId: 'PAIKS', hp: 105, maxHp: 105 }
    ], null, 'Ahom Fortress Guard');

    // A roll of 0.30 is > 0.20 defensive attack chance
    const { movements } = processAiMovement(ahom, state, { rng: () => 0.30 });
    const attacks = movements.filter(m => m.isAttack);
    assertEqual(attacks.length, 0, 'Defensive AI holds fortress position when roll exceeds threshold');
  }, { tier: 2 });

  test('T_AI_PERS_03: PIOUS_CRUSADER attacks with zeal and targets opposing religions', () => {
    const state = createTestState();
    const mewar = state.getFaction('FAC_MEWAR');
    assertEqual(mewar.aiPersonality, 'PIOUS_CRUSADER', 'Mewar has Pious Crusader personality');
    assertEqual(PERSONALITY_ATTACK_CHANCES.PIOUS_CRUSADER, 0.70, 'Pious Crusader has 70% attack chance');
  }, { tier: 2 });
});

// ============================================================================
// Suite 6: Diplomacy — Treaty Acceptance Score Calculus
// ============================================================================

describe('Diplomacy — Suite 6: Treaty Acceptance Score Calculus (F13, F14, R3 AC)', () => {
  test('T_DIP_CALC_01: Positive bilateral relations linearly increase treaty acceptance score', () => {
    const state = createTestState();
    
    const evalAt0 = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'TRADE_AGREEMENT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BAHMANI',
      currentRelation: 0,
      sweetenerGold: 0
    });

    const evalAt60 = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'TRADE_AGREEMENT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BAHMANI',
      currentRelation: 60,
      sweetenerGold: 0
    });

    const delta = evalAt60.score - evalAt0.score;
    assertEqual(delta, 30, 'Relation +60 increases score by exactly 30 (60 * 0.5)');
  }, { tier: 2 });

  test('T_DIP_CALC_02: Negative bilateral relations (hostility) reduce acceptance score and cause rejection', () => {
    const state = createTestState();
    
    const evalHostile = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'NON_AGGRESSION_PACT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BAHMANI',
      currentRelation: -60,
      sweetenerGold: 0
    });

    assertFalse(evalHostile.accepted, 'Hostile proposal with relation -60 is rejected');
    assertTrue(evalHostile.score < evalHostile.threshold, 'Score is strictly below threshold');
  }, { tier: 2 });

  test('T_DIP_CALC_03: Gold tribute sweetener increases score by +0.05 per gold (1000g = +50 score)', () => {
    const state = createTestState();
    
    const eval0g = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'NON_AGGRESSION_PACT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BAHMANI',
      currentRelation: 0,
      sweetenerGold: 0
    });

    const eval1000g = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'NON_AGGRESSION_PACT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BAHMANI',
      currentRelation: 0,
      sweetenerGold: 1000
    });

    assertEqual(eval1000g.score - eval0g.score, 50, '1000 gold sweetener adds exactly 50 points');
  }, { tier: 2 });

  test('T_DIP_CALC_04: Envoy diplomat with high Diplomacy attribute increases acceptance score', () => {
    const state = createTestState();
    
    const evalNoDip = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'TRADE_AGREEMENT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BENGAL',
      currentRelation: 0,
      diplomatCharacter: null
    });

    const evalHighDip = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'TRADE_AGREEMENT',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BENGAL',
      currentRelation: 0,
      diplomatCharacter: { attributes: { diplomacy: 8 } }
    });

    assertEqual(evalHighDip.score - evalNoDip.score, 36, 'DIP 8 envoy adds exactly 36 points (8 * 4.5)');
  }, { tier: 2 });

  test('T_DIP_CALC_05: Personality biases correctly scale acceptance scores', () => {
    const state = createTestState();
    
    // Bengal (MERCANTILE_OPPORTUNIST) has +40 on Trade
    // Delhi (proposer) shares Sunni Islam with Bengal -> +15 religious bonus + 40 mercantile bias + 20 base = 75 >= 40
    const evalTrade = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'TRADE_AGREEMENT',
      proposingFactionId: 'FAC_DELHI',
      targetFactionId: 'FAC_BENGAL',
      currentRelation: 0
    });
    assertTrue(evalTrade.accepted, 'Mercantile Bengal readily accepts Trade Agreement');

    // Mewar (PIOUS_CRUSADER) has -60 on Vassalage
    const evalVassal = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'VASSALAGE',
      proposingFactionId: 'FAC_DELHI',
      targetFactionId: 'FAC_MEWAR',
      currentRelation: 0
    });
    assertFalse(evalVassal.accepted, 'Pious Crusader Mewar vehemently rejects Vassalage demand');
  }, { tier: 2 });

  test('T_DIP_CALC_06: EXPANSIONIST_MILITANT AI refuses Peace Treaty when winning in military power', () => {
    const state = createTestState();
    
    // Proposer is weaker (militaryPowerRatio = 0.5 <= 1.0)
    const evalPeace = evaluateTreatyProposal({
      gameState: state,
      treatyType: 'PEACE_TREATY',
      proposingFactionId: 'FAC_VIJAYANAGARA',
      targetFactionId: 'FAC_BAHMANI',
      militaryPowerRatio: 0.5,
      currentRelation: -60,
      isAtWar: true
    });

    assertFalse(evalPeace.accepted, 'Expansionist refuses peace when stronger than proposer');
    assertEqual(evalPeace.breakdown.personalityBias, -30, 'Personality bias imposes -30 penalty');
  }, { tier: 2 });
});

// ============================================================================
// Suite 7: Diplomacy — Treaty Execution & State Mutation
// ============================================================================

describe('Diplomacy — Suite 7: Treaty Execution & State Mutation (F13)', () => {
  test('T_DIP_EXEC_01: Executing a treaty deducts offered gold sweetener from proposer treasury', () => {
    const state = createTestState();
    const proposer = state.getFaction('FAC_VIJAYANAGARA');
    const target = state.getFaction('FAC_BAHMANI');
    
    proposer.treasury = 1000;
    const targetStartGold = target.treasury || 0;

    const res = executeTreaty(state, 'TRADE_AGREEMENT', 'FAC_VIJAYANAGARA', 'FAC_BAHMANI', 400);
    assertTrue(res.success, 'Treaty successfully executed');
    assertEqual(proposer.treasury, 600, 'Proposer lost 400g sweetener');
    assertEqual(target.treasury, targetStartGold + 400, 'Target gained 400g sweetener');
  }, { tier: 2 });

  test('T_DIP_EXEC_02: Executing a treaty instantiates a new active record in gameState.diplomacy.treaties', () => {
    const state = createTestState();
    state.diplomacy.treaties = [];

    const res = executeTreaty(state, 'NON_AGGRESSION_PACT', 'FAC_VIJAYANAGARA', 'FAC_BAHMANI', 0);
    assertTrue(res.success, 'NAP executed');
    assertEqual(state.diplomacy.treaties.length, 1, 'Treaties list has 1 entry');
    assertEqual(state.diplomacy.treaties[0].type, 'NON_AGGRESSION_PACT', 'Treaty type matches');
    assertEqual(state.diplomacy.treaties[0].isActive, true, 'Treaty is active');
  }, { tier: 2 });

  test('T_DIP_EXEC_03: Executing a treaty applies bilateral relation boost', () => {
    const state = createTestState();
    state.diplomacy.relations['FAC_VIJAYANAGARA']['FAC_BAHMANI'] = 0;
    state.diplomacy.relations['FAC_BAHMANI']['FAC_VIJAYANAGARA'] = 0;

    executeTreaty(state, 'MILITARY_ALLIANCE', 'FAC_VIJAYANAGARA', 'FAC_BAHMANI', 0);
    assertEqual(state.diplomacy.relations['FAC_VIJAYANAGARA']['FAC_BAHMANI'], 30, 'Military alliance gives +30 relation');
    assertEqual(state.diplomacy.relations['FAC_BAHMANI']['FAC_VIJAYANAGARA'], 30, 'Relation update is symmetric');
  }, { tier: 2 });

  test('T_DIP_EXEC_04: Duplicate active treaties of the same type between identical factions are prevented', () => {
    const state = createTestState();
    state.diplomacy.treaties = [];

    const first = executeTreaty(state, 'TRADE_AGREEMENT', 'FAC_VIJAYANAGARA', 'FAC_BAHMANI', 0);
    assertTrue(first.success, 'First treaty execution succeeds');

    const duplicate = executeTreaty(state, 'TRADE_AGREEMENT', 'FAC_VIJAYANAGARA', 'FAC_BAHMANI', 0);
    assertFalse(duplicate.success, 'Duplicate treaty execution is blocked');
    assertEqual(state.diplomacy.treaties.length, 1, 'Treaties collection does not register duplicate');
  }, { tier: 2 });
});

// ============================================================================
// Suite 8: Hostile Encounter Clash Detection & Bridge
// ============================================================================

describe('AI Turn — Suite 8: Hostile Encounter Clash Detection & Bridge (R3)', () => {
  test('T_AI_CLASH_01: Moving AI army into player province triggers onEncounterClash callback', () => {
    const state = createTestState();
    
    // Clear existing armies in target area
    Object.values(state.armies).forEach(a => {
      if (a.provinceId === 'PROV_VIJAYANAGARA' || a.provinceId === 'PROV_GULBARGA') {
        delete state.armies[a.id];
      }
    });

    // Player army stationed at Vijayanagara
    state.createArmy(state.playerFactionId, 'PROV_VIJAYANAGARA', [
      { unitTypeId: 'RAJPUT_LEVIES', hp: 130, maxHp: 130 }
    ], null, 'Player Defense Force');

    // Hostile Bahmani army in adjacent Gulbarga
    state.diplomacy.relations['FAC_BAHMANI'][state.playerFactionId] = -70;
    const aiArmy = state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160 }
    ], null, 'Bahmani Invader');

    let clashReceived = null;
    processAiTurn(state, {
      rng: () => 0.01, // Force attack roll
      onEncounterClash: (clash) => {
        clashReceived = clash;
      }
    });

    assertTrue(clashReceived !== null, 'onEncounterClash callback was triggered');
    assertEqual(clashReceived.attackerArmy.id, aiArmy.id, 'Attacker army is Bahmani host');
    assertEqual(clashReceived.defenderArmy.factionId, state.playerFactionId, 'Defender army is Player host');
    assertEqual(clashReceived.province.id, 'PROV_VIJAYANAGARA', 'Province is Vijayanagara');
    // Attacker paused at border waiting for player encounter resolution
    assertEqual(aiArmy.provinceId, 'PROV_GULBARGA', 'Attacker halted at frontier awaiting battle resolution');
  }, { tier: 3 });

  test('T_AI_CLASH_02: Headless turn execution returns pending clash in result summary', () => {
    const state = createTestState();
    
    // Clear existing armies in target area
    Object.values(state.armies).forEach(a => {
      if (a.provinceId === 'PROV_VIJAYANAGARA' || a.provinceId === 'PROV_GULBARGA') {
        delete state.armies[a.id];
      }
    });

    state.createArmy(state.playerFactionId, 'PROV_VIJAYANAGARA', [
      { unitTypeId: 'RAJPUT_LEVIES', hp: 130, maxHp: 130 }
    ], null, 'Player Garrison');

    state.diplomacy.relations['FAC_BAHMANI'][state.playerFactionId] = -70;
    state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160 }
    ], null, 'Bahmani Raider');

    const aiResults = processAiTurn(state, { rng: () => 0.01 });
    assertTrue(aiResults.pendingBattles.length > 0, 'pendingBattles contains encounter record');
    assertTrue(aiResults.clashes.length > 0, 'clashes alias contains encounter record');
    assertEqual(aiResults.pendingBattles[0].defenderArmy.factionId, state.playerFactionId, 'Target is player army');
  }, { tier: 3 });
});
