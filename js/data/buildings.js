/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/data/buildings.js
 * 
 * Concrete specification and data model for 5 provincial building categories
 * across 3 progressive upgrade tiers.
 */

export const BUILDING_CATEGORIES = Object.freeze({
  BARRACKS: 'BARRACKS',
  WALLS: 'WALLS',
  IRRIGATION: 'IRRIGATION',
  MARKET: 'MARKET',
  SHRINE: 'SHRINE'
});

export const BUILDINGS = Object.freeze({
  // ==========================================
  // 1. MILITARY BARRACKS & MUSTER GROUNDS
  // ==========================================
  barracks_t1: {
    id: 'barracks_t1',
    category: BUILDING_CATEGORIES.BARRACKS,
    tier: 1,
    name: 'Muster Ground',
    nameVariants: {
      DHARMIC: 'Chhaoni & Akhada',
      ISLAMIC: 'Muster Ground & Maidan',
      DEFAULT: 'Muster Ground'
    },
    cost: 100,
    buildTime: 2,
    maintenanceCost: 5,
    taxBonus: 0,
    defenseRating: 0,
    garrisonBonus: 1,
    publicOrderBonus: 0,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: ['RAJPUT_LEVIES', 'PAIKS'],
    requiredResource: null,
    prerequisiteBuildingId: null,
    specialEffects: ['Enables recruitment of basic regional militia and infantry'],
    description: 'A cleared training ground and weapon depot for mobilizing local infantry and levies.',
    historicalContext: 'Traditional akharas and muster camps allowed local feudal lords (Nayakas and Jagirdars) to rapidly assemble regional infantry.'
  },
  barracks_t2: {
    id: 'barracks_t2',
    category: BUILDING_CATEGORIES.BARRACKS,
    tier: 2,
    name: 'Armory & Training Grounds',
    nameVariants: {
      DHARMIC: 'Silahkhana & Talim Khana',
      ISLAMIC: 'Royal Karkhana & Armory',
      DEFAULT: 'Armory & Training Grounds'
    },
    cost: 250,
    buildTime: 4,
    maintenanceCost: 15,
    taxBonus: 0,
    defenseRating: 5,
    garrisonBonus: 2,
    publicOrderBonus: 0,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: ['HORSE_ARCHERS'],
    requiredResource: 'IRON',
    prerequisiteBuildingId: 'barracks_t1',
    specialEffects: [
      'Unlocks Horse Archers (requires HORSES in province or trade)',
      'Recruited regiments start with +10 morale'
    ],
    description: 'Specialized weapon smithies, armor storage, and disciplined drill yards for professional soldiers.',
    historicalContext: 'State-sponsored weapons factories (Karkhanas in Delhi/Bengal; Ayudhagar in Vijayanagara) mass-produced composite bows and bladed weapons.'
  },
  barracks_t3: {
    id: 'barracks_t3',
    category: BUILDING_CATEGORIES.BARRACKS,
    tier: 3,
    name: 'Imperial Stables & Elephant Stupa',
    nameVariants: {
      DHARMIC: 'Gajashala & Ashvashala',
      ISLAMIC: 'Filkhana & Royal Paigah',
      DEFAULT: 'Imperial Stables & Elephant Stupa'
    },
    cost: 500,
    buildTime: 6,
    maintenanceCost: 35,
    taxBonus: 0,
    defenseRating: 10,
    garrisonBonus: 3,
    publicOrderBonus: 2,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: ['HEAVY_CAVALRY', 'WAR_ELEPHANTS'],
    requiredResource: 'WAR_ELEPHANTS',
    prerequisiteBuildingId: 'barracks_t2',
    specialEffects: [
      'Unlocks Heavy Ghulam/Vanguard Cavalry and War Elephants',
      '-10% recruitment gold cost for mounted shock units',
      '+2 provincial public order from imperial military presence'
    ],
    description: 'Massive vaulted stone stables and training enclosures capable of housing war elephants and armored cavalry stallions.',
    historicalContext: 'The domed elephant stables of Vijayanagara and the Sultanate Filkhanas housed hundreds of battle-hardened pachyderms and elite steeds.'
  },

  // ==========================================
  // 2. FORTIFICATIONS & CITY WALLS
  // ==========================================
  walls_t1: {
    id: 'walls_t1',
    category: BUILDING_CATEGORIES.WALLS,
    tier: 1,
    name: 'Mud Rampart & Palisade',
    nameVariants: {
      DHARMIC: 'Matti Durga & Wooden Kot',
      ISLAMIC: 'Mud Fasl & Palisade',
      DEFAULT: 'Mud Rampart & Palisade'
    },
    cost: 100,
    buildTime: 2,
    maintenanceCost: 5,
    taxBonus: 0,
    defenseRating: 20,
    garrisonBonus: 1,
    publicOrderBonus: 1,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: null,
    specialEffects: [
      '+20 provincial defense rating',
      '+1 garrison regiment slot',
      '+1 turn enemy siege duration before provincial capitulation'
    ],
    description: 'Earthen embankments reinforced with timber stakes and ditch trenches protecting outer settlements.',
    historicalContext: 'Quickly raised earthen ramparts (*dhus*) provided vital protection against predatory horse raids and nomadic incursions.'
  },
  walls_t2: {
    id: 'walls_t2',
    category: BUILDING_CATEGORIES.WALLS,
    tier: 2,
    name: 'Stone Curtain Walls',
    nameVariants: {
      DHARMIC: 'Shila Kot & Prakara',
      ISLAMIC: 'Shaharpanah & Stone Ramparts',
      DEFAULT: 'Stone Curtain Walls'
    },
    cost: 250,
    buildTime: 4,
    maintenanceCost: 15,
    taxBonus: 0,
    defenseRating: 50,
    garrisonBonus: 2,
    publicOrderBonus: 3,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: 'STONE',
    prerequisiteBuildingId: 'walls_t1',
    specialEffects: [
      '+50 provincial defense rating',
      '+2 garrison regiment slots',
      'Ballista towers provide defensive missile fire against besiegers',
      '+3 turns enemy siege duration before provincial capitulation'
    ],
    description: 'Interlocking cut-granite or cyclopean masonry walls with fortified bastions, machicolations, and iron-studded gates.',
    historicalContext: '14th-century Deccan and Gangetic fortresses incorporated ashlar stone masonry capable of withstanding early counterweight siege engines.'
  },
  walls_t3: {
    id: 'walls_t3',
    category: BUILDING_CATEGORIES.WALLS,
    tier: 3,
    name: 'Hill Citadel & Qila',
    nameVariants: {
      DHARMIC: 'Giri Durga (Hill Fortress)',
      ISLAMIC: 'Bala Hissar & Imperial Qila',
      DEFAULT: 'Hill Citadel & Qila'
    },
    cost: 500,
    buildTime: 6,
    maintenanceCost: 35,
    taxBonus: 0,
    defenseRating: 100,
    garrisonBonus: 3,
    publicOrderBonus: 6,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: 'IRON',
    prerequisiteBuildingId: 'walls_t2',
    specialEffects: [
      '+100 provincial defense rating',
      '+3 garrison regiment slots',
      'Siege Attrition Immunity: Defenders suffer no starvation losses for the first 3 siege turns',
      '+25% defensive damage modifier during tactical siege battles',
      '+5 turns enemy siege duration before provincial capitulation'
    ],
    description: 'Impregnable multi-tiered citadel built on steep rocky escarpments, complete with internal water cisterns and subterranean storehouses.',
    historicalContext: 'Fabled fortresses like Daulatabad, Chittorgarh, Kalinjar, and Warangal stood as virtually unassailable strongholds through concentric lines of defense.'
  },

  // ==========================================
  // 3. AGRICULTURE & IRRIGATION CANALS
  // ==========================================
  irrigation_t1: {
    id: 'irrigation_t1',
    category: BUILDING_CATEGORIES.IRRIGATION,
    tier: 1,
    name: 'Canal Ditches & Wells',
    nameVariants: {
      DHARMIC: 'Kuhl Ditches & Stepwells (Baoli)',
      ISLAMIC: 'Karez Wells & Sluices',
      DEFAULT: 'Canal Ditches & Wells'
    },
    cost: 100,
    buildTime: 2,
    maintenanceCost: 0,
    taxBonus: 15,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 1,
    growthBonus: 0.05,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: null,
    specialEffects: [
      '+15 gold/turn provincial agrarian tax bonus',
      '+5% population growth rate'
    ],
    description: 'Basic stepwells, water lift wheels (rahat), and ditch channels channeling seasonal rains to terraced fields.',
    historicalContext: 'Stepwells (*Baolis*) and Persian water wheels transformed semi-arid regions of Rajasthan and Gujarat into fertile agrarian tracts.'
  },
  irrigation_t2: {
    id: 'irrigation_t2',
    category: BUILDING_CATEGORIES.IRRIGATION,
    tier: 2,
    name: 'Grand Anicut & Water Tank',
    nameVariants: {
      DHARMIC: 'Mahatadaka & Eri Reservoir',
      ISLAMIC: 'Bandhara & Bund System',
      DEFAULT: 'Grand Anicut & Water Tank'
    },
    cost: 250,
    buildTime: 4,
    maintenanceCost: 5,
    taxBonus: 35,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 3,
    growthBonus: 0.12,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: 'irrigation_t1',
    specialEffects: [
      '+35 gold/turn agrarian revenue',
      '+12% population growth rate',
      'Famine Immunity: Province is completely protected against drought and monsoon crop failure unrest'
    ],
    description: 'Massive earthen and masonry dams creating artificial lakes that store monsoon water for year-round dual-crop harvesting.',
    historicalContext: 'The South Indian *Eri* tank cascade systems and check-dams (*Anicuts*) built by Chola, Kakatiya, and Sangama sovereigns sustained dense populations.'
  },
  irrigation_t3: {
    id: 'irrigation_t3',
    category: BUILDING_CATEGORIES.IRRIGATION,
    tier: 3,
    name: 'River Canal Network',
    nameVariants: {
      DHARMIC: 'Kalyana Nahar & Cauvery Sluice Grid',
      ISLAMIC: 'Nahar-i-Firoz & Riverway Grid',
      DEFAULT: 'River Canal Network'
    },
    cost: 500,
    buildTime: 6,
    maintenanceCost: 15,
    taxBonus: 70,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 6,
    growthBonus: 0.20,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: 'irrigation_t2',
    specialEffects: [
      '+70 gold/turn agrarian revenue',
      '+20% population growth rate',
      '+6 provincial public order from agricultural prosperity',
      '+1 campaign army supply line radius if province connects to a major river'
    ],
    description: 'Vast regional canal networks diverting major river channels (Yamuna, Satluj, Tungabhadra, Cauvery) across multiple districts.',
    historicalContext: 'Firuz Shah Tughlaq constructed extensive civil canal networks connecting the Yamuna and Ghaggar rivers, turning barren tracts into breadbaskets.'
  },

  // ==========================================
  // 4. COMMERCE & MARKETS
  // ==========================================
  market_t1: {
    id: 'market_t1',
    category: BUILDING_CATEGORIES.MARKET,
    tier: 1,
    name: 'Local Bazaar',
    nameVariants: {
      DHARMIC: 'Haat & Santhe',
      ISLAMIC: 'Mandi & Local Bazaar',
      DEFAULT: 'Local Bazaar'
    },
    cost: 100,
    buildTime: 2,
    maintenanceCost: 0,
    taxBonus: 25,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 0,
    growthBonus: 0.02,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: null,
    specialEffects: [
      '+25 gold/turn commercial revenue',
      '+5% bonus to provincial trade tariffs'
    ],
    description: 'Weekly rural marketplaces and central street stalls where local artisans, weavers, and farmers trade goods.',
    historicalContext: 'Weekly rural markets (*haats*) facilitated monetization and commercial exchange under local trade guilds.'
  },
  market_t2: {
    id: 'market_t2',
    category: BUILDING_CATEGORIES.MARKET,
    tier: 2,
    name: 'Caravanserai & River Port',
    nameVariants: {
      DHARMIC: 'Dharmashala & Ghat Port',
      ISLAMIC: 'Caravanserai & Bandar Wharf',
      DEFAULT: 'Caravanserai & River Port'
    },
    cost: 250,
    buildTime: 4,
    maintenanceCost: 10,
    taxBonus: 60,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 2,
    growthBonus: 0.05,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: 'market_t1',
    specialEffects: [
      '+60 gold/turn commercial revenue',
      '+10% bonus to bilateral trade treaties involving this province',
      'Unlocks foreign merchant envoy missions'
    ],
    description: 'Fortified traveler inns with walled courtyards, stables for pack camels and bullocks, and river wharves for cargo barges.',
    historicalContext: 'Caravanserais (*Sarais*) along the Grand Trunk Road and river ports on the Ganga and Brahmaputra handled immense inter-regional trade.'
  },
  market_t3: {
    id: 'market_t3',
    category: BUILDING_CATEGORIES.MARKET,
    tier: 3,
    name: 'Grand Mint & Merchant Guildhall',
    nameVariants: {
      DHARMIC: 'Taksal & Mahajan Mahasabha',
      ISLAMIC: 'Dar al-Zarb & Sarraf Chamber',
      DEFAULT: 'Grand Mint & Merchant Guildhall'
    },
    cost: 500,
    buildTime: 6,
    maintenanceCost: 20,
    taxBonus: 120,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 4,
    growthBonus: 0.08,
    conversionRate: 0,
    pietyBonus: 0,
    recruitmentUnlocks: [],
    requiredResource: 'PRECIOUS_STONES', // or precious metals/trade
    prerequisiteBuildingId: 'market_t2',
    specialEffects: [
      '+120 gold/turn commercial revenue',
      '+20% foreign trade income modifier',
      '-15% provincial corruption / tax leakage'
    ],
    description: 'Official royal coinage mint and high guildhead offices of merchant bankers (*Sarrafs* and *Nagarsheths*) issuing letters of credit (*Hundis*).',
    historicalContext: 'Urban economic metropolises like Delhi, Pandua, Cambay, and Vijayanagara operated mints issuing high-purity gold and silver currency.'
  },

  // ==========================================
  // 5. RELIGIOUS SHRINES & TEMPLES
  // ==========================================
  shrine_t1: {
    id: 'shrine_t1',
    category: BUILDING_CATEGORIES.SHRINE,
    tier: 1,
    name: 'Shrine & Village Mosque',
    nameVariants: {
      DHARMIC: 'Gramadevati Devasthana',
      ISLAMIC: 'Village Masjid & Chillahgah',
      DEFAULT: 'Shrine & Village Mosque'
    },
    cost: 100,
    buildTime: 2,
    maintenanceCost: 0,
    taxBonus: 0,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 5,
    growthBonus: 0,
    conversionRate: 0.005,
    pietyBonus: 2,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: null,
    specialEffects: [
      '+5 provincial public order',
      '+0.5% state religion conversion rate per turn',
      '+2 ruler piety bonus'
    ],
    description: 'Local neighborhood prayer house, village deity altar, or small mosque uniting local worshipers.',
    historicalContext: 'Local shrines and sacred groves formed the bedrock of grassroots spiritual life and communal cohesion.'
  },
  shrine_t2: {
    id: 'shrine_t2',
    category: BUILDING_CATEGORIES.SHRINE,
    tier: 2,
    name: 'Mandir & Jami Masjid',
    nameVariants: {
      DHARMIC: 'Maha Mandir & Agrahara',
      ISLAMIC: 'Jami Masjid & Madrasa',
      DEFAULT: 'Mandir & Jami Masjid'
    },
    cost: 250,
    buildTime: 4,
    maintenanceCost: 10,
    taxBonus: 0,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 12,
    growthBonus: 0,
    conversionRate: 0.015,
    pietyBonus: 10,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: 'shrine_t1',
    specialEffects: [
      '+12 provincial public order',
      '+1.5% state religion conversion rate per turn',
      '+10 ruler piety bonus',
      'Reduces provincial religious friction penalty by 50%'
    ],
    description: 'Major stone temple complex or congregational Friday mosque featuring scriptural schools and community kitchens.',
    historicalContext: 'Urban monumental shrines like the Adina Mosque in Bengal or the Vidyashankara temple at Sringeri anchored religious authority and education.'
  },
  shrine_t3: {
    id: 'shrine_t3',
    category: BUILDING_CATEGORIES.SHRINE,
    tier: 3,
    name: 'Grand Monumental Temple & Dargah',
    nameVariants: {
      DHARMIC: 'Rajagopuram Complex & Matha',
      ISLAMIC: 'Grand Dargah Sharif & Khanqah',
      DEFAULT: 'Grand Monumental Temple & Dargah'
    },
    cost: 500,
    buildTime: 6,
    maintenanceCost: 25,
    taxBonus: 0,
    defenseRating: 5,
    garrisonBonus: 0,
    publicOrderBonus: 20,
    growthBonus: 0.02,
    conversionRate: 0.030,
    pietyBonus: 25,
    recruitmentUnlocks: [],
    requiredResource: null,
    prerequisiteBuildingId: 'shrine_t2',
    specialEffects: [
      '+20 provincial public order',
      '+3.0% state religion conversion rate per turn',
      '+25 ruler piety bonus',
      '+5 defense rating from fortified sanctum perimeter',
      '-25% armed rebellion spawn probability in province'
    ],
    description: 'Colossal religious landmark featuring soaring gopurams or grand domes, attracting thousands of pilgrims and saintly mendicants.',
    historicalContext: 'Spiritual epicenters such as the Virupaksha complex in Hampi, Ajmer Sharif Dargah, and Jagannath Puri exerted empire-wide political and cultural influence.'
  }
});

// ==========================================
// HELPER FUNCTIONS & QUERY METHODS
// ==========================================

/**
 * Retrieve a building definition by its unique identifier.
 * @param {string} buildingId 
 * @returns {object|null}
 */
export function getBuilding(buildingId) {
  return BUILDINGS[buildingId] || null;
}

/**
 * Retrieve all buildings belonging to a specific category, sorted by tier ascending.
 * @param {string} category 
 * @returns {Array<object>}
 */
export function getBuildingsByCategory(category) {
  return Object.values(BUILDINGS)
    .filter(b => b.category === category)
    .sort((a, b) => a.tier - b.tier);
}

/**
 * Retrieve a building for a specific category and tier.
 * @param {string} category 
 * @param {number} tier 
 * @returns {object|null}
 */
export function getBuildingByTier(category, tier) {
  return Object.values(BUILDINGS).find(b => b.category === category && b.tier === tier) || null;
}

/**
 * Get the next tier upgrade for a given building, or null if already at max tier.
 * @param {string} buildingId 
 * @returns {object|null}
 */
export function getNextUpgrade(buildingId) {
  const current = getBuilding(buildingId);
  if (!current || current.tier >= 3) return null;
  return getBuildingByTier(current.category, current.tier + 1);
}

/**
 * Aggregate all numerical bonuses conferred by an array of active building IDs in a province.
 * @param {Array<string>} activeBuildingIds 
 * @returns {object}
 */
export function calculateProvinceBuildingBonuses(activeBuildingIds = []) {
  const result = {
    taxBonus: 0,
    defenseRating: 0,
    garrisonBonus: 0,
    publicOrderBonus: 0,
    growthBonus: 0,
    conversionRate: 0,
    pietyBonus: 0,
    maintenanceCost: 0,
    recruitmentUnlocks: [],
    hasFamineImmunity: false,
    hasSiegeAttritionImmunity: false
  };

  const unlockedSet = new Set();

  for (const bId of activeBuildingIds) {
    const b = getBuilding(bId);
    if (!b) continue;

    result.taxBonus += b.taxBonus || 0;
    result.defenseRating += b.defenseRating || 0;
    result.garrisonBonus += b.garrisonBonus || 0;
    result.publicOrderBonus += b.publicOrderBonus || 0;
    result.growthBonus += b.growthBonus || 0;
    result.conversionRate += b.conversionRate || 0;
    result.pietyBonus += b.pietyBonus || 0;
    result.maintenanceCost += b.maintenanceCost || 0;

    if (Array.isArray(b.recruitmentUnlocks)) {
      for (const u of b.recruitmentUnlocks) {
        unlockedSet.add(u);
      }
    }

    if (b.id === 'irrigation_t2' || b.id === 'irrigation_t3') {
      result.hasFamineImmunity = true;
    }
    if (b.id === 'walls_t3') {
      result.hasSiegeAttritionImmunity = true;
    }
  }

  result.recruitmentUnlocks = Array.from(unlockedSet);
  return result;
}

/**
 * Determine which unit classes can be recruited in a province given its buildings and strategic resources.
 * @param {Array<string>} activeBuildingIds 
 * @param {Array<string>} provinceResources 
 * @returns {Array<string>}
 */
export function getRecruitableUnits(activeBuildingIds = [], provinceResources = []) {
  const bonuses = calculateProvinceBuildingBonuses(activeBuildingIds);
  const resourceSet = new Set(provinceResources);

  const recruitable = [];

  for (const unitId of bonuses.recruitmentUnlocks) {
    // Specific resource requirements
    if (unitId === 'HORSE_ARCHERS' || unitId === 'HEAVY_CAVALRY') {
      // Mounted troops require HORSES resource
      if (resourceSet.has('HORSES')) {
        recruitable.push(unitId);
      }
    } else if (unitId === 'WAR_ELEPHANTS') {
      // Elephants require WAR_ELEPHANTS resource
      if (resourceSet.has('WAR_ELEPHANTS')) {
        recruitable.push(unitId);
      }
    } else {
      // Regular levies and paiks do not require rare strategic resources
      recruitable.push(unitId);
    }
  }

  return recruitable;
}

/**
 * Check whether a province can commission a building.
 * @param {string} buildingId 
 * @param {Array<string>} activeBuildingIds 
 * @param {number} treasuryGold 
 * @param {Array<string>} availableResources 
 * @returns {{ canBuild: boolean, reason: string }}
 */
export function canConstructBuilding(buildingId, activeBuildingIds = [], treasuryGold = 0, availableResources = []) {
  const target = getBuilding(buildingId);
  if (!target) {
    return { canBuild: false, reason: `Unknown building ID: ${buildingId}` };
  }

  if (activeBuildingIds.includes(buildingId)) {
    return { canBuild: false, reason: 'Building already constructed in this province' };
  }

  if (treasuryGold < target.cost) {
    return { canBuild: false, reason: `Insufficient gold: requires ${target.cost}, available ${treasuryGold}` };
  }

  // Check prerequisite tier
  if (target.prerequisiteBuildingId && !activeBuildingIds.includes(target.prerequisiteBuildingId)) {
    const prereq = getBuilding(target.prerequisiteBuildingId);
    return { canBuild: false, reason: `Missing prerequisite building: ${prereq ? prereq.name : target.prerequisiteBuildingId}` };
  }

  // Check required resource
  if (target.requiredResource && !availableResources.includes(target.requiredResource)) {
    return { canBuild: false, reason: `Missing required strategic resource: ${target.requiredResource}` };
  }

  return { canBuild: true, reason: 'OK' };
}

export const BUILDINGS_DATA = {
  BARRACKS: [
    { ...BUILDINGS.barracks_t1, turns: BUILDINGS.barracks_t1.buildTime, defenseBonus: BUILDINGS.barracks_t1.defenseRating, garrisonSlots: BUILDINGS.barracks_t1.garrisonBonus, unlocks: BUILDINGS.barracks_t1.recruitmentUnlocks },
    { ...BUILDINGS.barracks_t2, turns: BUILDINGS.barracks_t2.buildTime, defenseBonus: BUILDINGS.barracks_t2.defenseRating, garrisonSlots: BUILDINGS.barracks_t2.garrisonBonus, unlocks: BUILDINGS.barracks_t2.recruitmentUnlocks },
    { ...BUILDINGS.barracks_t3, turns: BUILDINGS.barracks_t3.buildTime, defenseBonus: BUILDINGS.barracks_t3.defenseRating, garrisonSlots: BUILDINGS.barracks_t3.garrisonBonus, unlocks: BUILDINGS.barracks_t3.recruitmentUnlocks }
  ],
  WALLS: [
    { ...BUILDINGS.walls_t1, turns: BUILDINGS.walls_t1.buildTime, defenseBonus: BUILDINGS.walls_t1.defenseRating, garrisonSlots: BUILDINGS.walls_t1.garrisonBonus },
    { ...BUILDINGS.walls_t2, turns: BUILDINGS.walls_t2.buildTime, defenseBonus: BUILDINGS.walls_t2.defenseRating, garrisonSlots: BUILDINGS.walls_t2.garrisonBonus },
    { ...BUILDINGS.walls_t3, turns: BUILDINGS.walls_t3.buildTime, defenseBonus: BUILDINGS.walls_t3.defenseRating, garrisonSlots: BUILDINGS.walls_t3.garrisonBonus }
  ],
  IRRIGATION: [
    { ...BUILDINGS.irrigation_t1, turns: BUILDINGS.irrigation_t1.buildTime, goldIncome: BUILDINGS.irrigation_t1.taxBonus },
    { ...BUILDINGS.irrigation_t2, turns: BUILDINGS.irrigation_t2.buildTime, goldIncome: BUILDINGS.irrigation_t2.taxBonus },
    { ...BUILDINGS.irrigation_t3, turns: BUILDINGS.irrigation_t3.buildTime, goldIncome: BUILDINGS.irrigation_t3.taxBonus }
  ],
  MARKET: [
    { ...BUILDINGS.market_t1, turns: BUILDINGS.market_t1.buildTime, goldIncome: BUILDINGS.market_t1.taxBonus },
    { ...BUILDINGS.market_t2, turns: BUILDINGS.market_t2.buildTime, goldIncome: BUILDINGS.market_t2.taxBonus, tradeMultiplier: 0.10 },
    { ...BUILDINGS.market_t3, turns: BUILDINGS.market_t3.buildTime, goldIncome: BUILDINGS.market_t3.taxBonus, corruptionReduction: 0.15 }
  ],
  SHRINE: [
    { ...BUILDINGS.shrine_t1, turns: BUILDINGS.shrine_t1.buildTime },
    { ...BUILDINGS.shrine_t2, turns: BUILDINGS.shrine_t2.buildTime },
    { ...BUILDINGS.shrine_t3, turns: BUILDINGS.shrine_t3.buildTime }
  ]
};

BUILDINGS_DATA.FORTIFICATIONS = BUILDINGS_DATA.WALLS;
BUILDINGS_DATA.AGRICULTURE = BUILDINGS_DATA.IRRIGATION;
BUILDINGS_DATA.COMMERCE = BUILDINGS_DATA.MARKET;
BUILDINGS_DATA.RELIGION = BUILDINGS_DATA.SHRINE;

