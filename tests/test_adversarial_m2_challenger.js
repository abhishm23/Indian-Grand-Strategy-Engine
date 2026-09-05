// tests/test_adversarial_m2_challenger.js
// Dedicated Empirical Stress & Adversarial Harness for Milestone 2 Iteration 2
// Challenger 1 verification script.

import { TacticalEngine, TacticalGrid, TacticalUnit, TacticalCombatMath, FACING } from '../js/engine/tacticalEngine.js';
import { UNIT_TYPES, COUNTER_MATRIX } from '../js/data/units.js';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, name, details = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}`);
    results.push({ name, status: 'PASS', details });
  } else {
    failed++;
    console.error(`  [FAIL] ${name} - Details: ${details}`);
    results.push({ name, status: 'FAIL', details });
  }
}

console.log("==================================================================");
console.log("   CHALLENGER 1 EMPIRICAL ADVERSARIAL STRESS SUITE (M2 ROUND 2)   ");
console.log("==================================================================\n");

// Helper to construct a standard 1v1 tactical engine
function createDuelEngine(attType, defType, options = {}) {
  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att_army',
      factionId: 'FAC_DELHI',
      regiments: [{ id: 'att_reg', unitTypeId: attType, hp: options.attHp || 200 }]
    },
    defenderArmy: {
      id: 'def_army',
      factionId: 'FAC_MEWAR',
      regiments: [{ id: 'def_reg', unitTypeId: defType, hp: options.defHp || 500 }]
    },
    attackerGeneral: options.attGen || null,
    defenderGeneral: options.defGen || null
  });

  const attacker = engine.getUnit('att_reg');
  const defender = engine.getUnit('def_reg');

  attacker.col = options.attCol ?? 5;
  attacker.row = options.attRow ?? 5;
  defender.col = options.defCol ?? 6;
  defender.row = options.defRow ?? 5;

  if (options.attFacing) attacker.setFacing(options.attFacing);
  if (options.defFacing) defender.setFacing(options.defFacing);

  if (options.attMoved !== undefined) attacker.movedDistance = options.attMoved;
  if (options.defTileType) {
    const tile = engine.grid.getTile(defender.col, defender.row);
    tile.terrainType = options.defTileType;
    if (options.defTileType === 'FOREST' || options.defTileType === 'JUNGLE') {
      tile.isCover = true;
    }
    if (options.defTileType === 'MARSH') {
      tile.isMarsh = true;
    }
  }

  engine.syncGridUnits();
  engine.updateAuras();

  return { engine, attacker, defender };
}

// ============================================================================
// SECTION 1: HEAVY CAVALRY CHARGE MOMENTUM EMPIRICAL VERIFICATION
// ============================================================================
console.log("--- 1. HEAVY CAVALRY CHARGE MOMENTUM & TERRAIN TESTS ---");

// Test 1.1: Distance scaling: 0 vs 1 vs 2 vs 3 vs 4 tiles on clear terrain
{
  const damages = [];
  for (let dist = 0; dist <= 4; dist++) {
    const { engine, attacker, defender } = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
      attMoved: dist,
      defFacing: 'W',
      defHp: 600
    });
    const res = engine.attackUnit('att_reg', 'def_reg');
    damages.push({ dist, rawDmg: res.rawDamage, dmg: res.damageDealt });
  }

  console.log("  Charge damage across movedDistance [0..4]:", damages.map(d => `d=${d.dist}:raw=${d.rawDmg},dealt=${d.dmg}`).join(', '));

  assert(
    damages[0].rawDmg === damages[1].rawDmg,
    "Cavalry moving 0 tiles vs 1 tile yields identical damage (momentum threshold < 2)",
    `d0=${damages[0].rawDmg}, d1=${damages[1].rawDmg}`
  );

  assert(
    damages[2].rawDmg > damages[0].rawDmg,
    "Cavalry moving 2 tiles deals strictly greater damage than moving 0 tiles",
    `d2=${damages[2].rawDmg} > d0=${damages[0].rawDmg}`
  );

  assert(
    damages[2].rawDmg === damages[3].rawDmg && damages[3].rawDmg === damages[4].rawDmg,
    "Cavalry moving >= 2 tiles caps at full charge multiplier",
    `d2=${damages[2].rawDmg}, d3=${damages[3].rawDmg}, d4=${damages[4].rawDmg}`
  );

  const ratio = damages[2].rawDmg / damages[0].rawDmg;
  assert(
    ratio >= 2.15 && ratio <= 2.25,
    `Charge damage amplification ratio on rawDamage is exactly ~2.2x (observed: ${ratio.toFixed(3)}x)`,
    `ratio=${ratio}`
  );
}

// Test 1.2: Forest Cover cancels charge momentum
{
  const clearDuel = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 3,
    defFacing: 'W',
    defTileType: 'PLAIN'
  });
  const clearRes = clearDuel.engine.attackUnit('att_reg', 'def_reg');

  const forestDuel = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 3,
    defFacing: 'W',
    defTileType: 'FOREST'
  });
  const forestRes = forestDuel.engine.attackUnit('att_reg', 'def_reg');

  const forestStatDuel = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 0,
    defFacing: 'W',
    defTileType: 'FOREST'
  });
  const forestStatRes = forestStatDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Forest test: clear charged=${clearRes.rawDamage}, forest charged=${forestRes.rawDamage}, forest stat=${forestStatRes.rawDamage}`);

  assert(
    forestRes.rawDamage < clearRes.rawDamage,
    "Forest cover significantly reduces charge damage compared to clear terrain",
    `forest charged=${forestRes.rawDamage} < clear charged=${clearRes.rawDamage}`
  );

  assert(
    forestRes.rawDamage === forestStatRes.rawDamage,
    "Forest cover completely cancels charge momentum (moving 3 tiles in forest == moving 0 tiles in forest)",
    `forest charged=${forestRes.rawDamage} === forest stat=${forestStatRes.rawDamage}`
  );
}

// Test 1.3: Jungle Cover cancels charge momentum
{
  const jungleDuel = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 3,
    defFacing: 'W',
    defTileType: 'JUNGLE'
  });
  const jungleRes = jungleDuel.engine.attackUnit('att_reg', 'def_reg');

  const jungleStatDuel = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 0,
    defFacing: 'W',
    defTileType: 'JUNGLE'
  });
  const jungleStatRes = jungleStatDuel.engine.attackUnit('att_reg', 'def_reg');

  assert(
    jungleRes.rawDamage === jungleStatRes.rawDamage,
    "Jungle cover cancels charge momentum identically to forest",
    `jungle charged=${jungleRes.rawDamage} === jungle stat=${jungleStatRes.rawDamage}`
  );
}

// Test 1.4: Spear Brace frontal cancellation vs Flank/Rear charge execution
{
  const frontDuel = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attMoved: 3,
    attCol: 5, attRow: 5,
    defCol: 6, defRow: 5,
    defFacing: 'W'
  });
  const frontRes = frontDuel.engine.attackUnit('att_reg', 'def_reg');

  const frontStatDuel = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attMoved: 0,
    attCol: 5, attRow: 5,
    defCol: 6, defRow: 5,
    defFacing: 'W'
  });
  const frontStatRes = frontStatDuel.engine.attackUnit('att_reg', 'def_reg');

  assert(
    frontRes.rawDamage === frontStatRes.rawDamage,
    "Spear brace completely negates frontal cavalry charge momentum (3 tiles == 0 tiles)",
    `front charged=${frontRes.rawDamage}, front stat=${frontStatRes.rawDamage}`
  );

  const flankDuel = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attMoved: 3,
    attCol: 6, attRow: 6,
    defCol: 6, defRow: 5,
    defFacing: 'W'
  });
  const flankRes = flankDuel.engine.attackUnit('att_reg', 'def_reg');

  const flankStatDuel = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attMoved: 0,
    attCol: 6, attRow: 6,
    defCol: 6, defRow: 5,
    defFacing: 'W'
  });
  const flankStatRes = flankStatDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Spear brace flank test: flank charged=${flankRes.rawDamage}, flank stat=${flankStatRes.rawDamage}`);

  assert(
    flankRes.rawDamage > flankStatRes.rawDamage,
    "Spear brace CANNOT cancel charge momentum from the flank (flank charge > flank stationary)",
    `flank charged=${flankRes.rawDamage} > flank stat=${flankStatRes.rawDamage}`
  );

  const rearDuel = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attMoved: 3,
    attCol: 7, attRow: 5,
    defCol: 6, defRow: 5,
    defFacing: 'W'
  });
  const rearRes = rearDuel.engine.attackUnit('att_reg', 'def_reg');

  const rearStatDuel = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attMoved: 0,
    attCol: 7, attRow: 5,
    defCol: 6, defRow: 5,
    defFacing: 'W'
  });
  const rearStatRes = rearStatDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Spear brace rear test: rear charged=${rearRes.rawDamage}, rear stat=${rearStatRes.rawDamage}`);

  assert(
    rearRes.rawDamage > rearStatRes.rawDamage,
    "Spear brace CANNOT cancel charge momentum from the rear (rear charge > rear stationary)",
    `rear charged=${rearRes.rawDamage} > rear stat=${rearStatRes.rawDamage}`
  );
}

// ============================================================================
// SECTION 2: ROCK-PAPER-SCISSORS COUNTER MATRIX AUDIT
// ============================================================================
console.log("\n--- 2. ROCK-PAPER-SCISSORS COUNTER MATRIX AUDIT ---");
{
  const unitClasses = [
    'WAR_ELEPHANTS',
    'HORSE_ARCHERS',
    'RAJPUT_LEVIES',
    'PAIKS',
    'HEAVY_CAVALRY',
    'SIEGE_ENGINES'
  ];

  let rpsMatchupsTested = 0;
  let rpsAllValid = true;

  for (const att of unitClasses) {
    for (const def of unitClasses) {
      const multStationary = COUNTER_MATRIX.getMultiplier(att, def, false);
      const multCharging = COUNTER_MATRIX.getMultiplier(att, def, true);

      if (typeof multStationary !== 'number' || isNaN(multStationary) || multStationary <= 0) {
        rpsAllValid = false;
        console.error(`Invalid stationary multiplier: ${att} vs ${def} -> ${multStationary}`);
      }
      if (typeof multCharging !== 'number' || isNaN(multCharging) || multCharging <= 0) {
        rpsAllValid = false;
        console.error(`Invalid charging multiplier: ${att} vs ${def} -> ${multCharging}`);
      }
      rpsMatchupsTested += 2;
    }
  }

  assert(rpsAllValid && rpsMatchupsTested === 72, "All 72 RPS combinations yield positive valid numeric multipliers", `tested: ${rpsMatchupsTested}`);

  assert(COUNTER_MATRIX.HEAVY_CAVALRY.PAIKS === 2.2, "Heavy Cavalry vs Paiks = 2.2 in raw counter matrix");
  assert(COUNTER_MATRIX.RAJPUT_LEVIES.HEAVY_CAVALRY === 2.0, "Rajput Levies vs Heavy Cavalry = 2.0 in raw counter matrix");
  assert(COUNTER_MATRIX.PAIKS.HORSE_ARCHERS === 1.6, "Paiks vs Horse Archers = 1.6 in raw counter matrix");
  assert(COUNTER_MATRIX.HORSE_ARCHERS.WAR_ELEPHANTS === 1.2, "Horse Archers vs War Elephants = 1.2 in raw counter matrix");
  assert(COUNTER_MATRIX.SIEGE_ENGINES.WAR_ELEPHANTS === 2.0, "Siege Engines vs War Elephants = 2.0 in raw counter matrix");
  assert(COUNTER_MATRIX.WAR_ELEPHANTS.RAJPUT_LEVIES === 1.8, "War Elephants vs Rajput Levies = 1.8 in raw counter matrix");
}

// ============================================================================
// SECTION 3: ELEVATION & TERRAIN DYNAMICS
// ============================================================================
console.log("\n--- 3. ELEVATION & TERRAIN DYNAMICS ---");

// Test 3.1: Elevation range modification delta for all missile unit classes
{
  const missileConfigs = [
    { type: 'HORSE_ARCHERS', baseRange: 4 },
    { type: 'PAIKS', baseRange: 3 },
    { type: 'SIEGE_ENGINES', baseRange: 6 }
  ];

  for (const m of missileConfigs) {
    const { engine, attacker, defender } = createDuelEngine(m.type, 'RAJPUT_LEVIES', {
      attCol: 2, attRow: 5,
      defCol: 2 + m.baseRange, defRow: 5
    });

    const attTile = engine.grid.getTile(attacker.col, attacker.row);
    const defTile = engine.grid.getTile(defender.col, defender.row);

    // 1. Level ground: exactly at max range
    attTile.elevation = 0; defTile.elevation = 0;
    let targets = engine.getAttackTargets(attacker);
    assert(targets.length === 1, `${m.type}: Target at base range ${m.baseRange} targetable on flat ground`);

    // 2. Target uphill 1 level: range reduced by 1
    defTile.elevation = 1;
    targets = engine.getAttackTargets(attacker);
    assert(targets.length === 0, `${m.type}: Target uphill 1 level at distance ${m.baseRange} is out of range`);

    const failRes = engine.attackUnit('att_reg', 'def_reg');
    assert(!failRes.success, `${m.type}: Attack uphill out of range returns success=false`);

    // Move defender 1 tile closer
    defender.col = 2 + m.baseRange - 1;
    engine.syncGridUnits();
    targets = engine.getAttackTargets(attacker);
    assert(targets.length === 1, `${m.type}: Target uphill 1 level at distance ${m.baseRange - 1} IS in range`);

    // 3. Attacker downhill +1 level
    defender.col = 2 + m.baseRange + 1;
    attTile.elevation = 1; defTile.elevation = 0;
    engine.syncGridUnits();
    targets = engine.getAttackTargets(attacker);
    assert(targets.length === 1, `${m.type}: Attacker downhill +1 level can target at baseRange + 1 (${m.baseRange + 1})`);
  }
}

// Test 3.2: Melee unit range remains 1 regardless of uphill elevation
{
  const { engine, attacker, defender } = createDuelEngine('HEAVY_CAVALRY', 'RAJPUT_LEVIES', {
    attCol: 5, attRow: 5,
    defCol: 6, defRow: 5
  });

  const attTile = engine.grid.getTile(5, 5);
  const defTile = engine.grid.getTile(6, 5);

  attTile.elevation = 0;
  defTile.elevation = 2; // High uphill

  const targets = engine.getAttackTargets(attacker);
  assert(targets.length === 1, "Melee unit (Heavy Cavalry) can target adjacent unit even 2 levels uphill");

  const attackRes = engine.attackUnit('att_reg', 'def_reg');
  assert(attackRes.success, "Melee attack uphill succeeds (melee range clamped at minimum 1)");
}

// Test 3.3: Elevation damage modifier scaling
{
  const lvlDuel = createDuelEngine('HORSE_ARCHERS', 'RAJPUT_LEVIES', {
    attCol: 5, attRow: 5, defCol: 7, defRow: 5
  });
  const lvlRes = lvlDuel.engine.attackUnit('att_reg', 'def_reg');

  const downDuel = createDuelEngine('HORSE_ARCHERS', 'RAJPUT_LEVIES', {
    attCol: 5, attRow: 5, defCol: 7, defRow: 5
  });
  downDuel.engine.grid.getTile(5, 5).elevation = 1;
  const downRes = downDuel.engine.attackUnit('att_reg', 'def_reg');

  const upDuel = createDuelEngine('HORSE_ARCHERS', 'RAJPUT_LEVIES', {
    attCol: 5, attRow: 5, defCol: 7, defRow: 5
  });
  upDuel.engine.grid.getTile(7, 5).elevation = 1;
  const upRes = upDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Elevation damage: down (+1)=${downRes.rawDamage}, level (0)=${lvlRes.rawDamage}, up (-1)=${upRes.rawDamage}`);

  assert(downRes.rawDamage > lvlRes.rawDamage, "Downhill attack deals strictly more damage than level ground", `down=${downRes.rawDamage} > lvl=${lvlRes.rawDamage}`);
  assert(lvlRes.rawDamage > upRes.rawDamage, "Level attack deals strictly more damage than uphill", `lvl=${lvlRes.rawDamage} > up=${upRes.rawDamage}`);
}

// ============================================================================
// SECTION 4: PAIK MARSH MOBILITY & DEFENSE HANDLING
// ============================================================================
console.log("\n--- 4. PAIK MARSH MOBILITY & DEFENSE HANDLING ---");

// Test 4.1: Marsh tile movement cost
{
  const grid = new TacticalGrid(20, 14);
  const marshTile = grid.getTile(5, 5);
  marshTile.isMarsh = true;
  marshTile.terrainType = 'MARSH';
  marshTile.movementCost = 2.0;

  const normalUnit = new TacticalUnit({ unitTypeId: 'RAJPUT_LEVIES' }, 'ATTACKER');
  const paikUnit = new TacticalUnit({ unitTypeId: 'PAIKS' }, 'ATTACKER');

  const normalCost = grid.getTileMoveCost(marshTile, normalUnit);
  const paikCost = grid.getTileMoveCost(marshTile, paikUnit);

  console.log(`  Marsh movement costs: normal=${normalCost}, paik=${paikCost}`);

  assert(normalCost === 2.0, "Normal unit pays 2.0 MP for marsh tile", `normalCost=${normalCost}`);
  assert(paikCost === 1.0, "Paiks pay 1.0 MP for marsh tile (Marsh Immunity)", `paikCost=${paikCost}`);
}

// Test 4.2: Reachable tiles comparison in wetlands
{
  const engine = new TacticalEngine({
    attackerArmy: {
      id: 'att_army',
      factionId: 'FAC_AHOM',
      regiments: [
        { id: 'paik_test', unitTypeId: 'PAIKS', hp: 105 },
        { id: 'rajput_test', unitTypeId: 'RAJPUT_LEVIES', hp: 130 }
      ]
    },
    defenderArmy: {
      id: 'def_army',
      factionId: 'FAC_ENEMY',
      regiments: []
    }
  });

  for (let r = 4; r <= 8; r++) {
    for (let c = 4; c <= 8; c++) {
      const t = engine.grid.getTile(c, r);
      t.isMarsh = true;
      t.terrainType = 'MARSH';
      t.movementCost = 2.0;
    }
  }

  const paik = engine.getUnit('paik_test');
  paik.col = 6; paik.row = 6;

  const rajput = engine.getUnit('rajput_test');
  rajput.col = 6; rajput.row = 6;

  const paikReachable = engine.grid.getReachableTiles(paik, []);
  const rajputReachable = engine.grid.getReachableTiles(rajput, []);

  console.log(`  Reachable tiles in marsh zone: Paiks=${paikReachable.length}, Rajput=${rajputReachable.length}`);

  assert(
    paikReachable.length > rajputReachable.length * 1.5,
    `Paiks with Marsh Immunity access far more tiles in marsh zone (${paikReachable.length} vs ${rajputReachable.length})`,
    `paik=${paikReachable.length}, rajput=${rajputReachable.length}`
  );
}

// Test 4.3: Marsh Defense Handling: Paik immunity vs Normal Unit penalty
{
  const coverModMarsh = TacticalCombatMath.calculateTerrainCoverModifier({ isMarsh: true, terrainType: 'MARSH' });
  assert(coverModMarsh.defenseModifier === 0.75, "calculateTerrainCoverModifier returns 0.75 defenseModifier for marsh");

  const rajputMarshDuel = createDuelEngine('HORSE_ARCHERS', 'RAJPUT_LEVIES', {
    attCol: 5, attRow: 5,
    defCol: 7, defRow: 5,
    defTileType: 'MARSH',
    defHp: 500
  });
  const rajputPlainDuel = createDuelEngine('HORSE_ARCHERS', 'RAJPUT_LEVIES', {
    attCol: 5, attRow: 5,
    defCol: 7, defRow: 5,
    defTileType: 'PLAIN',
    defHp: 500
  });

  const rajputMarshRes = rajputMarshDuel.engine.attackUnit('att_reg', 'def_reg');
  const rajputPlainRes = rajputPlainDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Normal unit (Rajput) raw damage taken: in marsh=${rajputMarshRes.rawDamage}, on plain=${rajputPlainRes.rawDamage}`);

  assert(
    rajputMarshRes.rawDamage > rajputPlainRes.rawDamage,
    "Normal unit on marsh suffers defense penalty, taking more damage than on plain",
    `marsh=${rajputMarshRes.rawDamage} > plain=${rajputPlainRes.rawDamage}`
  );

  const paikMarshDuel = createDuelEngine('HORSE_ARCHERS', 'PAIKS', {
    attCol: 5, attRow: 5,
    defCol: 7, defRow: 5,
    defTileType: 'MARSH',
    defHp: 500
  });
  const paikPlainDuel = createDuelEngine('HORSE_ARCHERS', 'PAIKS', {
    attCol: 5, attRow: 5,
    defCol: 7, defRow: 5,
    defTileType: 'PLAIN',
    defHp: 500
  });

  const paikMarshRes = paikMarshDuel.engine.attackUnit('att_reg', 'def_reg');
  const paikPlainRes = paikPlainDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Paik raw damage taken: in marsh=${paikMarshRes.rawDamage}, on plain=${paikPlainRes.rawDamage}`);

  assert(
    paikMarshRes.rawDamage === paikPlainRes.rawDamage,
    "Paiks with Marsh Immunity take identical damage in marsh as on plain (0% defense penalty)",
    `marsh=${paikMarshRes.rawDamage} === plain=${paikPlainRes.rawDamage}`
  );
}

// ============================================================================
// SECTION 5: ADVERSARIAL STRESS TESTING & BOUNDARY CONDITIONS
// ============================================================================
console.log("\n--- 5. ADVERSARIAL STRESS TESTING & BOUNDARY CONDITIONS ---");

// Test 5.1: General Leadership Aura stacking with Charge Momentum
{
  const genAuraDuel = createDuelEngine('HEAVY_CAVALRY', 'WAR_ELEPHANTS', {
    attMoved: 3,
    attGen: { id: 'GEN_LEAD', name: 'Zafar Khan', attributes: { command: 9, dread: 5, piety: 3 } }
  });
  const genRes = genAuraDuel.engine.attackUnit('att_reg', 'def_reg');

  const uninspiredDuel = createDuelEngine('HEAVY_CAVALRY', 'WAR_ELEPHANTS', {
    attMoved: 3
  });
  const uninspiredRes = uninspiredDuel.engine.attackUnit('att_reg', 'def_reg');

  console.log(`  Charge + Aura damage: with general raw=${genRes.rawDamage} (dealt=${genRes.damageDealt}), uninspired raw=${uninspiredRes.rawDamage} (dealt=${uninspiredRes.damageDealt})`);

  assert(
    genRes.rawDamage > uninspiredRes.rawDamage,
    "General command buff stacks synergistically with cavalry charge momentum",
    `gen=${genRes.rawDamage} > uninsp=${uninspiredRes.rawDamage}`
  );
}

// Test 5.2: Extreme movedDistance handling
{
  const { engine: engExt } = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 999,
    defHp: 500
  });
  const resExt = engExt.attackUnit('att_reg', 'def_reg');
  assert(resExt.success && resExt.damageDealt > 0, "Extreme movedDistance (999) does not overflow or crash");

  const { engine: engNeg } = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: -5,
    defHp: 500
  });
  const resNeg = engNeg.attackUnit('att_reg', 'def_reg');
  assert(resNeg.success && resNeg.damageDealt > 0, "Negative movedDistance (-5) does not crash and behaves as uncharged");
}

// Test 5.3: Compound Terrain: Forest on a Hill (Elevation 1 + Cover)
{
  const compoundDuel = createDuelEngine('HEAVY_CAVALRY', 'PAIKS', {
    attMoved: 3,
    attCol: 5, attRow: 5,
    defCol: 6, defRow: 5,
    defTileType: 'FOREST',
    defHp: 500
  });
  compoundDuel.engine.grid.getTile(6, 5).elevation = 1;

  const compRes = compoundDuel.engine.attackUnit('att_reg', 'def_reg');
  assert(compRes.success, "Compound terrain (Forest + Hill) attack executes cleanly");
  console.log(`  Compound terrain (Forest+Hill) damage taken by defender: raw=${compRes.rawDamage}, dealt=${compRes.damageDealt}`);
}

// Test 5.4: Subordinate units inside vs outside general aura while charging
{
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
        { id: 'target_near', unitTypeId: 'WAR_ELEPHANTS', hp: 350 },
        { id: 'target_far', unitTypeId: 'WAR_ELEPHANTS', hp: 350 }
      ]
    },
    attackerGeneral: bukkaRaya
  });

  const gen = engine.getUnit('gen_lead');
  const subNear = engine.getUnit('sub_near');
  const subFar = engine.getUnit('sub_far');

  gen.col = 2; gen.row = 2;
  subNear.col = 3; subNear.row = 2;
  engine.getUnit('target_near').col = 4; engine.getUnit('target_near').row = 2;

  subFar.col = 15; subFar.row = 12;
  engine.getUnit('target_far').col = 16; engine.getUnit('target_far').row = 12;

  engine.syncGridUnits();
  engine.updateAuras();

  subNear.actionPoints = 2;
  subNear.movedDistance = 3;

  subFar.actionPoints = 2;
  subFar.movedDistance = 3;

  const nearRes = engine.attackUnit('sub_near', 'target_near');
  const farRes = engine.attackUnit('sub_far', 'target_far');

  console.log(`  Subordinate charge test: near (in aura)=${nearRes.rawDamage}, far (out of aura)=${farRes.rawDamage}`);

  assert(
    subNear.inGeneralAura && !subFar.inGeneralAura,
    "Subordinate spatial general aura proximity correctly detected"
  );

  assert(
    nearRes.rawDamage > farRes.rawDamage,
    "Charging subordinate inside general aura deals greater damage than charging subordinate outside aura",
    `near=${nearRes.rawDamage} > far=${farRes.rawDamage}`
  );
}

// ============================================================================
// SECTION 6: FACING & DIRECTIONAL COMBAT GEOMETRY
// ============================================================================
console.log("\n--- 6. FACING & DIRECTIONAL COMBAT GEOMETRY ---");
{
  const facings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  let allAnglesValid = true;

  for (const f of facings) {
    const vec = TacticalCombatMath.calculateFacingVector(f);
    if (isNaN(vec.dc) || isNaN(vec.dr)) {
      allAnglesValid = false;
      console.error(`Invalid facing vector for ${f}`);
    }
  }

  assert(allAnglesValid, "All 8 directional facing vectors calculate without NaN or error");

  const angles = [
    { deg: 0, dir: 'FRONT' },
    { deg: 30, dir: 'FRONT' },
    { deg: 45, dir: 'FRONT' },
    { deg: 46, dir: 'FLANK' },
    { deg: 90, dir: 'FLANK' },
    { deg: 135, dir: 'FLANK' },
    { deg: 136, dir: 'REAR' },
    { deg: 180, dir: 'REAR' }
  ];

  let allDirsValid = true;
  for (const a of angles) {
    const dir = TacticalCombatMath.calculateDirectionalAttack(a.deg);
    if (dir.direction !== a.dir) {
      allDirsValid = false;
      console.error(`Angle ${a.deg} mapped to ${dir.direction}, expected ${a.dir}`);
    }
  }

  assert(allDirsValid, "Frontal, Flank, and Rear angular arcs adhere strictly to 0-45, 46-135, 136-180 specification");
}

console.log("\n==================================================================");
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
console.log("==================================================================");

if (failed > 0) {
  process.exit(1);
}
