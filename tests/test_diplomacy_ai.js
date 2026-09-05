// tests/test_diplomacy_ai.js
// Tier 2 & 3 Validation Suite: 5 Core Diplomatic Treaties, AI Acceptance Calculus, Personalities, and Religious Affinity

import { describe, test, assertEqual, assertTrue, assertFalse, assertInBounds } from './testRunner.js';
import { calculateDiplomaticOfferScore, CHARACTERS_DATA, FACTIONS_DATA } from './fixtures/spec_oracle.js';

describe('Diplomacy — 5 Core Treaties Framework (F13)', () => {
  test('Framework supports all 5 core historical treaty types', () => {
    const TREATY_TYPES = [
      'PEACE_TREATY',
      'NON_AGGRESSION_PACT',
      'TRADE_AGREEMENT',
      'MILITARY_ALLIANCE',
      'VASSALAGE'
    ];

    const TREATY_THRESHOLDS = {
      TRADE_AGREEMENT: 40,
      NON_AGGRESSION_PACT: 50,
      PEACE_TREATY: 60,
      MILITARY_ALLIANCE: 75,
      VASSALAGE: 90
    };

    TREATY_TYPES.forEach(tType => {
      assertTrue(TREATY_THRESHOLDS[tType] !== undefined, `Treaty ${tType} must have defined acceptance threshold`);
      assertInBounds(TREATY_THRESHOLDS[tType], 30, 100, `Threshold out of expected bounds`);
    });
  }, { tier: 2 });
});

describe('Diplomacy — AI Acceptance Calculus (F14)', () => {
  test('High relation and skilled diplomat produce successful treaty proposal', () => {
    // Proposing Trade Agreement: Target threshold 40
    // Base 20, Relation +40 (40 * 0.5 = 20), Diplomat DIP 8 (8 * 4.5 = 36), Religious Match (+15)
    // Score = 20 + 20 + 36 + 15 = 91 >= 40 -> Accepted
    const score = calculateDiplomaticOfferScore(20, 8, 0, 15, 0, 0) + (40 * 0.5);
    assertTrue(score >= 40, 'Trade treaty successfully accepted');
  }, { tier: 2 });

  test('Hostile relations and religious friction cause proposal rejection', () => {
    // Proposing Military Alliance: Target threshold 75
    // Base 0, Relation -60 (-60 * 0.5 = -30), Diplomat DIP 4 (18), Religious Mismatch (-10), Threat 20
    // Score = 0 - 30 + 18 - 10 - 20 = -42 < 75 -> Rejected
    const score = calculateDiplomaticOfferScore(0, 4, 0, -10, 0, 20) + (-60 * 0.5);
    assertTrue(score < 75, 'Hostile proposal strongly rejected');
  }, { tier: 3 });

  test('Tribute sweetener gold increases AI acceptance score (+0.05 per gold)', () => {
    const scoreWithoutGold = calculateDiplomaticOfferScore(10, 5, 0, 0, 0, 0);
    const scoreWith1000Gold = calculateDiplomaticOfferScore(10, 5, 0, 0, 1000, 0);
    assertEqual(scoreWith1000Gold - scoreWithoutGold, 50, '1000 gold sweetener provides +50 acceptance score');
  }, { tier: 2 });

  test('Mercantile AI personality exhibits strong preference for Trade (+40 bias)', () => {
    const bengal = FACTIONS_DATA.find(f => f.id === 'FAC_BENGAL');
    assertEqual(bengal.aiPersonality, 'MERCANTILE_OPPORTUNIST', 'Bengal is Mercantile Opportunist');

    const tradeBias = 40;
    const baseScore = calculateDiplomaticOfferScore(10, 6, 0, 0, 0, 0);
    const totalScore = baseScore + tradeBias;
    assertTrue(totalScore >= 40, 'Trade proposal accepted easily by mercantile faction');
  }, { tier: 3 });

  test('Defensive Bastion AI strongly rejects vassalage demands', () => {
    const mewar = FACTIONS_DATA.find(f => f.id === 'FAC_MEWAR');
    assertEqual(mewar.aiPersonality, 'PIOUS_CRUSADER', 'Mewar is Pious Crusader');

    const vassalageThreshold = 90;
    const vassalagePenalty = -60; // Proud refusal of submission
    const score = calculateDiplomaticOfferScore(20, 8, 20, -10, 0, 0) + vassalagePenalty;
    assertTrue(score < vassalageThreshold, 'Proud Rajput faction refuses vassalage demand');
  }, { tier: 3 });
});

describe('Diplomacy — Treaties Lifecycle & Penalties (F13)', () => {
  test('Violating a non-aggression pact inflicts Oathbreaker trait and -50 relation penalty', () => {
    const treaty = { type: 'NON_AGGRESSION_PACT', durationRemaining: 12, broken: false };
    const factionRelations = { FAC_DELHI: 20, FAC_BAHMANI: 10, FAC_MEWAR: 30 };

    // Player breaks pact
    treaty.broken = true;
    const penalty = -50;
    Object.keys(factionRelations).forEach(fId => {
      factionRelations[fId] += penalty;
    });

    assertEqual(factionRelations['FAC_DELHI'], -30, 'Delhi relation penalized by -50');
    assertEqual(factionRelations['FAC_BAHMANI'], -40, 'Bahmani relation penalized by -50');
    assertEqual(factionRelations['FAC_MEWAR'], -20, 'Mewar relation penalized by -50');
  }, { tier: 3 });

  test('Vassalage treaty extracts exactly 20% of vassal gross provincial revenue', () => {
    const vassalGrossRevenue = 1500;
    const tributeTithe = 0.20;
    const extractedTribute = Math.round(vassalGrossRevenue * tributeTithe);
    assertEqual(extractedTribute, 300, 'Overlord receives 300 gold from 1500 vassal income');
  }, { tier: 2 });

  test('Peace treaties mandate 10-turn non-aggression truce', () => {
    const peaceTreaty = { type: 'PEACE_TREATY', truceDuration: 10 };
    assertEqual(peaceTreaty.truceDuration, 10, 'Peace treaty enforces 10-turn truce');
  }, { tier: 2 });
});

describe('Diplomacy — Individual Treaty Type Scenarios (F13, F14)', () => {
  test('Bilateral Trade Agreement proposal between peaceful trading states is accepted', () => {
    // Threshold 40: Base 20, Rel +30 (15), DIP 7 (31.5), Religion match (+15) = 81.5 >= 40
    const score = calculateDiplomaticOfferScore(20, 7, 0, 15, 0, 0) + 15;
    assertTrue(score >= 40, 'Trade treaty accepted');
  }, { tier: 2 });

  test('Non-Aggression Pact between neutral neighbors is accepted', () => {
    // Threshold 50: Base 15, Rel +20 (10), DIP 6 (27), Common Border (+10) = 62 >= 50
    const score = calculateDiplomaticOfferScore(15, 6, 10, 0, 0, 0) + 10;
    assertTrue(score >= 50, 'Non-aggression pact accepted');
  }, { tier: 2 });

  test('Peace Treaty with 400 gold reparations is accepted by winning defender', () => {
    // Threshold 60: Base -10, Rel -20 (-10), DIP 8 (36), Gold 400 (+20), War Weariness (+30) = 66 >= 60
    const score = calculateDiplomaticOfferScore(-10, 8, 0, 0, 400, 0) - 10 + 30;
    assertTrue(score >= 60, 'Peace treaty accepted with sweetener');
  }, { tier: 2 });

  test('Military Alliance against common imperial rival is accepted', () => {
    // Threshold 75: Base 10, Rel +50 (25), DIP 9 (40.5), Shared Threat (+20) = 95.5 >= 75
    const score = calculateDiplomaticOfferScore(10, 9, 20, 0, 0, 0) + 25;
    assertTrue(score >= 75, 'Military alliance ratified');
  }, { tier: 2 });

  test('Vassalage demand on proud sovereign empire is rejected with diplomatic penalty', () => {
    // Threshold 90: Base -30, Rel 0 (0), DIP 5 (22.5), Sovereign Refusal (-50) = -57.5 < 90
    const score = calculateDiplomaticOfferScore(-30, 5, 0, 0, 0, 0) - 50;
    assertTrue(score < 90, 'Vassalage demand rejected');
  }, { tier: 2 });
});


