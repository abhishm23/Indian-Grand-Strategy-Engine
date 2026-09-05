// tests/test_tactical_engine.js
// Headless automated test suite for Tactical Battlefield Engine & Mechanics (Milestone 2)

import { describe, test, assert, assertTrue, assertFalse, assertEqual, assertApproxEqual, assertInBounds } from './testRunner.js';
import { TacticalEngine, TacticalGrid, TacticalUnit, TacticalCombatMath, FACING } from '../js/engine/tacticalEngine.js';
import { UNIT_TYPES, COUNTER_MATRIX } from '../js/data/units.js';

describe('Tactical Engine — Grid & Deployment Geometry', () => {
  test('T_GRID_01: 20x14 grid dimensions and 280 total tiles', () => {
    const grid = new TacticalGrid(20, 14);
    assertEqual(grid.cols, 20, 'Columns must equal 20');
    assertEqual(grid.rows, 14, 'Rows must equal 14');
    let count = 0;
    for (let r = 0; r < 14; r++) {
      for (let c = 0; c < 20; c++) {
        const tile = grid.getTile(c, r);
        assert(tile !== null, `Tile at ${c},${r} must exist`);
        assertEqual(tile.col, c);
        assertEqual(tile.row, r);
        count++;
      }
    }
    assertEqual(count, 280, 'Total tiles must equal 280');
  });

  test('T_GRID_02: Attacker deployment zone strictly cols 0-3 with East facing', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_test',
        factionId: 'FAC_PLAYER',
        regiments: [
          { id: 'att_1', unitTypeId: 'RAJPUT_LEVIES', name: 'Rajput Spear Guard', hp: 130 },
          { id: 'att_2', unitTypeId: 'WAR_ELEPHANTS', name: 'Gaja Host', hp: 350 }
        ]
      },
      defenderArmy: {
        id: 'def_test',
        factionId: 'FAC_ENEMY',
        regiments: [
          { id: 'def_1', unitTypeId: 'PAIKS', name: 'Paik Militia', hp: 105 }
        ]
      }
    });

    const attUnits = engine.units.filter(u => u.side === 'ATTACKER');
    assertEqual(attUnits.length, 2, 'Should spawn 2 attacker units');
    attUnits.forEach(u => {
      assertInBounds(u.col, 0, 3, 'Attacker col must be between 0 and 3');
      assertEqual(u.facing, 'E', 'Attacker unit default facing must be East');
    });
  });

  test('T_GRID_03: Defender deployment zone strictly cols 16-19 with West facing', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_test',
        factionId: 'FAC_PLAYER',
        regiments: [{ id: 'att_1', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
      },
      defenderArmy: {
        id: 'def_test',
        factionId: 'FAC_ENEMY',
        regiments: [
          { id: 'def_1', unitTypeId: 'HORSE_ARCHERS', hp: 90 },
          { id: 'def_2', unitTypeId: 'SIEGE_ENGINES', hp: 70 }
        ]
      }
    });

    const defUnits = engine.units.filter(u => u.side === 'DEFENDER');
    assertEqual(defUnits.length, 2, 'Should spawn 2 defender units');
    defUnits.forEach(u => {
      assertInBounds(u.col, 16, 19, 'Defender col must be between 16 and 19');
      assertEqual(u.facing, 'W', 'Defender unit default facing must be West');
    });
  });

  test("T_GRID_04: No-man's land (cols 4-15) contains zero initial units", () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_test',
        factionId: 'FAC_PLAYER',
        regiments: [{ id: 'att_1', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }]
      },
      defenderArmy: {
        id: 'def_test',
        factionId: 'FAC_ENEMY',
        regiments: [{ id: 'def_1', unitTypeId: 'PAIKS', hp: 105 }]
      }
    });

    for (let r = 0; r < 14; r++) {
      for (let c = 4; c <= 15; c++) {
        const u = engine.getUnitAt(c, r);
        assertEqual(u, null, `Tile ${c},${r} in No-man's land must be vacant initially`);
      }
    }
  });
});

describe('Tactical Engine — Unit Schemas & Action Economy', () => {
  test('T_UNIT_01: War Elephants base stats and Terror Aura', () => {
    const elephant = new TacticalUnit({ unitTypeId: 'WAR_ELEPHANTS', hp: 350 }, 'ATTACKER');
    assertEqual(elephant.maxHp, 350);
    assertEqual(elephant.meleeAtk, 48);
    assertEqual(elephant.meleeDef, 28);
    assertEqual(elephant.moveSpeed, 3);
    assertEqual(elephant.baseMorale, 120);
    assertEqual(elephant.terrorMoraleDrain, 30, 'Terror morale drain must be 30');
    assertEqual(elephant.actionPoints, 2, 'Initial AP must be 2');
  });

  test('T_UNIT_02: Horse Archers skirmish mobility and range', () => {
    const ha = new TacticalUnit({ unitTypeId: 'HORSE_ARCHERS', hp: 90 }, 'ATTACKER');
    assertEqual(ha.maxHp, 90);
    assertEqual(ha.range, 4);
    assertEqual(ha.moveSpeed, 5);
    assertTrue(ha.skirmishRetreat, 'Horse Archers must have skirmish retreat');
  });

  test('T_UNIT_03: Rajput Levies spear brace and Jauhar morale floor', () => {
    const rajput = new TacticalUnit({ unitTypeId: 'RAJPUT_LEVIES', hp: 130 }, 'DEFENDER');
    assertEqual(rajput.maxHp, 130);
    assertTrue(rajput.spearBrace, 'Rajput Levies must have spear brace');
    assertEqual(rajput.minMoraleFloor, 25, 'Min morale floor must be 25');
    assertApproxEqual(rajput.hillCombatBonus, 0.35, 0.01);
  });

  test('T_UNIT_04: Paiks wetland immunity and jungle stealth', () => {
    const paik = new TacticalUnit({ unitTypeId: 'PAIKS', hp: 105 }, 'DEFENDER');
    assertEqual(paik.maxHp, 105);
    assertEqual(paik.range, 3);
    assertTrue(paik.marshImmunity, 'Paiks must have marsh immunity');
    assertTrue(paik.jungleStealth, 'Paiks must have jungle stealth');
  });

  test('T_UNIT_05: Heavy Cavalry charge multiplier', () => {
    const hc = new TacticalUnit({ unitTypeId: 'HEAVY_CAVALRY', hp: 160 }, 'ATTACKER');
    assertEqual(hc.maxHp, 160);
    assertEqual(hc.meleeAtk, 42);
    assertEqual(hc.meleeDef, 26);
    assertEqual(hc.moveSpeed, 4);
    assertApproxEqual(hc.chargeMultiplier, 2.2, 0.01);
  });

  test('T_UNIT_06: Siege Engines min range 2 and range 6', () => {
    const siege = new TacticalUnit({ unitTypeId: 'SIEGE_ENGINES', hp: 70 }, 'ATTACKER');
    assertEqual(siege.maxHp, 70);
    assertEqual(siege.meleeAtk, 65);
    assertEqual(siege.range, 6);
    assertEqual(siege.minRange, 2, 'Siege engines must have minimum range 2');
    assertEqual(siege.moveSpeed, 1);
  });

  test('T_UNIT_07: Movement expends 1 AP and updates facing vector', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'u1', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'u2', unitTypeId: 'PAIKS', hp: 105 }]
      }
    });

    const unit = engine.units.find(u => u.id === 'u1');
    assertEqual(unit.actionPoints, 2);
    const startCol = unit.col;
    const startRow = unit.row;

    const moveRes = engine.moveUnit('u1', startCol + 2, startRow);
    assertTrue(moveRes.success, 'Move should succeed');
    assertEqual(unit.col, startCol + 2);
    assertEqual(unit.actionPoints, 1, 'Action points should decrement to 1');
    assertEqual(unit.facing, 'E', 'Facing should orient towards movement direction East');
  });
});

describe('Tactical Engine — Directional Combat Mathematics', () => {
  test('T_DIR_01: Frontal arc (0°–45°) deals 1.0x damage, 0 morale shock, counter allowed', () => {
    // Defender facing EAST at (5, 5). Attacker at (6, 5) -> approach angle 0°
    const angle0 = TacticalCombatMath.calculateApproachAngle('EAST', 5, 5, 6, 5);
    assertEqual(angle0, 0, 'Angle directly in front must be 0°');

    const dir0 = TacticalCombatMath.calculateDirectionalAttack(angle0);
    assertEqual(dir0.direction, 'FRONT');
    assertEqual(dir0.damageMultiplier, 1.0);
    assertEqual(dir0.moraleShock, 0);
    assertEqual(dir0.armorReduction, 0.0);
    assertTrue(dir0.counterAllowed);

    // Diagonal front at 45°
    const angle45 = TacticalCombatMath.calculateApproachAngle('EAST', 5, 5, 6, 4);
    assertApproxEqual(angle45, 45, 0.1);
    const dir45 = TacticalCombatMath.calculateDirectionalAttack(angle45);
    assertEqual(dir45.direction, 'FRONT');
    assertEqual(dir45.damageMultiplier, 1.0);
  });

  test('T_DIR_02: Flanking arc (46°–135°) deals 1.4x damage, -20 morale shock, 50% armor bypass', () => {
    // Defender facing EAST at (5, 5). Attacker at (5, 4) -> approach angle 90°
    const angle90 = TacticalCombatMath.calculateApproachAngle('EAST', 5, 5, 5, 4);
    assertApproxEqual(angle90, 90, 0.1);

    const dir90 = TacticalCombatMath.calculateDirectionalAttack(angle90);
    assertEqual(dir90.direction, 'FLANK');
    assertApproxEqual(dir90.damageMultiplier, 1.4, 0.01);
    assertEqual(dir90.moraleShock, -20);
    assertEqual(dir90.armorReduction, 0.50);
    assertTrue(dir90.counterAllowed);

    // 135° diagonal flank
    const angle135 = TacticalCombatMath.calculateApproachAngle('EAST', 5, 5, 4, 4);
    assertApproxEqual(angle135, 135, 0.1);
    const dir135 = TacticalCombatMath.calculateDirectionalAttack(angle135);
    assertEqual(dir135.direction, 'FLANK');
  });

  test('T_DIR_03: Rear arc (136°–180°) deals 2.0x damage, -40 morale shock, 100% armor bypass, NO counter', () => {
    // Defender facing EAST at (5, 5). Attacker at (4, 5) -> approach angle 180°
    const angle180 = TacticalCombatMath.calculateApproachAngle('EAST', 5, 5, 4, 5);
    assertEqual(angle180, 180);

    const dir180 = TacticalCombatMath.calculateDirectionalAttack(angle180);
    assertEqual(dir180.direction, 'REAR');
    assertEqual(dir180.damageMultiplier, 2.0);
    assertEqual(dir180.moraleShock, -40);
    assertEqual(dir180.armorReduction, 1.0);
    assertFalse(dir180.counterAllowed, 'Counter-attack must NOT be allowed from rear attack');
  });

  test('T_DIR_04: Directional attack execution produces higher damage on flank and rear than front', () => {
    const setupAndAttack = (atkCol, atkRow, defFacing = 'EAST') => {
      const engine = new TacticalEngine({
        attackerArmy: {
          id: 'att',
          regiments: [{ id: 'att_u', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
        },
        defenderArmy: {
          id: 'def',
          regiments: [{ id: 'def_u', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
        }
      });
      const def = engine.getUnit('def_u');
      def.col = 5;
      def.row = 5;
      def.setFacing(defFacing);

      const atk = engine.getUnit('att_u');
      atk.col = atkCol;
      atk.row = atkRow;
      engine.syncGridUnits();

      return engine.attackUnit('att_u', 'def_u');
    };

    // Front attack (attacker at 6, 5)
    const frontRes = setupAndAttack(6, 5, 'EAST');
    assertEqual(frontRes.direction, 'FRONT');

    // Flank attack (attacker at 5, 4)
    const flankRes = setupAndAttack(5, 4, 'EAST');
    assertEqual(flankRes.direction, 'FLANK');

    // Rear attack (attacker at 4, 5)
    const rearRes = setupAndAttack(4, 5, 'EAST');
    assertEqual(rearRes.direction, 'REAR');

    assert(flankRes.damageDealt > frontRes.damageDealt, `Flank damage (${flankRes.damageDealt}) should exceed front damage (${frontRes.damageDealt})`);
    assert(rearRes.damageDealt > flankRes.damageDealt, `Rear damage (${rearRes.damageDealt}) should exceed flank damage (${flankRes.damageDealt})`);
    assertEqual(rearRes.counterDamage, 0, 'Rear attack should produce 0 counter-damage');
  });
});

describe('Tactical Engine — Terrain Modifiers', () => {
  test('T_TER_01: High ground downhill attack grants +25% damage per level and +1 range', () => {
    const elevMod1 = TacticalCombatMath.calculateElevationModifier(1, 0);
    assertApproxEqual(elevMod1.damageMultiplier, 1.25, 0.01, 'Level +1 elevation gives 1.25x damage');
    assertEqual(elevMod1.rangeBonus, 1, 'Level +1 elevation gives +1 missile range');

    const elevMod2 = TacticalCombatMath.calculateElevationModifier(2, 0);
    assertApproxEqual(elevMod2.damageMultiplier, 1.50, 0.01, 'Level +2 elevation gives 1.50x damage');
    assertEqual(elevMod2.rangeBonus, 2);
  });

  test('T_TER_02: Uphill attack suffers -25% damage per level and -1 range', () => {
    const elevModMinus = TacticalCombatMath.calculateElevationModifier(0, 1);
    assertApproxEqual(elevModMinus.damageMultiplier, 0.75, 0.01, 'Level -1 elevation gives 0.75x damage');
    assertEqual(elevModMinus.rangeBonus, -1);
  });

  test('T_TER_03: Forest cover provides 50% missile protection and prohibits cavalry charge', () => {
    const forestTile = { isCover: true, terrainType: 'FOREST' };
    const coverMissile = TacticalCombatMath.calculateTerrainCoverModifier(forestTile, true);
    assertApproxEqual(coverMissile.damageReduction, 0.50, 0.01, 'Forest gives 50% missile damage reduction');
    assertFalse(coverMissile.chargeAllowed, 'Forest must prohibit cavalry charge');

    const coverMelee = TacticalCombatMath.calculateTerrainCoverModifier(forestTile, false);
    assertEqual(coverMelee.damageReduction, 0.0, 'Forest does not reduce melee attack damage');
    assertFalse(coverMelee.chargeAllowed, 'Forest prohibits charge even in melee');
  });

  test('T_TER_04: River chokepoints impose 50% movement penalty except for Paiks (Marsh Immunity)', () => {
    const grid = new TacticalGrid(20, 14, { terrainType: 'RIVER_DELTA' });
    const marshTile = { isMarsh: true, terrainType: 'MARSH', movementCost: 2.0 };

    const cav = new TacticalUnit({ unitTypeId: 'HEAVY_CAVALRY', hp: 160 }, 'ATTACKER');
    const paik = new TacticalUnit({ unitTypeId: 'PAIKS', hp: 105 }, 'ATTACKER');

    const cavCost = grid.getTileMoveCost(marshTile, cav);
    assertEqual(cavCost, 2.0, 'Heavy cavalry entering marsh costs 2.0 MP (50% penalty)');

    const paikCost = grid.getTileMoveCost(marshTile, paik);
    assertEqual(paikCost, 1.0, 'Paiks with Marsh Immunity pay only 1.0 MP');
  });
});

describe('Tactical Engine — Morale, Rout & Cascade Shock', () => {
  test('T_MOR_01: Morale state classifies correctly across thresholds', () => {
    assertEqual(TacticalCombatMath.classifyMorale(100), 'STEADY');
    assertEqual(TacticalCombatMath.classifyMorale(50), 'STEADY');
    assertEqual(TacticalCombatMath.classifyMorale(49), 'SHAKEN');
    assertEqual(TacticalCombatMath.classifyMorale(25), 'SHAKEN');
    assertEqual(TacticalCombatMath.classifyMorale(24), 'PANICKING');
    assertEqual(TacticalCombatMath.classifyMorale(21), 'PANICKING');
    assertEqual(TacticalCombatMath.classifyMorale(20), 'ROUTED');
    assertEqual(TacticalCombatMath.classifyMorale(5), 'ROUTED');
    assertEqual(TacticalCombatMath.classifyMorale(0), 'ROUTED');
  });

  test('T_MOR_02: Unit with morale <= 20% becomes ROUTED and uncontrollable', () => {
    const unit = new TacticalUnit({ unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 25 }, 'DEFENDER');
    assertFalse(unit.isRouted);
    assertTrue(unit.canAct());

    unit.drainMorale(6);
    assertEqual(unit.morale, 19);
    assertTrue(unit.isRouted, 'Unit with morale <= 20 must be marked isRouted');
    assertFalse(unit.canAct(), 'Routed unit cannot act');
  });

  test('T_MOR_03: Chain panic triggers -15 morale shock to nearby friendly units (<= 3 tiles)', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'att_u', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [
          { id: 'def_1', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 25 },
          { id: 'def_near', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
          { id: 'def_far', unitTypeId: 'PAIKS', hp: 105, morale: 75 }
        ]
      }
    });

    const d1 = engine.getUnit('def_1');
    const dNear = engine.getUnit('def_near');
    const dFar = engine.getUnit('def_far');

    d1.col = 10; d1.row = 5;
    dNear.col = 12; dNear.row = 5; // distance = 2 (<= 3)
    dFar.col = 16; dFar.row = 5;  // distance = 6 (> 3)
    engine.syncGridUnits();

    // Drain d1 to trigger rout
    d1.drainMorale(10);
    engine.triggerChainPanic(d1);

    assertEqual(dNear.morale, 60, 'Nearby friendly unit should lose 15 morale from chain panic');
    assertEqual(dFar.morale, 75, 'Far friendly unit should be unaffected');
  });

  test('T_MOR_04: General Leadership Aura grants 100% immunity to chain panic', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'att_u', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
      },
      defenderArmy: {
        id: 'def',
        generalId: 'CHAR_BUKKA',
        regiments: [
          { id: 'def_gen', unitTypeId: 'RAJPUT_LEVIES', hp: 130 },
          { id: 'def_protected', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
          { id: 'def_fleeing', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 22 }
        ]
      },
      defenderGeneral: {
        id: 'CHAR_BUKKA',
        name: 'Bukka Raya I',
        attributes: { command: 9, dread: 5, piety: 7 }
      }
    });

    const gen = engine.getUnit('def_gen');
    const prot = engine.getUnit('def_protected');
    const flee = engine.getUnit('def_fleeing');

    gen.col = 16; gen.row = 6;
    prot.col = 15; prot.row = 6; // distance 1 from general -> inside aura
    flee.col = 14; flee.row = 6; // distance 1 from prot (<= 3)

    engine.updateAuras();
    assertTrue(prot.inGeneralAura, 'Protected unit must be inside general aura');

    // Trigger rout on flee
    flee.drainMorale(5);
    engine.triggerChainPanic(flee);

    assertEqual(prot.morale, 75, 'Unit inside General Aura must take 0 chain panic shock');
  });

  test('T_MOR_05: Routing units auto-move toward retreat edge each phase', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'att_rout', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 15 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'def_rout', unitTypeId: 'PAIKS', hp: 105, morale: 15 }]
      }
    });

    const attU = engine.getUnit('att_rout');
    const defU = engine.getUnit('def_rout');

    attU.col = 3; attU.row = 5;
    defU.col = 17; defU.row = 5;
    engine.syncGridUnits();

    // Attacker routes West toward col 0
    engine.processRoutingUnits('ATTACKER');
    assertEqual(attU.col, 2, 'Attacker routed unit should step West toward col 0');

    // Defender routes East toward col 19
    engine.processRoutingUnits('DEFENDER');
    assertEqual(defU.col, 18, 'Defender routed unit should step East toward col 19');
  });

  test('T_MOR_06: War Elephant Berserk Frenzy deals 24 damage to all adjacent units at 0 morale', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [
          { id: 'ele', unitTypeId: 'WAR_ELEPHANTS', hp: 350, morale: 0 },
          { id: 'adj_friendly', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }
        ]
      },
      defenderArmy: {
        id: 'def',
        regiments: [
          { id: 'adj_enemy', unitTypeId: 'PAIKS', hp: 105 }
        ]
      }
    });

    const ele = engine.getUnit('ele');
    const friendly = engine.getUnit('adj_friendly');
    const enemy = engine.getUnit('adj_enemy');

    ele.col = 6; ele.row = 6;
    friendly.col = 7; friendly.row = 6; // adjacent
    enemy.col = 5; enemy.row = 6;    // adjacent
    engine.syncGridUnits();

    const frenzied = engine.processBerserkFrenzy();
    assertEqual(frenzied.length, 1);
    assertEqual(friendly.hp, 130 - 24, 'Friendly adjacent unit should take 24 berserk trample damage');
    assertEqual(enemy.hp, 105 - 24, 'Enemy adjacent unit should take 24 berserk trample damage');
    assertTrue(ele.hasFrenzied);
  });
});

describe('Tactical Engine — General Aura & Rock-Paper-Scissors Counters', () => {
  test('T_AUR_01: General Aura radius scales with Command stat', () => {
    // Formula: Math.max(2, Math.floor(command / 2) + 1)
    assertEqual(TacticalCombatMath.calculateGeneralAuraRadius(0), 2);
    assertEqual(TacticalCombatMath.calculateGeneralAuraRadius(3), 2);
    assertEqual(TacticalCombatMath.calculateGeneralAuraRadius(5), 3);
    assertEqual(TacticalCombatMath.calculateGeneralAuraRadius(8), 5); // Sultan Tughlaq
    assertEqual(TacticalCombatMath.calculateGeneralAuraRadius(9), 5); // Bukka Raya I
    assertEqual(TacticalCombatMath.calculateGeneralAuraRadius(10), 6);
  });

  test('T_RPS_01: Rock-paper-scissors counter relationships from units.js', () => {
    // Rajput Levies (Spear) vs Heavy Cavalry: 2.0x
    const spearVsCav = COUNTER_MATRIX.getMultiplier('FEROCIOUS_INFANTRY', 'SHOCK_CAVALRY');
    assertApproxEqual(spearVsCav, 2.0, 0.01);

    // Heavy Cavalry vs Paiks (Archers/Militia): 2.2x
    const cavVsPaik = COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'WETLAND_INFANTRY');
    assertApproxEqual(cavVsPaik, 2.2, 0.01);

    // Siege Engines vs War Elephants: 2.0x
    const siegeVsEle = COUNTER_MATRIX.getMultiplier('ARTILLERY_ENGINE', 'SHOCK_MONSTER');
    assertApproxEqual(siegeVsEle, 2.0, 0.01);

    // War Elephants vs Rajput Levies: 1.8x
    const eleVsInf = COUNTER_MATRIX.getMultiplier('SHOCK_MONSTER', 'FEROCIOUS_INFANTRY');
    assertApproxEqual(eleVsInf, 1.8, 0.01);
  });
});

describe('Tactical Engine — Battle Outcome & Campaign Synchronization', () => {
  test('T_OUT_01: Eliminating all defender units declares attacker victory and produces valid outcome object', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_army',
        name: 'Royal Army of Vijayanagara',
        factionId: 'FAC_VIJAYANAGARA',
        regiments: [{ id: 'att_reg', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
      },
      defenderArmy: {
        id: 'def_army',
        name: 'Bahmani Vanguard',
        factionId: 'FAC_BAHMANI',
        regiments: [{ id: 'def_reg', unitTypeId: 'PAIKS', hp: 10 }]
      },
      province: { id: 'PROV_RAICHUR', name: 'Raichur Doab', terrainType: 'FLOODPLAIN' }
    });

    const def = engine.getUnit('def_reg');
    def.hp = 0; // killed

    assertTrue(engine.checkBattleEnd(), 'Battle should be ended');
    assertEqual(engine.winner, 'attacker', 'Attacker should be the winner');

    const outcome = engine.getBattleOutcome();
    assertTrue(outcome.attackerWins);
    assertEqual(outcome.winner, 'attacker');
    assertEqual(outcome.outcome, 'DECISIVE_VICTORY');
    assertEqual(outcome.province.id, 'PROV_RAICHUR');
    assertEqual(outcome.attacker.armyId, 'att_army');
    assertEqual(outcome.defender.armyId, 'def_army');
    assertEqual(outcome.defender.destroyed.length, 1);
    assertEqual(outcome.defender.survivingRegiments, 0);
    assertEqual(outcome.attacker.survivingRegiments, 1);
  });

  test('T_OUT_02: Tactical retreat concedes battle to defender with minimal losses', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_army',
        regiments: [{ id: 'att_reg', unitTypeId: 'HORSE_ARCHERS', hp: 90 }]
      },
      defenderArmy: {
        id: 'def_army',
        regiments: [{ id: 'def_reg', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }]
      }
    });

    const retreatOutcome = engine.retreat('ATTACKER');
    assertFalse(retreatOutcome.attackerWins);
    assertEqual(retreatOutcome.winner, 'defender');
    assertEqual(engine.currentPhase, 'BATTLE_OVER');
  });
});

describe('Tactical Engine — Doctrines, Terror Aura & Campaign State Mutation', () => {
  test('T_DOC_01: Gaja Shock Charge doctrine applies +50% damage and -30 terror shock', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'ele', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'inf', unitTypeId: 'RAJPUT_LEVIES', hp: 130, morale: 100 }]
      }
    });

    const ele = engine.getUnit('ele');
    const inf = engine.getUnit('inf');
    ele.col = 5; ele.row = 5;
    inf.col = 6; inf.row = 5;
    inf.setFacing('W');
    engine.syncGridUnits();

    // Attack without doctrine
    const baseRes = engine.attackUnit('ele', 'inf');

    // Reset defender HP and morale for comparison
    inf.hp = 130;
    inf.morale = 100;
    inf.isRouted = false;
    ele.actionPoints = 2;

    // Attack with doctrine
    const chargeRes = engine.attackUnit('ele', 'inf', { elephantCharge: true });
    assert(chargeRes.damageDealt > baseRes.damageDealt, `Elephant charge damage (${chargeRes.damageDealt}) should exceed normal attack (${baseRes.damageDealt})`);
    assert(chargeRes.moraleLoss > baseRes.moraleLoss, `Elephant charge morale loss (${chargeRes.moraleLoss}) should exceed normal morale loss (${baseRes.moraleLoss})`);
  });

  test('T_DOC_02: Shield Wall doctrine grants +50% defense vs cavalry charges', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'cav', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [{ id: 'inf', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }]
      }
    });

    const cav = engine.getUnit('cav');
    const inf = engine.getUnit('inf');
    cav.col = 5; cav.row = 5;
    inf.col = 6; inf.row = 5;
    inf.setFacing('W');
    engine.syncGridUnits();

    // Standard attack
    const normalRes = engine.attackUnit('cav', 'inf');

    // Reset defender
    inf.hp = 130;
    cav.actionPoints = 2;

    // Shield Wall attack
    const shieldWallRes = engine.attackUnit('cav', 'inf', { shieldWall: true });
    assert(shieldWallRes.damageDealt < normalRes.damageDealt, `Shield Wall damage (${shieldWallRes.damageDealt}) should be less than normal damage (${normalRes.damageDealt})`);
  });

  test('T_AUR_02: War Elephant Terror Aura drains 30 morale from adjacent enemies at turn start', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att',
        regiments: [{ id: 'ele', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
      },
      defenderArmy: {
        id: 'def',
        regiments: [
          { id: 'near_enemy', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
          { id: 'far_enemy', unitTypeId: 'PAIKS', hp: 105, morale: 75 }
        ]
      }
    });

    const ele = engine.getUnit('ele');
    const near = engine.getUnit('near_enemy');
    const far = engine.getUnit('far_enemy');

    ele.col = 8; ele.row = 6;
    near.col = 9; near.row = 6; // distance = 1 (adjacent)
    far.col = 14; far.row = 6;  // distance = 6 (> 1)
    engine.syncGridUnits();

    // Apply terror auras to defender
    engine.applyTerrorAuras('DEFENDER');

    assertEqual(near.morale, 75 - 30, 'Adjacent enemy must lose 30 morale from Terror Aura');
    assertEqual(far.morale, 75, 'Non-adjacent enemy must remain unaffected');
  });

  test('T_BFS_01: BFS Pathfinding finds optimal path avoiding deep water obstacles', () => {
    const grid = new TacticalGrid(20, 14, { terrainType: 'FLOODPLAIN' });
    // In FLOODPLAIN, river is at col 9 and 10, with bridge at row 4
    const unit = new TacticalUnit({ unitTypeId: 'HEAVY_CAVALRY', hp: 160, moveSpeed: 6 }, 'ATTACKER');

    // Path from (8, 4) to (11, 4) crosses bridge at (9, 4) and (10, 4)
    const path = grid.findPath(8, 4, 11, 4, unit);
    assert(path !== null, 'Path across bridge must exist');
    assert(path.length >= 4, 'Path should traverse bridge tiles');

    // Attempting to cross river at row 0 (no bridge) must either fail or detour around bridge
    const detourPath = grid.findPath(8, 0, 11, 0, unit);
    if (detourPath) {
      // Must detour through bridge row
      const bridgeRowUsed = detourPath.some(step => (step.col === 9 || step.col === 10) && (step.row === 3 || step.row === 4 || step.row === 9 || step.row === 10));
      assertTrue(bridgeRowUsed, 'Detour path across river must pass through valid bridge crossings');
    }
  });

  test('T_CAMPAIGN_SYNC_01: Tactical outcome feeds into applyBattleOutcome and captures province', async () => {
    const { GameState } = await import('../js/engine/gameState.js');
    const { applyBattleOutcome } = await import('../js/engine/combatResolver.js');

    const gs = new GameState();
    gs.initNewGame('FAC_VIJAYANAGARA');

    const reg1 = { id: 'REG_ATT_1', name: 'Gaja Host', unitTypeId: 'WAR_ELEPHANTS', hp: 350 };
    const reg2 = { id: 'REG_DEF_1', name: 'Border Guard', unitTypeId: 'PAIKS', hp: 5 };

    gs.getArmiesInProvince('PROV_GULBARGA').forEach(a => gs.deleteArmy(a.id));
    const atkArmy = gs.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [reg1], null, 'Vijayanagara Vanguard');
    const defArmy = gs.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [reg2], null, 'Bahmani Garrison');
    const prov = gs.getProvince('PROV_GULBARGA');

    const engine = new TacticalEngine({
      attackerArmy: atkArmy,
      defenderArmy: defArmy,
      province: prov,
      gameState: gs
    });

    // Eliminate defender
    const defU = engine.getUnit('REG_DEF_1');
    defU.hp = 0;
    engine.checkBattleEnd();

    const tacticalOutcome = engine.getBattleOutcome();
    assertTrue(tacticalOutcome.attackerWins);

    // Apply to campaign
    const res = applyBattleOutcome(gs, tacticalOutcome);
    assertTrue(res.attackerWins);
    assertEqual(res.winner, 'attacker');
    assertEqual(prov.controllingFaction, 'FAC_VIJAYANAGARA', 'Province control must transfer to victor');
    assertEqual(atkArmy.provinceId, 'PROV_GULBARGA', 'Victorious army must advance into province');
    assertEqual(gs.getArmy(defArmy.id), null, 'Wiped defender army must be removed from GameState');
  });
});

describe('Tactical Remediation & Regression Tests — Iteration 2', () => {
  test('T_UI_RENDER_01: Headless canvas renderer smoke test completes without ReferenceError and >800 draw calls', async () => {
    const drawCalls = [];
    const noop = (name) => (...args) => { drawCalls.push({ name, args }); };
    const mockGradient = { addColorStop: () => {} };
    const mockCtx = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'canvas') return { width: 1000, height: 700 };
        if (prop === 'createRadialGradient' || prop === 'createLinearGradient') return () => mockGradient;
        return noop(prop);
      }
    });
    const mockCanvas = {
      width: 1000,
      height: 700,
      getContext: () => mockCtx,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 700 }),
      addEventListener: () => {},
      removeEventListener: () => {}
    };

    const mockEl = {
      style: {},
      classList: { add: () => {}, remove: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelectorAll: () => [],
      appendChild: () => {}
    };

    const prevDoc = global.document;
    const prevRAF = global.requestAnimationFrame;
    global.document = {
      getElementById: () => mockEl,
      querySelector: () => mockEl,
      querySelectorAll: () => [],
      createElement: () => mockEl
    };
    global.requestAnimationFrame = () => 1;

    try {
      const { TacticalBattlefield } = await import('../js/ui/tacticalView.js');
      const tb = new TacticalBattlefield({
        canvas: mockCanvas,
        attackerArmy: { id: 'att', factionId: 'FAC_VIJAYANAGARA', regiments: [{ id: 'hc', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }] },
        defenderArmy: { id: 'def', factionId: 'FAC_BAHMANI', regiments: [{ id: 'pk', unitTypeId: 'PAIKS', hp: 105 }] }
      });
      tb.render();
      assert(drawCalls.length >= 800, `Render should execute >= 800 canvas operations (actual: ${drawCalls.length})`);
    } finally {
      global.document = prevDoc;
      global.requestAnimationFrame = prevRAF;
    }
  });

  test('T_CALLBACK_01: TacticalEngine invokes onBattleEnd callback on combat victory and defeat', () => {
    let battleEndResult = null;

    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_force',
        factionId: 'FAC_VIJAYANAGARA',
        regiments: [{ id: 'att_el', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }]
      },
      defenderArmy: {
        id: 'def_force',
        factionId: 'FAC_BAHMANI',
        regiments: [{ id: 'def_p', unitTypeId: 'PAIKS', hp: 5 }]
      },
      onBattleEnd: (result) => {
        battleEndResult = result;
      }
    });

    const defUnit = engine.getUnit('def_p');
    defUnit.hp = 0;
    engine.checkBattleEnd();

    assertTrue(engine.isOver, 'Engine must flag isOver = true');
    assertEqual(engine.currentPhase, 'BATTLE_OVER');
    assert(battleEndResult !== null, 'onBattleEnd callback must be invoked');
    assertTrue(battleEndResult.attackerWins, 'Attacker must be victor');
    assertEqual(battleEndResult.winner, 'attacker');
  });

  test('T_CHARGE_01: Heavy Cavalry charge momentum grants dynamic attack bonus when charging >= 2 tiles', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_cav',
        factionId: 'FAC_DELHI',
        regiments: [
          { id: 'cav_stat', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
          { id: 'cav_charg', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }
        ]
      },
      defenderArmy: {
        id: 'def_inf',
        factionId: 'FAC_MEWAR',
        regiments: [
          { id: 'def_p1', unitTypeId: 'PAIKS', hp: 400 },
          { id: 'def_p2', unitTypeId: 'PAIKS', hp: 400 }
        ]
      }
    });

    const cavStat = engine.getUnit('cav_stat');
    const defP1 = engine.getUnit('def_p1');
    cavStat.col = 5; cavStat.row = 5; cavStat.movedDistance = 0; // Stationary
    defP1.col = 6; defP1.row = 5; defP1.setFacing('W');

    const cavCharg = engine.getUnit('cav_charg');
    const defP2 = engine.getUnit('def_p2');
    cavCharg.col = 5; cavCharg.row = 7; cavCharg.movedDistance = 3; // Charged 3 tiles
    defP2.col = 6; defP2.row = 7; defP2.setFacing('W');
    engine.syncGridUnits();

    const statRes = engine.attackUnit('cav_stat', 'def_p1');
    const chargRes = engine.attackUnit('cav_charg', 'def_p2');

    assert(chargRes.damageDealt > statRes.damageDealt, `Charging cavalry damage (${chargRes.damageDealt}) must exceed stationary cavalry damage (${statRes.damageDealt})`);
  });

  test('T_AURA_01: General Leadership Aura empowers subordinate units inside aura with commander attributes', () => {
    const bukkaRaya = {
      id: 'CHAR_BUKKA_I',
      name: 'Bukka Raya I',
      attributes: { command: 9, dread: 4, piety: 6 }
    };

    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_army',
        factionId: 'FAC_VIJAYANAGARA',
        regiments: [
          { id: 'gen_lead', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
          { id: 'sub_near', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
          { id: 'sub_far', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }
        ]
      },
      defenderArmy: {
        id: 'def_army',
        factionId: 'FAC_BAHMANI',
        regiments: [
          { id: 'target_near', unitTypeId: 'PAIKS', hp: 500 },
          { id: 'target_far', unitTypeId: 'PAIKS', hp: 500 }
        ]
      },
      attackerGeneral: bukkaRaya
    });

    const gen = engine.getUnit('gen_lead'); // Commander
    const subNear = engine.getUnit('sub_near'); // Within general aura
    const subFar = engine.getUnit('sub_far'); // Far away outside aura
    const targetNear = engine.getUnit('target_near');
    const targetFar = engine.getUnit('target_far');

    gen.col = 2; gen.row = 2;
    subNear.col = 3; subNear.row = 2; // dist 1 <= aura radius 5
    targetNear.col = 4; targetNear.row = 2;

    subFar.col = 15; subFar.row = 12; // dist > 10
    targetFar.col = 16; targetFar.row = 12;

    engine.syncGridUnits();
    engine.updateAuras();

    assertTrue(subNear.inGeneralAura, 'subNear must be inside General Aura');
    assertFalse(subFar.inGeneralAura, 'subFar must be outside General Aura');

    subNear.actionPoints = 2;
    subNear.movedDistance = 0;
    const nearRes = engine.attackUnit('sub_near', 'target_near');

    subFar.actionPoints = 2;
    subFar.movedDistance = 0;
    const farRes = engine.attackUnit('sub_far', 'target_far');

    assert(nearRes.damageDealt > farRes.damageDealt, `Subordinate in general aura damage (${nearRes.damageDealt}) must exceed uninspired subordinate damage (${farRes.damageDealt})`);
  });

  test('T_ELEV_01: Uphill attack reduces missile range by 1 per elevation level', () => {
    const engine = new TacticalEngine({
      attackerArmy: {
        id: 'att_missile',
        factionId: 'FAC_DELHI',
        regiments: [{ id: 'ha', unitTypeId: 'HORSE_ARCHERS', hp: 90 }] // base range 4
      },
      defenderArmy: {
        id: 'def_uphill',
        factionId: 'FAC_MEWAR',
        regiments: [{ id: 'def_p', unitTypeId: 'PAIKS', hp: 105 }]
      }
    });

    const ha = engine.getUnit('ha');
    const def = engine.getUnit('def_p');

    ha.col = 5; ha.row = 5; // elevation 0
    def.col = 9; def.row = 5; // distance = 4

    // Case 1: Neutral elevation -> target is within range 4
    engine.syncGridUnits();
    let targets = engine.getAttackTargets(ha);
    assertEqual(targets.length, 1, 'Target at distance 4 should be within range on level ground');

    // Case 2: Defender on hill (elevation 1) -> maxRange = 4 - 1 = 3 -> distance 4 is out of range
    const defTile = engine.grid.getTile(9, 5);
    defTile.elevation = 1;

    targets = engine.getAttackTargets(ha);
    assertEqual(targets.length, 0, 'Target uphill at distance 4 should be out of range due to uphill penalty');

    const res = engine.attackUnit('ha', 'def_p');
    assertFalse(res.success, 'Uphill attack out of range should fail');
  });
});
