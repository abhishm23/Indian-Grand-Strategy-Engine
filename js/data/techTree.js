/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/data/techTree.js
 * 
 * Concrete specification and data model for 3 branching research trees
 * (Military Doctrines, Siege & Metallurgy, Civil/Administrative Statecraft)
 * across 4 progressive technology tiers.
 */

export const TECH_BRANCHES = Object.freeze({
  MILITARY_DOCTRINES: 'MILITARY_DOCTRINES',
  SIEGE_METALLURGY: 'SIEGE_METALLURGY',
  CIVIL_STATECRAFT: 'CIVIL_STATECRAFT'
});

export const TECH_TREE = Object.freeze({
  // ==========================================
  // BRANCH 1: MILITARY DOCTRINES & LOGISTICS
  // ==========================================
  TECH_COMBINED_ARMS: {
    id: 'TECH_COMBINED_ARMS',
    name: 'Combined Arms Drills',
    branch: TECH_BRANCHES.MILITARY_DOCTRINES,
    tier: 1,
    researchCost: 100, // Tech points required
    prerequisites: [],
    effects: {
      infantryAttackModifier: 0.10, // +10% melee damage for foot regiments
      levyMoraleBonus: 5            // +5 base morale floor for regional levies
    },
    effectsDescription: '+10% infantry melee power and +5 base morale for levies.',
    description: 'Disciplined battlefield drills coordinating foot spearmen, archer volleys, and skirmisher screens.',
    historicalContext: 'Drawing upon both indigenous Vyuha formations and Turkish-Afghan tactics, armies learned to protect ranged bowmen behind dense spear hedges.'
  },
  TECH_ELEPHANT_ARMOR: {
    id: 'TECH_ELEPHANT_ARMOR',
    name: 'Elephant Howdah Armor',
    branch: TECH_BRANCHES.MILITARY_DOCTRINES,
    tier: 2,
    researchCost: 250,
    prerequisites: ['TECH_COMBINED_ARMS'],
    effects: {
      elephantHpModifier: 0.25,        // +25% War Elephant max HP
      elephantPanicResistance: 0.20,   // -20% panic vulnerability threshold
      elephantTerrorBonus: 5           // +5 additional enemy battle morale drain
    },
    effectsDescription: '+25% War Elephant HP, -20% panic vulnerability, and +5 enemy terror shock.',
    description: 'Reinforced iron plate barding, spiked tusks, and fortified wooden howdah battlements for war elephants.',
    historicalContext: 'Deccan and Carnatic kings transformed massive bull elephants (*Gajas*) into walking juggernauts protected by heavy mail and lamellar armor.'
  },
  TECH_SUPPLY_DEPOTS: {
    id: 'TECH_SUPPLY_DEPOTS',
    name: 'Supply Train Depots',
    branch: TECH_BRANCHES.MILITARY_DOCTRINES,
    tier: 3,
    researchCost: 450,
    prerequisites: ['TECH_ELEPHANT_ARMOR'],
    effects: {
      supplyLineRadiusBonus: 1,              // Extends supply reach from 3 to 4 provinces
      extremeTerrainAttritionReduction: 0.50 // -50% casualties in mountains/deserts/jungles
    },
    effectsDescription: '+1 province supply line radius and -50% non-combat terrain attrition.',
    description: 'Organized grain depots, secured road staging bastions, and contracted pastoral ox-trains (Banjaras).',
    historicalContext: 'Nomadic Banjara bullock convoys transporting thousands of mounds of grain were vital for imperial expeditions marching into the Deccan and Sindh.'
  },
  TECH_IMPERIAL_STAFF: {
    id: 'TECH_IMPERIAL_STAFF',
    name: 'Imperial Command Staff',
    branch: TECH_BRANCHES.MILITARY_DOCTRINES,
    tier: 4,
    researchCost: 750,
    prerequisites: ['TECH_SUPPLY_DEPOTS'],
    effects: {
      armyMovementPointsModifier: 0.15, // +15% campaign movement points
      generalCommandBonus: 1,           // +1 Command attribute to all generals
      flankDefenseModifier: 0.10        // +10% defense mitigation when flanked
    },
    effectsDescription: '+15% army campaign movement speed, +1 Command to all generals, and +10% flank defense.',
    description: 'Centralized military council, standard signalling banners, and specialized mounted couriers (Yasawals).',
    historicalContext: 'Formal military high command structures allowed sovereigns to synchronize multi-army pincers and react swiftly to sudden frontier raids.'
  },

  // ==========================================
  // BRANCH 2: SIEGE ENGINEERING & METALLURGY
  // ==========================================
  TECH_WOOTZ_STEEL: {
    id: 'TECH_WOOTZ_STEEL',
    name: 'Wootz Crucible Steel',
    branch: TECH_BRANCHES.SIEGE_METALLURGY,
    tier: 1,
    researchCost: 100,
    prerequisites: [],
    effects: {
      cavalryAttackModifier: 0.10,        // +10% shock cavalry attack
      eliteRegimentDamageModifier: 0.15   // +15% damage for heavy infantry and knights
    },
    effectsDescription: '+10% cavalry attack damage and +15% weapon damage for elite regiments.',
    description: 'High-temperature crucible smelting producing high-carbon steel with distinctive swirling pattern-welds.',
    historicalContext: 'South Indian Wootz crucible steel (*Ukku*) from Telangana and Karnataka was prized throughout Asia and the Middle East for crafting superior swords.'
  },
  TECH_SAPPING_MINING: {
    id: 'TECH_SAPPING_MINING',
    name: 'Sapping & Countervallation',
    branch: TECH_BRANCHES.SIEGE_METALLURGY,
    tier: 2,
    researchCost: 250,
    prerequisites: ['TECH_WOOTZ_STEEL'],
    effects: {
      siegeSpeedModifier: 0.30,              // +30% faster siege wall breaching
      siegeAttritionDefenderModifier: 0.25   // +25% defender casualty attrition during siege
    },
    effectsDescription: '+30% siege progression speed and +25% defender siege attrition.',
    description: 'Subterranean mining shafts, zigzag approach trenches, and covered timber assault galleries (Sabat).',
    historicalContext: 'Sapping methods undermined stone towers and earthen ramparts during legendary sieges such as Ranthambore and Chittor.'
  },
  TECH_COUNTERWEIGHT_MANJANIQ: {
    id: 'TECH_COUNTERWEIGHT_MANJANIQ',
    name: 'Counterweight Manjaniqs',
    branch: TECH_BRANCHES.SIEGE_METALLURGY,
    tier: 3,
    researchCost: 450,
    prerequisites: ['TECH_SAPPING_MINING'],
    effects: {
      unlockSiegeArtillery: true,     // Enables recruitment of heavy Manjaniq / Ballista units
      artilleryDamageModifier: 0.25   // +25% area-of-effect damage to siege engines
    },
    effectsDescription: 'Unlocks recruitment of Siege Artillery engines and +25% artillery damage.',
    description: 'Massive gravity-driven counterweight trebuchets hurling stone boulders and incendiary naphtha casks.',
    historicalContext: 'Counterweight trebuchets brought to India by Sultanate engineers pulverized curtain walls that had stood for centuries.'
  },
  TECH_ARCHITECTURAL_BASTIONS: {
    id: 'TECH_ARCHITECTURAL_BASTIONS',
    name: 'Architectural Bastions',
    branch: TECH_BRANCHES.SIEGE_METALLURGY,
    tier: 4,
    researchCost: 750,
    prerequisites: ['TECH_COUNTERWEIGHT_MANJANIQ'],
    effects: {
      fortressDefenseBonus: 50,    // +50 defense rating to all friendly fortifications
      garrisonRegimentCapacity: 1  // +1 maximum garrison regiment in all fortified provinces
    },
    effectsDescription: '+50 fortress defense rating empire-wide and +1 garrison regiment capacity.',
    description: 'Concentric multi-walled defenses, curved stone bastions, and machicolated gateways with murder holes.',
    historicalContext: 'Masterful architectural fortresses like Daulatabad (Devagiri) featured labyrinthine dark passages and multiple stone barriers.'
  },

  // ==========================================
  // BRANCH 3: CIVIL STATECRAFT & ADMINISTRATION
  // ==========================================
  TECH_ZABT_CADASTRE: {
    id: 'TECH_ZABT_CADASTRE',
    name: 'Zabt Revenue Cadastre',
    branch: TECH_BRANCHES.CIVIL_STATECRAFT,
    tier: 1,
    researchCost: 100,
    prerequisites: [],
    effects: {
      provincialTaxModifier: 0.15, // +15% provincial tax income empire-wide
      corruptionReduction: 0.05    // -5% provincial tax leakage
    },
    effectsDescription: '+15% empire-wide tax income and -5% provincial corruption.',
    description: 'Systematic land measurement (paimash), agricultural yield registers, and standardized revenue rates.',
    historicalContext: 'Pioneered under Sultanate finance ministers and formalized in Deccan kingdoms, measured cadastral surveys eliminated corrupt fiscal middlemen.'
  },
  TECH_STATE_GRANARIES: {
    id: 'TECH_STATE_GRANARIES',
    name: 'State Granary Network',
    branch: TECH_BRANCHES.CIVIL_STATECRAFT,
    tier: 2,
    researchCost: 250,
    prerequisites: ['TECH_ZABT_CADASTRE'],
    effects: {
      famineUnrestImmunity: true,       // Complete immunity to famine public order unrest
      populationGrowthModifier: 0.10    // +10% population growth rate empire-wide
    },
    effectsDescription: 'Complete immunity to famine public order penalties and +10% population growth.',
    description: 'Strategic royal grain reserves, municipal silos, and state-supervised price stabilization ordinances.',
    historicalContext: 'Alauddin Khalji and Firuz Shah Tughlaq maintained vast municipal granaries in Delhi that disbursed grain at fixed prices during failed monsoons.'
  },
  TECH_BARID_POSTAL: {
    id: 'TECH_BARID_POSTAL',
    name: 'Barid Postal Runners',
    branch: TECH_BRANCHES.CIVIL_STATECRAFT,
    tier: 3,
    researchCost: 450,
    prerequisites: ['TECH_STATE_GRANARIES'],
    effects: {
      distantProvincePublicOrderBonus: 10,  // +10 public order in non-capital provinces
      diplomaticActionSpeedModifier: 0.25,  // Faster diplomatic envoy resolution
      diplomaticAcceptanceBonus: 5          // +5 bonus to AI treaty acceptance score
    },
    effectsDescription: '+10 public order in non-capital provinces and +5 AI diplomatic acceptance bonus.',
    description: 'Relay courier system utilizing fresh horses (ulagh) and swift foot runners (dhawa) with bells.',
    historicalContext: 'Traveler Ibn Battuta marveled at the imperial post system that sped dispatches and delicacies across thousands of miles in mere days.'
  },
  TECH_CODIFIED_EDICTS: {
    id: 'TECH_CODIFIED_EDICTS',
    name: 'Codified Imperial Edicts',
    branch: TECH_BRANCHES.CIVIL_STATECRAFT,
    tier: 4,
    researchCost: 750,
    prerequisites: ['TECH_BARID_POSTAL'],
    effects: {
      maxPublicOrderCapBonus: 15,    // Increases maximum public order cap from 100 to 115
      corruptionReduction: 0.25,     // -25% corruption empire-wide
      governorGovernanceBonus: 1     // +1 Governance attribute to all assigned governors
    },
    effectsDescription: '+15 maximum public order cap (up to 115), -25% corruption, and +1 Governance to all governors.',
    description: 'Standardized legal codes, moral ordinances, and codified provincial court digests engraved on stone and copper.',
    historicalContext: 'Comprehensive legal treatises (such as the Fatawa-i-Jahandari and Vijayanagara royal copper plate charters) institutionalized imperial governance.'
  }
});

// ==========================================
// HELPER FUNCTIONS & QUERY METHODS
// ==========================================

/**
 * Retrieve a technology definition by its unique identifier.
 * @param {string} techId 
 * @returns {object|null}
 */
export function getTech(techId) {
  return TECH_TREE[techId] || null;
}

/**
 * Retrieve all technologies belonging to a specific branch, sorted by tier ascending.
 * @param {string} branch 
 * @returns {Array<object>}
 */
export function getTechsByBranch(branch) {
  return Object.values(TECH_TREE)
    .filter(t => t.branch === branch)
    .sort((a, b) => a.tier - b.tier);
}

/**
 * Check whether a technology can be currently researched given the unlocked technologies.
 * @param {string} techId 
 * @param {Array<string>} unlockedTechIds 
 * @returns {boolean}
 */
export function canResearchTech(techId, unlockedTechIds = []) {
  const tech = getTech(techId);
  if (!tech) return false;
  if (unlockedTechIds.includes(techId)) return false; // already unlocked

  // Check if all prerequisites are unlocked
  return tech.prerequisites.every(prereqId => unlockedTechIds.includes(prereqId));
}

/**
 * Retrieve all technologies currently available for research (prerequisites met, not yet unlocked).
 * @param {Array<string>} unlockedTechIds 
 * @returns {Array<object>}
 */
export function getAvailableTechs(unlockedTechIds = []) {
  return Object.values(TECH_TREE).filter(t => canResearchTech(t.id, unlockedTechIds));
}

/**
 * Calculate the consolidated empire-wide numerical modifiers from all currently unlocked technologies.
 * @param {Array<string>} unlockedTechIds 
 * @returns {object}
 */
export function calculateEmpireTechModifiers(unlockedTechIds = []) {
  const modifiers = {
    infantryAttackModifier: 0,
    levyMoraleBonus: 0,
    elephantHpModifier: 0,
    elephantPanicResistance: 0,
    elephantTerrorBonus: 0,
    supplyLineRadiusBonus: 0,
    extremeTerrainAttritionReduction: 0,
    armyMovementPointsModifier: 0,
    generalCommandBonus: 0,
    flankDefenseModifier: 0,
    cavalryAttackModifier: 0,
    eliteRegimentDamageModifier: 0,
    siegeSpeedModifier: 0,
    siegeAttritionDefenderModifier: 0,
    unlockSiegeArtillery: false,
    artilleryDamageModifier: 0,
    fortressDefenseBonus: 0,
    garrisonRegimentCapacity: 0,
    provincialTaxModifier: 0,
    corruptionReduction: 0,
    famineUnrestImmunity: false,
    populationGrowthModifier: 0,
    distantProvincePublicOrderBonus: 0,
    diplomaticActionSpeedModifier: 0,
    diplomaticAcceptanceBonus: 0,
    maxPublicOrderCapBonus: 0,
    governorGovernanceBonus: 0
  };

  for (const tId of unlockedTechIds) {
    const tech = getTech(tId);
    if (!tech || !tech.effects) continue;

    for (const [key, val] of Object.entries(tech.effects)) {
      if (typeof val === 'boolean') {
        if (val) modifiers[key] = true;
      } else if (typeof val === 'number') {
        modifiers[key] = (modifiers[key] || 0) + val;
      }
    }
  }

  return modifiers;
}

/**
 * Retrieve progress statistics for a branch.
 * @param {string} branch 
 * @param {Array<string>} unlockedTechIds 
 * @returns {{ total: number, unlocked: number, percent: number }}
 */
export function getBranchProgress(branch, unlockedTechIds = []) {
  const branchTechs = getTechsByBranch(branch);
  const total = branchTechs.length;
  const unlocked = branchTechs.filter(t => unlockedTechIds.includes(t.id)).length;
  const percent = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  return { total, unlocked, percent };
}

/**
 * Validate the integrity of the technology tree DAG (no cycles, valid prerequisites).
 * @returns {{ valid: boolean, errors: Array<string> }}
 */
export function validateTechGraph() {
  const errors = [];
  const allIds = new Set(Object.keys(TECH_TREE));

  for (const tech of Object.values(TECH_TREE)) {
    for (const prereq of tech.prerequisites) {
      if (!allIds.has(prereq)) {
        errors.push(`Tech ${tech.id} has non-existent prerequisite: ${prereq}`);
      }
      const pTech = TECH_TREE[prereq];
      if (pTech && pTech.tier >= tech.tier) {
        errors.push(`Tech ${tech.id} (tier ${tech.tier}) has prerequisite ${prereq} of equal or higher tier (${pTech.tier})`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export const TECH_TREE_DATA = {
  MILITARY: [
    { ...TECH_TREE.TECH_COMBINED_ARMS, cost: TECH_TREE.TECH_COMBINED_ARMS.researchCost, prereq: null },
    { ...TECH_TREE.TECH_ELEPHANT_ARMOR, cost: TECH_TREE.TECH_ELEPHANT_ARMOR.researchCost, prereq: 'TECH_COMBINED_ARMS' },
    { ...TECH_TREE.TECH_SUPPLY_DEPOTS, cost: TECH_TREE.TECH_SUPPLY_DEPOTS.researchCost, prereq: 'TECH_ELEPHANT_ARMOR' },
    { ...TECH_TREE.TECH_IMPERIAL_STAFF, cost: TECH_TREE.TECH_IMPERIAL_STAFF.researchCost, prereq: 'TECH_SUPPLY_DEPOTS' }
  ],
  SIEGE_METALLURGY: [
    { ...TECH_TREE.TECH_WOOTZ_STEEL, cost: TECH_TREE.TECH_WOOTZ_STEEL.researchCost, prereq: null },
    { ...TECH_TREE.TECH_SAPPING_MINING, cost: TECH_TREE.TECH_SAPPING_MINING.researchCost, prereq: 'TECH_WOOTZ_STEEL' },
    { ...TECH_TREE.TECH_COUNTERWEIGHT_MANJANIQ, cost: TECH_TREE.TECH_COUNTERWEIGHT_MANJANIQ.researchCost, prereq: 'TECH_SAPPING_MINING' },
    { ...TECH_TREE.TECH_ARCHITECTURAL_BASTIONS, cost: TECH_TREE.TECH_ARCHITECTURAL_BASTIONS.researchCost, prereq: 'TECH_COUNTERWEIGHT_MANJANIQ' }
  ],
  CIVIL_STATECRAFT: [
    { ...TECH_TREE.TECH_ZABT_CADASTRE, cost: TECH_TREE.TECH_ZABT_CADASTRE.researchCost, prereq: null },
    { ...TECH_TREE.TECH_STATE_GRANARIES, cost: TECH_TREE.TECH_STATE_GRANARIES.researchCost, prereq: 'TECH_ZABT_CADASTRE' },
    { ...TECH_TREE.TECH_BARID_POSTAL, cost: TECH_TREE.TECH_BARID_POSTAL.researchCost, prereq: 'TECH_STATE_GRANARIES' },
    { ...TECH_TREE.TECH_CODIFIED_EDICTS, cost: TECH_TREE.TECH_CODIFIED_EDICTS.researchCost, prereq: 'TECH_BARID_POSTAL' }
  ]
};

TECH_TREE_DATA.MILITARY_DOCTRINES = TECH_TREE_DATA.MILITARY;
TECH_TREE_DATA.ADMIN_AGRONOMY = TECH_TREE_DATA.CIVIL_STATECRAFT;

