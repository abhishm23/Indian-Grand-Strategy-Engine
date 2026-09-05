// tests/test_adversarial_m2.js
// Empirical Challenger Adversarial Test Suite for Milestone 2: Tactical Battlefield Engine & Renderer
// Rigorously stress-tests:
// 1. Grid Boundaries, Out-of-bounds, Collisions, Pathfinding around Obstacles
// 2. Morale Degradation, Rout Threshold, Control Revocation
// 3. Chain Panic Cascade & General Leadership Aura Immunity
// 4. Rout Auto-Flee Movement & Board Exit
// 5. War Elephant Berserk Frenzy
// 6. Multi-Turn Simulated Battles (100 Full Automated Battles)

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  TestRunner,
  assert,
  assertTrue,
  assertFalse,
  assertEqual,
  assertApproxEqual,
  assertInBounds
} from './testRunner.js';

import {
  TacticalEngine,
  TacticalGrid,
  TacticalUnit,
  TacticalCombatMath,
  FACING
} from '../js/engine/tacticalEngine.js';
import { UNIT_TYPES, COUNTER_MATRIX } from '../js/data/units.js';
import { GameState } from '../js/engine/gameState.js';
import { applyBattleOutcome } from '../js/engine/combatResolver.js';

const __filename = fileURLToPath(import.meta.url);
export const advRunner = new TestRunner();
const describe = advRunner.describe.bind(advRunner);
const test = advRunner.test.bind(advRunner);

// ============================================================================
// SUITE 1: ADVERSARIAL GRID BOUNDARIES, COORDINATES & PATHFINDING
// ============================================================================
describe('Adversarial Tactical Grid — Boundaries, Coordinates & Pathfinding', () => {

  test('ADV_GRID_01: Exact 20x14 Grid Geometry & Invariants (280 tiles)', () => {
    const grid = new TacticalGrid(20, 14);
    assertEqual(grid.cols, 20, 'Columns must be exactly 20');
    assertEqual(grid.rows, 14, 'Rows must be exactly 14');
    assertEqual(grid.tiles.length, 14, 'Matrix rows must equal 14');

    let totalTiles = 0;
    for (let r = 0; r < 14; r++) {
      assertEqual(grid.tiles[r].length, 20, `Row ${r} must contain 20 columns`);
      for (let c = 0; c < 20; c++) {
        const tile = grid.getTile(c, r);
        assert(tile !== null, `Tile (${c}, ${r}) must not be null`);
        assertEqual(tile.col, c);
        assertEqual(tile.row, r);
        totalTiles++;
      }
    }
    assertEqual(totalTiles, 280, 'Total tiles must equal exactly 280');
  });

  test('ADV_GRID_02: Extreme & Invalid Out-of-Bounds Queries Return Null / False', () => {
    const grid = new TacticalGrid(20, 14);

    const outOfBoundsCoords = [
      [-1, 0], [0, -1], [-1, -1], [20, 0], [0, 14], [20, 14],
      [-999, 5], [5, -999], [999, 999], [-50, 20], [25, -10]
    ];

    for (const [c, r] of outOfBoundsCoords) {
      assertFalse(grid.isValidCoord(c, r), `isValidCoord(${c}, ${r}) must be false`);
      assertEqual(grid.getTile(c, r), null, `getTile(${c}, ${r}) must return null`);
      assertFalse(grid.isPassable(c, r), `isPassable(${c}, ${r}) must be false`);
    }

    // Adversarial NaN / undefined robustness checks on isValidCoord
    assertFalse(grid.isValidCoord(NaN, 5), 'isValidCoord(NaN, 5) must be false');
    assertFalse(grid.isValidCoord(5, NaN), 'isValidCoord(5, NaN) must be false');
    assertFalse(grid.isValidCoord(undefined, 5), 'isValidCoord(undefined, 5) must be false');
    assertFalse(grid.isValidCoord(5, undefined), 'isValidCoord(5, undefined) must be false');
  });

  test('ADV_GRID_03: Move Command Boundary Rejection (Out-of-bounds moves rejected)', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'u1', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'd1', unitTypeId: 'PAIKS', hp: 105 }]
      }
    });

    const unit = engine.getUnit('u1');
    unit.col = 0;
    unit.row = 0;
    engine.syncGridUnits();

    // Out-of-bounds target coordinates
    const badMoves = [
      [-1, 0], [0, -1], [20, 0], [0, 14], [-5, -5], [100, 100]
    ];

    for (const [tc, tr] of badMoves) {
      const res = engine.moveUnit('u1', tc, tr);
      assertFalse(res.success, `Move to (${tc}, ${tr}) must fail`);
      assertEqual(res.reason, 'Invalid coordinate', `Reason must be 'Invalid coordinate', got: ${res.reason}`);
    }
  });

  test('ADV_GRID_04: Canvas Coordinate Clamping Logic (0-19 cols, 0-13 rows)', () => {
    // Simulating TacticalBattlefield.getCanvasTileCoords clamping
    function mockGetCanvasTileCoords(clientX, clientY, rectWidth = 1000, rectHeight = 700) {
      const scaleX = 1000 / rectWidth;
      const scaleY = 700 / rectHeight;
      const col = Math.floor((clientX * scaleX) / 50);
      const row = Math.floor((clientY * scaleY) / 50);
      return {
        col: Math.max(0, Math.min(19, col)),
        row: Math.max(0, Math.min(13, row))
      };
    }

    assertEqual(mockGetCanvasTileCoords(-100, -100).col, 0);
    assertEqual(mockGetCanvasTileCoords(-100, -100).row, 0);
    assertEqual(mockGetCanvasTileCoords(1500, 1000).col, 19);
    assertEqual(mockGetCanvasTileCoords(1500, 1000).row, 13);
    assertEqual(mockGetCanvasTileCoords(25, 25).col, 0);
    assertEqual(mockGetCanvasTileCoords(975, 675).col, 19);
    assertEqual(mockGetCanvasTileCoords(975, 675).row, 13);
    assertEqual(mockGetCanvasTileCoords(500, 350).col, 10);
    assertEqual(mockGetCanvasTileCoords(500, 350).row, 7);
  });

  test('ADV_GRID_05: Diagonal Collision & 8-Way Neighbor Integrity', () => {
    const grid = new TacticalGrid(20, 14);

    // Interior tile (5, 5) -> 8 neighbors
    const interior = grid.getNeighbors(5, 5, true);
    assertEqual(interior.length, 8, 'Interior tile must have 8 neighbors');

    // Corner tiles -> 3 neighbors
    const cornerTopLeft = grid.getNeighbors(0, 0, true);
    assertEqual(cornerTopLeft.length, 3, 'Corner tile (0, 0) must have 3 neighbors');
    const cornerBottomRight = grid.getNeighbors(19, 13, true);
    assertEqual(cornerBottomRight.length, 3, 'Corner tile (19, 13) must have 3 neighbors');

    // Edge tiles (non-corner) -> 5 neighbors
    const edgeTop = grid.getNeighbors(5, 0, true);
    assertEqual(edgeTop.length, 5, 'Top edge tile must have 5 neighbors');
    const edgeLeft = grid.getNeighbors(0, 5, true);
    assertEqual(edgeLeft.length, 5, 'Left edge tile must have 5 neighbors');

    // Cardinal-only mode -> 4 interior, 2 corner
    const interiorCard = grid.getNeighbors(5, 5, false);
    assertEqual(interiorCard.length, 4, 'Interior tile cardinal-only must have 4 neighbors');
    const cornerCard = grid.getNeighbors(0, 0, false);
    assertEqual(cornerCard.length, 2, 'Corner tile cardinal-only must have 2 neighbors');
  });

  test('ADV_GRID_06: Pathfinding Obstacle Avoidance (River crossing in Floodplain)', () => {
    const grid = new TacticalGrid(20, 14, { terrainType: 'FLOODPLAIN' });
    const unit = new TacticalUnit({ unitTypeId: 'HEAVY_CAVALRY', hp: 160, moveSpeed: 8 }, 'ATTACKER');

    // River is on cols 9 and 10, impassable except at bridge rows 3, 4, 9, 10
    // Try to path from (8, 0) to (11, 0)
    const path = grid.findPath(8, 0, 11, 0, unit);
    assert(path !== null, 'Path across river must exist via bridge');
    assertTrue(path.length > 3, 'Direct crossing is impassable, path must detour');

    // Path must NOT cross river at any impassable tile
    path.forEach(step => {
      const tile = grid.getTile(step.col, step.row);
      assertFalse(tile.isImpassable, `Path step (${step.col}, ${step.row}) must NOT be impassable`);
    });

    // Verify bridge was traversed
    const crossedBridge = path.some(step => (step.col === 9 || step.col === 10) && (step.row === 3 || step.row === 4 || step.row === 9 || step.row === 10));
    assertTrue(crossedBridge, 'Path must cross at a valid bridge row');
  });

  test('ADV_GRID_07: Pathfinding Mountain Barrier Chokepoint (Mountain pass)', () => {
    const grid = new TacticalGrid(20, 14, { terrainType: 'MOUNTAIN_PASS' });
    const unit = new TacticalUnit({ unitTypeId: 'RAJPUT_LEVIES', hp: 130, moveSpeed: 10 }, 'ATTACKER');

    // Mountain pass has impassable mountains on cols 6-13 for rows 0-3 and 10-13
    // Open pass is rows 4-9
    const path = grid.findPath(5, 1, 14, 1, unit);
    assert(path !== null, 'Path through mountain pass must exist');

    // Check that path diverts into the open corridor (row >= 4 and row <= 9) when crossing cols 6-13
    path.forEach(step => {
      if (step.col >= 6 && step.col <= 13) {
        assertTrue(step.row >= 4 && step.row <= 9, `Step (${step.col}, ${step.row}) in barrier zone must be in pass corridor (rows 4-9)`);
      }
    });
  });

  test('ADV_GRID_08: Dynamic Unit Collision & Enemy Blockade', () => {
    const grid = new TacticalGrid(20, 14);
    const cav = new TacticalUnit({ id: 'cav', unitTypeId: 'HEAVY_CAVALRY', hp: 160, moveSpeed: 4 }, 'ATTACKER');
    const enemy = new TacticalUnit({ id: 'enemy', unitTypeId: 'PAIKS', hp: 105 }, 'DEFENDER');
    enemy.col = 5;
    enemy.row = 5;

    const allUnits = [cav, enemy];
    cav.col = 4;
    cav.row = 5;

    // Enemy is at (5, 5). Attacker wants to move to (6, 5) directly through enemy.
    const path = grid.findPath(4, 5, 6, 5, cav, allUnits);
    assert(path !== null, 'Should path around enemy unit');
    // Path should not pass through (5, 5)
    const stepsOnEnemy = path.some(step => step.col === 5 && step.row === 5);
    assertFalse(stepsOnEnemy, 'Path cannot step on enemy unit tile');
  });

  test('ADV_GRID_09: Completely Boxed-In Unit Returns 0 Reachable Tiles & Null Path', () => {
    const grid = new TacticalGrid(20, 14);
    const unit = new TacticalUnit({ id: 'trapped', unitTypeId: 'PAIKS', hp: 105, moveSpeed: 3 }, 'ATTACKER');
    unit.col = 5;
    unit.row = 5;

    // Surround with 8 enemy units
    const surroundingEnemies = [];
    let idCounter = 1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const e = new TacticalUnit({ id: `e_${idCounter++}`, unitTypeId: 'HEAVY_CAVALRY', hp: 160 }, 'DEFENDER');
        e.col = 5 + dc;
        e.row = 5 + dr;
        surroundingEnemies.push(e);
      }
    }

    const allUnits = [unit, ...surroundingEnemies];
    const reachable = grid.getReachableTiles(unit, allUnits);
    assertEqual(reachable.length, 0, 'Completely boxed-in unit must have 0 reachable tiles');

    const path = grid.findPath(5, 5, 5, 8, unit, allUnits);
    assertEqual(path, null, 'Completely boxed-in unit must have null path out');
  });
});

// ============================================================================
// SUITE 2: MORALE DEGRADATION, ROUT THRESHOLD & CONTROL REVOCATION
// ============================================================================
describe('Adversarial Morale — Degradation, Rout Threshold & Control Revocation', () => {

  test('ADV_MOR_01: Exact Morale Threshold Boundary Classifications', () => {
    // Spec:
    // >= 50: STEADY
    // 25-49: SHAKEN
    // 21-24: PANICKING
    // <= 20: ROUTED
    assertEqual(TacticalCombatMath.classifyMorale(100), 'STEADY');
    assertEqual(TacticalCombatMath.classifyMorale(50), 'STEADY');
    assertEqual(TacticalCombatMath.classifyMorale(49.9), 'SHAKEN');
    assertEqual(TacticalCombatMath.classifyMorale(49), 'SHAKEN');
    assertEqual(TacticalCombatMath.classifyMorale(25), 'SHAKEN');
    assertEqual(TacticalCombatMath.classifyMorale(24.9), 'PANICKING');
    assertEqual(TacticalCombatMath.classifyMorale(24), 'PANICKING');
    assertEqual(TacticalCombatMath.classifyMorale(21), 'PANICKING');
    assertEqual(TacticalCombatMath.classifyMorale(20.9), 'PANICKING', '20.9 is > 20 so should be PANICKING');
    assertEqual(TacticalCombatMath.classifyMorale(20.0), 'ROUTED', '20.0 is <= 20 so should be ROUTED');
    assertEqual(TacticalCombatMath.classifyMorale(20), 'ROUTED');
    assertEqual(TacticalCombatMath.classifyMorale(1), 'ROUTED');
    assertEqual(TacticalCombatMath.classifyMorale(0), 'ROUTED');
  });

  test('ADV_MOR_02: Precise Rout Transition Trigger at Morale <= 20', () => {
    const unit = new TacticalUnit({ unitTypeId: 'PAIKS', hp: 105, morale: 25 }, 'ATTACKER');
    assertFalse(unit.isRouted, 'Initial morale 25 must not be routed');
    assertEqual(unit.moraleState, 'SHAKEN');

    // Drain 4 -> morale = 21
    unit.drainMorale(4);
    assertEqual(unit.morale, 21);
    assertFalse(unit.isRouted, 'Morale 21 must not be routed');
    assertEqual(unit.moraleState, 'PANICKING');

    // Drain 1 -> morale = 20
    unit.drainMorale(1);
    assertEqual(unit.morale, 20);
    assertTrue(unit.isRouted, 'Morale 20 MUST flip isRouted to true');
    assertEqual(unit.moraleState, 'ROUTED');
  });

  test('ADV_MOR_03: Complete Control Revocation on Routed Unit', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'u_routed', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 20 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'd_enemy', unitTypeId: 'PAIKS', hp: 105 }]
      }
    });

    const unit = engine.getUnit('u_routed');
    unit.col = 3; unit.row = 5;
    const enemy = engine.getUnit('d_enemy');
    enemy.col = 4; enemy.row = 5;
    engine.syncGridUnits();

    // 1. isRouted is true
    assertTrue(unit.isRouted, 'Unit must be routed');

    // 2. canAct() must strictly return false even with full AP
    assertEqual(unit.actionPoints, 2);
    assertFalse(unit.canAct(), 'canAct() must be false for routed unit');

    // 3. selectUnit() returns empty reachables and attack targets
    const selection = engine.selectUnit('u_routed');
    assertEqual(selection.reachableTiles.length, 0, 'Routed unit must have 0 reachable tiles');
    assertEqual(selection.attackTargets.length, 0, 'Routed unit must have 0 attack targets');

    // 4. moveUnit() fails
    const moveRes = engine.moveUnit('u_routed', 2, 5);
    assertFalse(moveRes.success, 'Routed unit moveUnit must fail');
    assertEqual(moveRes.reason, 'Unit cannot act');

    // 5. attackUnit() fails
    const atkRes = engine.attackUnit('u_routed', 'd_enemy');
    assertFalse(atkRes.success, 'Routed unit attackUnit must fail');
    assertEqual(atkRes.reason, 'Attacker cannot act');
  });

  test('ADV_MOR_04: Irreversibility of Rout State (recoverMorale rejected)', () => {
    const unit = new TacticalUnit({ unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 15 }, 'ATTACKER');
    assertTrue(unit.isRouted);

    // Attempting morale recovery
    const gained = unit.recoverMorale(50);
    assertEqual(gained, 0, 'recoverMorale on routed unit must return 0');
    assertEqual(unit.morale, 15, 'Morale must remain at 15');
    assertTrue(unit.isRouted, 'isRouted must remain true');
  });

  test('ADV_MOR_05: Routed Defender Prohibited from Counter-Attacking', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'atk', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'def_routed', unitTypeId: 'PAIKS', hp: 100, morale: 15 }]
      }
    });

    const atk = engine.getUnit('atk');
    const def = engine.getUnit('def_routed');
    atk.col = 5; atk.row = 5;
    def.col = 6; def.row = 5;
    def.setFacing('W'); // Facing attacker (front attack where counter is normally allowed)
    engine.syncGridUnits();

    assertTrue(def.isRouted);

    const res = engine.attackUnit('atk', 'def_routed');
    assertTrue(res.success);
    assertEqual(res.counterDamage, 0, 'Routed defender MUST NOT counter-attack');
    assertEqual(atk.hp, 160, 'Attacker must take 0 counter-damage from routed defender');
  });
});

// ============================================================================
// SUITE 3: CHAIN PANIC CASCADE & GENERAL LEADERSHIP AURA
// ============================================================================
describe('Adversarial Morale — Chain Panic Cascade & General Leadership Aura', () => {

  test('ADV_PAN_01: Chain Panic Shock Trigger (-15 morale shock to all friendly units within <= 3 tiles)', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [
          { id: 'trigger_u', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 25 },
          { id: 'friend_d1', unitTypeId: 'PAIKS', hp: 105, morale: 70 },
          { id: 'friend_d2', unitTypeId: 'PAIKS', hp: 105, morale: 70 },
          { id: 'friend_d3', unitTypeId: 'PAIKS', hp: 105, morale: 70 }
        ]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'enemy_close', unitTypeId: 'RAJPUT_LEVIES', hp: 130, morale: 100 }]
      }
    });

    const trig = engine.getUnit('trigger_u');
    const f1 = engine.getUnit('friend_d1');
    const f2 = engine.getUnit('friend_d2');
    const f3 = engine.getUnit('friend_d3');
    const enemy = engine.getUnit('enemy_close');

    trig.col = 5; trig.row = 5;
    f1.col = 5; f1.row = 6; // distance 1
    f2.col = 7; f2.row = 5; // distance 2
    f3.col = 8; f3.row = 5; // distance 3
    enemy.col = 6; enemy.row = 5; // distance 1 (enemy)
    engine.syncGridUnits();

    // Trigger rout
    trig.drainMorale(10);
    assertTrue(trig.isRouted);
    engine.triggerChainPanic(trig);

    // All friendly units at dist <= 3 lose 15 morale
    assertEqual(f1.morale, 55, 'Friend at dist 1 must suffer -15 shock');
    assertEqual(f2.morale, 55, 'Friend at dist 2 must suffer -15 shock');
    assertEqual(f3.morale, 55, 'Friend at dist 3 must suffer -15 shock');

    // Enemy is unaffected
    assertEqual(enemy.morale, 100, 'Hostile unit must NOT suffer friendly chain panic');
  });

  test('ADV_PAN_02: Spatial Attenuation of Chain Panic (dist >= 4 unaffected)', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [
          { id: 'trig', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 20 },
          { id: 'f_d4', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
          { id: 'f_d5', unitTypeId: 'PAIKS', hp: 105, morale: 75 }
        ]
      },
      defenderArmy: { id: 'def', regiments: [] }
    });

    const trig = engine.getUnit('trig');
    const f4 = engine.getUnit('f_d4');
    const f5 = engine.getUnit('f_d5');

    trig.col = 5; trig.row = 5;
    f4.col = 9; f4.row = 5; // distance 4
    f5.col = 10; f5.row = 10; // distance 5
    engine.syncGridUnits();

    engine.triggerChainPanic(trig);

    assertEqual(f4.morale, 75, 'Friend at dist 4 must be unaffected');
    assertEqual(f5.morale, 75, 'Friend at dist 5 must be unaffected');
  });

  test('ADV_PAN_03: General Leadership Aura Radius Scaling (max(2, floor(command/2) + 1))', () => {
    const expected = [
      [0, 2], [1, 2], [2, 2], [3, 2],
      [4, 3], [5, 3],
      [6, 4], [7, 4],
      [8, 5], [9, 5],
      [10, 6]
    ];

    for (const [cmd, expectedRadius] of expected) {
      const calc = TacticalCombatMath.calculateGeneralAuraRadius(cmd);
      assertEqual(calc, expectedRadius, `Command ${cmd} must produce aura radius ${expectedRadius}`);
    }
  });

  test('ADV_PAN_04: 100% Chain Panic Immunity inside General Aura', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        generalId: 'CHAR_BUKKA',
        regiments: [
          { id: 'gen_unit', unitTypeId: 'WAR_ELEPHANTS', hp: 350 },
          { id: 'protected_ally', unitTypeId: 'PAIKS', hp: 105, morale: 70 },
          { id: 'panicking_ally', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 22 }
        ]
      },
      defenderArmy: { id: 'def', regiments: [] },
      attackerGeneral: {
        id: 'CHAR_BUKKA',
        name: 'Bukka Raya I',
        attributes: { command: 9, dread: 5, piety: 7 }
      }
    });

    const gen = engine.getUnit('gen_unit');
    const prot = engine.getUnit('protected_ally');
    const panic = engine.getUnit('panicking_ally');

    // General command 9 -> radius 5
    gen.col = 2; gen.row = 2;
    prot.col = 4; prot.row = 4; // distance 2 (inside aura <= 5)
    panic.col = 5; panic.row = 4; // distance 1 from prot (within chain panic radius 3)
    engine.syncGridUnits();
    engine.updateAuras();

    assertTrue(prot.inGeneralAura, 'Protected ally must have inGeneralAura = true');

    // Rout panicking ally
    panic.drainMorale(5);
    assertTrue(panic.isRouted);
    engine.triggerChainPanic(panic);

    // Protected ally is 100% immune
    assertEqual(prot.morale, 70, 'Unit inside General Aura must suffer 0 chain panic shock');
  });

  test('ADV_PAN_05: Aura Boundary Edge Sensitivity (Radius R is immune, R+1 suffers -15 shock)', () => {
    // Command 4 -> radius = max(2, floor(4/2) + 1) = 3
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        generalId: 'GEN_4',
        regiments: [
          { id: 'gen', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
          { id: 'ally_edge', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
          { id: 'ally_outside', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
          { id: 'fleeing', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 20 }
        ]
      },
      defenderArmy: { id: 'def', regiments: [] },
      attackerGeneral: { id: 'GEN_4', attributes: { command: 4 } }
    });

    const gen = engine.getUnit('gen');
    const edge = engine.getUnit('ally_edge');
    const outside = engine.getUnit('ally_outside');
    const flee = engine.getUnit('fleeing');

    gen.col = 5; gen.row = 5;
    edge.col = 8; edge.row = 5; // dist 3 from gen (exactly on aura edge)
    outside.col = 9; outside.row = 5; // dist 4 from gen (just outside aura)
    flee.col = 8; flee.row = 6; // dist 1 from edge, dist 2 from outside (<=3 for both)

    engine.syncGridUnits();
    engine.updateAuras();

    assertTrue(edge.inGeneralAura, 'Edge unit at dist 3 must be inside aura');
    assertFalse(outside.inGeneralAura, 'Outside unit at dist 4 must NOT be inside aura');

    engine.triggerChainPanic(flee);

    assertEqual(edge.morale, 75, 'Unit inside aura must have 100% immunity (morale 75)');
    assertEqual(outside.morale, 60, 'Unit outside aura must suffer -15 shock (morale drops to 60)');
  });

  test('ADV_PAN_06: Aura Dissolution upon General Rout or Death', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        generalId: 'GEN_LEADER',
        regiments: [
          { id: 'gen_leader', unitTypeId: 'HEAVY_CAVALRY', hp: 160, morale: 100 },
          { id: 'subordinate', unitTypeId: 'PAIKS', hp: 105, morale: 75 }
        ]
      },
      defenderArmy: { id: 'def', regiments: [] },
      attackerGeneral: { id: 'GEN_LEADER', attributes: { command: 8 } }
    });

    const gen = engine.getUnit('gen_leader');
    const sub = engine.getUnit('subordinate');
    gen.col = 5; gen.row = 5;
    sub.col = 6; sub.row = 5;
    engine.syncGridUnits();
    engine.updateAuras();

    assertTrue(sub.inGeneralAura, 'Subordinate must initially be inside aura');

    // General starting morale is 100 + floor(8 * 2.5) = 120.
    // Draining 105 drops morale to 15 <= 20, triggering rout
    gen.drainMorale(105);
    assertTrue(gen.isRouted, 'Commander must be routed at morale 15');
    engine.updateAuras();

    assertFalse(sub.inGeneralAura, 'Subordinate must lose aura protection when general routs');
  });
});

// ============================================================================
// SUITE 4: ROUT AUTO-FLEE MOVEMENT & BOARD EXIT
// ============================================================================
describe('Adversarial Routing — Auto-Flee Movement & Board Exit', () => {

  test('ADV_FLE_01: Attacker Routed Units Auto-Flee Westward toward Col 0', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'att_flee', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 15 }]
      },
      defenderArmy: { id: 'def', regiments: [] }
    });

    const u = engine.getUnit('att_flee');
    u.col = 3; u.row = 5;
    engine.syncGridUnits();

    // Step 1: 3 -> 2
    engine.processRoutingUnits('ATTACKER');
    assertEqual(u.col, 2);
    assertEqual(u.facing, 'W', 'Attacker fleeing must face West');
    assertFalse(u.hasExited);

    // Step 2: 2 -> 1
    engine.processRoutingUnits('ATTACKER');
    assertEqual(u.col, 1);
    assertFalse(u.hasExited);

    // Step 3: 1 -> 0 (reaches boundary and exits)
    engine.processRoutingUnits('ATTACKER');
    assertEqual(u.col, 0);
    assertTrue(u.hasExited, 'Attacker reaching col 0 must be marked hasExited = true');
  });

  test('ADV_FLE_02: Defender Routed Units Auto-Flee Eastward toward Col 19', () => {
    const engine = new TacticalEngine({
      attackerArmy: { id: 'att', regiments: [] },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'def_flee', unitTypeId: 'PAIKS', hp: 105, morale: 15 }]
      }
    });

    const u = engine.getUnit('def_flee');
    u.col = 17; u.row = 7;
    engine.syncGridUnits();

    // Step 1: 17 -> 18
    engine.processRoutingUnits('DEFENDER');
    assertEqual(u.col, 18);
    assertEqual(u.facing, 'E', 'Defender fleeing must face East');
    assertFalse(u.hasExited);

    // Step 2: 18 -> 19
    engine.processRoutingUnits('DEFENDER');
    assertEqual(u.col, 19);
    assertTrue(u.hasExited, 'Defender reaching col 19 must be marked hasExited = true');
  });

  test('ADV_FLE_03: Obstacle Sidestepping when Direct Retreat Path is Blocked', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [
          { id: 'fleeing', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 15 },
          { id: 'blocker', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }
        ]
      },
      defenderArmy: { id: 'def', regiments: [] }
    });

    const flee = engine.getUnit('fleeing');
    const block = engine.getUnit('blocker');

    flee.col = 3; flee.row = 5;
    block.col = 2; block.row = 5; // Blocking direct Westward path (2, 5)
    engine.syncGridUnits();

    // Process routing: unit should sidestep to row 4 or row 6
    engine.processRoutingUnits('ATTACKER');
    assertEqual(flee.col, 2, 'Must still advance West to col 2');
    assertTrue(flee.row === 4 || flee.row === 6, `Must sidestep to row 4 or 6, was ${flee.row}`);
  });

  test('ADV_FLE_04: Fled Units Retain Survivor Status in Campaign Outcome', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_army',
        regiments: [
          { id: 'reg_survivor', unitTypeId: 'WAR_ELEPHANTS', hp: 200, morale: 10 },
          { id: 'reg_casualty', unitTypeId: 'PAIKS', hp: 0, morale: 0 }
        ]
      },
      defenderArmy: {
        id: 'def_army',
        regiments: [{ id: 'def_reg', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
      }
    });

    const flee = engine.getUnit('reg_survivor');
    flee.col = 0; // At boundary
    flee.hasExited = true; // Successfully escaped the board

    const dead = engine.getUnit('reg_casualty');
    dead.hp = 0;

    engine.checkBattleEnd();
    const outcome = engine.getBattleOutcome();

    // Escaped unit with hp > 0 must be counted in survivingRegiments!
    assertEqual(outcome.attacker.survivingRegiments, 1, 'Escaped unit with HP > 0 must count as survivor');
    assertEqual(outcome.attacker.destroyed.length, 1, 'Only reg_casualty should be in destroyed list');
    assertEqual(outcome.attacker.destroyed[0], dead.name);
  });
});

// ============================================================================
// SUITE 5: WAR ELEPHANT BERSERK FRENZY
// ============================================================================
describe('Adversarial Mechanics — War Elephant Berserk Frenzy', () => {

  test('ADV_ELE_01: Berserk Frenzy Triggers at Morale 0 for SHOCK_MONSTER', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'ele', unitTypeId: 'WAR_ELEPHANTS', hp: 350, morale: 5 }]
      },
      defenderArmy: { id: 'def', regiments: [] }
    });

    const ele = engine.getUnit('ele');
    ele.col = 5; ele.row = 5;
    engine.syncGridUnits();

    // Morale 5 -> does NOT frenzy yet
    let frenzied = engine.processBerserkFrenzy();
    assertEqual(frenzied.length, 0, 'Morale > 0 must not frenzy');
    assertFalse(ele.hasFrenzied);

    // Morale drops to 0
    ele.drainMorale(10);
    assertEqual(ele.morale, 0);

    frenzied = engine.processBerserkFrenzy();
    assertEqual(frenzied.length, 1, 'Morale 0 must trigger frenzy');
    assertTrue(ele.hasFrenzied);
  });

  test('ADV_ELE_02: Deals 24 Trample Damage & 15 Morale Shock to All Adjacent Units (8 tiles)', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'ele', unitTypeId: 'WAR_ELEPHANTS', hp: 350, morale: 0 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: []
      }
    });

    const ele = engine.getUnit('ele');
    ele.col = 5; ele.row = 5;

    // Place units on all 8 adjacent tiles (4 friendly, 4 enemy)
    const adjacentUnits = [];
    let counter = 1;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        const side = (counter % 2 === 0) ? 'ATTACKER' : 'DEFENDER';
        const u = new TacticalUnit({ id: `adj_${counter++}`, unitTypeId: 'PAIKS', hp: 105, morale: 75 }, side);
        u.col = 5 + dc;
        u.row = 5 + dr;
        engine.units.push(u);
        adjacentUnits.push(u);
      }
    }
    assertEqual(adjacentUnits.length, 8);
    engine.syncGridUnits();

    // Trigger frenzy
    const frenzied = engine.processBerserkFrenzy();
    assertEqual(frenzied.length, 1);

    // Check that ALL 8 adjacent units took 24 damage and 15 morale shock
    adjacentUnits.forEach(adj => {
      assertEqual(adj.hp, 105 - 24, `Unit at (${adj.col}, ${adj.row}) must take 24 damage`);
      assertEqual(adj.morale, 75 - 15, `Unit at (${adj.col}, ${adj.row}) must take 15 morale shock`);
    });

    // Elephant itself must NOT damage itself
    assertEqual(ele.hp, 350, 'Elephant must not damage itself during frenzy');
  });

  test('ADV_ELE_03: Single-Execution Lock (hasFrenzied prevents repeat triggers)', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [
          { id: 'ele', unitTypeId: 'WAR_ELEPHANTS', hp: 350, morale: 0 },
          { id: 'bystander', unitTypeId: 'PAIKS', hp: 105, morale: 75 }
        ]
      },
      defenderArmy: { id: 'def', regiments: [] }
    });

    const ele = engine.getUnit('ele');
    const bys = engine.getUnit('bystander');
    ele.col = 5; ele.row = 5;
    bys.col = 6; bys.row = 5;
    engine.syncGridUnits();

    // First call triggers
    const f1 = engine.processBerserkFrenzy();
    assertEqual(f1.length, 1);
    assertEqual(bys.hp, 81);

    // Second call must NOT re-trigger
    const f2 = engine.processBerserkFrenzy();
    assertEqual(f2.length, 0, 'Subsequent frenzy check must not trigger again');
    assertEqual(bys.hp, 81, 'Bystander HP must not drop again');
  });

  test('ADV_ELE_04: Non-Elephant Units at Morale 0 Do NOT Trigger Berserk Frenzy', () => {
    const nonEleClasses = ['HEAVY_CAVALRY', 'RAJPUT_LEVIES', 'PAIKS', 'HORSE_ARCHERS', 'SIEGE_ENGINES'];

    for (const unitType of nonEleClasses) {
      const engine = new TacticalEngine({
        attackerArmy: {
          id: 'att',
          regiments: [
            { id: 'test_u', unitTypeId: unitType, hp: 100, morale: 0 },
            { id: 'neighbor', unitTypeId: 'PAIKS', hp: 100 }
          ]
        },
        defenderArmy: { id: 'def', regiments: [] }
      });

      const u = engine.getUnit('test_u');
      const n = engine.getUnit('neighbor');
      u.col = 5; u.row = 5;
      n.col = 6; n.row = 5;
      engine.syncGridUnits();

      const frenzied = engine.processBerserkFrenzy();
      assertEqual(frenzied.length, 0, `Non-elephant unit (${unitType}) must never frenzy`);
      assertEqual(n.hp, 100, `Neighbor must take 0 damage from non-elephant`);
    }
  });
});

// ============================================================================
// SUITE 6: MULTI-TURN SIMULATED BATTLES (100 FULL AUTOMATED BATTLES)
// ============================================================================
describe('Adversarial Stability — 100 Full Automated Tactical Battles', () => {

  test('ADV_SIM_01: 100 Full Multi-Turn Battles Complete Without Infinite Loops, Deadlocks, or Memory Leaks', () => {
    const terrains = ['FLOODPLAIN', 'RIVER_DELTA', 'HIGHLAND_HILLS', 'JUNGLE', 'MOUNTAIN_PASS', 'ARID_PLATEAU'];
    const factions = ['FAC_DELHI', 'FAC_VIJAYANAGARA', 'FAC_BAHMANI', 'FAC_BENGAL', 'FAC_MEWAR', 'FAC_AHOM'];
    const generals = [
      { id: 'GEN_TUGHLAQ', name: 'Muhammad bin Tughlaq', attributes: { command: 8, dread: 7, piety: 5 } },
      { id: 'GEN_BUKKA', name: 'Bukka Raya I', attributes: { command: 9, dread: 5, piety: 7 } },
      { id: 'GEN_BAHMAN', name: 'Ala-ud-Din Bahman Shah', attributes: { command: 8, dread: 8, piety: 6 } },
      { id: 'GEN_MEWAR', name: 'Rana Hammir Singh', attributes: { command: 7, dread: 6, piety: 8 } },
      null
    ];

    const unitTypeKeys = ['WAR_ELEPHANTS', 'HEAVY_CAVALRY', 'RAJPUT_LEVIES', 'PAIKS', 'HORSE_ARCHERS', 'SIEGE_ENGINES'];

    // Track memory
    const initialHeap = process.memoryUsage().heapUsed;

    let totalBattles = 100;
    let battlesCompleted = 0;
    let attackerWins = 0;
    let defenderWins = 0;
    let maxRoundsObserved = 0;
    let totalRoundsObserved = 0;

    for (let b = 0; b < totalBattles; b++) {
      const terrainType = terrains[b % terrains.length];
      const attFaction = factions[b % factions.length];
      const defFaction = factions[(b + 1) % factions.length];
      const attGen = generals[b % generals.length];
      const defGen = generals[(b + 2) % generals.length];

      // Army sizes: 2 to 6 regiments per army
      const armySize = 2 + (b % 5);

      const attRegiments = [];
      const defRegiments = [];

      for (let i = 0; i < armySize; i++) {
        const uTypeA = unitTypeKeys[(b + i) % unitTypeKeys.length];
        const uTypeD = unitTypeKeys[(b + i + 2) % unitTypeKeys.length];
        const hpA = UNIT_TYPES[uTypeA].maxHp || 100;
        const hpD = UNIT_TYPES[uTypeD].maxHp || 100;

        attRegiments.push({ id: `att_r_${b}_${i}`, unitTypeId: uTypeA, hp: hpA });
        defRegiments.push({ id: `def_r_${b}_${i}`, unitTypeId: uTypeD, hp: hpD });
      }

      const engine = new TacticalEngine({
        attackerArmy: { id: `att_army_${b}`, name: `Attacker Army ${b}`, factionId: attFaction, regiments: attRegiments },
        defenderArmy: { id: `def_army_${b}`, name: `Defender Army ${b}`, factionId: defFaction, regiments: defRegiments },
        province: { id: `PROV_${b}`, name: `Province ${b}`, terrainType },
        attackerGeneral: attGen,
        defenderGeneral: defGen
      });

      let rounds = 0;
      const MAX_ROUNDS = 50;

      while (!engine.isOver && rounds < MAX_ROUNDS) {
        rounds++;

        // Automated Attacker Turn
        const attUnits = engine.units.filter(u => u.side === 'ATTACKER' && u.canAct());
        for (const u of attUnits) {
          if (!u.canAct()) continue;
          let targets = engine.getAttackTargets(u);

          if (targets.length === 0) {
            const reachable = engine.grid.getReachableTiles(u, engine.units);
            if (reachable.length > 0) {
              const enemies = engine.units.filter(e => e.side !== u.side && e.hp > 0 && !e.hasExited);
              if (enemies.length > 0) {
                let best = null;
                let minDist = Infinity;
                for (const t of reachable) {
                  for (const e of enemies) {
                    const d = engine.grid.getDistance(t.col, t.row, e.col, e.row);
                    if (d < minDist) {
                      minDist = d;
                      best = t;
                    }
                  }
                }
                if (best) {
                  engine.moveUnit(u.id, best.col, best.row);
                  targets = engine.getAttackTargets(u);
                }
              }
            }
          }

          if (targets.length > 0 && u.actionPoints > 0) {
            targets.sort((a, b) => {
              const multA = COUNTER_MATRIX.getMultiplier(u.unitClass, a.unitClass);
              const multB = COUNTER_MATRIX.getMultiplier(u.unitClass, b.unitClass);
              return multB - multA;
            });
            engine.attackUnit(u.id, targets[0].id);
          }
        }

        // End Player Phase executes AI Defender phase and advances round
        engine.endPlayerPhase();
      }

      // Assertions per battle
      assertTrue(engine.isOver, `Battle #${b + 1} (${terrainType}) failed to conclude within ${MAX_ROUNDS} rounds`);
      assert(engine.winner === 'attacker' || engine.winner === 'defender', `Battle #${b + 1} must have valid winner: ${engine.winner}`);
      assertTrue(rounds <= MAX_ROUNDS, `Battle #${b + 1} exceeded max round limit: ${rounds}`);

      if (engine.winner === 'attacker') attackerWins++;
      else defenderWins++;

      battlesCompleted++;
      totalRoundsObserved += rounds;
      if (rounds > maxRoundsObserved) maxRoundsObserved = rounds;

      // Verify campaign outcome compile
      const outcome = engine.getBattleOutcome();
      assert(outcome !== null, `Outcome of battle #${b + 1} must not be null`);
      assertEqual(outcome.winner, engine.winner);
      assertEqual(outcome.attackerWins, engine.winner === 'attacker');
      assertEqual(
        outcome.attacker.survivingRegiments + outcome.attacker.destroyed.length,
        outcome.attacker.totalRegimentsBefore,
        `Attacker units before (${outcome.attacker.totalRegimentsBefore}) must equal surviving (${outcome.attacker.survivingRegiments}) + destroyed (${outcome.attacker.destroyed.length})`
      );
      assertEqual(
        outcome.defender.survivingRegiments + outcome.defender.destroyed.length,
        outcome.defender.totalRegimentsBefore,
        `Defender units before (${outcome.defender.totalRegimentsBefore}) must equal surviving (${outcome.defender.survivingRegiments}) + destroyed (${outcome.defender.destroyed.length})`
      );
    }

    assertEqual(battlesCompleted, 100, 'All 100 automated battles must complete');
    const finalHeap = process.memoryUsage().heapUsed;
    const heapDiffMB = (finalHeap - initialHeap) / (1024 * 1024);

    console.log(`\n  [100 Battle Simulation Benchmark]`);
    console.log(`  - Total Battles Run:    ${battlesCompleted}`);
    console.log(`  - Attacker Victories:   ${attackerWins}`);
    console.log(`  - Defender Victories:   ${defenderWins}`);
    console.log(`  - Average Battle Length:${(totalRoundsObserved / 100).toFixed(1)} rounds`);
    console.log(`  - Max Rounds Observed:  ${maxRoundsObserved} rounds`);
    console.log(`  - Net Heap Delta:       ${heapDiffMB.toFixed(2)} MB`);

    // Ensure memory did not grow excessively (should be under 50 MB for 100 short battles in V8)
    assert(heapDiffMB < 60.0, `Heap memory growth (${heapDiffMB.toFixed(2)} MB) exceeded acceptable threshold (< 60MB)`);
  });
});

// Self-executing runner
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  (async () => {
    try {
      await advRunner.run();
    } catch (err) {
      console.error(`Fatal adversarial test error: ${err.message}`);
      console.error(err.stack);
      process.exit(1);
    }
  })();
}
