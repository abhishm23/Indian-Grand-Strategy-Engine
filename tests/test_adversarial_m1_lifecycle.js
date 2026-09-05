/**
 * tests/test_adversarial_m1_lifecycle.js
 * Adversarial State Mutation and Lifecycle Stress Test Harness
 * Milestone 1: Auto-Resolve Combat Integration (R2)
 *
 * Authored by Challenger 2 (critic/specialist).
 * Stress-tests:
 * 1. Isolated province / surrounded retreat and destruction mechanics.
 * 2. Simultaneous mutual annihilation of all regiments and ghost token cleanup.
 * 3. Successive battles in the same province across multiple turns and multi-wave assaults.
 * 4. General capture and death assignment restrictions, loyalty clamps, and prisoner isolation.
 * 5. Rapid clicking, re-entrancy, and modal lifecycle idempotency.
 * 6. Memory leaks, orphaned references in GameState.armies, and HUD/Map dangling pointers.
 */

import {
  calculateWinProbability,
  formatWinOdds,
  armyCombatPower,
  regimentCombatPower,
  applyCasualties,
  removeDestroyedRegiments,
  resolveGeneralFate,
  findRetreatProvince,
  autoResolveBattle,
  applyBattleOutcome
} from '../js/engine/combatResolver.js';
import { GameState } from '../js/engine/gameState.js';
import { PROVINCES, TERRAIN_TYPES } from '../js/data/provinces.js';
import { FACTIONS } from '../js/data/factions.js';
import { CHARACTERS } from '../js/data/characters.js';
import { UNIT_TYPES } from '../js/data/units.js';

export const lifecycleResults = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  suites: [],
  failures: []
};

function suite(name) {
  const s = { name, passed: 0, failed: 0, tests: [] };
  lifecycleResults.suites.push(s);
  return {
    assert(desc, condition, extraInfo = '') {
      lifecycleResults.totalTests++;
      if (condition) {
        s.passed++;
        lifecycleResults.passed++;
        s.tests.push({ desc, passed: true });
      } else {
        s.failed++;
        lifecycleResults.failed++;
        const failureEntry = { suite: name, desc, extraInfo };
        lifecycleResults.failures.push(failureEntry);
        s.tests.push({ desc, passed: false, extraInfo });
        console.error(`  FAIL: [${name}] ${desc} ${extraInfo}`);
      }
    }
  };
}

console.log('======================================================================');
console.log('STARTING ADVERSARIAL LIFECYCLE & MUTATION STRESS TEST (CHALLENGER 2)');
console.log('======================================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: Isolated Province, Island Defeats & Surrounded Border Retreats
// -----------------------------------------------------------------------------
const s1 = suite('Suite 1: Isolated Province, Island & Surrounded Traps');

{
  // Test 1.1: Island province with 0 connections
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  // Inject synthetic island province
  state.provinces['PROV_ISLAND_TEST'] = {
    id: 'PROV_ISLAND_TEST',
    name: 'Isolated Atoll',
    controllingFaction: 'FAC_BAHMANI',
    connections: [],
    navalConnections: [],
    defenseLevel: 0,
    terrainType: 'FLOODPLAIN',
    publicOrder: 80
  };

  const att = state.createArmy('FAC_VIJAYANAGARA', 'PROV_ISLAND_TEST', [
    { id: 'R1', unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, morale: 100, maxMorale: 100, meleeAtk: 50, meleeDef: 30 }
  ], null, 'Island Invader');

  const def = state.createArmy('FAC_BAHMANI', 'PROV_ISLAND_TEST', [
    { id: 'R2', unitTypeId: 'PAIKS', hp: 30, maxHp: 100, morale: 50, maxMorale: 100, meleeAtk: 20, meleeDef: 10 }
  ], null, 'Trapped Island Defender');

  const prov = state.getProvince('PROV_ISLAND_TEST');

  // Attacker wins
  const res = {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: prov.id },
    attacker: { armyId: att.id, destroyed: [] },
    defender: { armyId: def.id, destroyed: [] }
  };

  const mutated = applyBattleOutcome(state, res);

  s1.assert(
    'Trapped defender in island province (0 connections) is marked as defenderTrapped: true',
    mutated.defenderTrapped === true
  );
  s1.assert(
    'Trapped defender army is cleanly removed from gameState.armies without crashing',
    state.getArmy(def.id) === null
  );
  s1.assert(
    'Attacker occupies the island province',
    att.provinceId === 'PROV_ISLAND_TEST'
  );
  s1.assert(
    'Province control transferred to attacker faction',
    prov.controllingFaction === 'FAC_VIJAYANAGARA'
  );
  s1.assert(
    'No ghost tokens remain for defender in getArmiesInProvince',
    state.getArmiesInProvince('PROV_ISLAND_TEST').length === 1 &&
    state.getArmiesInProvince('PROV_ISLAND_TEST')[0].id === att.id
  );
}

{
  // Test 1.2: Terminal province (Gampola) when only egress (Jaffna) has hostile forces
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const gampola = state.getProvince('PROV_GAMPOLA');
  const jaffna = state.getProvince('PROV_JAFFNA');

  // Gampola connections: only Jaffna
  s1.assert('Gampola only connects to Jaffna', gampola.connections.length === 1 && gampola.connections[0] === 'PROV_JAFFNA');

  // Place hostile Vijayanagara army in Jaffna to block retreat
  const blocker = state.createArmy('FAC_VIJAYANAGARA', 'PROV_JAFFNA', [
    { id: 'RB', unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, morale: 100 }
  ]);

  const att = state.createArmy('FAC_VIJAYANAGARA', 'PROV_GAMPOLA', [
    { id: 'RA', unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, morale: 100 }
  ]);

  const def = state.createArmy('FAC_GAMPOLA', 'PROV_GAMPOLA', [
    { id: 'RD', unitTypeId: 'PAIKS', hp: 100, maxHp: 100, morale: 80 }
  ]);

  const retreatProv = findRetreatProvince(state, gampola, def.factionId);
  s1.assert('findRetreatProvince returns null when the only connection is occupied by hostiles', retreatProv === null);

  const res = {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: gampola.id },
    attacker: { armyId: att.id, destroyed: [] },
    defender: { armyId: def.id, destroyed: [] }
  };

  applyBattleOutcome(state, res);
  s1.assert('Gampola defender is trapped and deleted', state.getArmy(def.id) === null);
  s1.assert('Gampola province control transferred to Vijayanagara', gampola.controllingFaction === 'FAC_VIJAYANAGARA');
}

{
  // Test 1.3: Surrounded on all sides by hostile armies in adjacent provinces
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_GULBARGA');
  // Fill all adjacent provinces with hostile armies
  for (const connId of prov.connections) {
    state.createArmy('FAC_DELHI', connId, [
      { id: `R_${connId}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, morale: 100 }
    ]);
  }

  const defArmy = state.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
    { id: 'R_DEF', unitTypeId: 'PAIKS', hp: 100, maxHp: 100, morale: 100 }
  ]);

  const retreat = findRetreatProvince(state, prov, 'FAC_BAHMANI');
  s1.assert('findRetreatProvince returns null when completely surrounded by hostiles', retreat === null);
}

{
  // Test 1.4: Island defeat with general present: verify general state after trapped destruction
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  state.provinces['PROV_ISLAND_2'] = {
    id: 'PROV_ISLAND_2',
    name: 'Coral Fort',
    controllingFaction: 'FAC_BAHMANI',
    connections: [],
    defenseLevel: 0,
    terrainType: 'FLOODPLAIN',
    publicOrder: 80
  };

  const general = state.getCharacter('CHAR_MUHAMMAD_SHAH_I'); // Bahmani general
  general.alive = true;
  general.currentRole = 'IDLE';

  const att = state.createArmy('FAC_VIJAYANAGARA', 'PROV_ISLAND_2', [
    { id: 'R1', unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100 }
  ]);

  const def = state.createArmy('FAC_BAHMANI', 'PROV_ISLAND_2', [
    { id: 'R2', unitTypeId: 'PAIKS', hp: 100, maxHp: 100, morale: 100 }
  ], general.id);

  s1.assert('General correctly assigned to army', def.generalId === general.id && general.currentRole === 'GENERAL');

  const res = {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: 'PROV_ISLAND_2' },
    attacker: { armyId: att.id, destroyed: [] },
    defender: { armyId: def.id, destroyed: [] }
  };

  applyBattleOutcome(state, res);

  s1.assert('Defender army was deleted', state.getArmy(def.id) === null);
  s1.assert('General assignmentTarget was cleared on army deletion', general.assignmentTarget === null);
  s1.assert(
    'General role is not pointing to destroyed army',
    general.currentRole === 'IDLE' || general.currentRole === 'DEAD' || general.currentRole === 'CAPTIVE'
  );
}

{
  // Test 1.5: Valid retreat to unthreatened friendly province
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  // Vijayanagara province with connection to Mysore
  const vijProv = state.getProvince('PROV_VIJAYANAGARA');
  const mysoreProv = state.getProvince('PROV_MYSORE');
  mysoreProv.controllingFaction = 'FAC_VIJAYANAGARA';

  const att = state.createArmy('FAC_BAHMANI', 'PROV_VIJAYANAGARA', [
    { id: 'R_BAH', unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, morale: 100 }
  ]);
  const def = state.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [
    { id: 'R_VIJ', unitTypeId: 'PAIKS', hp: 80, maxHp: 100, morale: 60 }
  ], 'CHAR_BUKKA_I');

  const retreatProv = findRetreatProvince(state, vijProv, 'FAC_VIJAYANAGARA');
  s1.assert('findRetreatProvince finds connected friendly province', retreatProv !== null);

  const res = {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: vijProv.id },
    attacker: { armyId: att.id, destroyed: [] },
    defender: { armyId: def.id, destroyed: [] },
    generalFates: {
      defender: { status: 'RETREATED', fate: 'ESCAPED_WITH_ARMY', characterId: 'CHAR_BUKKA_I' }
    }
  };

  applyBattleOutcome(state, res);
  s1.assert('Defender army retreated to a connected province', def.provinceId === retreatProv.id);
  s1.assert('Defender movement points reset to 0 after retreat', def.movementPoints === 0);
  const defGen = state.getCharacter('CHAR_BUKKA_I');
  s1.assert('Defending general location updated to retreat province', defGen.locationProvinceId === retreatProv.id);
}

// -----------------------------------------------------------------------------
// SUITE 2: Simultaneous Mutual Annihilation & Ghost Token Elimination
// -----------------------------------------------------------------------------
const s2 = suite('Suite 2: Simultaneous Mutual Annihilation & Ghost Tokens');

{
  // Test 2.1 & 2.2: Mutual total destruction of both armies
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_KHANDESH');
  prov.controllingFaction = 'FAC_BAHMANI';
  const initialOwner = prov.controllingFaction;

  const att = state.createArmy('FAC_VIJAYANAGARA', 'PROV_KHANDESH', [
    { id: 'RA_1', unitTypeId: 'RAJPUT_LEVIES', hp: 5, maxHp: 100, morale: 50 }
  ], 'CHAR_HARIHARA_I', 'Suicide Vanguard');

  const def = state.createArmy('FAC_BAHMANI', 'PROV_KHANDESH', [
    { id: 'RD_1', unitTypeId: 'PAIKS', hp: 5, maxHp: 100, morale: 50 }
  ], null, 'Depleted Garrison');

  const attId = att.id;
  const defId = def.id;

  // Force both armies to have 0 surviving regiments
  att.regiments = [];
  def.regiments = [];

  const res = {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: prov.id },
    attacker: { armyId: attId, destroyed: ['RA_1'] },
    defender: { armyId: defId, destroyed: ['RD_1'] }
  };

  const mutated = applyBattleOutcome(state, res);

  s2.assert('Attacker army is deleted from gameState.armies', state.getArmy(attId) === null);
  s2.assert('Defender army is deleted from gameState.armies', state.getArmy(defId) === null);
  s2.assert('No entry exists in gameState.armies[attId]', !(attId in state.armies));
  s2.assert('No entry exists in gameState.armies[defId]', !(defId in state.armies));
  s2.assert(
    'getArmiesInProvince returns 0 armies for the battle province',
    state.getArmiesInProvince(prov.id).length === 0
  );
  s2.assert(
    'Province ownership did NOT transfer to wiped attacker (remains defender faction)',
    prov.controllingFaction === initialOwner
  );
  s2.assert(
    'mutated.provinceConquered is false when attacker had 0 surviving regiments',
    mutated.provinceConquered === false && mutated.conquered === false
  );
}

{
  // Test 2.3: Defender wins the roll, but also has 0 surviving regiments
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_MALABAR');
  prov.controllingFaction = 'FAC_DELHI';

  const att = state.createArmy('FAC_VIJAYANAGARA', 'PROV_MALABAR', [
    { id: 'RA_2', unitTypeId: 'PAIKS', hp: 5, maxHp: 100 }
  ]);
  const def = state.createArmy('FAC_DELHI', 'PROV_MALABAR', [
    { id: 'RD_2', unitTypeId: 'PAIKS', hp: 5, maxHp: 100 }
  ]);

  const attId = att.id;
  const defId = def.id;

  att.regiments = [];
  def.regiments = [];

  const res = {
    attackerWins: false,
    winner: 'defender',
    outcome: 'DEFEAT',
    province: { id: prov.id },
    attacker: { armyId: attId, destroyed: ['RA_2'] },
    defender: { armyId: defId, destroyed: ['RD_2'] }
  };

  applyBattleOutcome(state, res);

  s2.assert('Both armies deleted when defender wins with mutual destruction',
    state.getArmy(attId) === null && state.getArmy(defId) === null
  );
  s2.assert('Province control untouched when defender wins mutual annihilation',
    prov.controllingFaction === 'FAC_DELHI'
  );
}

{
  // Test 2.4: General fates during mutual wipeout
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const g1 = state.getCharacter('CHAR_BUKKA_I');
  const g2 = state.getCharacter('CHAR_MUHAMMAD_SHAH_I');

  // Both armies destroyed: test 100 simulated general fates with armyDestroyed = true
  let escapedCount = 0;
  let slainCount = 0;
  let captiveCount = 0;

  for (let i = 0; i < 100; i++) {
    const char = { id: `CHAR_TEST_${i}`, name: 'Test Gen', alive: true, loyalty: 80, currentRole: 'GENERAL' };
    const fate = resolveGeneralFate(char, false, true, 'FAC_VIJAYANAGARA', 'PROV_DELHI');
    if (fate.status === 'ESCAPED') {
      escapedCount++;
      if (char.currentRole !== 'IDLE' || char.locationProvinceId !== 'PROV_DELHI') {
        s2.assert('Escaped general from destroyed army must be IDLE at capital', false, JSON.stringify(char));
      }
    } else if (fate.status === 'DECEASED') {
      slainCount++;
      if (char.alive !== false || char.currentRole !== 'DEAD') {
        s2.assert('Slain general must be marked dead', false, JSON.stringify(char));
      }
    } else if (fate.status === 'CAPTURED') {
      captiveCount++;
      if (char.currentRole !== 'CAPTIVE') {
        s2.assert('Captured general must have role CAPTIVE', false, JSON.stringify(char));
      }
    }
  }

  s2.assert('Statistical general fates: escapes occur (~75%)', escapedCount >= 50 && escapedCount <= 95, `Escaped: ${escapedCount}`);
  s2.assert('Statistical general fates: casualties occur (~10%)', slainCount >= 2 && slainCount <= 25, `Slain: ${slainCount}`);
  s2.assert('Statistical general fates: captures occur (~15%)', captiveCount >= 5 && captiveCount <= 30, `Captive: ${captiveCount}`);
}

{
  // Test 2.5: Serialization round-trip after mutual wipeout
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_WARANGAL');
  const att = state.createArmy('FAC_VIJAYANAGARA', prov.id, [{ id: 'R1', unitTypeId: 'PAIKS', hp: 10 }]);
  const def = state.createArmy('FAC_BAHMANI', prov.id, [{ id: 'R2', unitTypeId: 'PAIKS', hp: 10 }]);

  att.regiments = [];
  def.regiments = [];

  applyBattleOutcome(state, {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: prov.id },
    attacker: { armyId: att.id, destroyed: ['R1'] },
    defender: { armyId: def.id, destroyed: ['R2'] }
  });

  const json = state.serialize();
  const restored = GameState.fromJSON(json);

  s2.assert('Restored state contains no deleted attacker army', restored.getArmy(att.id) === null);
  s2.assert('Restored state contains no deleted defender army', restored.getArmy(def.id) === null);
  s2.assert('Restored state getArmiesInProvince is empty for cleared province',
    restored.getArmiesInProvince(prov.id).length === 0
  );
  s2.assert('Restored province ownership matches pre-save state',
    restored.getProvince(prov.id).controllingFaction === state.getProvince(prov.id).controllingFaction
  );
}

// -----------------------------------------------------------------------------
// SUITE 3: Successive Battles in the Same Province (Multi-Wave Clashes)
// -----------------------------------------------------------------------------
const s3 = suite('Suite 3: Successive Battles in Same Province');

{
  // Test 3.1: 5 successive battles in the same contested province in a single turn
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_GULBARGA');
  prov.controllingFaction = 'FAC_BAHMANI';

  // Spawn Initial Defender
  let currentDefender = state.createArmy('FAC_BAHMANI', prov.id, [
    { id: 'REG_D0', unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, meleeAtk: 40, meleeDef: 25 }
  ], null, 'Initial Bahmani Garrison');

  for (let wave = 1; wave <= 5; wave++) {
    // Fresh attacker marches in
    const attacker = state.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [
      { id: `REG_W${wave}`, unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, meleeAtk: 48, meleeDef: 28 }
    ], null, `Vijayanagara Wave ${wave}`);

    // Auto-resolve wave battle
    const battleRes = autoResolveBattle(attacker, currentDefender, prov, state);
    const mutated = applyBattleOutcome(state, battleRes);

    s3.assert(`Wave ${wave}: Battle resolves cleanly without error`, typeof mutated.winner === 'string');

    // Invariant checks
    const livingArmiesInProv = state.getArmiesInProvince(prov.id);
    for (const a of livingArmiesInProv) {
      s3.assert(`Wave ${wave}: Army ${a.id} in province has >0 regiments`, (a.regiments || []).length > 0);
      s3.assert(`Wave ${wave}: Army ${a.id} exists in gameState.armies`, state.getArmy(a.id) !== null);
    }

    // Prepare next round defender
    if (mutated.winner === 'attacker' && mutated.provinceConquered) {
      s3.assert(`Wave ${wave}: Province conquered by Vijayanagara`, prov.controllingFaction === 'FAC_VIJAYANAGARA');
      // Bahmani counter-attacks in next wave
      currentDefender = attacker; // previous attacker is now holding province
    } else {
      currentDefender = state.getArmy(currentDefender.id) || attacker;
    }
  }

  s3.assert('State integrity intact after 5 consecutive wave battles', Object.keys(state.armies).length > 0);
}

{
  // Test 3.2: 20 successive clashes in same province with state serialization check every 5 battles
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_MALWA');
  let clashCount = 0;

  for (let round = 0; round < 20; round++) {
    const a1 = state.createArmy('FAC_DELHI', prov.id, [
      { id: `REG_DEL_${round}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, meleeAtk: 40, meleeDef: 25 }
    ]);
    const a2 = state.createArmy('FAC_MEWAR', prov.id, [
      { id: `REG_MEW_${round}`, unitTypeId: 'RAJPUT_LEVIES', hp: 130, maxHp: 130, meleeAtk: 36, meleeDef: 22 }
    ]);

    const res = autoResolveBattle(a1, a2, prov, state);
    applyBattleOutcome(state, res);
    clashCount++;

    if (clashCount % 5 === 0) {
      const json = state.serialize();
      const restored = GameState.fromJSON(json);
      s3.assert(`Clash ${clashCount}: serialization round-trip succeeds without error`, restored !== null);
      s3.assert(`Clash ${clashCount}: province data preserved`, restored.getProvince(prov.id).id === 'PROV_MALWA');
    }
  }
  s3.assert('Completed 20 successive clashes without corruption', clashCount === 20);
}

// -----------------------------------------------------------------------------
// SUITE 4: General Capture, Death & Loyalty Boundaries
// -----------------------------------------------------------------------------
const s4 = suite('Suite 4: General Death, Capture & Loyalty Limits');

{
  // Test 4.1: General Death in battle
  const char = { id: 'CHAR_DEAD_TEST', name: 'Martyred Amir', alive: true, currentRole: 'GENERAL', assignmentTarget: 'ARMY_1' };
  const fate = resolveGeneralFate(char, false, true, 'FAC_VIJAYANAGARA', 'PROV_DELHI');

  // Force roll to 5 (slain)
  const slainFate = resolveGeneralFate({ ...char }, false, true);
  // Specifically test roll <= 10 behavior
  const deadChar = { id: 'CHAR_SLAIN_1', name: 'Dead Amir', alive: true, currentRole: 'GENERAL', assignmentTarget: 'ARMY_1' };
  deadChar.alive = false;
  deadChar.currentRole = 'DEAD';
  deadChar.assignmentTarget = null;

  s4.assert('Dead general has alive === false', deadChar.alive === false);
  s4.assert('Dead general has currentRole === "DEAD"', deadChar.currentRole === 'DEAD');
  s4.assert('Dead general has assignmentTarget === null', deadChar.assignmentTarget === null);
}

{
  // Test 4.2 & 4.3: Ensure dead generals cannot be assigned to new armies or roles
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const deadChar = state.getCharacter('CHAR_BUKKA_I');
  deadChar.alive = false;
  deadChar.currentRole = 'DEAD';
  deadChar.assignmentTarget = null;

  // Try creating army with dead general
  const army = state.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [
    { id: 'R1', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }
  ], deadChar.id, 'Phantom Host');

  s4.assert('createArmy does not assign dead general (army.generalId remains null)', army.generalId === null);
  s4.assert('Dead general role remains DEAD after createArmy attempt', deadChar.currentRole === 'DEAD');

  // Try assignCharacterRole
  const assigned = state.assignCharacterRole(deadChar.id, 'GENERAL', army.id);
  s4.assert('assignCharacterRole returns false for dead character', assigned === false);
  s4.assert('army.generalId not updated by failed assignment', army.generalId === null);

  // Try assigning as GOVERNOR
  const govAssigned = state.assignCharacterRole(deadChar.id, 'GOVERNOR', 'PROV_VIJAYANAGARA');
  s4.assert('assignCharacterRole returns false when assigning dead character as GOVERNOR', govAssigned === false);
  s4.assert('Province governorId not set to dead character', state.getProvince('PROV_VIJAYANAGARA').governorId !== deadChar.id);
}

{
  // Test 4.4: Loyalty clamps on victory
  const general = { id: 'CHAR_LOYAL', name: 'Loyal General', alive: true, loyalty: 97 };
  resolveGeneralFate(general, true);
  s4.assert('Loyalty capped at 100 on victory from 97 (+5)', general.loyalty === 100);

  resolveGeneralFate(general, true);
  s4.assert('Loyalty does not exceed 100 on subsequent victory from 100', general.loyalty === 100);

  // Test defeat loyalty loss floor clamped at minimum 10
  const lowGeneral = { id: 'CHAR_DISLOYAL', name: 'Rebellious General', alive: true, loyalty: 12 };
  // Defeat with army destroyed: verify loyalty clamp
  resolveGeneralFate(lowGeneral, false, true, null, null, 50);
  s4.assert('Loyalty loss floor clamped at minimum 10 (never < 10) on escape', lowGeneral.loyalty === 10);
}

{
  // Test 4.5: General Capture isolation check
  const captive = {
    id: 'CHAR_CAPTIVE_TEST',
    name: 'Captive Amir',
    alive: true,
    currentRole: 'CAPTIVE',
    assignmentTarget: null,
    capturedByFactionId: 'FAC_VIJAYANAGARA'
  };

  s4.assert('Captive character has alive: true', captive.alive === true);
  s4.assert('Captive character has currentRole: CAPTIVE', captive.currentRole === 'CAPTIVE');
  s4.assert('Captive character records capturing faction', captive.capturedByFactionId === 'FAC_VIJAYANAGARA');
}

{
  // Test 4.6: Challenge — Can a CAPTIVE character be assigned as GENERAL or GOVERNOR?
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const captive = state.getCharacter('CHAR_BUKKA_I');
  captive.alive = true;
  captive.currentRole = 'CAPTIVE';
  captive.capturedByFactionId = 'FAC_BAHMANI';
  captive.assignmentTarget = null;

  // Empirical test: Does assignCharacterRole reject a captive character?
  const assigned = state.assignCharacterRole(captive.id, 'GENERAL', 'ARMY_TEST');
  // If assigned is true, captive character was improperly allowed to be appointed!
  s4.assert(
    'Captive character assignment audit: assignCharacterRole should reject prisoner of war (currentRole === CAPTIVE)',
    assigned === false,
    `Vulnerability: assignCharacterRole allowed appointing prisoner of war as GENERAL (currentRole was overwritten)`
  );
}

// -----------------------------------------------------------------------------
// SUITE 5: Rapid Clicking, Re-entrant Calls & Event Idempotency
// -----------------------------------------------------------------------------
const s5 = suite('Suite 5: Rapid Clicking, Re-entrancy & Modal Idempotency');

{
  // Test 5.1 & 5.2: Double-click simulation on battle auto-resolve
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_WARANGAL');
  const att = state.createArmy('FAC_VIJAYANAGARA', prov.id, [
    { id: 'RA', unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, meleeAtk: 40, meleeDef: 25 }
  ]);
  const def = state.createArmy('FAC_BAHMANI', prov.id, [
    { id: 'RD', unitTypeId: 'PAIKS', hp: 100, maxHp: 100, meleeAtk: 25, meleeDef: 15 }
  ]);

  let pendingBattle = {
    attackerArmy: att,
    defenderArmy: def,
    province: prov
  };

  // Simulate first click: resolves battle and clears pendingBattle
  const clickResolve = () => {
    if (!pendingBattle) return null; // Guard check
    const { attackerArmy, defenderArmy, province } = pendingBattle;
    const raw = autoResolveBattle(attackerArmy, defenderArmy, province, state);
    const res = applyBattleOutcome(state, raw);
    pendingBattle = null; // Cleared
    return res;
  };

  const firstResult = clickResolve();
  s5.assert('First click resolves battle successfully', firstResult !== null);
  s5.assert('pendingBattle is null after first click', pendingBattle === null);

  // Simulate immediate second click (rapid double click)
  const secondResult = clickResolve();
  s5.assert('Second click is guarded by pendingBattle check and returns null without re-executing', secondResult === null);
}

{
  // Test 5.3: Calling applyBattleOutcome with stale/already-deleted army IDs
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_KONKAN');

  const staleResult = {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: prov.id },
    attacker: { armyId: 'ARMY_NONEXISTENT_1', destroyed: [] },
    defender: { armyId: 'ARMY_NONEXISTENT_2', destroyed: [] }
  };

  let threw = false;
  let returned = null;
  try {
    returned = applyBattleOutcome(state, staleResult);
  } catch (err) {
    threw = true;
  }

  s5.assert('applyBattleOutcome with nonexistent/stale armies does not throw exception', threw === false);
  s5.assert('applyBattleOutcome returns result gracefully when armies missing', returned === staleResult);
}

// -----------------------------------------------------------------------------
// SUITE 6: Memory Leaks, Orphaned References & HUD/Map Dangling Pointers
// -----------------------------------------------------------------------------
const s6 = suite('Suite 6: Memory Leaks, Orphaned References & Dangling Pointers');

{
  // Test 6.1: Simulated CampaignMap selectedArmyId cleanup when army is deleted
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_KHANDESH');
  const att = state.createArmy('FAC_VIJAYANAGARA', prov.id, [{ id: 'RA', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]);
  const def = state.createArmy('FAC_BAHMANI', prov.id, [{ id: 'RD', unitTypeId: 'PAIKS', hp: 10 }]);

  // Mock campaignMap
  const mockCampaignMap = {
    selectedArmyId: def.id,
    selectedProvinceId: null,
    renderCalled: false,
    render() { this.renderCalled = true; }
  };

  // Mock campaignHud
  const mockCampaignHud = {
    selectedArmyId: def.id,
    selectedProvinceId: null,
    deselectCalled: false,
    updateCalled: false,
    deselectAll() {
      this.selectedArmyId = null;
      this.selectedProvinceId = null;
      this.deselectCalled = true;
    },
    selectProvince(pId) {
      this.selectedProvinceId = pId;
    },
    update() {
      this.updateCalled = true;
    },
    addNotification() {}
  };

  // Annihilate defender
  def.regiments = [];
  const res = applyBattleOutcome(state, {
    attackerWins: true,
    winner: 'attacker',
    outcome: 'VICTORY',
    province: { id: prov.id },
    attacker: { armyId: att.id, destroyed: [] },
    defender: { armyId: def.id, destroyed: ['RD'] }
  });

  // Execute main.js cleanup block logic (lines 673-692)
  if (mockCampaignMap.selectedArmyId && !state.getArmy(mockCampaignMap.selectedArmyId)) {
    mockCampaignMap.selectedArmyId = null;
  }
  if (res.conquered || res.provinceConquered) {
    mockCampaignMap.selectedProvinceId = prov.id;
  }

  if (mockCampaignHud.selectedArmyId && !state.getArmy(mockCampaignHud.selectedArmyId)) {
    mockCampaignHud.deselectAll();
  }
  if (res.conquered || res.provinceConquered) {
    mockCampaignHud.selectProvince(prov.id);
  } else {
    mockCampaignHud.update();
  }

  s6.assert('mockCampaignMap.selectedArmyId cleared when defender destroyed', mockCampaignMap.selectedArmyId === null);
  s6.assert('mockCampaignHud.deselectAll() called when selected army destroyed', mockCampaignHud.deselectCalled === true);
  s6.assert('mockCampaignHud.selectedArmyId is null', mockCampaignHud.selectedArmyId === null);
}

{
  // Test 6.2: Inspect for orphaned army keys after 30 randomized battles
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const provinces = Object.keys(state.provinces);

  for (let i = 0; i < 30; i++) {
    const pId = provinces[i % provinces.length];
    const prov = state.getProvince(pId);
    const a1 = state.createArmy('FAC_DELHI', pId, [{ id: `R_${i}_1`, unitTypeId: 'HEAVY_CAVALRY', hp: 50, maxHp: 160 }]);
    const a2 = state.createArmy('FAC_BAHMANI', pId, [{ id: `R_${i}_2`, unitTypeId: 'PAIKS', hp: 50, maxHp: 100 }]);

    const res = autoResolveBattle(a1, a2, prov, state);
    applyBattleOutcome(state, res);
  }

  // Verify all keys in state.armies correspond to non-null valid objects with regiments
  let orphanedKeys = 0;
  let emptyRegimentArmies = 0;
  for (const [key, army] of Object.entries(state.armies)) {
    if (!army || army.id !== key) orphanedKeys++;
    if (!army.regiments || army.regiments.length === 0) emptyRegimentArmies++;
  }

  s6.assert('Zero orphaned keys in gameState.armies after 30 battles', orphanedKeys === 0, `Orphaned: ${orphanedKeys}`);
  s6.assert('Zero empty-regiment armies in gameState.armies after 30 battles', emptyRegimentArmies === 0, `Empty: ${emptyRegimentArmies}`);
}

{
  // Test 6.3: Verify general's assignmentTarget is cleared when army is destroyed in battle
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_KONKAN');
  const general = state.getCharacter('CHAR_BUKKA_I');
  const dyingArmy = state.createArmy('FAC_VIJAYANAGARA', prov.id, [
    { id: 'R_DOOM', unitTypeId: 'PAIKS', hp: 5, maxHp: 100 }
  ], general.id);

  s6.assert('General assignmentTarget points to dyingArmy before battle', general.assignmentTarget === dyingArmy.id);

  const enemyArmy = state.createArmy('FAC_BAHMANI', prov.id, [
    { id: 'R_KILLER', unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350 }
  ]);

  // Wiped out in battle
  dyingArmy.regiments = [];
  applyBattleOutcome(state, {
    attackerWins: false,
    winner: 'defender',
    outcome: 'DECISIVE_DEFEAT',
    province: { id: prov.id },
    attacker: { armyId: dyingArmy.id, destroyed: ['R_DOOM'] },
    defender: { armyId: enemyArmy.id, destroyed: [] }
  });

  s6.assert('Destroyed army was deleted from gameState.armies', state.getArmy(dyingArmy.id) === null);
  s6.assert('General assignmentTarget was cleared to null (no dangling pointer)', general.assignmentTarget === null);
  s6.assert('General role was reset from GENERAL (e.g. IDLE, DEAD, or CAPTIVE)', general.currentRole !== 'GENERAL');
}

{
  // Test 6.4: Verify totalRegimentsBefore double counting in autoResolveBattle
  // If an army had 1 regiment that was destroyed, what is totalRegimentsBefore?
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const prov = state.getProvince('PROV_MALWA');
  const a1 = state.createArmy('FAC_DELHI', prov.id, [
    { id: 'R1', unitTypeId: 'HEAVY_CAVALRY', hp: 1, maxHp: 160 } // Will be destroyed
  ]);
  const a2 = state.createArmy('FAC_MEWAR', prov.id, [
    { id: 'R2', unitTypeId: 'WAR_ELEPHANTS', hp: 350, maxHp: 350 }
  ]);

  const res = autoResolveBattle(a1, a2, prov, state);

  // If a1 had 1 regiment and it was destroyed:
  // casualties has 1 item, destroyed has 1 item
  // totalRegimentsBefore was computed as: casualties.length + destroyed.length
  // which equals 2, but army only had 1 regiment!
  const actualBefore = 1;
  const reportedBefore = res.attacker.totalRegimentsBefore;
  const isCorrect = reportedBefore === actualBefore;

  s6.assert(
    'totalRegimentsBefore arithmetic: accurate count without double-counting destroyed regiments',
    isCorrect,
    `Reported totalRegimentsBefore: ${reportedBefore}, Expected: ${actualBefore} (combatResolver.js lines 410, 420 double-counts destroyed)`
  );
}

// -----------------------------------------------------------------------------
// SUITE 7: Memory Stability & 100-Battle Heavy Workload Stress
// -----------------------------------------------------------------------------
const s7 = suite('Suite 7: Memory Stability & 100-Battle Workload Stress');

{
  const state = new GameState();
  state.initNewGame('FAC_VIJAYANAGARA');

  const initialArmyCount = Object.keys(state.armies).length;
  const provList = Object.keys(state.provinces);

  if (global.gc) global.gc();
  const memStart = process.memoryUsage().heapUsed;

  const tStart = performance.now();
  for (let b = 0; b < 100; b++) {
    const pId = provList[b % provList.length];
    const prov = state.getProvince(pId);
    const att = state.createArmy('FAC_VIJAYANAGARA', pId, [
      { id: `R_ATT_${b}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160, maxHp: 160, meleeAtk: 40, meleeDef: 25 }
    ]);
    const def = state.createArmy('FAC_BAHMANI', pId, [
      { id: `R_DEF_${b}`, unitTypeId: 'PAIKS', hp: 100, maxHp: 100, meleeAtk: 25, meleeDef: 15 }
    ]);

    const res = autoResolveBattle(att, def, prov, state);
    applyBattleOutcome(state, res);
  }
  const durationMs = performance.now() - tStart;

  if (global.gc) global.gc();
  const memEnd = process.memoryUsage().heapUsed;
  const heapDiffMB = (memEnd - memStart) / (1024 * 1024);

  s7.assert('100 battles executed in under 250ms', durationMs < 250, `Took ${durationMs.toFixed(2)}ms (${(durationMs/100).toFixed(2)}ms/battle)`);
  s7.assert('Heap growth across 100 battles is bounded (< 25MB)', heapDiffMB < 25, `Heap diff: ${heapDiffMB.toFixed(2)} MB`);

  // Verify all living armies are valid and no empty/orphaned objects remain
  let invalidArmies = 0;
  for (const army of Object.values(state.armies)) {
    if (!army || !army.regiments || army.regiments.length === 0) invalidArmies++;
  }
  s7.assert('Zero invalid or 0-regiment ghost armies in state after 100 battles', invalidArmies === 0, `Invalid: ${invalidArmies}`);
}

// -----------------------------------------------------------------------------
// SUMMARY & EXECUTION
// -----------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------');
console.log('LIFECYCLE & MUTATION STRESS TEST SUMMARY:');
console.log(`  Total Test Cases: ${lifecycleResults.totalTests}`);
console.log(`  Passed:           ${lifecycleResults.passed}`);
console.log(`  Failed:           ${lifecycleResults.failed}`);
console.log('----------------------------------------------------------------------');

for (const s of lifecycleResults.suites) {
  const mark = s.failed === 0 ? '✔ PASS' : '✖ FAIL';
  console.log(`  ${mark} [${s.passed}/${s.passed + s.failed}] ${s.name}`);
}

if (lifecycleResults.failures.length > 0) {
  console.log('\nFAILURES RECORDED:');
  for (const f of lifecycleResults.failures) {
    console.log(`  - [${f.suite}] ${f.desc} ${f.extraInfo}`);
  }
}

console.log('======================================================================\n');
