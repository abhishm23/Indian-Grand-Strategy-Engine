// tests/test_serialization.js
// Tier 2 & 4 Validation Suite: Save/Load State JSON Serialization, Deserialization, Round-Trip Integrity, and Error Handling

import { describe, test, assertEqual, assertTrue, assertFalse, assertDeepEqual, assertThrows } from './testRunner.js';
import { GameStateOracle } from './fixtures/spec_oracle.js';

describe('Serialization — Deterministic Save/Load Round-Trip (F25)', () => {
  test('Initial state serializes and deserializes with 100% data fidelity', () => {
    const originalState = new GameStateOracle();
    const serializedJson = originalState.serialize();

    assertTrue(typeof serializedJson === 'string', 'Serialized output is a string');
    assertTrue(serializedJson.length > 500, 'Serialized output contains substantial data');

    const loadedState = new GameStateOracle();
    loadedState.deserialize(serializedJson);

    assertEqual(loadedState.currentTurn, originalState.currentTurn, 'Turn number preserved');
    assertEqual(loadedState.year, originalState.year, 'Calendar year preserved');
    assertEqual(loadedState.playerFactionId, originalState.playerFactionId, 'Player faction ID preserved');

    assertDeepEqual(loadedState.provinces, originalState.provinces, 'All 40 provinces match identically');
    assertDeepEqual(loadedState.factions, originalState.factions, 'All 10 factions match identically');
    assertDeepEqual(loadedState.characters, originalState.characters, 'All 26 characters match identically');
    assertDeepEqual(loadedState.armies, originalState.armies, 'All armies match identically');
  }, { tier: 2 });

  test('Mutated multi-turn game state preserves all modifications across serialization', () => {
    const state = new GameStateOracle();

    // 1. Advance turns
    state.processTurn();
    state.processTurn();

    // 2. Modify provincial state
    const vij = state.provinces['PROV_VIJAYANAGARA'];
    vij.publicOrder = 95;
    vij.governorId = 'CHAR_KAMPANA';
    vij.activeBuildings.push('FORTIFICATIONS_T1');

    // 3. Modify faction treasuries and armies
    const fac = state.factions['FAC_VIJAYANAGARA'];
    fac.treasury = 12500;

    state.armies['ARMY_VIJ_EXPEDITION'] = {
      id: 'ARMY_VIJ_EXPEDITION',
      factionId: 'FAC_VIJAYANAGARA',
      name: 'Southern Strike Host',
      generalId: 'CHAR_BUKKA_I',
      provinceId: 'PROV_MYSORE',
      movementPoints: 60,
      supplyState: 'SUPPLIED',
      regiments: [
        { type: 'WAR_ELEPHANTS', hp: 320, maxHp: 350, morale: 90, meleeAtk: 48, meleeDef: 28 }
      ]
    };

    // 4. Research progress
    state.techProgress['FAC_VIJAYANAGARA'] = {
      activeTechId: 'TECH_MIL_2',
      remainingCost: 110,
      unlockedTechs: ['TECH_MIL_1']
    };

    // Serialize and Rehydrate
    const jsonStr = state.serialize();
    const restoredState = new GameStateOracle();
    restoredState.deserialize(jsonStr);

    assertEqual(restoredState.currentTurn, 3, 'Restored turn count matches');
    assertEqual(restoredState.factions['FAC_VIJAYANAGARA'].treasury, 12500, 'Restored treasury matches');
    assertEqual(restoredState.provinces['PROV_VIJAYANAGARA'].publicOrder, 95, 'Restored public order matches');
    assertEqual(restoredState.provinces['PROV_VIJAYANAGARA'].governorId, 'CHAR_KAMPANA', 'Restored governor matches');
    assertTrue(restoredState.provinces['PROV_VIJAYANAGARA'].activeBuildings.includes('FORTIFICATIONS_T1'), 'Restored building matches');

    const restoredArmy = restoredState.armies['ARMY_VIJ_EXPEDITION'];
    assertTrue(restoredArmy !== undefined, 'Expedition army restored');
    assertEqual(restoredArmy.regiments[0].hp, 320, 'Regiment HP preserved accurately');
    assertEqual(restoredArmy.movementPoints, 60, 'Movement points preserved accurately');

    assertDeepEqual(
      restoredState.techProgress['FAC_VIJAYANAGARA'],
      state.techProgress['FAC_VIJAYANAGARA'],
      'Tech progress tree preserved with exact fidelity'
    );
  }, { tier: 4 });

  test('Serialization avoids circular object references by storing entity IDs', () => {
    const state = new GameStateOracle();
    // Verify JSON stringify runs without circular structure error
    let jsonOutput = null;
    let threwError = false;
    try {
      jsonOutput = state.serialize();
    } catch (e) {
      threwError = true;
    }
    assertFalse(threwError, 'Serialization must never throw circular reference errors');
    assertTrue(jsonOutput !== null, 'Output successfully generated');
  }, { tier: 2 });

  test('Malformed or corrupted JSON strings throw clear parsing errors', () => {
    const state = new GameStateOracle();
    assertThrows(() => {
      state.deserialize('{ malformed JSON string ... missing braces ');
    }, 'JSON', 'Corrupt JSON throws descriptive error');
  }, { tier: 3 });

  test('Serialization is idempotent: multiple round-trips produce byte-for-byte identical output', () => {
    const state1 = new GameStateOracle();
    state1.processTurn();
    const json1 = state1.serialize();

    const state2 = new GameStateOracle();
    state2.deserialize(json1);
    const json2 = state2.serialize();

    assertEqual(json1, json2, 'Second serialization cycle matches first identically');
  }, { tier: 4 });

  test('Serialization withstands large workloads with dozens of active armies and rebellions', () => {
    const state = new GameStateOracle();
    // Populate 30 active armies
    for (let i = 1; i <= 30; i++) {
      state.armies[`ARMY_STRESS_${i}`] = {
        id: `ARMY_STRESS_${i}`,
        factionId: i % 2 === 0 ? 'FAC_DELHI' : 'FAC_VIJAYANAGARA',
        name: `Host ${i}`,
        provinceId: 'PROV_DELHI',
        regiments: [
          { type: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100 }
        ]
      };
    }

    const startTimer = performance.now();
    const json = state.serialize();
    const parseTimer = performance.now();
    const reloaded = new GameStateOracle();
    reloaded.deserialize(json);
    const endTimer = performance.now();

    assertTrue(json.length > 5000, 'Large state serialized');
    assertEqual(Object.keys(reloaded.armies).length, 31, 'All 31 armies rehydrated');
    assertTrue((endTimer - startTimer) < 100, 'Serialization and parsing completes in < 100ms');
  }, { tier: 4 });
});

