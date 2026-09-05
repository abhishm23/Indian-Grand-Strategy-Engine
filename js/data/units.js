/**
 * Regional Unit Classes and Rock-Paper-Scissors Counter Matrix
 * For 14th-Century Indian Subcontinent Grand Strategy & Tactical Warfare.
 */

const baseUnits = {
  WAR_ELEPHANTS: {
    id: "WAR_ELEPHANTS",
    name: "War Elephants",
    regionalName: "Gaja Shock Host",
    class: "SHOCK_MONSTER",
    unitClass: "SHOCK_MONSTER",
    maxHp: 350,
    meleeAttack: 48,
    meleeAtk: 48,
    meleeDefense: 28,
    meleeDef: 28,
    range: 1,
    moveSpeed: 3,
    baseMorale: 120,
    recruitmentCost: 350,
    upkeepCost: 25,
    upkeep: 25,
    requiredResource: "WAR_ELEPHANTS",
    specialAbilities: ["Trample_Charge", "Terror_Aura", "Berserk_Frenzy"],
    specialAbility: "TRAMPLE_TERROR",
    terrorMoraleDrain: 30,
    description: "Massive armored pachyderms capable of pulverizing enemy infantry formations and sowing widespread panic, though vulnerable to siege ballistas and panic frenzy when isolated."
  },
  HORSE_ARCHERS: {
    id: "HORSE_ARCHERS",
    name: "Horse Archers",
    regionalName: "Turkic Khas Skirmishers",
    class: "SKIRMISH_CAVALRY",
    unitClass: "SKIRMISH_CAVALRY",
    maxHp: 90,
    meleeAttack: 26,
    meleeAtk: 26,
    meleeDefense: 12,
    meleeDef: 12,
    range: 4,
    moveSpeed: 5,
    baseMorale: 80,
    recruitmentCost: 180,
    upkeepCost: 14,
    upkeep: 14,
    requiredResource: "HORSES",
    specialAbilities: ["Skirmish_Retreat", "Parthian_Volley", "High_Evasion"],
    specialAbility: "PARTHIAN_VOLLEY",
    skirmishRetreat: true,
    description: "Swift mounted archers delivering deadly composite bow volleys while evading heavier forces; excels at harassing slow infantry but falters against disciplined massed foot archers."
  },
  RAJPUT_LEVIES: {
    id: "RAJPUT_LEVIES",
    name: "Rajput Levies",
    regionalName: "Kshatriya Spear & Talwar Guard",
    class: "FEROCIOUS_INFANTRY",
    unitClass: "FEROCIOUS_INFANTRY",
    maxHp: 130,
    meleeAttack: 36,
    meleeAtk: 36,
    meleeDefense: 22,
    meleeDef: 22,
    range: 1,
    moveSpeed: 3,
    baseMorale: 110,
    recruitmentCost: 140,
    upkeepCost: 10,
    upkeep: 10,
    requiredResource: "IRON",
    specialAbilities: ["Jauhar_Vow", "Highland_Ferocity", "Spear_Brace"],
    specialAbility: "JAUHAR_VOW",
    hillCombatBonus: 0.35,
    minMoraleFloor: 25,
    description: "Valiant frontline warrior caste troops who form unyielding spear walls against cavalry charges and fight with ferocious zeal in rugged mountain and hill terrain."
  },
  PAIKS: {
    id: "PAIKS",
    name: "Paiks",
    regionalName: "Bengali & Assamese Paik Militia",
    class: "WETLAND_INFANTRY",
    unitClass: "WETLAND_INFANTRY",
    maxHp: 105,
    meleeAttack: 30,
    meleeAtk: 30,
    meleeDefense: 14,
    meleeDef: 14,
    range: 3,
    moveSpeed: 4,
    baseMorale: 75,
    recruitmentCost: 100,
    upkeepCost: 7,
    upkeep: 7,
    requiredResource: "TEXTILES",
    specialAbilities: ["Marsh_Immunity", "Jungle_Stealth", "Poisoned_Arrows"],
    specialAbility: "MARSH_IMMUNITY",
    poisonArrows: true,
    description: "Versatile light militia skilled in archery and bamboo spearcraft; maneuver unhindered through mud, rivers, and dense jungles to ambush unwary invaders."
  },
  HEAVY_CAVALRY: {
    id: "HEAVY_CAVALRY",
    name: "Heavy Cavalry",
    regionalName: "Ghulam Armored Lancers",
    class: "SHOCK_CAVALRY",
    unitClass: "SHOCK_CAVALRY",
    maxHp: 160,
    meleeAttack: 42,
    meleeAtk: 42,
    meleeDefense: 26,
    meleeDef: 26,
    range: 1,
    moveSpeed: 4,
    baseMorale: 100,
    recruitmentCost: 220,
    upkeepCost: 18,
    upkeep: 18,
    requiredResource: "HORSES",
    specialAbilities: ["Devastating_Lance_Charge", "Formation_Shatter"],
    specialAbility: "LANCE_CHARGE",
    chargeMultiplier: 2.2,
    description: "Mail-clad elite shock troopers delivering catastrophic charges that obliterate archers and light formations, but vulnerable when charging braced spearmen."
  },
  SIEGE_ENGINES: {
    id: "SIEGE_ENGINES",
    name: "Siege Engines",
    regionalName: "Manjaniq & Heavy Ballistas",
    class: "ARTILLERY_ENGINE",
    unitClass: "ARTILLERY_ENGINE",
    maxHp: 70,
    meleeAttack: 65,
    meleeAtk: 65,
    meleeDefense: 6,
    meleeDef: 6,
    range: 6,
    minRange: 2,
    moveSpeed: 1,
    baseMorale: 60,
    recruitmentCost: 280,
    upkeepCost: 20,
    upkeep: 20,
    requiredResource: "IRON",
    specialAbilities: ["Siege_Barrage_AoE", "Wall_Breach_Damage", "Min_Range_2"],
    specialAbility: "WALL_BREACH",
    aoeRadius: 1,
    description: "Powerful counterweight catapults and heavy torsion ballistas that reduce fortifications to rubble and impale giant beasts at long distance; helpless if engaged in hand-to-hand combat."
  }
};

// Add aliases
baseUnits.HEAVY_GHULAM_CAVALRY = baseUnits.HEAVY_CAVALRY;
baseUnits.SIEGE_MANJANIQ = baseUnits.SIEGE_ENGINES;

export const UNIT_TYPES = Object.freeze(baseUnits);
export const REGIONAL_UNITS = UNIT_TYPES;
export const UNIT_TYPE_LIST = Object.freeze([
  baseUnits.WAR_ELEPHANTS,
  baseUnits.HORSE_ARCHERS,
  baseUnits.RAJPUT_LEVIES,
  baseUnits.PAIKS,
  baseUnits.HEAVY_CAVALRY,
  baseUnits.SIEGE_ENGINES
]);

/**
 * 6x6 Rock-Paper-Scissors Counter Multipliers
 */
const rawCounterMatrix = {
  WAR_ELEPHANTS: {
    WAR_ELEPHANTS: 1.0,
    HORSE_ARCHERS: 0.8,
    RAJPUT_LEVIES: 1.8,
    PAIKS: 1.8,
    HEAVY_CAVALRY: 1.3,
    HEAVY_GHULAM_CAVALRY: 1.3,
    SIEGE_ENGINES: 2.0,
    SIEGE_MANJANIQ: 2.0
  },
  HORSE_ARCHERS: {
    WAR_ELEPHANTS: 1.2,
    HORSE_ARCHERS: 1.0,
    RAJPUT_LEVIES: 1.4,
    PAIKS: 0.8,
    HEAVY_CAVALRY: 1.3,
    HEAVY_GHULAM_CAVALRY: 1.3,
    SIEGE_ENGINES: 1.8,
    SIEGE_MANJANIQ: 1.8
  },
  RAJPUT_LEVIES: {
    WAR_ELEPHANTS: 1.5,
    HORSE_ARCHERS: 0.7,
    RAJPUT_LEVIES: 1.0,
    PAIKS: 1.3,
    HEAVY_CAVALRY: 2.0,
    HEAVY_GHULAM_CAVALRY: 2.0,
    SIEGE_ENGINES: 1.8,
    SIEGE_MANJANIQ: 1.8
  },
  PAIKS: {
    WAR_ELEPHANTS: 0.9,
    HORSE_ARCHERS: 1.6,
    RAJPUT_LEVIES: 0.9,
    PAIKS: 1.0,
    HEAVY_CAVALRY: 0.6,
    HEAVY_GHULAM_CAVALRY: 0.6,
    SIEGE_ENGINES: 1.5,
    SIEGE_MANJANIQ: 1.5
  },
  HEAVY_CAVALRY: {
    WAR_ELEPHANTS: 0.7,
    HORSE_ARCHERS: 0.9,
    RAJPUT_LEVIES: 0.6,
    PAIKS: 2.2,
    HEAVY_CAVALRY: 1.0,
    HEAVY_GHULAM_CAVALRY: 1.0,
    SIEGE_ENGINES: 2.5,
    SIEGE_MANJANIQ: 2.5
  },
  HEAVY_GHULAM_CAVALRY: null,
  SIEGE_ENGINES: {
    WAR_ELEPHANTS: 2.0,
    HORSE_ARCHERS: 0.5,
    RAJPUT_LEVIES: 1.6,
    PAIKS: 1.4,
    HEAVY_CAVALRY: 1.2,
    HEAVY_GHULAM_CAVALRY: 1.2,
    SIEGE_ENGINES: 1.0,
    SIEGE_MANJANIQ: 1.0
  },
  SIEGE_MANJANIQ: null
};

rawCounterMatrix.HEAVY_GHULAM_CAVALRY = rawCounterMatrix.HEAVY_CAVALRY;
rawCounterMatrix.SIEGE_MANJANIQ = rawCounterMatrix.SIEGE_ENGINES;

function calculateMultiplier(attackerClass, defenderClass, isCharging = false) {
  // Direct tactical class matchups
  if (attackerClass === 'SPEARMAN' && (defenderClass === 'SHOCK_CAVALRY' || defenderClass === 'SHOCK_MONSTER')) {
    return 2.5;
  }
  if (attackerClass === 'SHOCK_CAVALRY' && (defenderClass === 'ARCHER' || defenderClass === 'SWORDSMAN' || defenderClass === 'WETLAND_INFANTRY') && isCharging) {
    return 2.2;
  }
  if (attackerClass === 'SHOCK_CAVALRY' && defenderClass === 'FEROCIOUS_INFANTRY') {
    return 0.6;
  }
  if (attackerClass === 'SHOCK_MONSTER' && (defenderClass === 'SWORDSMAN' || defenderClass === 'FEROCIOUS_INFANTRY')) {
    return 1.8;
  }
  if (attackerClass === 'ARCHER' && (defenderClass === 'SKIRMISH_CAVALRY' || defenderClass === 'WETLAND_INFANTRY')) {
    return 1.6;
  }
  if (attackerClass === 'SKIRMISH_CAVALRY' && (defenderClass === 'SPEARMAN' || defenderClass === 'ARTILLERY_ENGINE')) {
    return 1.5;
  }
  if (attackerClass === 'ARTILLERY_ENGINE' && defenderClass === 'SHOCK_MONSTER') {
    return 2.0;
  }

  // Map archetype classes to representative unit IDs
  const classToUnitId = {
    SHOCK_MONSTER: 'WAR_ELEPHANTS',
    SHOCK_BEAST: 'WAR_ELEPHANTS',
    SKIRMISH_CAVALRY: 'HORSE_ARCHERS',
    FEROCIOUS_INFANTRY: 'RAJPUT_LEVIES',
    SPEARMAN: 'RAJPUT_LEVIES',
    WETLAND_INFANTRY: 'PAIKS',
    ARCHER: 'PAIKS',
    SHOCK_CAVALRY: 'HEAVY_CAVALRY',
    ARTILLERY_ENGINE: 'SIEGE_ENGINES',
    SWORDSMAN: 'RAJPUT_LEVIES'
  };

  const attKey = classToUnitId[attackerClass] || attackerClass;
  const defKey = classToUnitId[defenderClass] || defenderClass;

  if (rawCounterMatrix[attKey] && typeof rawCounterMatrix[attKey][defKey] === 'number') {
    return rawCounterMatrix[attKey][defKey];
  }

  if (attackerClass === defenderClass) {
    return 1.0;
  }

  return 1.0;
}

rawCounterMatrix.getMultiplier = calculateMultiplier;

export const COUNTER_MATRIX = Object.freeze(rawCounterMatrix);

export function getUnitType(id) {
  return UNIT_TYPES[id] || null;
}

export function getAllUnitTypes() {
  return UNIT_TYPE_LIST;
}

export function getCounterMultiplier(attackerClass, defenderClass, isCharging = false) {
  return calculateMultiplier(attackerClass, defenderClass, isCharging);
}
