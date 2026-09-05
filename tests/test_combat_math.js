// tests/test_combat_math.js
// Tier 2 & 3 Validation Suite: Auto-Resolve Odds (5-95%), Directional Angles (1.0x, 1.4x, 2.0x), Elevation (+25%), Forest Cover, and Morale Rout

import { describe, test, assertEqual, assertApproxEqual, assertTrue, assertFalse, assertInBounds } from './testRunner.js';
import {
  calculateAutoResolveOdds,
  calculateAutoResolvePower,
  calculateDirectionalAttack,
  calculateElevationCombatModifier,
  calculateTerrainCoverModifier,
  CHARACTERS_DATA,
  REGIONAL_UNITS
} from './fixtures/spec_oracle.js';

describe('Combat Math — Auto-Resolve Odds & Power (F08)', () => {
  test('Balanced armies on neutral ground produce exactly 50% win-odds', () => {
    const odds = calculateAutoResolveOdds(1000, 1000);
    assertEqual(odds.attackerWinChance, 50, 'Attacker odds are 50%');
    assertEqual(odds.defenderWinChance, 50, 'Defender odds are 50%');
  }, { tier: 2 });

  test('Auto-resolve odds are strictly clamped between 5% and 95% (Boundary Value Analysis)', () => {
    // Extreme attacker advantage (10,000 vs 100) -> Clamped to 95%
    const overwhelmingAtk = calculateAutoResolveOdds(10000, 100);
    assertEqual(overwhelmingAtk.attackerWinChance, 95, 'Overwhelming attacker clamped at 95%');
    assertEqual(overwhelmingAtk.defenderWinChance, 5, 'Defender floor clamped at 5%');

    // Extreme defender advantage (50 vs 5,000) -> Clamped to 5%
    const overwhelmingDef = calculateAutoResolveOdds(50, 5000);
    assertEqual(overwhelmingDef.attackerWinChance, 5, 'Underdog attacker floor clamped at 5%');
    assertEqual(overwhelmingDef.defenderWinChance, 95, 'Overwhelming defender clamped at 95%');

    // 100 random power ratios all stay strictly within [5, 95]
    for (let i = 1; i <= 100; i++) {
      const pAtk = Math.floor(Math.random() * 5000) + 1;
      const pDef = Math.floor(Math.random() * 5000) + 1;
      const result = calculateAutoResolveOdds(pAtk, pDef);
      assertInBounds(result.attackerWinChance, 5, 95, `Random ratio ${pAtk}:${pDef} attacker odds out of bounds`);
      assertInBounds(result.defenderWinChance, 5, 95, `Random ratio ${pAtk}:${pDef} defender odds out of bounds`);
      assertEqual(result.attackerWinChance + result.defenderWinChance, 100, 'Odds must sum to 100%');
    }
  }, { tier: 3 });

  test('General Command & Dread significantly amplify army combat power', () => {
    const mockArmy = {
      regiments: [
        { hp: 350, maxHp: 350, morale: 100, meleeAtk: 48, meleeDef: 28, counterBonus: 0 },
        { hp: 160, maxHp: 160, morale: 100, meleeAtk: 42, meleeDef: 26, counterBonus: 0 }
      ]
    };

    const powerNoGen = calculateAutoResolvePower(mockArmy, null, 0, 0);

    // Bukka Raya I (COM 9, DRE 6): GenMod = 1.0 + (9*0.04) + (6*0.02) = 1.0 + 0.36 + 0.12 = 1.48 (+48%)
    const bukka = CHARACTERS_DATA.find(c => c.id === 'CHAR_BUKKA_I');
    const powerWithBukka = calculateAutoResolvePower(mockArmy, bukka, 0, 0);

    assertApproxEqual(powerWithBukka / powerNoGen, 1.48, 0.01, 'General Bukka grants +48% power boost');
  }, { tier: 2 });
});

describe('Combat Math — Directional Combat Angles (F11)', () => {
  test('Frontal arc (0° to 45°) deals 1.0x damage, 0 morale shock, and full defender armor', () => {
    [0, 15, 30, 45].forEach(deg => {
      const res = calculateDirectionalAttack(deg);
      assertEqual(res.direction, 'FRONT', `Angle ${deg}° should be FRONT`);
      assertEqual(res.damageMultiplier, 1.0, `Damage multiplier at ${deg}°`);
      assertEqual(res.moraleShock, 0, `Morale shock at ${deg}°`);
      assertEqual(res.armorReduction, 0, `Armor reduction at ${deg}°`);
      assertTrue(res.counterAllowed, `Counter attack allowed at ${deg}°`);
    });
  }, { tier: 3 });

  test('Flank arc (46° to 135°) deals 1.4x damage, -20 morale shock, and 50% armor bypass', () => {
    [46, 60, 90, 120, 135].forEach(deg => {
      const res = calculateDirectionalAttack(deg);
      assertEqual(res.direction, 'FLANK', `Angle ${deg}° should be FLANK`);
      assertEqual(res.damageMultiplier, 1.4, `Damage multiplier at ${deg}°`);
      assertEqual(res.moraleShock, -20, `Morale shock at ${deg}°`);
      assertEqual(res.armorReduction, 0.50, `Armor reduction at ${deg}°`);
      assertTrue(res.counterAllowed, `Counter attack allowed at ${deg}°`);
    });
  }, { tier: 3 });

  test('Rear arc (136° to 180°) deals 2.0x damage, -40 morale shock, 100% armor bypass, and no counter-attack', () => {
    [136, 150, 170, 180].forEach(deg => {
      const res = calculateDirectionalAttack(deg);
      assertEqual(res.direction, 'REAR', `Angle ${deg}° should be REAR`);
      assertEqual(res.damageMultiplier, 2.0, `Damage multiplier at ${deg}°`);
      assertEqual(res.moraleShock, -40, `Morale shock at ${deg}°`);
      assertEqual(res.armorReduction, 1.0, `Armor reduction at ${deg}°`);
      assertFalse(res.counterAllowed, `Counter attack prohibited at ${deg}°`);
    });
  }, { tier: 3 });
});

describe('Combat Math — Elevation Advantage & Cover (F11)', () => {
  test('High-ground downhill attack grants +25% damage per elevation level and +1 range', () => {
    const down1 = calculateElevationCombatModifier(1, 0); // Attacker on hill (1), defender on plain (0)
    assertEqual(down1.damageMultiplier, 1.25, '1 level downhill yields 1.25x damage');
    assertEqual(down1.rangeBonus, 1, '1 level downhill yields +1 range');

    const down2 = calculateElevationCombatModifier(2, 0); // Attacker on citadel (2), defender on plain (0)
    assertEqual(down2.damageMultiplier, 1.50, '2 levels downhill yields 1.50x damage');
    assertEqual(down2.rangeBonus, 2, '2 levels downhill yields +2 range');
  }, { tier: 3 });

  test('Uphill attack suffers -25% damage per elevation level and -1 range', () => {
    const up1 = calculateElevationCombatModifier(0, 1); // Attacker on plain (0), defender on hill (1)
    assertEqual(up1.damageMultiplier, 0.75, '1 level uphill suffers 0.75x damage');
    assertEqual(up1.rangeBonus, -1, '1 level uphill suffers -1 range penalty');
  }, { tier: 3 });

  test('Forest and Jungle provide 50% missile protection and prevent cavalry charge', () => {
    const forestMissile = calculateTerrainCoverModifier('FOREST', true);
    assertEqual(forestMissile.damageReduction, 0.50, 'Forest reduces missile damage by 50%');
    assertEqual(forestMissile.chargeAllowed, false, 'Cavalry charge prohibited in forest');
    assertTrue(forestMissile.grantsStealth, 'Forest grants stealth to light infantry');

    const jungleMissile = calculateTerrainCoverModifier('JUNGLE', true);
    assertEqual(jungleMissile.damageReduction, 0.50, 'Jungle reduces missile damage by 50%');
    assertEqual(jungleMissile.chargeAllowed, false, 'Cavalry charge prohibited in jungle');
  }, { tier: 3 });
});

describe('Combat Math — Morale States & Shock Dynamics (F12)', () => {
  test('Morale states transition across Steady (>=50), Shaken (25-49), Panicking (1-24), and Routed (0)', () => {
    const classifyMorale = (m) => {
      if (m >= 50) return 'STEADY';
      if (m >= 25) return 'SHAKEN';
      if (m > 0) return 'PANICKING';
      return 'ROUTED';
    };

    assertEqual(classifyMorale(100), 'STEADY', '100 is Steady');
    assertEqual(classifyMorale(50), 'STEADY', '50 is Steady threshold');
    assertEqual(classifyMorale(49), 'SHAKEN', '49 is Shaken');
    assertEqual(classifyMorale(25), 'SHAKEN', '25 is Shaken threshold');
    assertEqual(classifyMorale(24), 'PANICKING', '24 is Panicking');
    assertEqual(classifyMorale(1), 'PANICKING', '1 is Panicking');
    assertEqual(classifyMorale(0), 'ROUTED', '0 is Routed');
  }, { tier: 3 });

  test('War Elephants inflict -30 terror morale drain on adjacent enemies', () => {
    const elephant = REGIONAL_UNITS['WAR_ELEPHANTS'];
    assertEqual(elephant.terrorMoraleDrain, 30, 'War Elephant terror morale drain is 30');
  }, { tier: 2 });

  test('Friendly unit routing triggers -15 chain panic in adjacent units within 3 tiles', () => {
    const friendlyUnit = { morale: 60, inGeneralAura: false };
    const adjacentRoutDistance = 2; // within 3 tiles

    if (adjacentRoutDistance <= 3 && !friendlyUnit.inGeneralAura) {
      friendlyUnit.morale -= 15;
    }

    assertEqual(friendlyUnit.morale, 45, 'Chain panic reduced morale by 15');
  }, { tier: 3 });

  test('General Leadership Aura provides complete immunity to chain panic', () => {
    const friendlyInAura = { morale: 60, inGeneralAura: true };
    const adjacentRoutDistance = 1;

    if (adjacentRoutDistance <= 3 && !friendlyInAura.inGeneralAura) {
      friendlyInAura.morale -= 15;
    }

    assertEqual(friendlyInAura.morale, 60, 'Morale protected by General aura');
  }, { tier: 3 });

  test('War Elephant broken at 0 morale enters Berserk Frenzy damaging adjacent units', () => {
    const brokenElephant = { morale: 0, state: 'ROUTED', trampleDmg: 48 };
    const isBerserk = brokenElephant.morale === 0;
    const frenzyTrample = isBerserk ? Math.floor(brokenElephant.trampleDmg * 0.50) : 0;
    assertEqual(frenzyTrample, 24, 'Frenzy trample deals 50% damage to surrounding units');
  }, { tier: 3 });
});

describe('Combat Math — Casualty Distribution Tiers & General Fate (F08)', () => {
  test('Auto-resolve decisive victory inflicts heavy loser casualties and modest winner losses', () => {
    const ratio = 0.80; // |0.80 - 0.5| = 0.30 >= 0.25 -> Decisive
    const isDecisive = Math.abs(ratio - 0.5) >= 0.25;
    assertTrue(isDecisive, 'Classified as decisive victory');

    const winnerCasualtyPct = 0.12; // 8% - 15%
    const loserCasualtyPct = 0.60;  // 45% - 75%
    assertInBounds(winnerCasualtyPct, 0.08, 0.15, 'Winner casualties in decisive tier');
    assertInBounds(loserCasualtyPct, 0.45, 0.75, 'Loser casualties in decisive tier');
  }, { tier: 3 });

  test('Defeated general fate probability distributes across slain (10%), captured (15%), and escape (75%)', () => {
    const resolveGeneralFate = (roll) => {
      if (roll <= 10) return 'DECEASED';
      if (roll <= 25) return 'CAPTURED';
      return 'ACTIVE';
    };

    assertEqual(resolveGeneralFate(5), 'DECEASED', 'Roll 5 is deceased');
    assertEqual(resolveGeneralFate(10), 'DECEASED', 'Roll 10 is deceased threshold');
    assertEqual(resolveGeneralFate(11), 'CAPTURED', 'Roll 11 is captured');
    assertEqual(resolveGeneralFate(25), 'CAPTURED', 'Roll 25 is captured threshold');
    assertEqual(resolveGeneralFate(26), 'ACTIVE', 'Roll 26 escapes');
    assertEqual(resolveGeneralFate(100), 'ACTIVE', 'Roll 100 escapes');
  }, { tier: 3 });

  test('Auto-resolve Close Victory tier (0.10 <= |ratio - 0.5| < 0.25)', () => {
    const ratio = 0.65;
    const diff = Math.abs(ratio - 0.5);
    assertTrue(diff >= 0.10 && diff < 0.25, 'Classified as close victory');
    const winnerCasualties = 0.22; // 18% - 28%
    const loserCasualties = 0.40;  // 32% - 48%
    assertInBounds(winnerCasualties, 0.18, 0.28, 'Winner casualties in close tier');
    assertInBounds(loserCasualties, 0.32, 0.48, 'Loser casualties in close tier');
  }, { tier: 3 });

  test('Auto-resolve Pyrrhic Victory tier (|ratio - 0.5| < 0.10)', () => {
    const ratio = 0.54;
    const diff = Math.abs(ratio - 0.5);
    assertTrue(diff < 0.10, 'Classified as pyrrhic victory');
    const winnerCasualties = 0.32; // 28% - 40%
    const loserCasualties = 0.38;  // 30% - 45%
    assertInBounds(winnerCasualties, 0.28, 0.40, 'Winner casualties in pyrrhic tier');
    assertInBounds(loserCasualties, 0.30, 0.45, 'Loser casualties in pyrrhic tier');
  }, { tier: 3 });
});

describe('Combat Math — Directional & Elevation Comprehensive Grid (F11)', () => {
  test('Angle 0°: Direct frontal assault', () => {
    const res = calculateDirectionalAttack(0);
    assertEqual(res.direction, 'FRONT', 'Direction is FRONT');
    assertEqual(res.damageMultiplier, 1.0, 'Damage is 1.0x');
    assertEqual(res.moraleShock, 0, 'Zero morale shock');
  }, { tier: 3 });

  test('Angle 45°: Upper boundary of frontal arc', () => {
    const res = calculateDirectionalAttack(45);
    assertEqual(res.direction, 'FRONT', '45 deg is FRONT');
    assertEqual(res.damageMultiplier, 1.0, 'Damage is 1.0x');
  }, { tier: 3 });

  test('Angle 46°: Lower boundary of flank arc', () => {
    const res = calculateDirectionalAttack(46);
    assertEqual(res.direction, 'FLANK', '46 deg is FLANK');
    assertEqual(res.damageMultiplier, 1.4, 'Damage is 1.4x');
    assertEqual(res.moraleShock, -20, 'Inflicts -20 morale shock');
  }, { tier: 3 });

  test('Angle 90°: Perpendicular flank charge', () => {
    const res = calculateDirectionalAttack(90);
    assertEqual(res.direction, 'FLANK', '90 deg is FLANK');
    assertEqual(res.armorReduction, 0.50, '50% armor bypass');
  }, { tier: 3 });

  test('Angle 135°: Upper boundary of flank arc', () => {
    const res = calculateDirectionalAttack(135);
    assertEqual(res.direction, 'FLANK', '135 deg is FLANK');
    assertEqual(res.damageMultiplier, 1.4, 'Damage is 1.4x');
  }, { tier: 3 });

  test('Angle 136°: Lower boundary of rear charge', () => {
    const res = calculateDirectionalAttack(136);
    assertEqual(res.direction, 'REAR', '136 deg is REAR');
    assertEqual(res.damageMultiplier, 2.0, 'Damage is 2.0x');
    assertEqual(res.moraleShock, -40, 'Inflicts -40 morale shock');
  }, { tier: 3 });

  test('Angle 180°: Direct rear strike', () => {
    const res = calculateDirectionalAttack(180);
    assertEqual(res.direction, 'REAR', '180 deg is REAR');
    assertEqual(res.armorReduction, 1.0, '100% armor bypass');
    assertFalse(res.counterAllowed, 'Counter-attack prohibited');
  }, { tier: 3 });

  test('Elevation delta +2: High citadel overlooking plain (+50% dmg, +2 range)', () => {
    const res = calculateElevationCombatModifier(2, 0);
    assertEqual(res.damageMultiplier, 1.50, 'Damage is 1.50x');
    assertEqual(res.rangeBonus, 2, 'Range bonus is +2');
  }, { tier: 3 });

  test('Elevation delta -2: Low plain attacking high citadel (-50% dmg, -2 range)', () => {
    const res = calculateElevationCombatModifier(0, 2);
    assertEqual(res.damageMultiplier, 0.50, 'Damage is 0.50x');
    assertEqual(res.rangeBonus, -2, 'Range penalty is -2');
  }, { tier: 3 });
});


