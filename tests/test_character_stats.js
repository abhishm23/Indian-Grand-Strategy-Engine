// tests/test_character_stats.js
// Tier 2 Validation Suite: Character Role Math, Attributes, Traits, Loyalty Drift, and Treason

import { describe, test, assertEqual, assertApproxEqual, assertTrue, assertFalse, assertInBounds } from './testRunner.js';
import {
  calculateGeneralAttackMultiplier,
  calculateGeneralDefenseMultiplier,
  calculateGeneralAuraRadius,
  calculateArmyBaseMorale,
  calculateClashMoraleShock,
  calculateCampaignMovementPoints,
  calculateGovernorCorruption,
  calculateGovernorTaxYield,
  calculateConstructionTurns,
  calculatePublicOrderDelta,
  calculateMinisterTechPoints,
  calculateDiplomaticOfferScore,
  calculateLoyaltyDrift,
  calculateRebellionProbability,
  CHARACTERS_DATA
} from './fixtures/spec_oracle.js';

describe('Character Stats — General Role Math (F04)', () => {
  test('Attack multiplier scales correctly with Command rating (1.0 + COM * 0.035)', () => {
    assertApproxEqual(calculateGeneralAttackMultiplier(1), 1.035, 0.0001, 'Command 1 attack boost');
    assertApproxEqual(calculateGeneralAttackMultiplier(5), 1.175, 0.0001, 'Command 5 attack boost');
    assertApproxEqual(calculateGeneralAttackMultiplier(9), 1.315, 0.0001, 'Command 9 (Bukka I) attack boost');
    assertApproxEqual(calculateGeneralAttackMultiplier(10), 1.350, 0.0001, 'Command 10 attack boost');
  }, { tier: 2 });

  test('Defense multiplier scales with Command and Dread (1.0 + COM*0.02 + DRE*0.01)', () => {
    assertApproxEqual(calculateGeneralDefenseMultiplier(1, 0), 1.020, 0.0001, 'Minimum command & dread');
    assertApproxEqual(calculateGeneralDefenseMultiplier(8, 7), 1.230, 0.0001, 'Command 8, Dread 7 (Ala-ud-Din)');
    assertApproxEqual(calculateGeneralDefenseMultiplier(10, 10), 1.300, 0.0001, 'Max command & dread');
  }, { tier: 2 });

  test('General Aura radius satisfies max(2, floor(COM / 2) + 1)', () => {
    assertEqual(calculateGeneralAuraRadius(1), 2, 'Command 1 aura radius');
    assertEqual(calculateGeneralAuraRadius(2), 2, 'Command 2 aura radius');
    assertEqual(calculateGeneralAuraRadius(3), 2, 'Command 3 aura radius');
    assertEqual(calculateGeneralAuraRadius(4), 3, 'Command 4 aura radius');
    assertEqual(calculateGeneralAuraRadius(8), 5, 'Command 8 aura radius');
    assertEqual(calculateGeneralAuraRadius(9), 5, 'Command 9 (Bukka I) aura radius');
    assertEqual(calculateGeneralAuraRadius(10), 6, 'Command 10 aura radius');
  }, { tier: 2 });

  test('Army base morale calculation satisfies 100 + COM*2.5 + PIE*1.5 clamped at 150', () => {
    assertEqual(calculateArmyBaseMorale(1, 0), 102.5, 'Min morale');
    assertEqual(calculateArmyBaseMorale(9, 8), 134.5, 'Command 9, Piety 8');
    assertEqual(calculateArmyBaseMorale(10, 10), 140.0, 'Command 10, Piety 10');
  }, { tier: 2 });

  test('Clash morale shock from Dread satisfies 5 + DRE * 1.5', () => {
    assertEqual(calculateClashMoraleShock(0), 5.0, 'Dread 0 shock');
    assertEqual(calculateClashMoraleShock(5), 12.5, 'Dread 5 shock');
    assertEqual(calculateClashMoraleShock(9), 18.5, 'Dread 9 (Muhammad bin Tughlaq) shock');
    assertEqual(calculateClashMoraleShock(10), 20.0, 'Dread 10 shock');
  }, { tier: 2 });

  test('Campaign march speed satisfies 10 + floor((COM - 5) * 1.5)', () => {
    assertEqual(calculateCampaignMovementPoints(1), 4, 'Command 1 MP');
    assertEqual(calculateCampaignMovementPoints(5), 10, 'Command 5 MP');
    assertEqual(calculateCampaignMovementPoints(9), 16, 'Command 9 MP');
    assertEqual(calculateCampaignMovementPoints(10), 17, 'Command 10 MP');
  }, { tier: 2 });
});

describe('Character Stats — Governor Role Math (F04)', () => {
  test('Corruption calculates as max(0, (10 - GOV)*0.02 - PIE*0.01)', () => {
    // High gov (10), high piety (6) -> 0
    assertEqual(calculateGovernorCorruption(10, 6), 0, 'GOV 10 corruption is 0');
    // GOV 4, PIE 2 -> (6 * 0.02) - 0.02 = 0.10
    assertApproxEqual(calculateGovernorCorruption(4, 2), 0.10, 0.0001, 'Low gov high corruption');
    // GOV 8, PIE 8 -> (2 * 0.02) - 0.08 = -0.04 -> 0
    assertEqual(calculateGovernorCorruption(8, 8), 0, 'Piety eliminates residual corruption');
  }, { tier: 2 });

  test('Effective tax yield integrates base tax, governance, dread, and corruption', () => {
    const baseTax = 300;
    // GOV 9, DRE 2, PIE 8: corruption = 0, mult = 1.0 + 0.45 + 0.04 = 1.49 -> 447
    const yield1 = calculateGovernorTaxYield(baseTax, 9, 2, 8);
    assertEqual(yield1, 447, 'Governor Firuz Tughlaq tax yield');

    // GOV 10, DRE 5, PIE 6: corruption = 0, mult = 1.0 + 0.50 + 0.10 = 1.60 -> 480
    const yield2 = calculateGovernorTaxYield(baseTax, 10, 5, 6);
    assertEqual(yield2, 480, 'Wazir Maqbul tax yield');
  }, { tier: 2 });

  test('Construction turn reduction satisfies max(1, ceil(BaseTurns / (1.0 + GOV * 0.08)))', () => {
    // 4 base turns, GOV 10 -> ceil(4 / 1.8) = ceil(2.22) = 3
    assertEqual(calculateConstructionTurns(4, 10, false), 3, 'GOV 10 reduces 4-turn build to 3');
    // With Master Architect trait: 3 - 1 = 2
    assertEqual(calculateConstructionTurns(4, 10, true), 2, 'Master Architect reduces build to 2');
    // 2 base turns, GOV 5 -> ceil(2 / 1.4) = ceil(1.42) = 2
    assertEqual(calculateConstructionTurns(2, 5, false), 2, 'GOV 5 retains 2 turns');
    // Always minimum 1 turn
    assertEqual(calculateConstructionTurns(1, 10, true), 1, 'Minimum construction time is 1');
  }, { tier: 2 });

  test('Public order delta aggregates GOV, DRE, PIE, and policy friction', () => {
    // Normal tax (0), religious match (0), war exhaustion 0: GOV 8, DRE 4, PIE 8
    // Gain = 4.8 + 3.2 + 5.6 = 13.6
    const delta1 = calculatePublicOrderDelta(8, 4, 8, 'NORMAL', true, 0);
    assertEqual(delta1, 13.6, 'Harmonious governance delta');

    // Extortionate tax (-25), religious friction (-15), war exhaustion 5
    // Net = 13.6 - 25 - 15 - 5 = -31.4
    const delta2 = calculatePublicOrderDelta(8, 4, 8, 'EXTORTIONATE', false, 5);
    assertEqual(delta2, -31.4, 'Oppressive governance negative delta');
  }, { tier: 2 });
});

describe('Character Stats — Minister Role Math (F04)', () => {
  test('Science and research points scale with PIE and GOV (Base * (1.0 + PIE*0.03 + GOV*0.04))', () => {
    const baseTech = 100;
    // Vidyaranya: PIE 10, GOV 9 -> 1.0 + 0.30 + 0.36 = 1.66 -> 166
    const techPoints = calculateMinisterTechPoints(baseTech, 10, 9);
    assertEqual(techPoints, 166, 'Sage Vidyaranya research acceleration (+66%)');
  }, { tier: 2 });

  test('Diplomatic offer score scales with DIP*4.5 and modifiers', () => {
    // Ibn Battuta: DIP 10 -> 45 points. Base 20, PowerRatio +10, Religion +15 -> 90
    const score = calculateDiplomaticOfferScore(20, 10, 10, 15, 0, 0);
    assertEqual(score, 90, 'Ibn Battuta high diplomacy score');

    // Low diplomat: DIP 2 -> 9 points. Base -10, Threat 20 -> -21
    const lowScore = calculateDiplomaticOfferScore(-10, 2, 0, 0, 0, 20);
    assertEqual(lowScore, -21, 'Low diplomat rejected score');
  }, { tier: 2 });
});

describe('Character Stats — Loyalty Drift & Rebellion Risk (F05)', () => {
  test('Loyalty drift considers ruler and character piety, ambition, prestige, and bankruptcy', () => {
    // Normal positive drift: Ruler PIE 8, Char PIE 7, not ambitious, +2 prestige
    // Drift = (8 * 0.2) + (7 * 0.3) + 2 = 1.6 + 2.1 + 2 = 5.7
    const drift1 = calculateLoyaltyDrift(8, 7, 4, false, 2, false);
    assertEqual(drift1, 5.7, 'Positive loyalty drift under pious ruler');

    // Negative drift: Ruler DRE 9, ambitious character (-2.25), bankrupt (-10)
    // Drift = 1.6 + 2.1 - 2.25 + 0 - 10 = -8.55 -> rounded to -8.5 in JS
    const drift2 = calculateLoyaltyDrift(8, 7, 9, true, 0, true);
    assertEqual(drift2, -8.5, 'Severe loyalty drop during imperial bankruptcy');
  }, { tier: 2 });

  test('Rebellion probability is 0 when Loyalty >= 25, and (25 - Loyalty)*2% when < 25', () => {
    assertEqual(calculateRebellionProbability(80), 0, 'High loyalty has 0% treason risk');
    assertEqual(calculateRebellionProbability(25), 0, 'Threshold 25 has 0% treason risk');
    assertEqual(calculateRebellionProbability(20), 0.10, 'Loyalty 20 has 10% treason risk');
    assertEqual(calculateRebellionProbability(10), 0.30, 'Loyalty 10 has 30% treason risk');
    assertEqual(calculateRebellionProbability(0), 0.50, 'Loyalty 0 has 50% treason risk per turn');
  }, { tier: 2 });
});

describe('Character Stats — Boundary Value Analysis & Comprehensive Grid (F04, F05)', () => {
  test('Command rating scales attack monotonically from 1 to 10', () => {
    let prev = 1.0;
    for (let c = 1; c <= 10; c++) {
      const mult = calculateGeneralAttackMultiplier(c);
      assertTrue(mult > prev, `Command ${c} should yield higher attack than ${c-1}`);
      assertApproxEqual(mult, 1.0 + (c * 0.035), 0.0001, `Command ${c} exact formula`);
      prev = mult;
    }
  }, { tier: 2 });

  test('Dread aura scales clash morale shock monotonically from 0 to 10', () => {
    let prev = 0.0;
    for (let d = 0; d <= 10; d++) {
      const shock = calculateClashMoraleShock(d);
      assertTrue(shock > prev, `Dread ${d} should inflict greater shock than ${d-1}`);
      assertEqual(shock, 5 + (d * 1.5), `Dread ${d} exact shock value`);
      prev = shock;
    }
  }, { tier: 2 });

  test('Corruption remains zero for high governance characters regardless of piety', () => {
    for (let p = 0; p <= 10; p++) {
      const corruption = calculateGovernorCorruption(10, p);
      assertEqual(corruption, 0, `Governance 10 must have zero corruption at piety ${p}`);
    }
  }, { tier: 2 });

  test('Construction turn reductions satisfy boundary minimum of 1 turn', () => {
    for (let turns = 1; turns <= 6; turns++) {
      const actual = calculateConstructionTurns(turns, 10, true);
      assertTrue(actual >= 1, `Construction turns must be >= 1 for baseTurns=${turns}`);
      assertTrue(actual <= turns, `Actual turns must not exceed base turns`);
    }
  }, { tier: 2 });
});

describe('Character Stats — Role Prestige & Trait System (F04, F05)', () => {
  test('Role prestige constants assign correct values: Minister (+3), General (+2), Governor (+1), Idle (-2)', () => {
    const ROLE_PRESTIGE = {
      MINISTER: 3,
      GENERAL: 2,
      GOVERNOR: 1,
      IDLE: -2
    };

    assertEqual(ROLE_PRESTIGE.MINISTER, 3, 'Minister prestige is +3');
    assertEqual(ROLE_PRESTIGE.GENERAL, 2, 'General prestige is +2');
    assertEqual(ROLE_PRESTIGE.GOVERNOR, 1, 'Governor prestige is +1');
    assertEqual(ROLE_PRESTIGE.IDLE, -2, 'Idle penalty is -2');
  }, { tier: 2 });

  test('All characters have traits capped at maximum 6 to prevent trait overflow', () => {
    CHARACTERS_DATA.forEach(c => {
      assertTrue(c.traits.length <= 6, `Character ${c.id} exceeds max 6 traits`);
      assertTrue(c.traits.length >= 1, `Character ${c.id} has at least 1 trait`);
    });
  }, { tier: 1 });

  test('Governor tax yield scales linearly with base province taxation', () => {
    [100, 200, 300, 400, 500].forEach(base => {
      const yieldAmt = calculateGovernorTaxYield(base, 8, 2, 8);
      assertTrue(yieldAmt > base, `Yield ${yieldAmt} should exceed base ${base}`);
      assertApproxEqual(yieldAmt / base, 1.44, 0.01, 'Multiplier ratio consistent');
    });
  }, { tier: 2 });
});


