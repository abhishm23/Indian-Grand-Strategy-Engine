// tests/challenge_m1_2_stress.js
// Milestone 1 Adversarial Stress Test Suite: GameState & Serialization Engine
// Evaluates Determinism, Circular References, Malformed JSON, Large Scaling, and Storage Boundaries.

import { GameState, MemoryStorageAdapter, getStorage, deepClone, sortKeysDeterministic } from '../js/engine/gameState.js';
import { PROVINCES } from '../js/data/provinces.js';
import { FACTIONS } from '../js/data/factions.js';
import { CHARACTERS } from '../js/data/characters.js';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const failureLog = [];

function assert(condition, testName, message = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const errMsg = `[FAIL] ${testName}${message ? ': ' + message : ''}`;
    failureLog.push(errMsg);
    console.error(`  ❌ ${errMsg}`);
  }
}

function assertStrictEqual(actual, expected, testName, message = '') {
  assert(actual === expected, testName, `${message} (Expected: ${expected}, Actual: ${actual})`);
}

function assertDeepStrictEqual(actual, expected, testName, message = '') {
  const actualStr = JSON.stringify(sortKeysDeterministic(actual));
  const expectedStr = JSON.stringify(sortKeysDeterministic(expected));
  assert(actualStr === expectedStr, testName, `${message} (JSON structures do not match)`);
}

function assertThrows(fn, expectedErrPattern, testName) {
  totalAssertions++;
  try {
    fn();
    failedAssertions++;
    const errMsg = `[FAIL] ${testName}: Expected function to throw error matching ${expectedErrPattern}, but it did not throw.`;
    failureLog.push(errMsg);
    console.error(`  ❌ ${errMsg}`);
  } catch (err) {
    if (expectedErrPattern instanceof RegExp ? expectedErrPattern.test(err.message) : err.message.includes(expectedErrPattern)) {
      passedAssertions++;
    } else {
      failedAssertions++;
      const errMsg = `[FAIL] ${testName}: Error thrown "${err.message}" did not match expected pattern ${expectedErrPattern}`;
      failureLog.push(errMsg);
      console.error(`  ❌ ${errMsg}`);
    }
  }
}

console.log('======================================================================');
console.log('CHALLENGER_M1_2: EMPIRICAL ADVERSARIAL STRESS TEST HARNESS');
console.log('Target: GameState & Serialization Engine (Milestone 1)');
console.log('======================================================================\n');

const suiteStartTime = performance.now();

// ======================================================================
// SUITE 1: Multi-Round Serialization / Deserialization Round-Trip (60 Cycles)
// ======================================================================
console.log('▶ SUITE 1: Multi-Round Serialization / Deserialization Round-Trip (60 Cycles)');

{
  // 1.1 Static Idempotency
  const staticState = new GameState();
  staticState.initNewGame('FAC_VIJAYANAGARA');
  const baseJson = staticState.serialize();
  let idempotentMatch = true;

  for (let i = 1; i <= 10; i++) {
    const rehydrated = GameState.fromJSON(baseJson);
    const reSerialized = rehydrated.serialize();
    if (reSerialized !== baseJson) {
      idempotentMatch = false;
      break;
    }
  }
  assert(idempotentMatch, '1.1 Static Idempotency', '10 consecutive deserialization-serialization cycles produce byte-for-byte identical output');

  // 1.2 60-Cycle Continuous Mutate-Serialize-Deserialize-Reserialize Pipeline
  const dynamicState = new GameState();
  dynamicState.initNewGame('FAC_DELHI');
  const provinceIds = Object.keys(dynamicState.provinces);
  const factionIds = Object.keys(dynamicState.factions);
  const characterIds = Object.keys(dynamicState.characters);

  let currentLoopState = dynamicState;
  let allCyclesDeterministic = true;
  let allFieldsPreserved = true;
  const cycleTimes = [];

  for (let cycle = 1; cycle <= 60; cycle++) {
    const tC0 = performance.now();

    // Step A: Serialize current state
    const jsonBeforeMutation = currentLoopState.serialize();

    // Step B: Rehydrate immediately and verify bit-exact match
    const interimState = GameState.fromJSON(jsonBeforeMutation);
    const jsonInterim = interimState.serialize();
    if (jsonBeforeMutation !== jsonInterim) {
      allCyclesDeterministic = false;
      break;
    }

    // Step C: Apply complex state mutations across subsystems
    interimState.advanceTurn();
    const fId = factionIds[cycle % factionIds.length];
    const pId = provinceIds[cycle % provinceIds.length];
    const cId = characterIds[cycle % characterIds.length];

    interimState.modifyTreasury(fId, (cycle * 211) % 1500);
    interimState.transferProvinceControl(pId, fId);

    const prov = interimState.getProvince(pId);
    if (prov) {
      prov.publicOrder = ((prov.publicOrder + (cycle * 7)) % 95) + 5;
      prov.buildings.push(`WALLS_T${(cycle % 3) + 1}`);
      prov.defenseLevel = (prov.defenseLevel % 5) + 1;
    }

    // Periodically spawn armies
    if (cycle % 3 === 0) {
      interimState.createArmy(fId, pId, [
        { unitTypeId: 'HEAVY_CAVALRY', hp: 150, maxHp: 160, morale: 90 },
        { unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100 }
      ], null, `MultiCycle_Army_${cycle}`);
    }

    // Periodically assign characters
    if (cycle % 4 === 0) {
      const char = interimState.getCharacter(cId);
      if (char && char.alive && char.currentRole !== 'RULER') {
        interimState.assignCharacterRole(cId, 'GOVERNOR', pId);
      }
    }

    // Step D: Serialize mutated state
    const jsonMutated = interimState.serialize();

    // Step E: Deserialize mutated state into fresh instance
    const reloadedMutated = GameState.fromJSON(jsonMutated);

    // Step F: Immediate re-serialization must match jsonMutated byte-for-byte
    const jsonReserialized = reloadedMutated.serialize();
    if (jsonMutated !== jsonReserialized) {
      allCyclesDeterministic = false;
      break;
    }

    // Verify key fields match
    if (reloadedMutated.currentTurn !== interimState.currentTurn ||
        reloadedMutated.year !== interimState.year ||
        Object.keys(reloadedMutated.armies).length !== Object.keys(interimState.armies).length ||
        reloadedMutated.getTreasury(fId) !== interimState.getTreasury(fId)) {
      allFieldsPreserved = false;
      break;
    }

    currentLoopState = reloadedMutated;
    const tC1 = performance.now();
    cycleTimes.push(tC1 - tC0);
  }

  assert(allCyclesDeterministic, '1.2 Multi-Round Determinism', 'All 60 continuous mutate-serialize-deserialize cycles maintained bit-exact determinism');
  assert(allFieldsPreserved, '1.2 Field Fidelity', 'All entity counts and values matched across 60 mutation cycles');

  const avgCycleTime = cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length;
  console.log(`  ✔ Completed 60 cycles. Avg cycle duration: ${avgCycleTime.toFixed(2)}ms, Final turn: ${currentLoopState.currentTurn}, Final year: ${currentLoopState.year}`);
}


// ======================================================================
// SUITE 2: Circular References and Non-Serializable Object Resilience
// ======================================================================
console.log('\n▶ SUITE 2: Circular References and Non-Serializable Object Resilience');

{
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  // 2.1 Direct root circular reference
  state.circularRoot = state;
  let rootJson = null;
  try {
    rootJson = state.serialize();
  } catch (e) {
    rootJson = null;
  }
  assert(rootJson !== null, '2.1 Root Circular Reference Resilience', 'Root circular reference ignored due to whitelist export in exportSaveObject()');

  // 2.2 In-entity circular reference (Province self-reference)
  state.provinces['PROV_DELHI'].selfReference = state.provinces['PROV_DELHI'];
  assertThrows(() => {
    state.serialize();
  }, /circular structure/i, '2.2 Entity Circular Reference Detection');
  delete state.provinces['PROV_DELHI'].selfReference;

  // 2.3 Cross-entity circular reference (Army <-> Character object pointer)
  const testArmy = Object.values(state.armies)[0];
  const testChar = state.characters['CHAR_BUKKA_I'];
  testArmy.pointerToChar = testChar;
  testChar.pointerToArmy = testArmy;
  assertThrows(() => {
    state.serialize();
  }, /circular structure/i, '2.3 Cross-Entity Object Pointer Circular Detection');
  delete testArmy.pointerToChar;
  delete testChar.pointerToArmy;

  // 2.4 Non-serializable Primitives & Types
  // BigInt
  state.factions['FAC_VIJAYANAGARA'].treasury = 10000n;
  assertThrows(() => {
    state.serialize();
  }, /BigInt/i, '2.4 BigInt Serialization Rejection');
  state.factions['FAC_VIJAYANAGARA'].treasury = 10000;

  // NaN and Infinity behavior
  state.factions['FAC_VIJAYANAGARA'].treasury = NaN;
  state.provinces['PROV_DELHI'].publicOrder = Infinity;
  const nanJson = state.serialize();
  const nanReloaded = GameState.fromJSON(nanJson);
  assertStrictEqual(nanReloaded.factions['FAC_VIJAYANAGARA'].treasury, null, '2.4 NaN Serialization Conversion', 'NaN coerces to null in JSON');
  assertStrictEqual(nanReloaded.provinces['PROV_DELHI'].publicOrder, null, '2.4 Infinity Serialization Conversion', 'Infinity coerces to null in JSON');

  // Undefined property omission
  state.characters['CHAR_BUKKA_I'].customTransientProp = undefined;
  const undefJson = state.serialize();
  const undefReloaded = GameState.fromJSON(undefJson);
  assertStrictEqual('customTransientProp' in undefReloaded.characters['CHAR_BUKKA_I'], false, '2.4 Undefined Property Omission', 'Undefined properties are cleanly omitted from serialized JSON');

  // Function property stripping
  state.provinces['PROV_DELHI'].calculateTaxes = function() { return 500; };
  const funcJson = state.serialize();
  const funcReloaded = GameState.fromJSON(funcJson);
  assertStrictEqual(typeof funcReloaded.provinces['PROV_DELHI'].calculateTaxes, 'undefined', '2.4 Function Stripping', 'Functions attached to entities are cleanly stripped upon serialization');

  // 2.5 Role Assignment Edge Case (Displaced Governor / General zombie state)
  const testGovState = new GameState();
  testGovState.initNewGame('FAC_DELHI');
  testGovState.assignCharacterRole('CHAR_FIRUZ_TUG', 'GOVERNOR', 'PROV_DELHI');
  assertStrictEqual(testGovState.getProvince('PROV_DELHI').governorId, 'CHAR_FIRUZ_TUG', '2.5 Governor Assignment Initial');
  
  // Assign second character to same province
  testGovState.assignCharacterRole('CHAR_MALIK_MAQBUL', 'GOVERNOR', 'PROV_DELHI');
  assertStrictEqual(testGovState.getProvince('PROV_DELHI').governorId, 'CHAR_MALIK_MAQBUL', '2.5 Governor Assignment Replaced');
  const displacedGov = testGovState.getCharacter('CHAR_FIRUZ_TUG');
  // Empirical observation: Firuz's currentRole is still GOVERNOR even though PROV_DELHI has replaced him!
  const hasDisplacedGovAnomaly = (displacedGov.currentRole === 'GOVERNOR' && displacedGov.assignmentTarget === 'PROV_DELHI');
  assert(hasDisplacedGovAnomaly, '2.5 Displaced Character Anomaly Empirical Check', 'Confirms displaced governor retains dangling assignment target');
  console.log(`  ℹ Displaced character assignment behavior confirmed: displaced character retains role ${displacedGov.currentRole} pointing to ${displacedGov.assignmentTarget}`);
}


// ======================================================================
// SUITE 3: Malformed / Corrupted JSON Rejection and Error Recovery
// ======================================================================
console.log('\n▶ SUITE 3: Malformed / Corrupted JSON Rejection and Error Recovery');

{
  const testState = new GameState();
  testState.initNewGame('FAC_VIJAYANAGARA');

  // 3.1 Non-string & empty inputs
  const invalidInputs = [
    { input: null, label: 'null' },
    { input: undefined, label: 'undefined' },
    { input: 12345, label: 'number 12345' },
    { input: {}, label: 'empty object {}' },
    { input: [], label: 'empty array []' },
    { input: '', label: 'empty string ""' }
  ];

  for (const item of invalidInputs) {
    assertThrows(() => {
      testState.deserialize(item.input);
    }, /Invalid JSON string/i, `3.1 Rejection of ${item.label}`);
  }

  // 3.2 Syntactic syntax errors
  const syntaxErrors = [
    { input: '   ', label: 'whitespace only' },
    { input: '{ bad json', label: 'unclosed brace' },
    { input: '{ "name": unquoted_val }', label: 'unquoted identifier' },
    { input: "{ 'singleQuotes': true }", label: 'single-quoted JSON' },
    { input: 'undefined', label: 'literal undefined string' },
    { input: 'NaN', label: 'literal NaN string' }
  ];

  for (const item of syntaxErrors) {
    assertThrows(() => {
      testState.deserialize(item.input);
    }, /JSON parse error/i, `3.2 Syntax Error Rejection: ${item.label}`);
  }

  // 3.3 Truncated JSON Stream (Simulating crash / partial write)
  const fullValidJson = testState.serialize();
  const truncationFractions = [0.01, 0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.99];

  for (const frac of truncationFractions) {
    const cutLen = Math.floor(fullValidJson.length * frac);
    const truncated = fullValidJson.slice(0, cutLen);
    assertThrows(() => {
      testState.deserialize(truncated);
    }, /JSON parse error/i, `3.3 Truncated JSON Rejection at ${(frac * 100).toFixed(0)}% length`);
  }

  // 3.4 Semantic & Schema Validation Errors
  const semanticErrors = [
    { json: 'null', label: 'JSON primitive null' },
    { json: '42', label: 'JSON primitive number 42' },
    { json: '"a plain string"', label: 'JSON primitive string' },
    { json: '[1, 2, 3]', label: 'JSON array' },
    { json: '{}', label: 'Empty JSON object missing entity collections' },
    { json: JSON.stringify({ state: { provinces: {} } }), label: 'Missing factions, characters, armies' },
    { json: JSON.stringify({ state: { provinces: {}, factions: {}, characters: {} } }), label: 'Missing armies' }
  ];

  for (const item of semanticErrors) {
    assertThrows(() => {
      testState.deserialize(item.json);
    }, /Invalid save state object|Malformed save state object/i, `3.4 Semantic Error Rejection: ${item.label}`);
  }

  // 3.5 State Isolation / Transactional Integrity Check
  // Ensure that after catching all deserialization failures, testState remains 100% healthy
  assertStrictEqual(testState.playerFactionId, 'FAC_VIJAYANAGARA', '3.5 State Isolation - Player Faction Intact');
  assertStrictEqual(testState.currentTurn, 1, '3.5 State Isolation - Turn Number Intact');
  assertStrictEqual(Object.keys(testState.provinces).length, 40, '3.5 State Isolation - 40 Provinces Intact');
  assertStrictEqual(Object.keys(testState.factions).length, 10, '3.5 State Isolation - 10 Factions Intact');
  assertStrictEqual(Object.keys(testState.characters).length, 26, '3.5 State Isolation - 26 Characters Intact');

  // 3.6 Mid-import failure behavior (Empirical inquiry)
  const partiallyCorruptedPayload = {
    currentTurn: 999,
    provinces: { test_p: { id: 'test_p' } },
    factions: {},
    characters: {},
    armies: {},
    get technologies() { throw new Error('Simulated mid-import clone explosion'); }
  };

  const corruptProbeState = new GameState();
  corruptProbeState.initNewGame('FAC_DELHI');
  try {
    corruptProbeState.importSaveObject(partiallyCorruptedPayload);
  } catch (e) {
    const isDirty = corruptProbeState.currentTurn === 999;
    assert(isDirty, '3.6 Mid-Import Mutation Anomaly Check', 'Records empirical finding that mid-import errors leave prior properties mutated');
    console.log(`  ℹ Mid-import error behavior confirmed: instance turn mutated to ${corruptProbeState.currentTurn} before error was thrown`);
  }
}


// ======================================================================
// SUITE 4: Large State Stress (100+ to 240+ Armies Scaling)
// ======================================================================
console.log('\n▶ SUITE 4: Large State Stress (100+ to 240+ Armies Scaling)');

{
  const stressState = new GameState();
  stressState.initNewGame('FAC_VIJAYANAGARA');

  const provinceKeys = Object.keys(stressState.provinces);
  const factionKeys = Object.keys(stressState.factions);

  // 4.1 Spawn 240 Armies across all 40 provinces (6 armies per province)
  const spawnStart = performance.now();
  let totalSpawned = 0;
  for (let pIdx = 0; pIdx < provinceKeys.length; pIdx++) {
    const pId = provinceKeys[pIdx];
    for (let a = 1; a <= 6; a++) {
      const fId = factionKeys[(pIdx + a) % factionKeys.length];
      const army = stressState.createArmy(fId, pId, [
        { unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, morale: 100 },
        { unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100 },
        { unitTypeId: 'HORSE_ARCHERS', hp: 90, maxHp: 90, morale: 80 }
      ], null, `StressArmy_${pId}_${a}`);
      if (army) totalSpawned++;
    }
  }
  const spawnEnd = performance.now();
  const totalArmiesCount = Object.keys(stressState.armies).length;

  assert(totalSpawned === 240, '4.1 Mass Army Creation Count', `Spawned exactly 240 armies (Total: ${totalArmiesCount}) in ${(spawnEnd - spawnStart).toFixed(2)}ms`);

  // 4.2 Large State Serialization & Throughput
  const tSer0 = performance.now();
  const largeJson = stressState.serialize();
  const tSer1 = performance.now();
  const jsonSizeKb = (largeJson.length / 1024).toFixed(2);

  assert(largeJson.length > 250000, '4.2 Large State JSON Size', `JSON size is ${jsonSizeKb} KB`);
  assert((tSer1 - tSer0) < 50, '4.2 Serialization Latency SLA', `Serialized 245 armies in ${(tSer1 - tSer0).toFixed(2)}ms (SLA: < 50ms)`);

  // 4.3 Large State Deserialization & Rehydration
  const tDes0 = performance.now();
  const reloadedLarge = GameState.fromJSON(largeJson);
  const tDes1 = performance.now();

  assertStrictEqual(Object.keys(reloadedLarge.armies).length, 245, '4.3 Deserialization Army Count Preservation');
  assert((tDes1 - tDes0) < 50, '4.3 Deserialization Latency SLA', `Deserialized 245 armies in ${(tDes1 - tDes0).toFixed(2)}ms (SLA: < 50ms)`);

  // 4.4 Large State Determinism
  const reSerializedLarge = reloadedLarge.serialize();
  assertStrictEqual(largeJson, reSerializedLarge, '4.4 Large State Round-Trip Determinism', '245-army state serializes identically across round-trips');

  // 4.5 Turn Advancement at Scale
  const tAdv0 = performance.now();
  reloadedLarge.advanceTurn();
  const tAdv1 = performance.now();

  let allArmiesReset = true;
  for (const army of Object.values(reloadedLarge.armies)) {
    if (army.movementPoints !== 100) {
      allArmiesReset = false;
      break;
    }
  }
  assert(allArmiesReset, '4.5 Turn Reset Scaling Integrity', `advanceTurn() with 245 armies executed in ${(tAdv1 - tAdv0).toFixed(2)}ms with 100% movement points reset`);

  // 4.6 Mass Army Deletion & Memory Reclamation
  const armyKeysToDelete = Object.keys(reloadedLarge.armies).slice(0, 100);
  for (const aId of armyKeysToDelete) {
    const deleted = reloadedLarge.deleteArmy(aId);
    assert(deleted, '4.6 Army Deletion', `Successfully deleted army ${aId}`);
  }
  assertStrictEqual(Object.keys(reloadedLarge.armies).length, 145, '4.6 Army Deletion Count Verification');

  const prunedJson = reloadedLarge.serialize();
  const prunedReloaded = GameState.fromJSON(prunedJson);
  assertStrictEqual(prunedJson, prunedReloaded.serialize(), '4.6 Post-Deletion Determinism');
  console.log(`  ✔ Large state stress passed: 245 armies serialized (${jsonSizeKb} KB) in ${(tSer1 - tSer0).toFixed(2)}ms, deserialized in ${(tDes1 - tDes0).toFixed(2)}ms`);
}


// ======================================================================
// SUITE 5: MemoryStorageAdapter Behavioral & Boundary Conformance
// ======================================================================
console.log('\n▶ SUITE 5: MemoryStorageAdapter Behavioral & Boundary Conformance');

{
  const storage = new MemoryStorageAdapter();

  // 5.1 Length property semantics
  assertStrictEqual(storage.length, 0, '5.1 Initial Storage Length');
  storage.setItem('key1', 'val1');
  assertStrictEqual(storage.length, 1, '5.1 Length after 1 item');
  storage.setItem('key2', 'val2');
  assertStrictEqual(storage.length, 2, '5.1 Length after 2 items');
  storage.setItem('key1', 'newVal1');
  assertStrictEqual(storage.length, 2, '5.1 Length unchanged after overwrite');
  storage.removeItem('key1');
  assertStrictEqual(storage.length, 1, '5.1 Length decremented after removal');
  storage.removeItem('nonexistent');
  assertStrictEqual(storage.length, 1, '5.1 Length unchanged on removing nonexistent key');
  storage.clear();
  assertStrictEqual(storage.length, 0, '5.1 Length zero after clear()');

  // 5.2 Key(index) boundary checks
  storage.setItem('alpha', '100');
  storage.setItem('beta', '200');
  storage.setItem('gamma', '300');

  assertStrictEqual(storage.key(0), 'alpha', '5.2 Key(0) Index Check');
  assertStrictEqual(storage.key(1), 'beta', '5.2 Key(1) Index Check');
  assertStrictEqual(storage.key(2), 'gamma', '5.2 Key(2) Index Check');
  assertStrictEqual(storage.key(3), null, '5.2 Key(3) Out-of-Bounds Check');
  assertStrictEqual(storage.key(100), null, '5.2 Key(100) Far-Out-of-Bounds Check');
  assertStrictEqual(storage.key(-1), null, '5.2 Key(-1) Negative Index Check');
  assertStrictEqual(storage.key(-100), null, '5.2 Key(-100) Negative Index Check');
  assertStrictEqual(storage.key(NaN), null, '5.2 Key(NaN) Check');
  assertStrictEqual(storage.key(undefined), null, '5.2 Key(undefined) Check');
  assertStrictEqual(storage.key(1.5), null, '5.2 Key(1.5) Float Check');

  // 5.3 Empty String and Value Type Conversions
  storage.setItem('', 'emptyKeyContent');
  assertStrictEqual(storage.getItem(''), 'emptyKeyContent', '5.3 Empty String Key');
  storage.setItem('emptyValKey', '');
  assertStrictEqual(storage.getItem('emptyValKey'), '', '5.3 Empty String Value Preservation (Not Null)');

  storage.setItem('numberVal', 42);
  assertStrictEqual(storage.getItem('numberVal'), '42', '5.3 Number Coercion to String');
  storage.setItem('boolVal', true);
  assertStrictEqual(storage.getItem('boolVal'), 'true', '5.3 Boolean Coercion to String');
  storage.setItem('nullVal', null);
  assertStrictEqual(storage.getItem('nullVal'), 'null', '5.3 Null Coercion to String');
  storage.setItem('undefVal', undefined);
  assertStrictEqual(storage.getItem('undefVal'), 'undefined', '5.3 Undefined Coercion to String');

  // 5.4 Key Type Coercion Gap (Empirical finding)
  storage.setItem(1234, 'numericKeyVal');
  const getViaNum = storage.getItem(1234);
  const getViaStr = storage.getItem('1234');
  assertStrictEqual(getViaNum, 'numericKeyVal', '5.4 Lookup by exact numeric key');
  // In Map, key is not coerced to string, so getItem("1234") returns null
  assertStrictEqual(getViaStr, null, '5.4 Document Map key non-coercion in MemoryStorageAdapter');
  console.log(`  ℹ MemoryStorageAdapter key non-coercion confirmed: Map uses raw key identity (getItem(1234)='${getViaNum}', getItem('1234')='${getViaStr}')`);

  // 5.5 High-Volume Throughput Stress
  storage.clear();
  const tVol0 = performance.now();
  for (let i = 0; i < 1000; i++) {
    storage.setItem(`stress_key_${i}`, `stress_value_${i}_${'x'.repeat(100)}`);
  }
  assertStrictEqual(storage.length, 1000, '5.5 High Volume 1000 Items Stored');
  for (let i = 0; i < 1000; i += 10) {
    const val = storage.getItem(`stress_key_${i}`);
    assert(val !== null && val.startsWith(`stress_value_${i}`), '5.5 High Volume Sample Lookup');
  }
  for (let i = 0; i < 500; i++) {
    storage.removeItem(`stress_key_${i}`);
  }
  assertStrictEqual(storage.length, 500, '5.5 High Volume 500 Items Removed');
  storage.clear();
  assertStrictEqual(storage.length, 0, '5.5 High Volume Cleared');
  const tVol1 = performance.now();
  console.log(`  ✔ MemoryStorageAdapter volume stress: 1000 inserts, 100 lookups, 500 deletes, clear in ${(tVol1 - tVol0).toFixed(2)}ms`);

  // 5.6 SaveToLocalStorage and LoadFromLocalStorage Integration
  const integrationState = new GameState();
  integrationState.initNewGame('FAC_BAHMANI');
  integrationState.advanceTurn();
  integrationState.saveToLocalStorage('save_slot_stress');

  const savesList = integrationState.listSavedGames();
  assert(savesList.length >= 1, '5.6 Save List Non-Empty');
  assertStrictEqual(savesList[0].slotKey, 'save_slot_stress', '5.6 Save Slot Recorded');

  const reloadedFromStorage = new GameState();
  const loadSuccess = reloadedFromStorage.loadFromLocalStorage('save_slot_stress');
  assertStrictEqual(loadSuccess, true, '5.6 Load From Storage Success');
  assertStrictEqual(reloadedFromStorage.playerFactionId, 'FAC_BAHMANI', '5.6 Loaded Player Faction');
  assertStrictEqual(reloadedFromStorage.currentTurn, 2, '5.6 Loaded Turn Number');

  // Verify listSavedGames handles corrupted save index gracefully
  const rawStorage = getStorage();
  rawStorage.setItem('iron_tactics_save_index', '{ corrupt index JSON');
  const resilientList = integrationState.listSavedGames();
  assertDeepStrictEqual(resilientList, [], '5.6 Resilient List on Corrupt Index');

  // Delete save slot
  integrationState.deleteSaveFromLocalStorage('save_slot_stress');
  assertStrictEqual(rawStorage.getItem('save_slot_stress'), null, '5.6 Deleted Save Slot From Storage');
}

const suiteEndTime = performance.now();
const suiteDuration = (suiteEndTime - suiteStartTime).toFixed(2);

console.log('\n======================================================================');
console.log('CHALLENGE HARNESS EXECUTION SUMMARY');
console.log(`Total Assertions: ${totalAssertions}`);
console.log(`Passed:           ${passedAssertions}`);
console.log(`Failed:           ${failedAssertions}`);
console.log(`Execution Time:   ${suiteDuration}ms`);
console.log('======================================================================');

if (failedAssertions > 0) {
  console.error('\nFAILURE DETAILS:');
  failureLog.forEach(f => console.error(f));
  process.exit(1);
} else {
  console.log('\nALL ADVERSARIAL CHALLENGE HARNESS TESTS PASSED EMPIRICALLY!\n');
  process.exit(0);
}
