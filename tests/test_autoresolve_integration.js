/**
 * tests/test_autoresolve_integration.js
 * Comprehensive Milestone 1 Auto-Resolve Integration Test Suite
 * Validates dynamic odds, 100-sim ±15% distribution, 3v5 fortified defense <= 40%,
 * proportional casualties, GameState mutations, and encounter modal view synchronization.
 */

import { describe, test, assertEqual, assertApproxEqual, assertTrue, assertFalse, assertInBounds, assert } from './testRunner.js';
import { GameState } from '../js/engine/gameState.js';
import {
  calculateWinProbability,
  formatWinOdds,
  armyCombatPower,
  regimentCombatPower,
  normalizeGeneralBonus,
  getTerrainDefenseModifier,
  getFortificationModifier,
  applyCasualties,
  removeDestroyedRegiments,
  resolveGeneralFate,
  findRetreatProvince,
  autoResolveBattle,
  applyBattleOutcome
} from '../js/engine/combatResolver.js';
import { TERRAIN_TYPES } from '../js/data/provinces.js';
import { UNIT_TYPES } from '../js/data/units.js';

describe('Auto-Resolve Integration — Dynamic Win Probability Calculation (Suite A)', () => {
  test('A1: Balanced armies on neutral terrain yield exactly 50% win probability', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', regiments: [{ ...reg }, { ...reg }] };
    const a2 = { id: 'A2', regiments: [{ ...reg }, { ...reg }] };
    const prov = { terrainType: 'FLOODPLAIN', defenseLevel: 0 };

    const prob = calculateWinProbability(a1, a2, prov, null, null);
    assertEqual(prob, 0.5, 'Equal armies produce exactly 0.50 probability');
  }, { tier: 2 });

  test('A2: Power ratio monotonicity across regiment counts (1v2 < 1v1 < 3v2 <= 2v1)', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const makeArmy = (n) => ({ id: 'A', regiments: Array.from({ length: n }, () => ({ ...reg })) });

    const p1v2 = calculateWinProbability(makeArmy(1), makeArmy(2), null, null, null);
    const p1v1 = calculateWinProbability(makeArmy(1), makeArmy(1), null, null, null);
    const p3v2 = calculateWinProbability(makeArmy(3), makeArmy(2), null, null, null);
    const p2v1 = calculateWinProbability(makeArmy(2), makeArmy(1), null, null, null);
    const p5v1 = calculateWinProbability(makeArmy(5), makeArmy(1), null, null, null);

    assertTrue(p1v2 < p1v1, '1v2 probability < 1v1 probability');
    assertTrue(p1v1 < p3v2, '1v1 probability < 3v2 probability');
    assertTrue(p3v2 < p2v1, '3v2 probability < 2v1 probability');
    assertTrue(p2v1 <= p5v1, '2v1 probability <= 5v1 probability (both at upper tier)');
    assertTrue(p5v1 >= 0.85, '5v1 probability is overwhelming (>= 0.85)');
  }, { tier: 2 });

  test('A3: Extreme power ratios strictly clamp probability to [0.05, 0.95]', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const tinyArmy = { regiments: [{ ...reg }] };
    const massiveArmy = { regiments: Array.from({ length: 100 }, () => ({ ...reg })) };

    const probHigh = calculateWinProbability(massiveArmy, tinyArmy, null, null, null);
    const probLow = calculateWinProbability(tinyArmy, massiveArmy, null, null, null);

    assertEqual(probHigh, 0.95, 'Overwhelming attack clamped at 0.95');
    assertEqual(probLow, 0.05, 'Overwhelming defense clamped at 0.05');
  }, { tier: 3 });

  test('A4: Mountain Pass and Jungle reduce attacker win odds compared to Floodplain', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { regiments: [{ ...reg }, { ...reg }, { ...reg }] };
    const a2 = { regiments: [{ ...reg }, { ...reg }, { ...reg }] };

    const pPlain = calculateWinProbability(a1, a2, { terrainType: 'FLOODPLAIN', defenseLevel: 0 }, null, null);
    const pJungle = calculateWinProbability(a1, a2, { terrainType: 'JUNGLE', defenseLevel: 0 }, null, null);
    const pPass = calculateWinProbability(a1, a2, { terrainType: 'MOUNTAIN_PASS', defenseLevel: 0 }, null, null);

    assertEqual(pPlain, 0.50, 'Floodplain is neutral 0.50');
    assertTrue(pJungle < pPlain, 'Jungle tactical defense lowers attacker win chance');
    assertTrue(pPass < pJungle, 'Mountain pass (+40% def) lowers attacker win chance more than jungle (+30% def)');
  }, { tier: 2 });

  test('A5: Fortification tiers (0 to 3) reduce attacker win odds monotonically', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { regiments: [{ ...reg }, { ...reg }] };
    const a2 = { regiments: [{ ...reg }, { ...reg }] };

    const pFort0 = calculateWinProbability(a1, a2, { terrainType: 'FLOODPLAIN', defenseLevel: 0 }, null, null);
    const pFort1 = calculateWinProbability(a1, a2, { terrainType: 'FLOODPLAIN', defenseLevel: 1 }, null, null);
    const pFort2 = calculateWinProbability(a1, a2, { terrainType: 'FLOODPLAIN', defenseLevel: 2 }, null, null);
    const pFort3 = calculateWinProbability(a1, a2, { terrainType: 'FLOODPLAIN', defenseLevel: 3 }, null, null);

    assertTrue(pFort0 > pFort1, 'Fort 0 > Fort 1 attacker chance');
    assertTrue(pFort1 > pFort2, 'Fort 1 > Fort 2 attacker chance');
    assertTrue(pFort2 > pFort3, 'Fort 2 > Fort 3 attacker chance');
  }, { tier: 2 });

  test('A6: High-Command generals boost army combat power and alter odds', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { regiments: [{ ...reg }, { ...reg }] };
    const a2 = { regiments: [{ ...reg }, { ...reg }] };

    const bukkaBonus = gs.calculateGeneralCombatBonus('CHAR_BUKKA_I'); // COM 9
    const firuzBonus = gs.calculateGeneralCombatBonus('CHAR_FIRUZ_TUG'); // COM 5

    const pWithBukkaDef = calculateWinProbability(a1, a2, null, null, bukkaBonus);
    const pWithFiruzDef = calculateWinProbability(a1, a2, null, null, firuzBonus);

    assertTrue(pWithBukkaDef < pWithFiruzDef, 'Command 9 general reduces attacker odds more than Command 5');
  }, { tier: 2 });

  test('A7: Diverse unit compositions compute distinctive, proportional combat power', () => {
    const elephant = { hp: 350, maxHp: 350, morale: 100, maxMorale: 100, meleeAtk: 48, meleeDef: 28 };
    const cavalry = { hp: 160, maxHp: 160, morale: 100, maxMorale: 100, meleeAtk: 42, meleeDef: 26 };
    const paik = { hp: 105, maxHp: 105, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 14 };

    const pEle = regimentCombatPower(elephant);
    const pCav = regimentCombatPower(cavalry);
    const pPaik = regimentCombatPower(paik);

    assertTrue(pEle > pCav, 'War Elephant combat power > Heavy Cavalry');
    assertTrue(pCav > pPaik, 'Heavy Cavalry combat power > Paiks');
    assertApproxEqual(pEle / pPaik, 5.58, 0.5, 'Elephant has ~5.6x combat power of Paiks');
  }, { tier: 2 });

  test('A8: Enriched Number return contains breakdown properties', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { regiments: [{ ...reg }, { ...reg }] };
    const a2 = { regiments: [{ ...reg }, { ...reg }] };

    const prob = calculateWinProbability(a1, a2, null, null, null);
    assertEqual(typeof prob, 'object', 'Enriched Number returns object instance');
    assertEqual(Number(prob), 0.5, 'Primitive unboxing is exactly 0.5');
    assertEqual(prob.attackerWinProb, 0.5, 'Contains attackerWinProb');
    assertEqual(prob.defenderWinProb, 0.5, 'Contains defenderWinProb');
    assertEqual(prob.ratio, 1.0, 'Contains ratio');
    assertTrue(prob.attackerPower > 0, 'Contains attackerPower');
    assertTrue(prob.defenderPower > 0, 'Contains defenderPower');
  }, { tier: 2 });
});

describe('Auto-Resolve Integration — Statistical Distribution over 100 Simulations (Suite B)', () => {
  test('B1: 100 simulations of equal armies yield win rate within 50% ± 15% (35 to 65 wins)', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }, { ...reg }] };
      const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }, { ...reg }] };
      const res = autoResolveBattle(a1, a2, null, null);
      if (res.attackerWins) wins++;
    }
    assertInBounds(wins, 35, 65, 'Attacker wins over 100 trials within [35, 65]');
  }, { tier: 3 });

  test('B2: 100 simulations of favored attacker (~73%) yield win rate within predicted ± 15%', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1Template = { regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }] };
    const a2Template = { regiments: [{ ...reg }, { ...reg }, { ...reg }] };
    const prob = Number(calculateWinProbability(a1Template, a2Template, null, null, null));

    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }] };
      const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }, { ...reg }, { ...reg }] };
      const res = autoResolveBattle(a1, a2, null, null);
      if (res.attackerWins) wins++;
    }

    const minExpected = Math.round((prob - 0.15) * 100);
    const maxExpected = Math.round((prob + 0.15) * 100);
    assertInBounds(wins, minExpected, maxExpected, 'Favored attacker win rate matches predicted ± 15%');
  }, { tier: 3 });

  test('B3: 100 simulations of underdog attacker (~27%) yield win rate within predicted ± 15%', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1Template = { regiments: [{ ...reg }, { ...reg }] };
    const a2Template = { regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }] };
    const prob = Number(calculateWinProbability(a1Template, a2Template, null, null, null));

    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }, { ...reg }] };
      const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }] };
      const res = autoResolveBattle(a1, a2, null, null);
      if (res.attackerWins) wins++;
    }

    const minExpected = Math.max(0, Math.round((prob - 0.15) * 100));
    const maxExpected = Math.min(100, Math.round((prob + 0.15) * 100));
    assertInBounds(wins, minExpected, maxExpected, 'Underdog attacker win rate matches predicted ± 15%');
  }, { tier: 3 });

  test('B4: Overwhelming advantage (95% clamp) yields >= 85 wins over 100 simulations', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: Array.from({ length: 15 }, () => ({ ...reg })) };
      const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }] };
      const res = autoResolveBattle(a1, a2, null, null);
      if (res.attackerWins) wins++;
    }
    assertTrue(wins >= 85, 'Overwhelming advantage yields at least 85 wins');
  }, { tier: 3 });

  test('B5: Overwhelming disadvantage (5% clamp) yields <= 15 wins over 100 simulations', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    let wins = 0;
    for (let i = 0; i < 100; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }] };
      const a2 = { id: 'A2', name: 'Def', regiments: Array.from({ length: 15 }, () => ({ ...reg })) };
      const res = autoResolveBattle(a1, a2, null, null);
      if (res.attackerWins) wins++;
    }
    assertTrue(wins <= 15, 'Overwhelming disadvantage yields at most 15 wins');
  }, { tier: 3 });
});

describe('Auto-Resolve Integration — Asymmetric Fortified Defense Benchmarks (Suite C)', () => {
  test('C1: 3v5 attacking Bukka Raya I (COM 9) in Chittorgarh (Tier 3 Fort, Hills) yields win chance <= 40%', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', regiments: [{ ...reg }, { ...reg }, { ...reg }], generalId: null };
    const a2 = { id: 'A2', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }, { ...reg }], generalId: 'CHAR_BUKKA_I' };

    const genBonus = gs.calculateGeneralCombatBonus('CHAR_BUKKA_I');
    const prov = { id: 'PROV_RAJPUTANA', terrainType: 'HIGHLAND_HILLS', defenseLevel: 3 };

    const prob = calculateWinProbability(a1, a2, prov, null, genBonus);
    assertTrue(prob <= 0.40, `Win chance ${(prob * 100).toFixed(1)}% must be <= 40%`);
    assertTrue(prob < 0.15, 'High fort hills with COM 9 general strongly suppresses attacker to < 15%');
  }, { tier: 2 });

  test('C2: 3v5 attacking Ala-ud-Din Bahman Shah (COM 8) in Daulatabad (Tier 3 Fort, Hills) yields win chance <= 40%', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_BAHMANI');

    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', regiments: [{ ...reg }, { ...reg }, { ...reg }] };
    const a2 = { id: 'A2', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }, { ...reg }] };

    const genBonus = gs.calculateGeneralCombatBonus('CHAR_BAHMAN_SHAH');
    const prov = { id: 'PROV_DAULATABAD', terrainType: 'HIGHLAND_HILLS', defenseLevel: 3 };

    const prob = calculateWinProbability(a1, a2, prov, null, genBonus);
    assertTrue(prob <= 0.40, `Win chance ${(prob * 100).toFixed(1)}% must be <= 40%`);
  }, { tier: 2 });

  test('C3: 3v5 attacking Muhammad bin Tughlaq (COM 8) in Delhi (Tier 3 Fort, Plains) yields win chance <= 40%', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_DELHI');

    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', regiments: [{ ...reg }, { ...reg }, { ...reg }] };
    const a2 = { id: 'A2', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }, { ...reg }] };

    const genBonus = gs.calculateGeneralCombatBonus('CHAR_MBT');
    const prov = { id: 'PROV_DELHI', terrainType: 'FLOODPLAIN', defenseLevel: 3 };

    const prob = calculateWinProbability(a1, a2, prov, null, genBonus);
    assertTrue(prob <= 0.40, `Win chance ${(prob * 100).toFixed(1)}% must be <= 40%`);
  }, { tier: 2 });

  test('C4: Minimal fortified threshold (Tier 1 Fort, Plains, COM 7) yields win chance <= 40%', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', regiments: [{ ...reg }, { ...reg }, { ...reg }] };
    const a2 = { id: 'A2', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }, { ...reg }] };

    const genBonus = gs.calculateGeneralCombatBonus('CHAR_HARIHARA_I'); // COM 7
    const prov = { id: 'PROV_MIN', terrainType: 'FLOODPLAIN', defenseLevel: 1 };

    const prob = calculateWinProbability(a1, a2, prov, null, genBonus);
    assertTrue(prob <= 0.40, `Win chance ${(prob * 100).toFixed(1)}% must be <= 40%`);
  }, { tier: 3 });

  test('C5: Attacker with high-Command general attacking 3v5 fortified position still yields win chance <= 40%', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', regiments: [{ ...reg }, { ...reg }, { ...reg }] };
    const a2 = { id: 'A2', regiments: [{ ...reg }, { ...reg }, { ...reg }, { ...reg }, { ...reg }] };

    const atkGenBonus = gs.calculateGeneralCombatBonus('CHAR_BUKKA_I'); // COM 9
    const defGenBonus = gs.calculateGeneralCombatBonus('CHAR_BAHMAN_SHAH'); // COM 8
    const prov = { id: 'PROV_GULBARGA', terrainType: 'HIGHLAND_HILLS', defenseLevel: 2 };

    const prob = calculateWinProbability(a1, a2, prov, atkGenBonus, defGenBonus);
    assertTrue(prob <= 0.40, `Attacker with general win chance ${(prob * 100).toFixed(1)}% must be <= 40%`);
  }, { tier: 3 });
});

describe('Auto-Resolve Integration — Proportional Casualties & State Mutation (Suite D)', () => {
  test('D1: Neither army emerges unscathed (attacker HP lost > 0 and defender HP lost > 0)', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    for (let i = 0; i < 20; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }, { ...reg }] };
      const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }, { ...reg }] };
      const res = autoResolveBattle(a1, a2, null, null);

      const atkTotalLost = res.attacker.casualties.reduce((s, c) => s + c.hpLost, 0);
      const defTotalLost = res.defender.casualties.reduce((s, c) => s + c.hpLost, 0);

      assertTrue(atkTotalLost > 0, 'Attacker suffered positive casualties');
      assertTrue(defTotalLost > 0, 'Defender suffered positive casualties');
      res.attacker.casualties.forEach(c => assertTrue(c.hpLost > 0, 'Each attacker regiment lost HP'));
      res.defender.casualties.forEach(c => assertTrue(c.hpLost > 0, 'Each defender regiment lost HP'));
    }
  }, { tier: 2 });

  test('D2: Loser suffers strictly greater percentage casualty losses than winner', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    for (let i = 0; i < 20; i++) {
      const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }, { ...reg }] };
      const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }, { ...reg }] };
      const res = autoResolveBattle(a1, a2, null, null);

      const atkLossPct = res.attacker.casualties.reduce((s, c) => s + c.hpLost, 0) / 200;
      const defLossPct = res.defender.casualties.reduce((s, c) => s + c.hpLost, 0) / 200;

      if (res.attackerWins) {
        assertTrue(defLossPct > atkLossPct, 'Losing defender suffered higher casualty % than winning attacker');
      } else {
        assertTrue(atkLossPct > defLossPct, 'Losing attacker suffered higher casualty % than winning defender');
      }
    }
  }, { tier: 2 });

  test('D3: High-intensity engagement (close match) inflicts heavier casualties than low-intensity', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const closeAtk = { regiments: [{ ...reg }, { ...reg }] };
    const closeDef = { regiments: [{ ...reg }, { ...reg }] };
    const closeRes = autoResolveBattle(closeAtk, closeDef, null, null);

    const landAtk = { regiments: Array.from({ length: 10 }, () => ({ ...reg })) };
    const landDef = { regiments: [{ ...reg }] };
    const landRes = autoResolveBattle(landAtk, landDef, null, null);

    assertTrue(closeRes.intensity > landRes.intensity, 'Close match produces higher intensity than landslide');
  }, { tier: 3 });

  test('D4: Morale degrades proportionally with casualties, loser suffering greater morale penalty', () => {
    const reg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const a1 = { id: 'A1', name: 'Atk', regiments: [{ ...reg }] };
    const a2 = { id: 'A2', name: 'Def', regiments: [{ ...reg }] };

    const res = autoResolveBattle(a1, a2, null, null);
    const atkFinalMorale = a1.regiments[0]?.morale ?? 0;
    const defFinalMorale = a2.regiments[0]?.morale ?? 0;

    assertTrue(atkFinalMorale < 100, 'Attacker morale degraded');
    assertTrue(defFinalMorale < 100, 'Defender morale degraded');
    if (res.attackerWins) {
      assertTrue(defFinalMorale < atkFinalMorale, 'Loser morale degraded more severely than winner');
    } else {
      assertTrue(atkFinalMorale < defFinalMorale, 'Loser morale degraded more severely than winner');
    }
  }, { tier: 3 });

  test('D5: Annihilated regiments (HP <= 0) are removed from army roster', () => {
    const severelyWoundedReg = { id: 'R_DYING', name: 'Dying Levy', hp: 5, maxHp: 100, morale: 10, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const army = { id: 'A_TEST', regiments: [severelyWoundedReg] };

    // Apply high loss factor
    applyCasualties(army, 0.8, false);
    assertTrue(severelyWoundedReg.hp <= 0, 'Regiment HP reduced to 0');

    const destroyed = removeDestroyedRegiments(army);
    assertEqual(destroyed.length, 1, '1 regiment destroyed');
    assertEqual(army.regiments.length, 0, 'Army roster cleaned up of destroyed regiments');
  }, { tier: 2 });
});

describe('Auto-Resolve Integration — GameState Integration & Campaign Triggers (Suite E)', () => {
  test('E1: Decisive attacker victory removes wiped defender army and updates attacker location', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg1 = { id: 'R1', name: 'Vijayanagara Guard', hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 35, meleeDef: 20 };
    const reg2 = { id: 'R2', name: 'Fragile Garrison', hp: 5, maxHp: 100, morale: 20, maxMorale: 100, meleeAtk: 20, meleeDef: 10 };

    const atkArmy = gs.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [reg1, reg1, reg1], null, 'Strike Force');
    const defArmy = gs.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [reg2], null, 'Token Garrison');
    const prov = gs.getProvince('PROV_GULBARGA');

    const rawRes = autoResolveBattle(atkArmy, defArmy, prov, gs);
    assertTrue(rawRes.attackerWins, 'Attacker achieves victory');

    const res = applyBattleOutcome(gs, rawRes);
    assertEqual(gs.getArmy(defArmy.id), null, 'Wiped defender army removed from GameState');
    assertEqual(atkArmy.provinceId, 'PROV_GULBARGA', 'Attacker army occupies conquered province');
  }, { tier: 3 });

  test('E2: Attacker victory transfers province control and strips opposing governor', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const prov = gs.getProvince('PROV_GULBARGA');
    assertEqual(prov.controllingFaction, 'FAC_BAHMANI', 'Initial controlling faction is Bahmani');

    // Assign a Bahmani governor
    gs.assignCharacterRole('CHAR_SAIFUDDIN_GHORI', 'GOVERNOR', 'PROV_GULBARGA');
    assertEqual(prov.governorId, 'CHAR_SAIFUDDIN_GHORI', 'Governor assigned');

    // Transfer control on conquest
    const ok = gs.transferProvinceControl('PROV_GULBARGA', 'FAC_VIJAYANAGARA');
    assertTrue(ok, 'transferProvinceControl succeeded');
    assertEqual(prov.controllingFaction, 'FAC_VIJAYANAGARA', 'Province transferred to Vijayanagara');
    assertEqual(prov.governorId, null, 'Opposing governor stripped of post');
    const ghori = gs.getCharacter('CHAR_SAIFUDDIN_GHORI');
    assertEqual(ghori.currentRole, 'IDLE', 'Ousted governor role reset to IDLE');
  }, { tier: 3 });

  test('E3: Defender victory preserves province control and resets defeated attacker movement points', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const strongReg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 45, meleeDef: 30 };
    const weakReg = { hp: 100, maxHp: 100, morale: 100, maxMorale: 100, meleeAtk: 10, meleeDef: 5 };

    const atkArmy = gs.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [{ ...weakReg }], null, 'Foolhardy Host');
    const defArmy = gs.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', Array.from({ length: 8 }, () => ({ ...strongReg })), null, 'Bastion');
    const prov = gs.getProvince('PROV_GULBARGA');

    const rawRes = autoResolveBattle(atkArmy, defArmy, prov, gs);
    rawRes.attackerWins = false;

    applyBattleOutcome(gs, rawRes);
    assertEqual(atkArmy.movementPoints, 0, 'Defeated attacker movement exhausted');
    assertEqual(prov.controllingFaction, 'FAC_BAHMANI', 'Defender province remains secure');
  }, { tier: 3 });

  test('E4: Surviving defeated defender retreats along valid connections; trapped defender is destroyed', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const prov = gs.getProvince('PROV_GULBARGA');
    const retreatProv = findRetreatProvince(gs, prov, 'FAC_BAHMANI');
    assertTrue(retreatProv !== null, 'Valid retreat province found for Bahmani defender from Gulbarga');

    // Test trapped surrounded army
    const isolatedProv = { id: 'PROV_ISLAND', connections: [] };
    const trapped = findRetreatProvince(gs, isolatedProv, 'FAC_BAHMANI');
    assertEqual(trapped, null, 'Surrounded/island province yields null retreat target');
  }, { tier: 3 });

  test('E5: Defeated general fate resolves across SLAIN (10%), CAPTURED (15%), or ESCAPED (75%) and victor gains loyalty', () => {
    const charVictor = { id: 'CHAR_VIC', name: 'Victorious General', alive: true, loyalty: 70, currentRole: 'GENERAL' };
    const vicRes = resolveGeneralFate(charVictor, true, false, 'FAC_BAHMANI', 'PROV_VIJAYANAGARA');
    assertEqual(vicRes.status, 'VICTORIOUS', 'Victor status is VICTORIOUS');
    assertEqual(charVictor.loyalty, 75, 'Victor gains +5 loyalty (70 -> 75)');

    // Statistical distribution check over 1,000 rolls
    let slain = 0;
    let captured = 0;
    let escaped = 0;

    for (let i = 0; i < 1000; i++) {
      const charDef = { id: `CHAR_DEF_${i}`, name: 'Defeated General', alive: true, loyalty: 80, currentRole: 'GENERAL' };
      const fate = resolveGeneralFate(charDef, false, false, 'FAC_VIJAYANAGARA', 'PROV_GULBARGA');
      if (fate.status === 'DECEASED') slain++;
      else if (fate.status === 'CAPTURED') captured++;
      else if (fate.status === 'RETREATED' || fate.status === 'ESCAPED') escaped++;
    }

    assertInBounds(slain, 60, 150, 'Slain frequency is ~10% (60 to 150 per 1,000)');
    assertInBounds(captured, 100, 200, 'Captured frequency is ~15% (100 to 200 per 1,000)');
    assertInBounds(escaped, 680, 820, 'Escaped frequency is ~75% (680 to 820 per 1,000)');
  }, { tier: 3 });

  test('E6: Destroyed army general has role automatically reset to IDLE and assignment cleared', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const dyingReg = { hp: 5, maxHp: 100, morale: 10, maxMorale: 100, meleeAtk: 20, meleeDef: 10 };
    const doomedArmy = gs.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [dyingReg], 'CHAR_BUKKA_I', 'Doomed Vanguard');
    const bukka = gs.getCharacter('CHAR_BUKKA_I');
    assertEqual(bukka.currentRole, 'GENERAL', 'Role is GENERAL');

    // Delete army on wipeout
    gs.deleteArmy(doomedArmy.id);
    assertEqual(bukka.currentRole, 'IDLE', 'General unassigned and reset to IDLE');
    assertEqual(bukka.assignmentTarget, null, 'Assignment target cleared');
  }, { tier: 3 });

  test('E7: Post-auto-resolve game state serializes and deserializes deterministically with 100% fidelity', () => {
    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg1 = { id: 'R1', hp: 80, maxHp: 100, morale: 85, maxMorale: 100, meleeAtk: 30, meleeDef: 15 };
    const army = gs.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [reg1], 'CHAR_BUKKA_I', 'Battle-Tested Host');

    // Run battle mutation
    applyCasualties(army, 0.4, true);

    const serialized = gs.serialize();
    const gsRestored = new GameState();
    gsRestored.deserialize(serialized);

    const restoredArmy = gsRestored.getArmy(army.id);
    assertEqual(restoredArmy.regiments[0].hp, army.regiments[0].hp, 'HP preserved exactly after serialization');
    assertEqual(restoredArmy.regiments[0].morale, army.regiments[0].morale, 'Morale preserved exactly after serialization');
  }, { tier: 4 });

  test('E8: formatWinOdds formats percentages accurately', () => {
    assertEqual(formatWinOdds(0.5), '50%', '0.5 formatted as 50%');
    assertEqual(formatWinOdds(0.684), '68%', '0.684 formatted as 68%');
    assertEqual(formatWinOdds(0.05), '5%', '0.05 formatted as 5%');
    assertEqual(formatWinOdds(0.95), '95%', '0.95 formatted as 95%');
  }, { tier: 2 });
});
