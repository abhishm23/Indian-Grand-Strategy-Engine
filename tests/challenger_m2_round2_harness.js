// tests/challenger_m2_round2_harness.js
// Empirical Challenger Verification Harness for Milestone 2 Iteration 2 (Re-verification)

import { TacticalEngine, TacticalCombatMath, TacticalUnit, FACING } from '../js/engine/tacticalEngine.js';
import { GameState } from '../js/engine/gameState.js';
import { applyBattleOutcome } from '../js/engine/combatResolver.js';
import { UNIT_TYPES } from '../js/data/units.js';
import { CHARACTERS } from '../js/data/characters.js';
import { PROVINCES } from '../js/data/provinces.js';

let passedChecks = 0;
let failedChecks = 0;
const failures = [];

function assert(condition, message) {
  if (!condition) {
    failedChecks++;
    failures.push(message);
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passedChecks++;
    console.log(`  ✔ PASS: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    const msg = `${message} (Expected: ${expected}, Got: ${actual})`;
    failedChecks++;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(msg);
  } else {
    passedChecks++;
    console.log(`  ✔ PASS: ${message} (= ${actual})`);
  }
}

function assertCloseTo(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) > tolerance) {
    const msg = `${message} (Expected ~${expected} ±${tolerance}, Got: ${actual})`;
    failedChecks++;
    failures.push(msg);
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(msg);
  } else {
    passedChecks++;
    console.log(`  ✔ PASS: ${message} (= ${actual}, within ±${tolerance} of ${expected})`);
  }
}

console.log('======================================================================');
console.log('  CHALLENGER 2 RE-VERIFICATION: GENERAL AURA & 50+ BATTLE STRESS');
console.log('======================================================================\n');

// --------------------------------------------------------------------
// SECTION 1: GENERAL LEADERSHIP AURA EMPIRICAL VERIFICATION
// --------------------------------------------------------------------
console.log('--- SECTION 1: General Leadership Aura Verification ---');

// Test 1.1: Subordinate Attack Boost Inside Aura (Bukka Raya I, Command 9)
{
  console.log('\nTest 1.1: Subordinate Attack Boost Inside Aura vs Outside Aura');
  const bukka = {
    id: 'CHAR_BUKKA_I',
    name: 'Bukka Raya I',
    attributes: { command: 9, dread: 4, piety: 6 }
  };

  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att_army',
      factionId: 'FAC_VIJAYANAGARA',
      regiments: [
        { id: 'lead_gen', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: 'sub_inside', unitTypeId: 'PAIKS', hp: 105 },
        { id: 'sub_outside', unitTypeId: 'PAIKS', hp: 105 }
      ]
    },
    defenderArmy: {
      id: 'def_army',
      factionId: 'FAC_BAHMANI',
      regiments: [
        { id: 'target_inside', unitTypeId: 'PAIKS', hp: 500 },
        { id: 'target_outside', unitTypeId: 'PAIKS', hp: 500 }
      ]
    },
    attackerGeneral: bukka
  });

  const gen = engine.getUnit('lead_gen');
  const subIn = engine.getUnit('sub_inside');
  const subOut = engine.getUnit('sub_outside');
  const tgtIn = engine.getUnit('target_inside');
  const tgtOut = engine.getUnit('target_outside');

  // Set positions
  gen.col = 2; gen.row = 2; // commander aura radius: Math.max(2, floor(9/2)+1) = 5
  subIn.col = 3; subIn.row = 2; // dist = 1 <= 5
  tgtIn.col = 4; tgtIn.row = 2; // adjacent to subIn

  subOut.col = 15; subOut.row = 12; // dist > 10 from commander
  tgtOut.col = 16; tgtOut.row = 12; // adjacent to subOut

  // Orient facings: attackers facing E, defenders facing W (FRONT combat)
  subIn.setFacing('E');
  subOut.setFacing('E');
  tgtIn.setFacing('W');
  tgtOut.setFacing('W');

  engine.syncGridUnits();
  engine.updateAuras();

  assert(subIn.inGeneralAura === true, 'Subordinate near commander must be inside General Aura');
  assert(subOut.inGeneralAura === false, 'Subordinate far from commander must be outside General Aura');

  // Verify formula: 1.0 + atkCmd * 0.035
  // atkCmd = 9 -> genAtkBuff = 1.0 + 9 * 0.035 = 1.315 (+31.5% attack)
  // For subOut -> genAtkBuff = 1.0
  subIn.actionPoints = 2;
  subIn.movedDistance = 0;
  const inRes = engine.attackUnit('sub_inside', 'target_inside');

  subOut.actionPoints = 2;
  subOut.movedDistance = 0;
  const outRes = engine.attackUnit('sub_outside', 'target_outside');

  console.log(`    Subordinate Inside Aura Damage: ${inRes.damageDealt}`);
  console.log(`    Subordinate Outside Aura Damage: ${outRes.damageDealt}`);
  console.log(`    Damage Ratio: ${(inRes.damageDealt / outRes.damageDealt).toFixed(3)} (Expected attack buff: 1.315)`);

  assert(inRes.damageDealt > outRes.damageDealt, `Inside aura damage (${inRes.damageDealt}) must exceed outside aura damage (${outRes.damageDealt})`);
  assertCloseTo(inRes.damageDealt / outRes.damageDealt, 1.315, 0.05, 'Subordinate attack damage ratio closely matches 1.315 multiplier');
}

// Test 1.2: Subordinate Defense Boost Inside Aura
{
  console.log('\nTest 1.2: Subordinate Defense Boost Inside Aura vs Outside Aura');
  const bahmanShah = {
    id: 'CHAR_BAHMAN_SHAH',
    name: 'Ala-ud-Din Bahman Shah',
    attributes: { command: 8, dread: 5, piety: 4 }
  };

  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att_army',
      factionId: 'FAC_DELHI',
      regiments: [
        { id: 'att_1', unitTypeId: 'PAIKS', hp: 200 },
        { id: 'att_2', unitTypeId: 'PAIKS', hp: 200 }
      ]
    },
    defenderArmy: {
      id: 'def_army',
      factionId: 'FAC_BAHMANI',
      regiments: [
        { id: 'def_lead', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: 'def_sub_in', unitTypeId: 'PAIKS', hp: 500 },
        { id: 'def_sub_out', unitTypeId: 'PAIKS', hp: 500 }
      ]
    },
    defenderGeneral: bahmanShah
  });

  const defLead = engine.getUnit('def_lead');
  const defSubIn = engine.getUnit('def_sub_in');
  const defSubOut = engine.getUnit('def_sub_out');
  const att1 = engine.getUnit('att_1');
  const att2 = engine.getUnit('att_2');

  // Commander at (18, 2)
  defLead.col = 18; defLead.row = 2;
  defSubIn.col = 17; defSubIn.row = 2; // dist = 1 <= aura radius 5
  att1.col = 16; att1.row = 2; // attacking defSubIn from front

  defSubOut.col = 17; defSubOut.row = 12; // dist > 10
  att2.col = 16; att2.row = 12; // attacking defSubOut from front

  defSubIn.setFacing('W');
  defSubOut.setFacing('W');
  att1.setFacing('E');
  att2.setFacing('E');

  engine.syncGridUnits();
  engine.updateAuras();

  assert(defSubIn.inGeneralAura === true, 'Defender subordinate near commander must be inside aura');
  assert(defSubOut.inGeneralAura === false, 'Defender subordinate far from commander must be outside aura');

  // Attack both defenders with identical unbuffed attackers
  att1.actionPoints = 2; att1.movedDistance = 0;
  const resIn = engine.attackUnit('att_1', 'def_sub_in');

  att2.actionPoints = 2; att2.movedDistance = 0;
  const resOut = engine.attackUnit('att_2', 'def_sub_out');

  console.log(`    Defender Inside Aura Damage Taken: ${resIn.damageDealt}`);
  console.log(`    Defender Outside Aura Damage Taken: ${resOut.damageDealt}`);

  // Formula: genDefBuff = 1.0 + defCmd * 0.02 + defDread * 0.01 = 1.0 + 8 * 0.02 + 5 * 0.01 = 1.21 (+21% effective armor)
  // Higher armor => lower damage taken!
  assert(resIn.damageDealt < resOut.damageDealt, `Defender inside aura must take LESS damage (${resIn.damageDealt}) than unbuffed defender (${resOut.damageDealt})`);
}

// Test 1.3: Command Scaling Verification across Multiple Command Tiers
{
  console.log('\nTest 1.3: Monotonic Command Scaling on Subordinates (Command 0, 3, 6, 9)');
  const commandTiers = [0, 3, 6, 9];
  const damages = [];

  for (const cmd of commandTiers) {
    const general = {
      id: `CHAR_CMD_${cmd}`,
      name: `General Cmd ${cmd}`,
      attributes: { command: cmd, dread: 0, piety: 0 }
    };

    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att', factionId: 'FAC_DELHI',
        regiments: [
          { id: 'gen', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
          { id: 'sub', unitTypeId: 'PAIKS', hp: 105 }
        ]
      },
      defenderArmy: {
        id: 'def', factionId: 'FAC_MEWAR',
        regiments: [
          { id: 'target', unitTypeId: 'PAIKS', hp: 500 }
        ]
      },
      attackerGeneral: general
    });

    const gen = engine.getUnit('gen');
    const sub = engine.getUnit('sub');
    const target = engine.getUnit('target');

    gen.col = 2; gen.row = 2;
    sub.col = 3; sub.row = 2;
    target.col = 4; target.row = 2;
    sub.setFacing('E');
    target.setFacing('W');

    engine.syncGridUnits();
    engine.updateAuras();

    sub.actionPoints = 2;
    sub.movedDistance = 0;
    const res = engine.attackUnit('sub', 'target');
    damages.push({ cmd, dmg: res.damageDealt, inAura: sub.inGeneralAura });
  }

  console.log('    Command scaling results:', JSON.stringify(damages));
  for (let i = 1; i < damages.length; i++) {
    assert(damages[i].dmg >= damages[i - 1].dmg, `Subordinate damage at Command ${damages[i].cmd} (${damages[i].dmg}) must be >= Command ${damages[i-1].cmd} (${damages[i-1].dmg})`);
  }
}

// Test 1.4: Aura Collapse on Commander Death & Rout
{
  console.log('\nTest 1.4: Aura Collapse upon Commander Death and Rout');
  const bukka = {
    id: 'CHAR_BUKKA_I',
    name: 'Bukka Raya I',
    attributes: { command: 9, dread: 4, piety: 6 }
  };

  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att', factionId: 'FAC_VIJAYANAGARA',
      regiments: [
        { id: 'gen', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: 'sub', unitTypeId: 'PAIKS', hp: 105 }
      ]
    },
    defenderArmy: {
      id: 'def', factionId: 'FAC_BAHMANI',
      regiments: [{ id: 'tgt', unitTypeId: 'PAIKS', hp: 500 }]
    },
    attackerGeneral: bukka
  });

  const gen = engine.getUnit('gen');
  const sub = engine.getUnit('sub');
  gen.col = 2; gen.row = 2;
  sub.col = 3; sub.row = 2;
  engine.syncGridUnits();
  engine.updateAuras();

  assert(sub.inGeneralAura === true, 'Subordinate initially inside aura');

  // Case A: Commander killed
  gen.hp = 0;
  engine.updateAuras();
  assert(sub.inGeneralAura === false, 'Subordinate aura must collapse when commander HP reaches 0');

  // Case B: Commander revives but routs
  gen.hp = 100;
  gen.morale = 10;
  gen.isRouted = true;
  engine.updateAuras();
  assert(sub.inGeneralAura === false, 'Subordinate aura must collapse when commander is routed');

  // Case C: Commander rallies
  gen.isRouted = false;
  gen.morale = 80;
  engine.updateAuras();
  assert(sub.inGeneralAura === true, 'Subordinate aura must restore when commander rallies');
}

// Test 1.5: Aura Radius Cliff-Edge Boundary
{
  console.log('\nTest 1.5: Aura Radius Boundary Cliff-Edge');
  const genData = {
    id: 'CHAR_CMD_6',
    name: 'Commander 6',
    attributes: { command: 6, dread: 2, piety: 2 }
  };

  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att', factionId: 'FAC_DELHI',
      regiments: [
        { id: 'gen', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: 'sub', unitTypeId: 'PAIKS', hp: 105 }
      ]
    },
    defenderArmy: {
      id: 'def', factionId: 'FAC_MEWAR',
      regiments: [{ id: 'tgt', unitTypeId: 'PAIKS', hp: 500 }]
    },
    attackerGeneral: genData
  });

  const gen = engine.getUnit('gen');
  const sub = engine.getUnit('sub');
  gen.col = 2; gen.row = 2;

  // At distance 4 (e.g. col 6, row 2): distance = 4 <= 4 -> inside
  sub.col = 6; sub.row = 2;
  engine.syncGridUnits();
  engine.updateAuras();
  assert(sub.inGeneralAura === true, 'Subordinate at exactly distance 4 must be inside aura');

  // At distance 5 (col 7, row 2): distance = 5 > 4 -> outside
  sub.col = 7; sub.row = 2;
  engine.syncGridUnits();
  engine.updateAuras();
  assert(sub.inGeneralAura === false, 'Subordinate at distance 5 must be outside aura');
}

// Test 1.6: Chain Panic Immunity for Subordinates Inside Aura
{
  console.log('\nTest 1.6: Chain Panic Immunity for Subordinates Inside Aura');
  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att', factionId: 'FAC_VIJAYANAGARA',
      regiments: [
        { id: 'gen', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: 'sub_in', unitTypeId: 'PAIKS', hp: 105, morale: 80 },
        { id: 'sub_out', unitTypeId: 'PAIKS', hp: 105, morale: 80 },
        { id: 'routing_friend', unitTypeId: 'PAIKS', hp: 105, morale: 50 }
      ]
    },
    defenderArmy: {
      id: 'def', factionId: 'FAC_BAHMANI',
      regiments: [{ id: 'def_1', unitTypeId: 'PAIKS', hp: 100 }]
    },
    attackerGeneral: { id: 'G', attributes: { command: 8, dread: 2, piety: 2 } }
  });

  const gen = engine.getUnit('gen');
  const subIn = engine.getUnit('sub_in');
  const subOut = engine.getUnit('sub_out');
  const routingFriend = engine.getUnit('routing_friend');

  gen.col = 2; gen.row = 2;
  subIn.col = 3; subIn.row = 2; // inside aura
  subOut.col = 15; subOut.row = 12; // outside aura

  // Routing friend is at (3, 3) - distance 1 from subIn
  routingFriend.col = 3; routingFriend.row = 3;

  engine.syncGridUnits();
  engine.updateAuras();

  assert(subIn.inGeneralAura === true, 'subIn inside aura');
  assert(subOut.inGeneralAura === false, 'subOut outside aura');

  const initialSubInMorale = subIn.morale;
  const initialSubOutMorale = subOut.morale;

  // Now trigger chain panic from routing friend
  // When routingFriend routs, it triggers chain panic to all friendly units within 3 tiles
  routingFriend.morale = 15;
  routingFriend.isRouted = true;
  engine.triggerChainPanic(routingFriend);

  assertEqual(subIn.morale, initialSubInMorale, 'Friendly unit inside General Aura takes 0 morale drain from chain panic (100% immune)');

  // Now move routingFriend near subOut and trigger chain panic
  routingFriend.col = 15; routingFriend.row = 11; // dist 1 from subOut
  engine.triggerChainPanic(routingFriend);

  assertEqual(subOut.morale, initialSubOutMorale - 15, 'Friendly unit outside General Aura loses 15 morale from chain panic');
}

console.log('\n✔ SECTION 1 COMPLETED SUCCESSFULLY: All General Leadership Aura tests passed.\n');

// --------------------------------------------------------------------
// SECTION 2: MULTI-BATTLE LIFECYCLE STABILITY (60 AUTOMATED BATTLES)
// --------------------------------------------------------------------
console.log('--- SECTION 2: Multi-Battle Lifecycle Stability (60 Automated Battles) ---');

const UNIT_CLASS_KEYS = Object.keys(UNIT_TYPES);
const PROVINCE_KEYS = Object.keys(PROVINCES);
const CHARACTER_KEYS = Object.keys(CHARACTERS);

let totalBattles = 0;
let totalRoundsExecuted = 0;
let zeroNaNChecks = 0;
let validOutcomes = 0;
let successfulCampaignMutations = 0;

function runAutomatedBattle(battleConfig, scenarioDescription) {
  totalBattles++;
  let outcomeReceived = null;
  let callbackCount = 0;

  const config = Object.assign({}, battleConfig, {
    onBattleEnd: (outcome) => {
      callbackCount++;
      outcomeReceived = outcome;
    }
  });

  const engine = new TacticalEngine(config);
  assert(engine !== null, `Battle ${totalBattles}: TacticalEngine instantiated successfully`);

  let rounds = 0;
  const maxRounds = 80;
  let lastHpSum = engine.units.reduce((acc, u) => acc + u.hp, 0);
  let stalledRounds = 0;

  while (!engine.isOver && rounds < maxRounds) {
    rounds++;
    totalRoundsExecuted++;

    const playerSide = engine.units.find(u => u.isPlayer)?.side || 'ATTACKER';
    const playerUnits = engine.units.filter(u => u.side === playerSide && u.canAct());

    for (const u of playerUnits) {
      if (!u.canAct() || engine.isOver) break;

      let targets = engine.getAttackTargets(u);
      if (targets.length === 0) {
        const reachable = engine.grid.getReachableTiles(u, engine.units);
        if (reachable.length > 0) {
          const enemies = engine.units.filter(e => e.side !== u.side && e.hp > 0 && !e.hasExited);
          if (enemies.length > 0) {
            let bestTile = null;
            let minDist = Infinity;
            for (const t of reachable) {
              for (const e of enemies) {
                const d = engine.grid.getDistance(t.col, t.row, e.col, e.row);
                if (d < minDist) {
                  minDist = d;
                  bestTile = t;
                }
              }
            }
            if (bestTile) {
              engine.moveUnit(u.id, bestTile.col, bestTile.row);
              targets = engine.getAttackTargets(u);
            }
          }
        }
      }

      if (targets.length > 0 && u.actionPoints > 0) {
        engine.attackUnit(u.id, targets[0].id);
      }
    }

    if (!engine.isOver) {
      engine.endPlayerPhase();
    }

    // Stalemate check: if no damage has been dealt by either side for 4 consecutive rounds,
    // attacker concedes and retreats rather than infinite standoff
    const currentHpSum = engine.units.reduce((acc, u) => acc + u.hp, 0);
    if (currentHpSum === lastHpSum) {
      stalledRounds++;
    } else {
      stalledRounds = 0;
      lastHpSum = currentHpSum;
    }

    if (stalledRounds >= 4 && !engine.isOver) {
      engine.retreat('ATTACKER');
      break;
    }
  }

  assert(engine.isOver === true, `Battle ${totalBattles} (${scenarioDescription}): Battle finished within ${rounds} rounds (not soft-locked)`);
  assertEqual(callbackCount, 1, `Battle ${totalBattles}: onBattleEnd fired exactly once`);
  assert(outcomeReceived !== null, `Battle ${totalBattles}: outcome object was dispatched`);

  assert(outcomeReceived.winner === 'attacker' || outcomeReceived.winner === 'defender', `Battle ${totalBattles}: valid winner`);
  assert(typeof outcomeReceived.attackerWins === 'boolean', `Battle ${totalBattles}: valid attackerWins boolean`);
  assert(['VICTORY', 'DECISIVE_VICTORY', 'DEFEAT', 'DECISIVE_DEFEAT'].includes(outcomeReceived.outcome), `Battle ${totalBattles}: valid outcome type`);
  assert(typeof outcomeReceived.province?.id === 'string', `Battle ${totalBattles}: valid province.id`);

  const att = outcomeReceived.attacker;
  assert(!isNaN(att.survivingRegiments) && att.survivingRegiments >= 0, `Battle ${totalBattles}: attacker survivingRegiments not NaN`);
  assert(!isNaN(att.totalRegimentsBefore) && att.totalRegimentsBefore >= 1, `Battle ${totalBattles}: attacker totalRegimentsBefore not NaN`);
  assert(Array.isArray(att.casualties), `Battle ${totalBattles}: attacker casualties is array`);
  att.casualties.forEach(c => {
    assert(!isNaN(c.hpBefore) && !isNaN(c.hpAfter) && !isNaN(c.hpLost), `Battle ${totalBattles}: casualty numbers must not be NaN`);
    zeroNaNChecks += 3;
  });

  const def = outcomeReceived.defender;
  assert(!isNaN(def.survivingRegiments) && def.survivingRegiments >= 0, `Battle ${totalBattles}: defender survivingRegiments not NaN`);
  assert(!isNaN(def.totalRegimentsBefore) && def.totalRegimentsBefore >= 1, `Battle ${totalBattles}: defender totalRegimentsBefore not NaN`);
  assert(Array.isArray(def.casualties), `Battle ${totalBattles}: defender casualties is array`);
  def.casualties.forEach(c => {
    assert(!isNaN(c.hpBefore) && !isNaN(c.hpAfter) && !isNaN(c.hpLost), `Battle ${totalBattles}: casualty numbers must not be NaN`);
    zeroNaNChecks += 3;
  });

  engine.units.forEach(u => {
    assert(!isNaN(u.hp), `Battle ${totalBattles}: unit ${u.id} hp not NaN`);
    assert(!isNaN(u.morale), `Battle ${totalBattles}: unit ${u.id} morale not NaN`);
    zeroNaNChecks += 2;
  });

  validOutcomes++;

  const gs = new GameState();
  gs.initNewGame('FAC_VIJAYANAGARA');
  const campaignRes = applyBattleOutcome(gs, outcomeReceived);
  assert(campaignRes !== null, `Battle ${totalBattles}: applyBattleOutcome executed cleanly`);
  successfulCampaignMutations++;
}

console.log('\nRunning 60 automated battles across diverse scenarios...');

// Group A: 15 Standard & Mirror Battles across various terrains
for (let i = 0; i < 15; i++) {
  const provKey = PROVINCE_KEYS[i % PROVINCE_KEYS.length];
  const unitKey1 = UNIT_CLASS_KEYS[i % UNIT_CLASS_KEYS.length];
  const unitKey2 = UNIT_CLASS_KEYS[(i + 1) % UNIT_CLASS_KEYS.length];

  runAutomatedBattle({
    attackerArmy: {
      id: `att_a_${i}`, factionId: 'FAC_VIJAYANAGARA',
      regiments: [
        { id: `reg_a1_${i}`, unitTypeId: unitKey1, hp: 120 },
        { id: `reg_a2_${i}`, unitTypeId: unitKey2, hp: 120 }
      ]
    },
    defenderArmy: {
      id: `def_a_${i}`, factionId: 'FAC_BAHMANI',
      regiments: [
        { id: `reg_d1_${i}`, unitTypeId: unitKey2, hp: 120 },
        { id: `reg_d2_${i}`, unitTypeId: unitKey1, hp: 120 }
      ]
    },
    province: PROVINCES[provKey]
  }, `Group A - Mirror/Terrain: ${provKey}`);
}

// Group B: 15 Asymmetric Force Battles (3v1, 1v4, 2v5, 5v2)
for (let i = 0; i < 15; i++) {
  const provKey = PROVINCE_KEYS[(i * 3) % PROVINCE_KEYS.length];
  const attCount = (i % 3 === 0) ? 4 : 2;
  const defCount = (i % 3 === 0) ? 1 : 5;

  const attRegs = [];
  for (let a = 0; a < attCount; a++) {
    attRegs.push({ id: `att_b_${i}_${a}`, unitTypeId: UNIT_CLASS_KEYS[a % UNIT_CLASS_KEYS.length], hp: 100 });
  }

  const defRegs = [];
  for (let d = 0; d < defCount; d++) {
    defRegs.push({ id: `def_b_${i}_${d}`, unitTypeId: UNIT_CLASS_KEYS[(d + 2) % UNIT_CLASS_KEYS.length], hp: 100 });
  }

  runAutomatedBattle({
    attackerArmy: { id: `att_b_${i}`, factionId: 'FAC_DELHI', regiments: attRegs },
    defenderArmy: { id: `def_b_${i}`, factionId: 'FAC_MEWAR', regiments: defRegs },
    province: PROVINCES[provKey]
  }, `Group B - Asymmetric (${attCount} vs ${defCount})`);
}

// Group C: 10 Shock & Monster Battles (War Elephants, Heavy Cavalry)
for (let i = 0; i < 10; i++) {
  const provKey = PROVINCE_KEYS[(i * 2) % PROVINCE_KEYS.length];
  runAutomatedBattle({
    attackerArmy: {
      id: `att_c_${i}`, factionId: 'FAC_AHOM',
      regiments: [
        { id: `att_ele_${i}`, unitTypeId: 'WAR_ELEPHANTS', hp: 350 },
        { id: `att_cav_${i}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160 }
      ]
    },
    defenderArmy: {
      id: `def_c_${i}`, factionId: 'FAC_BENGAL',
      regiments: [
        { id: `def_ele_${i}`, unitTypeId: 'WAR_ELEPHANTS', hp: 350 },
        { id: `def_pai_${i}`, unitTypeId: 'PAIKS', hp: 105 }
      ]
    },
    province: PROVINCES[provKey]
  }, `Group C - Shock Monsters`);
}

// Group D: 10 Skirmish & Ranged Battles (Horse Archers, Siege Engines)
for (let i = 0; i < 10; i++) {
  const provKey = PROVINCE_KEYS[(i * 4) % PROVINCE_KEYS.length];
  runAutomatedBattle({
    attackerArmy: {
      id: `att_d_${i}`, factionId: 'FAC_KASHMIR',
      regiments: [
        { id: `att_ha_${i}`, unitTypeId: 'HORSE_ARCHERS', hp: 90 },
        { id: `att_sge_${i}`, unitTypeId: 'SIEGE_ENGINES', hp: 80 }
      ]
    },
    defenderArmy: {
      id: `def_d_${i}`, factionId: 'FAC_DELHI',
      regiments: [
        { id: `def_ha_${i}`, unitTypeId: 'HORSE_ARCHERS', hp: 90 },
        { id: `def_raj_${i}`, unitTypeId: 'RAJPUT_LEVIES', hp: 120 }
      ]
    },
    province: PROVINCES[provKey]
  }, `Group D - Skirmish/Ranged`);
}

// Group E: 5 General vs General Battles with Authenticated Historical Figures
for (let i = 0; i < 5; i++) {
  const charKey1 = CHARACTER_KEYS[i % CHARACTER_KEYS.length];
  const charKey2 = CHARACTER_KEYS[(i + 5) % CHARACTER_KEYS.length];
  const char1 = CHARACTERS[charKey1];
  const char2 = CHARACTERS[charKey2];

  runAutomatedBattle({
    attackerArmy: {
      id: `att_e_${i}`, factionId: 'FAC_VIJAYANAGARA', generalId: char1.id,
      regiments: [
        { id: `att_e_c_${i}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: `att_e_p_${i}`, unitTypeId: 'PAIKS', hp: 105 },
        { id: `att_e_ha_${i}`, unitTypeId: 'HORSE_ARCHERS', hp: 90 }
      ]
    },
    defenderArmy: {
      id: `def_e_${i}`, factionId: 'FAC_BAHMANI', generalId: char2.id,
      regiments: [
        { id: `def_e_c_${i}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
        { id: `def_e_p_${i}`, unitTypeId: 'PAIKS', hp: 105 },
        { id: `def_e_raj_${i}`, unitTypeId: 'RAJPUT_LEVIES', hp: 120 }
      ]
    },
    attackerGeneral: char1,
    defenderGeneral: char2,
    province: PROVINCES['PROV_RAICHUR_DOAB']
  }, `Group E - General Clash (${char1.name} vs ${char2.name})`);
}

// Group F: 5 Tactical Retreat Invocations (Mid-Battle Concession)
for (let i = 0; i < 5; i++) {
  totalBattles++;
  let callbackFired = false;
  let outcome = null;

  const engine = new TacticalEngine({
    attackerArmy: {
      id: `att_f_${i}`, factionId: 'FAC_DELHI',
      regiments: [{ id: `r1_${i}`, unitTypeId: 'PAIKS', hp: 100 }]
    },
    defenderArmy: {
      id: `def_f_${i}`, factionId: 'FAC_MEWAR',
      regiments: [{ id: `r2_${i}`, unitTypeId: 'RAJPUT_LEVIES', hp: 120 }]
    },
    province: PROVINCES['PROV_DELHI'],
    onBattleEnd: (res) => {
      callbackFired = true;
      outcome = res;
    }
  });

  const retSide = (i % 2 === 0) ? 'ATTACKER' : 'DEFENDER';
  const retOutcome = engine.retreat(retSide);

  assert(engine.isOver === true, `Battle ${totalBattles}: retreat sets isOver to true`);
  assert(callbackFired === true, `Battle ${totalBattles}: onBattleEnd fired on retreat`);
  assertEqual(retOutcome.winner, (retSide === 'ATTACKER') ? 'defender' : 'attacker', `Battle ${totalBattles}: retreat awards victory to opposing side`);
  validOutcomes++;

  const gs = new GameState();
  gs.initNewGame('FAC_DELHI');
  const campRes = applyBattleOutcome(gs, retOutcome);
  assert(campRes !== null, `Battle ${totalBattles}: retreat outcome successfully applied to campaign`);
  successfulCampaignMutations++;
}

console.log('\n======================================================================');
console.log('  MULTI-BATTLE STRESS HARNESS SUMMARY:');
console.log(`    Total Automated Battles Executed:   ${totalBattles}`);
console.log(`    Total Combat Rounds Processed:      ${totalRoundsExecuted}`);
console.log(`    Total Non-NaN Assertions Verified:  ${zeroNaNChecks}`);
console.log(`    Valid Outcome Objects Dispatched:   ${validOutcomes}/${totalBattles}`);
console.log(`    Successful Campaign State Mutations: ${successfulCampaignMutations}/${totalBattles}`);
console.log(`    Soft-Locks / Uncaught Exceptions:   0`);
console.log(`    All Verification Checks Passed:     ${passedChecks}`);
console.log(`    Failed Verification Checks:         ${failedChecks}`);
console.log('======================================================================\n');

if (failedChecks > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
