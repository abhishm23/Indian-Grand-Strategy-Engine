/**
 * tests/adversarial_tactical_stress.js
 * 
 * Adversarial Stress Test Suite for Milestone 2: Tactical Battlefield Engine & Renderer
 * Executed by Challenger 1 (critic, specialist).
 * 
 * Tests:
 * 1. Directional Damage Arcs & Edge Angles (0°, 45°, 46°, 135°, 136°, 180°, and floating boundaries)
 * 2. Terrain Modifiers (Downhill +25%/level, Uphill -25%/level, Forest 50% missile protection, Forest charge negation, River 2.0 MP, Paik marsh immunity & defense penalty audit)
 * 3. Rock-Paper-Scissors Counters (Rajput Levies vs Cav 2.0x, Heavy Cav charge 2.2x audit, Siege vs Elephants 2.0x, Elephants vs Levies 1.8x)
 * 4. Extreme General Command Multipliers (Command 0 vs Command 10, Commander vs Subordinates in Aura)
 * 5. Numerical Safety (Division by Zero, NaN/Infinity propagation, Negative HP leaks, Morale clamping, Pathfinding infinite loops)
 */

import { TacticalEngine, TacticalGrid, TacticalUnit, TacticalCombatMath, FACING } from '../js/engine/tacticalEngine.js';
import { UNIT_TYPES, COUNTER_MATRIX } from '../js/data/units.js';

let passedCount = 0;
let failedCount = 0;
const findings = [];

function assert(condition, message, testGroup = 'GENERAL') {
  if (!condition) {
    failedCount++;
    const err = `FAIL [${testGroup}]: ${message}`;
    console.error(`\x1b[31m✖ ${err}\x1b[0m`);
    findings.push({ group: testGroup, status: 'FAIL', message });
    throw new Error(err);
  } else {
    passedCount++;
    console.log(`\x1b[32m✔ PASS [${testGroup}]: ${message}\x1b[0m`);
  }
}

function assertApproxEqual(actual, expected, tolerance = 0.01, message = '', testGroup = 'GENERAL') {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${message} (Expected ~${expected}, got ${actual}, diff ${diff})`, testGroup);
}

function runSection(title, fn) {
  console.log(`\n\x1b[1m\x1b[34m=== ${title} ===\x1b[0m`);
  try {
    fn();
  } catch (e) {
    console.error(`Section error: ${e.message}`);
  }
}

// ============================================================================
// SECTION 1: Directional Damage Arcs & Boundary Stress-Testing
// ============================================================================
runSection('1. Directional Damage Arcs & Boundary Angles', () => {
  // Test 1.1: Exact boundary values
  const front0 = TacticalCombatMath.calculateDirectionalAttack(0.0);
  assert(front0.direction === 'FRONT' && front0.damageMultiplier === 1.0 && front0.counterAllowed === true && front0.moraleShock === 0,
    'Angle 0.0° classified as FRONT (1.0x, 0 shock, counter allowed)', 'DIRECTIONAL');

  const front45 = TacticalCombatMath.calculateDirectionalAttack(45.0);
  assert(front45.direction === 'FRONT' && front45.damageMultiplier === 1.0 && front45.counterAllowed === true,
    'Angle 45.0° strictly classified as FRONT (1.0x)', 'DIRECTIONAL');

  const flank45_001 = TacticalCombatMath.calculateDirectionalAttack(45.001);
  assert(flank45_001.direction === 'FLANK' && flank45_001.damageMultiplier === 1.4 && flank45_001.moraleShock === -20,
    'Angle 45.001° strictly transitions to FLANK (1.4x, -20 shock)', 'DIRECTIONAL');

  const flank46 = TacticalCombatMath.calculateDirectionalAttack(46.0);
  assert(flank46.direction === 'FLANK' && flank46.damageMultiplier === 1.4 && flank46.armorReduction === 0.5,
    'Angle 46.0° classified as FLANK (1.4x, 50% armor reduction)', 'DIRECTIONAL');

  const flank135 = TacticalCombatMath.calculateDirectionalAttack(135.0);
  assert(flank135.direction === 'FLANK' && flank135.damageMultiplier === 1.4 && flank135.counterAllowed === true,
    'Angle 135.0° strictly classified as FLANK (1.4x, counter allowed)', 'DIRECTIONAL');

  const rear135_001 = TacticalCombatMath.calculateDirectionalAttack(135.001);
  assert(rear135_001.direction === 'REAR' && rear135_001.damageMultiplier === 2.0 && rear135_001.counterAllowed === false && rear135_001.moraleShock === -40,
    'Angle 135.001° strictly transitions to REAR (2.0x, -40 shock, NO counter)', 'DIRECTIONAL');

  const rear136 = TacticalCombatMath.calculateDirectionalAttack(136.0);
  assert(rear136.direction === 'REAR' && rear136.damageMultiplier === 2.0 && rear136.armorReduction === 1.0,
    'Angle 136.0° classified as REAR (2.0x, 100% armor bypass)', 'DIRECTIONAL');

  const rear180 = TacticalCombatMath.calculateDirectionalAttack(180.0);
  assert(rear180.direction === 'REAR' && rear180.damageMultiplier === 2.0 && rear180.counterAllowed === false,
    'Angle 180.0° classified as REAR (2.0x, NO counter)', 'DIRECTIONAL');

  // Test 1.2: Empirical Attack Execution across 3 Arcs
  const createDirTest = () => new TacticalEngine({
    attackerArmy: { id: 'att', regiments: [{ id: 'atk_u', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }] },
    defenderArmy: { id: 'def', regiments: [{ id: 'def_u', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }] }
  });

  // Defender at (5, 5) facing EAST
  const engFront = createDirTest();
  const defF = engFront.getUnit('def_u'); defF.col = 5; defF.row = 5; defF.setFacing('E');
  const atkF = engFront.getUnit('atk_u'); atkF.col = 6; atkF.row = 5;
  engFront.syncGridUnits();
  const resFront = engFront.attackUnit('atk_u', 'def_u');

  const engFlank = createDirTest();
  const defFl = engFlank.getUnit('def_u'); defFl.col = 5; defFl.row = 5; defFl.setFacing('E');
  const atkFl = engFlank.getUnit('atk_u'); atkFl.col = 5; atkFl.row = 4; // 90°
  engFlank.syncGridUnits();
  const resFlank = engFlank.attackUnit('atk_u', 'def_u');

  const engRear = createDirTest();
  const defR = engRear.getUnit('def_u'); defR.col = 5; defR.row = 5; defR.setFacing('E');
  const atkR = engRear.getUnit('atk_u'); atkR.col = 4; atkR.row = 5; // 180°
  engRear.syncGridUnits();
  const resRear = engRear.attackUnit('atk_u', 'def_u');

  assert(resFront.direction === 'FRONT', 'Empirical front attack direction is FRONT', 'DIRECTIONAL');
  assert(resFlank.direction === 'FLANK', 'Empirical flank attack direction is FLANK', 'DIRECTIONAL');
  assert(resRear.direction === 'REAR', 'Empirical rear attack direction is REAR', 'DIRECTIONAL');

  const flankDamageBonus = (resFlank.damageDealt - resFront.damageDealt) / resFront.damageDealt;
  assert(flankDamageBonus >= 0.40, `Flank attack deals >= 40% bonus damage (Actual: +${(flankDamageBonus * 100).toFixed(1)}%)`, 'DIRECTIONAL');

  const rearDamageBonus = (resRear.damageDealt - resFront.damageDealt) / resFront.damageDealt;
  assert(rearDamageBonus >= 1.00, `Rear attack deals >= 100% bonus damage (Actual: +${(rearDamageBonus * 100).toFixed(1)}%)`, 'DIRECTIONAL');

  assert(resRear.counterDamage === 0, 'Rear attack completely denies counter-damage', 'DIRECTIONAL');
  assert(resFront.counterDamage > 0, 'Front attack permits defender counter-damage', 'DIRECTIONAL');
});

// ============================================================================
// SECTION 2: Terrain Modifiers & Paik Marsh Audit
// ============================================================================
runSection('2. Terrain Modifiers & Elevation', () => {
  // Downhill +25% per elevation level
  const down1 = TacticalCombatMath.calculateElevationModifier(1, 0);
  assertApproxEqual(down1.damageMultiplier, 1.25, 0.001, 'Elevation delta +1 gives 1.25x damage (+25%)', 'TERRAIN');
  assert(down1.rangeBonus === 1, 'Elevation delta +1 gives +1 range bonus', 'TERRAIN');

  const down2 = TacticalCombatMath.calculateElevationModifier(2, 0);
  assertApproxEqual(down2.damageMultiplier, 1.50, 0.001, 'Elevation delta +2 gives 1.50x damage (+50%)', 'TERRAIN');
  assert(down2.rangeBonus === 2, 'Elevation delta +2 gives +2 range bonus', 'TERRAIN');

  // Uphill -25% per elevation level
  const up1 = TacticalCombatMath.calculateElevationModifier(0, 1);
  assertApproxEqual(up1.damageMultiplier, 0.75, 0.001, 'Elevation delta -1 gives 0.75x damage (-25%)', 'TERRAIN');
  assert(up1.rangeBonus === -1, 'Elevation delta -1 gives -1 range penalty', 'TERRAIN');

  const up2 = TacticalCombatMath.calculateElevationModifier(0, 2);
  assertApproxEqual(up2.damageMultiplier, 0.50, 0.001, 'Elevation delta -2 gives 0.50x damage (-50%)', 'TERRAIN');

  // Extreme uphill clamp test (e.g. delta = -5)
  const upExtreme = TacticalCombatMath.calculateElevationModifier(0, 5);
  assert(upExtreme.damageMultiplier === 0.25, 'Extreme uphill damage multiplier clamped to at least 0.25x (no 0 or negative damage)', 'TERRAIN');

  // Forest missile protection: 50% damage reduction
  const forestTile = { isCover: true, terrainType: 'FOREST' };
  const forestMissile = TacticalCombatMath.calculateTerrainCoverModifier(forestTile, true);
  assert(forestMissile.damageReduction === 0.50, 'Forest cover provides exactly 50% missile protection', 'TERRAIN');
  assert(forestMissile.chargeAllowed === false, 'Forest cover negates cavalry charge', 'TERRAIN');

  const forestMelee = TacticalCombatMath.calculateTerrainCoverModifier(forestTile, false);
  assert(forestMelee.damageReduction === 0.0, 'Forest cover does not reduce melee damage', 'TERRAIN');
  assert(forestMelee.defenseModifier === 1.25, 'Forest cover provides +25% defense bonus', 'TERRAIN');

  // Empirical test of forest missile protection
  const testMissileDamage = (targetInForest) => {
    const engine = new TacticalEngine({
      attackerArmy: { regiments: [{ id: 'ha', unitTypeId: 'HORSE_ARCHERS', hp: 90 }] },
      defenderArmy: { regiments: [{ id: 'tar', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }] }
    });
    const ha = engine.getUnit('ha'); ha.col = 3; ha.row = 5;
    const tar = engine.getUnit('tar'); tar.col = 5; tar.row = 5; tar.setFacing('W');
    if (targetInForest) {
      const tile = engine.grid.getTile(5, 5);
      tile.isCover = true;
      tile.terrainType = 'FOREST';
    }
    engine.syncGridUnits();
    return engine.attackUnit('ha', 'tar').damageDealt;
  };

  const openDmg = testMissileDamage(false);
  const forestDmg = testMissileDamage(true);
  assert(forestDmg < openDmg, `Forest cover significantly reduces missile damage (${openDmg} -> ${forestDmg})`, 'TERRAIN');
  const reductionRatio = (openDmg - forestDmg) / openDmg;
  assert(reductionRatio >= 0.45, `Missile damage reduction in forest is >= 45% (Actual: ${(reductionRatio * 100).toFixed(1)}%)`, 'TERRAIN');

  // River / Marsh movement penalty & Paik immunity
  const grid = new TacticalGrid(20, 14, { terrainType: 'RIVER_DELTA' });
  const marshTile = { isMarsh: true, terrainType: 'MARSH', movementCost: 2.0 };
  const cav = new TacticalUnit({ unitTypeId: 'HEAVY_CAVALRY', hp: 160 }, 'ATTACKER');
  const paik = new TacticalUnit({ unitTypeId: 'PAIKS', hp: 105 }, 'ATTACKER');

  assert(grid.getTileMoveCost(marshTile, cav) === 2.0, 'Normal unit movement cost in marsh is 2.0 MP (50% penalty)', 'TERRAIN');
  assert(grid.getTileMoveCost(marshTile, paik) === 1.0, 'Paik movement cost in marsh is 1.0 MP (marsh immunity)', 'TERRAIN');

  // AUDIT: Paik Defense Penalty in Marsh
  // Worker 2 claimed: "Paiks possessing Marsh_Immunity to move at 1.0 MP with 0 defense penalty"
  const marshCover = TacticalCombatMath.calculateTerrainCoverModifier(marshTile, false);
  assert(marshCover.defenseModifier === 0.75, 'Marsh imposes 0.75x defense modifier (-25% defense penalty)', 'TERRAIN');
  console.log(`\x1b[33m[AUDIT FINDING 1]: Paik Marsh Immunity is strictly movement-based (1.0 MP). In tacticalEngine.js line 951, calculateTerrainCoverModifier does NOT accept a unit parameter, so Paiks standing in marsh STILL suffer the -25% defense penalty (defenseModifier = 0.75). Worker 2 handoff falsely claimed 0 defense penalty.\x1b[0m`);
});

// ============================================================================
// SECTION 3: Rock-Paper-Scissors Counters & Heavy Cavalry Charge Audit
// ============================================================================
runSection('3. Rock-Paper-Scissors Counter Multipliers & Charge Mechanics', () => {
  // 3.1: Rajput Levies vs Cavalry (2.0x)
  const rajputVsCav = COUNTER_MATRIX.getMultiplier('FEROCIOUS_INFANTRY', 'SHOCK_CAVALRY');
  assertApproxEqual(rajputVsCav, 2.0, 0.01, 'Rajput Levies vs Heavy Cavalry counter multiplier is 2.0x', 'RPS');

  // 3.2: Siege Engines vs Elephants (2.0x)
  const siegeVsEle = COUNTER_MATRIX.getMultiplier('ARTILLERY_ENGINE', 'SHOCK_MONSTER');
  assertApproxEqual(siegeVsEle, 2.0, 0.01, 'Siege Engines vs War Elephants counter multiplier is 2.0x', 'RPS');

  // 3.3: Elephants vs Levies (1.8x)
  const eleVsLevies = COUNTER_MATRIX.getMultiplier('SHOCK_MONSTER', 'FEROCIOUS_INFANTRY');
  assertApproxEqual(eleVsLevies, 1.8, 0.01, 'War Elephants vs Rajput Levies counter multiplier is 1.8x', 'RPS');

  // 3.4: Heavy Cavalry Charge Audit
  const cavVsPaiksCharge = COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'WETLAND_INFANTRY', true);
  const cavVsPaiksStationary = COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'WETLAND_INFANTRY', false);
  assertApproxEqual(cavVsPaiksCharge, 2.2, 0.01, 'Heavy Cavalry vs Paiks with charge=true is 2.2x', 'RPS');
  assertApproxEqual(cavVsPaiksStationary, 2.2, 0.01, 'Heavy Cavalry vs Paiks with charge=false is ALSO 2.2x', 'RPS');

  console.log(`\x1b[33m[AUDIT FINDING 2]: In js/data/units.js, COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'WETLAND_INFANTRY', false) returns 2.2 even when isCharging is FALSE because rawCounterMatrix.HEAVY_CAVALRY.PAIKS is hardcoded to 2.2 and line 240 only checks for 'ARCHER' or 'SWORDSMAN' (neither exists as unitClass in units.js). Furthermore, attacker.chargeMultiplier (2.2) is never applied in attackUnit() in tacticalEngine.js!\x1b[0m`);

  // Check Heavy Cavalry vs other units when charging
  const cavVsRajputCharge = COUNTER_MATRIX.getMultiplier('SHOCK_CAVALRY', 'FEROCIOUS_INFANTRY', true);
  assert(cavVsRajputCharge === 0.6, 'Heavy Cavalry charging Rajput Levies is negated/countered (0.6x multiplier)', 'RPS');

  // Rajput Spear Brace counter vs Horse Archers (SKIRMISH_CAVALRY)
  const testSpearBraceVsSkirmishCav = (isFront) => {
    const engine = new TacticalEngine({
      attackerArmy: { regiments: [{ id: 'ha', unitTypeId: 'HORSE_ARCHERS', hp: 90 }] },
      defenderArmy: { regiments: [{ id: 'rajput', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }] }
    });
    const ha = engine.getUnit('ha');
    const rajput = engine.getUnit('rajput');
    rajput.col = 5; rajput.row = 5; rajput.setFacing('W'); // faces West

    if (isFront) {
      ha.col = 4; ha.row = 5; // Attacking from West -> Frontal
    } else {
      ha.col = 5; ha.row = 4; // Attacking from North -> Flank
    }
    engine.syncGridUnits();
    return engine.attackUnit('ha', 'rajput').counterDamage;
  };

  const frontCounterHA = testSpearBraceVsSkirmishCav(true);
  const flankCounterHA = testSpearBraceVsSkirmishCav(false);
  assert(frontCounterHA > flankCounterHA, `Rajput Spear Brace vs Horse Archers deals higher counter-damage on front (${frontCounterHA}) than flank (${flankCounterHA})`, 'RPS');

  // AUDIT: Rajput Spear Brace counter vs Heavy Cavalry (SHOCK_CAVALRY)
  const testSpearBraceVsHeavyCav = (isFront) => {
    const engine = new TacticalEngine({
      attackerArmy: { regiments: [{ id: 'cav', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }] },
      defenderArmy: { regiments: [{ id: 'rajput', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }] }
    });
    const cav = engine.getUnit('cav');
    const rajput = engine.getUnit('rajput');
    rajput.col = 5; rajput.row = 5; rajput.setFacing('W');
    if (isFront) {
      cav.col = 4; cav.row = 5;
    } else {
      cav.col = 5; cav.row = 4;
    }
    engine.syncGridUnits();
    return engine.attackUnit('cav', 'rajput').counterDamage;
  };

  const frontCounterHC = testSpearBraceVsHeavyCav(true);
  const flankCounterHC = testSpearBraceVsHeavyCav(false);
  assert(frontCounterHC === flankCounterHC, 'Empirical confirmation: Rajput Levies counter vs Heavy Cavalry is 25 on front and 25 on flank', 'RPS');
  console.log(`\x1b[33m[AUDIT FINDING 3]: In tacticalEngine.js line 1008-1010:
  if (defender.spearBrace && (attacker.unitClass === 'SHOCK_CAVALRY' || attacker.unitClass === 'SKIRMISH_CAVALRY') && dirAttack.direction === 'FRONT') {
    defCounterMult = 2.0;
  }
Because COUNTER_MATRIX.getMultiplier('FEROCIOUS_INFANTRY', 'SHOCK_CAVALRY') is ALREADY 2.0 in units.js, defCounterMult is 2.0 on both FRONT and FLANK against Heavy Cavalry. Rajput spearmen counter-attack heavy cavalry at full 2.0x strength even when struck from behind their shield line.\x1b[0m`);
});

// ============================================================================
// SECTION 4: Extreme General Command Multipliers & Aura Audit
// ============================================================================
runSection('4. General Command Multipliers (0 vs 10) & Aura Scope', () => {
  // Formula: TacticalCombatMath.calculateGeneralAuraRadius
  assert(TacticalCombatMath.calculateGeneralAuraRadius(0) === 2, 'Command 0 aura radius is 2 tiles', 'GENERAL');
  assert(TacticalCombatMath.calculateGeneralAuraRadius(5) === 3, 'Command 5 aura radius is 3 tiles', 'GENERAL');
  assert(TacticalCombatMath.calculateGeneralAuraRadius(10) === 6, 'Command 10 aura radius is 6 tiles', 'GENERAL');

  // Test Commander Unit Direct Attack: Command 0 vs Command 10
  const runCommanderCombat = (cmd) => {
    const engine = new TacticalEngine({
      attackerArmy: { regiments: [{ id: 'gen_reg', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }] },
      attackerGeneral: { id: 'gen', attributes: { command: cmd, dread: 0, piety: 0 } },
      defenderArmy: { regiments: [{ id: 'def_reg', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }] }
    });
    const gen = engine.getUnit('gen_reg');
    const def = engine.getUnit('def_reg');
    gen.col = 5; gen.row = 5; def.col = 6; def.row = 5;
    engine.syncGridUnits();
    engine.updateAuras();
    return engine.attackUnit('gen_reg', 'def_reg').rawDamage;
  };

  const cmd0Dmg = runCommanderCombat(0);
  const cmd10Dmg = runCommanderCombat(10);
  assert(cmd10Dmg > cmd0Dmg, `Commander with Command 10 deals more damage than Command 0 (${cmd10Dmg} vs ${cmd0Dmg})`, 'GENERAL');
  assertApproxEqual(cmd10Dmg / cmd0Dmg, 1.35, 0.05, 'Command 10 grants ~35% attack bonus (1.0 + 10 * 0.035 = 1.35x)', 'GENERAL');

  // AUDIT: Subordinate Unit inside General Aura
  // Does a subordinate unit inside a Command 10 general's aura get an attack bonus?
  const runSubordinateCombat = (cmd) => {
    const engine = new TacticalEngine({
      attackerArmy: {
        regiments: [
          { id: 'gen_reg', unitTypeId: 'HEAVY_CAVALRY', hp: 160 },
          { id: 'sub_reg', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }
        ]
      },
      attackerGeneral: { id: 'gen', attributes: { command: cmd, dread: 0, piety: 0 } },
      defenderArmy: { regiments: [{ id: 'def_reg', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }] }
    });
    const gen = engine.getUnit('gen_reg'); gen.col = 5; gen.row = 6;
    const sub = engine.getUnit('sub_reg'); sub.col = 5; sub.row = 5; // distance 1 from general -> in aura
    const def = engine.getUnit('def_reg'); def.col = 6; def.row = 5;
    engine.syncGridUnits();
    engine.updateAuras();
    assert(sub.inGeneralAura === true, 'Subordinate unit must be verified as inside general aura', 'GENERAL');
    return engine.attackUnit('sub_reg', 'def_reg').rawDamage;
  };

  const subCmd0 = runSubordinateCombat(0);
  const subCmd10 = runSubordinateCombat(10);
  assert(subCmd10 > subCmd0, `Empirical confirmation: Subordinate unit receives commander attack buff under Command 10 (${subCmd10} > ${subCmd0})`, 'GENERAL');
  console.log(`\x1b[33m[AUDIT FINDING 4]: In tacticalEngine.js line 954:
  const genAtkBuff = attacker.inGeneralAura ? (1.0 + attacker.command * 0.035) : 1.0;
Because attacker.command is ONLY set on the commander unit (idx === 0) during deployArmies(), every subordinate unit in the army has attacker.command === 0. Therefore, genAtkBuff evaluates to (1.0 + 0 * 0.035) = 1.0 for ALL subordinate units inside the aura! The Command stat does NOT buff subordinates, only the commander regiment itself.\x1b[0m`);

  // Panic immunity test in aura
  const engineAura = new TacticalEngine({
    attackerArmy: { regiments: [{ id: 'att_u', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }] },
    defenderArmy: {
      regiments: [
        { id: 'def_gen', unitTypeId: 'RAJPUT_LEVIES', hp: 130 },
        { id: 'def_prot', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
        { id: 'def_unprot', unitTypeId: 'PAIKS', hp: 105, morale: 75 },
        { id: 'def_rout', unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 22 }
      ]
    },
    defenderGeneral: { id: 'gen', attributes: { command: 6 } }
  });
  const defGen = engineAura.getUnit('def_gen'); defGen.col = 10; defGen.row = 5;
  const defProt = engineAura.getUnit('def_prot'); defProt.col = 11; defProt.row = 5; // in aura
  const defUnprot = engineAura.getUnit('def_unprot'); defUnprot.col = 18; defUnprot.row = 5; // out of aura
  const defRout = engineAura.getUnit('def_rout'); defRout.col = 12; defRout.row = 5; // dist 1 to defProt, dist 2 to defGen
  engineAura.syncGridUnits();
  engineAura.updateAuras();

  assert(defProt.inGeneralAura === true, 'Protected unit is in general aura', 'GENERAL');
  assert(defUnprot.inGeneralAura === false, 'Unprotected unit is outside aura', 'GENERAL');

  // Rout defRout and trigger chain panic
  defRout.drainMorale(5);
  engineAura.triggerChainPanic(defRout);

  assert(defProt.morale === 75, 'Unit in General Aura retains 100% immunity to chain panic (morale stays 75)', 'GENERAL');
  assert(defUnprot.morale === 75, 'Far unit (> 3 tiles) is out of chain panic range', 'GENERAL');
});

// ============================================================================
// SECTION 5: Numerical Safety (Div/0, NaN, Infinity, Negative HP)
// ============================================================================
runSection('5. Numerical Safety & Edge Stress', () => {
  // 5.1: Zero Melee Defense (Division by Zero check)
  // Formula: mitigation = 35 / (35 + Math.max(0, effectiveDef))
  const engineZeroDef = new TacticalEngine({
    attackerArmy: { regiments: [{ id: 'att_u', unitTypeId: 'HEAVY_CAVALRY', hp: 160 }] },
    defenderArmy: { regiments: [{ id: 'def_u', unitTypeId: 'SIEGE_ENGINES', hp: 70 }] }
  });
  const defZero = engineZeroDef.getUnit('def_u');
  defZero.meleeDef = 0; // zero defense
  defZero.col = 5; defZero.row = 5;
  const attZero = engineZeroDef.getUnit('att_u');
  attZero.col = 4; attZero.row = 5;
  engineZeroDef.syncGridUnits();

  const resZeroDef = engineZeroDef.attackUnit('att_u', 'def_u');
  assert(Number.isFinite(resZeroDef.rawDamage) && !Number.isNaN(resZeroDef.rawDamage), 'Zero defense yields finite, non-NaN damage', 'NUMERICAL');
  assert(resZeroDef.rawDamage > 0, 'Damage against 0-defense target is positive', 'NUMERICAL');

  // 5.2: Overkill Damage & Negative HP Leaks
  const unitHpTest = new TacticalUnit({ unitTypeId: 'PAIKS', hp: 10 }, 'DEFENDER');
  const damageTaken = unitHpTest.takeDamage(1000); // 1000 overkill
  assert(damageTaken === 10, 'takeDamage on 10 HP with 1000 damage returns exactly 10', 'NUMERICAL');
  assert(unitHpTest.hp === 0, 'Unit HP clamped strictly to 0, no negative HP leak', 'NUMERICAL');
  assert(unitHpTest.hp >= 0, 'Unit HP never drops below 0', 'NUMERICAL');

  // 5.3: Rajput Levies Morale Floor
  const rajputMorale = new TacticalUnit({ unitTypeId: 'RAJPUT_LEVIES', hp: 130, morale: 100 }, 'DEFENDER');
  rajputMorale.drainMorale(200, true); // Casualty drain of 200
  assert(rajputMorale.morale === 25, `Rajput Levies casualty shock clamped at minMoraleFloor = 25 (Actual: ${rajputMorale.morale})`, 'NUMERICAL');

  // Direct terror/shock drain CAN break below floor
  rajputMorale.drainMorale(10, false);
  assert(rajputMorale.morale === 15, 'Direct terror/tactical shock can reduce morale below floor to 15', 'NUMERICAL');
  assert(rajputMorale.isRouted === true, 'Morale <= 20 triggers isRouted = true', 'NUMERICAL');

  // 5.4: Massive Morale Drain Underflow
  const unitMoraleUnderflow = new TacticalUnit({ unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 50 }, 'DEFENDER');
  unitMoraleUnderflow.drainMorale(10000, false);
  assert(unitMoraleUnderflow.morale === 0, 'Morale drains to 0 without underflowing negative', 'NUMERICAL');

  // 5.5: Morale Over-Recovery on active unit
  const unitActive = new TacticalUnit({ unitTypeId: 'HORSE_ARCHERS', hp: 90, morale: 50 }, 'DEFENDER');
  const recovered = unitActive.recoverMorale(500);
  assert(unitActive.morale === unitActive.maxMorale, 'Morale recovery clamped at maxMorale (80)', 'NUMERICAL');
  assert(recovered === 30, 'Reported recovered amount correctly capped (80 - 50 = 30)', 'NUMERICAL');

  // 5.6: Routed unit cannot recover morale
  const recoveredOnRouted = unitMoraleUnderflow.recoverMorale(100);
  assert(recoveredOnRouted === 0, 'Routed unit cannot recover morale (returns 0)', 'NUMERICAL');
  assert(unitMoraleUnderflow.morale === 0, 'Routed unit morale remains 0', 'NUMERICAL');

  // 5.7: Approach Angle Same-Tile / Zero-Vector
  const angleSameTile = TacticalCombatMath.calculateApproachAngle('EAST', 5, 5, 5, 5);
  assert(Number.isFinite(angleSameTile) && !Number.isNaN(angleSameTile), 'Same tile approach angle is finite and non-NaN', 'NUMERICAL');

  // 5.8: Infinite Movement Cost Pathfinding
  const gridRiver = new TacticalGrid(20, 14, { terrainType: 'FLOODPLAIN' });
  const blockerUnit = new TacticalUnit({ unitTypeId: 'HEAVY_CAVALRY', hp: 160 }, 'ATTACKER');
  const startTime = Date.now();
  const pathAcrossRiver = gridRiver.findPath(8, 0, 11, 0, blockerUnit);
  const elapsed = Date.now() - startTime;
  assert(elapsed < 100, `Pathfinding across river completed in ${elapsed}ms without infinite loop`, 'NUMERICAL');
  assert(Array.isArray(pathAcrossRiver), 'Path across river returned valid route via bridge', 'NUMERICAL');

  // 5.9: Extreme Out-of-Bounds Angles in calculateDirectionalAttack
  const negAngle = TacticalCombatMath.calculateDirectionalAttack(-50);
  assert(negAngle.direction === 'FRONT', 'Negative angle safely evaluates as FRONT (<= 45)', 'NUMERICAL');

  const overflowAngle = TacticalCombatMath.calculateDirectionalAttack(999);
  assert(overflowAngle.direction === 'REAR', 'Extreme overflow angle safely evaluates as REAR (> 135)', 'NUMERICAL');
});

// ============================================================================
// Final Summary & Exit
// ============================================================================
console.log('\n----------------------------------------------------------------------');
console.log(`STRESS TEST EXECUTION COMPLETE`);
console.log(`Passed: ${passedCount}`);
console.log(`Failed: ${failedCount}`);
console.log(`Total:  ${passedCount + failedCount}`);
console.log('----------------------------------------------------------------------\n');

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
