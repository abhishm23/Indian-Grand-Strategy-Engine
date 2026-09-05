/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/data/religions.js
 * 
 * Concrete specification and data model for Dharmic and Islamic traditions,
 * authentic pilgrimage holy shrines, and 3 state tolerance policies
 * with deterministic public order, economic, and diplomatic modifiers.
 */

export const RELIGIOUS_TRADITIONS = Object.freeze({
  DHARMIC: {
    id: 'DHARMIC',
    name: 'Dharmic Tradition',
    description: 'Indigenous spiritual traditions encompassing Vedic Hinduism, Buddhism, and Jainism rooted in karma, dharma, and temple patronage.',
    philosophicalCore: 'Shared reverence for sacred geography (Tirthas), cosmic order (Rta/Dharma), and spiritual asceticism.'
  },
  ISLAMIC: {
    id: 'ISLAMIC',
    name: 'Islamic Tradition',
    description: 'Monotheistic faith anchored in the Quran, Sunnah, and Hanafi jurisprudence, enriched across India by mystical Sufi tariqas.',
    philosophicalCore: 'Divine unity (Tawhid), egalitarian brotherhood, royal piety, and Sufi hospice (Khanqah) hospitality.'
  }
});

export const RELIGIONS = Object.freeze({
  // ==========================================
  // DHARMIC RELIGIONS & SECTS
  // ==========================================
  HINDUISM_SHAIVITE: {
    id: 'HINDUISM_SHAIVITE',
    name: 'Shaivite Hinduism',
    tradition: 'DHARMIC',
    clergyTitle: 'Pashupata & Jangama Priests',
    description: 'Worship of Shiva as supreme ascetic and destroyer. Prominent in Mewar (Eklingji), Kakatiya Warangal, and Jaffna.',
    baseModifiers: {
      homeTerritoryDefenseModifier: 0.10, // +10% defense in home provinces
      levyMoraleBonus: 5,                 // +5 morale floor
      publicOrderModifier: 2
    },
    sacredSites: ['SHRINE_VARANASI', 'SHRINE_SOMNATH']
  },
  HINDUISM_VAISHNAVITE: {
    id: 'HINDUISM_VAISHNAVITE',
    name: 'Vaishnavite Hinduism',
    tradition: 'DHARMIC',
    clergyTitle: 'Sri Vaishnava Acharyas',
    description: 'Devotion to Vishnu, Rama, and Krishna through devotional Bhakti singing, charitable endowments, and massive temple cities.',
    baseModifiers: {
      populationGrowthModifier: 0.05,     // +5% population growth
      publicOrderModifier: 4,             // +4 public order from community cohesion
      agriculturalTaxModifier: 0.05
    },
    sacredSites: ['SHRINE_TIRUPATI', 'SHRINE_PURI', 'SHRINE_PANDHARPUR']
  },
  HINDUISM_SMARTHA: {
    id: 'HINDUISM_SMARTHA',
    name: 'Smartha Advaita Vedanta',
    tradition: 'DHARMIC',
    clergyTitle: 'Shankaracharyas & Agrahara Pandits',
    description: 'Orthodox non-sectarian Vedic philosophy synthesized by Adi Shankara and revitalized by Sage Vidyaranya at Sringeri and Vijayanagara.',
    baseModifiers: {
      researchRateModifier: 0.15,         // +15% civic research speed
      diplomaticAffinityBonus: 10,        // +10 diplomacy with all Hindu rulers
      publicOrderModifier: 3
    },
    sacredSites: ['SHRINE_VARANASI', 'SHRINE_TIRUPATI']
  },
  BUDDHISM_THERAVADA: {
    id: 'BUDDHISM_THERAVADA',
    name: 'Theravada Buddhism',
    tradition: 'DHARMIC',
    clergyTitle: 'Sangha Mahatheras',
    description: 'Ancient monastic tradition based on the Pali Canon, centered around royal relic sanctuaries in Sri Lanka and Burma.',
    baseModifiers: {
      capitalPublicOrderBonus: 15,        // +15 public order in capital
      armyUpkeepReduction: 0.10,          // -10% army upkeep
      publicOrderModifier: 4
    },
    sacredSites: ['SHRINE_GAMPOLA_TOOTH']
  },
  BUDDHISM_TIBETAN: {
    id: 'BUDDHISM_TIBETAN',
    name: 'Tibetan Vajrayana Buddhism',
    tradition: 'DHARMIC',
    clergyTitle: 'Lamas & Rinpoches',
    description: 'Vajrayana Buddhist monastic hierarchy governing Trans-Himalayan valleys under the Phagmodrupa dynasty in Lhasa and Guge.',
    baseModifiers: {
      mountainDefenseModifier: 0.20,      // +20% defense in mountain passes
      extremeColdAttritionReduction: 0.50,// -50% mountain freeze casualties
      publicOrderModifier: 3
    },
    sacredSites: []
  },
  TRADITIONAL_TAI: {
    id: 'TRADITIONAL_TAI',
    name: 'Traditional Tai (Phuralong)',
    tradition: 'DHARMIC',
    clergyTitle: 'Deodhais & Bailungs',
    description: 'Ancestral animist and celestial pantheon of the Ahom conquerors of Assam, venerating the supreme deity Lengdon.',
    baseModifiers: {
      manpowerMobilizationModifier: 0.15, // +15% manpower recruitment speed
      wetlandDefenseModifier: 0.10,       // +10% defense in Brahmaputra marshes
      publicOrderModifier: 2
    },
    sacredSites: []
  },

  // ==========================================
  // ISLAMIC RELIGIONS & TRADITIONS
  // ==========================================
  ISLAM_SUNNI: {
    id: 'ISLAM_SUNNI',
    name: 'Sunni Islam (Hanafi)',
    tradition: 'ISLAMIC',
    clergyTitle: 'Ulama, Qadis & Shaikhs',
    description: 'Imperial faith of the Delhi Sultanate, Bahmanis, and Bengal Sultanate, governed by Hanafi jurisprudence and Caliphal investiture.',
    baseModifiers: {
      cavalryAttackModifier: 0.10,        // +10% shock cavalry attack
      provincialTaxModifier: 0.10,        // +10% base tax collection efficiency
      publicOrderModifier: 2
    },
    sacredSites: ['SHRINE_NIZAMUDDIN', 'SHRINE_AJMER']
  },
  ISLAM_SUFI: {
    id: 'ISLAM_SUFI',
    name: 'Sufi Devotionalism',
    tradition: 'ISLAMIC',
    clergyTitle: 'Pir, Murshid & Khadim',
    description: 'Mystical Sufi tariqas (Chishti, Suhrawardi, Firdausi) bridging cultural divides through hospice soup kitchens (Langar) and musical assemblies (Sama).',
    baseModifiers: {
      syncreticPublicOrderBonus: 10,      // +10 public order across mixed populations
      naturalConversionRate: 0.015,       // +1.5% peaceful conversion per turn
      publicOrderModifier: 5
    },
    sacredSites: ['SHRINE_AJMER', 'SHRINE_NIZAMUDDIN']
  }
});

export const HOLY_SHRINES = Object.freeze({
  SHRINE_VARANASI: {
    id: 'SHRINE_VARANASI',
    name: 'Kashi Vishwanath & Manikarnika Ghat',
    provinceId: 'PROV_JAUNPUR', // Varanasi is situated within the Jaunpur-Varanasi administrative region
    tradition: 'DHARMIC',
    deityOrSaint: 'Lord Shiva (Visvesvara)',
    description: 'The holiest of Hindu pilgrimage destinations on the sacred Ganga, revered for eternal liberation (Moksha).',
    controllerBonus: {
      pietyBonus: 20,
      publicOrderBonus: 10,
      pilgrimRevenue: 50, // Gold per turn
      diplomaticBonusSameTradition: 15,
      special: '+10 morale to all Dharmic forces defending the Gangetic heartland'
    },
    historicalSignificance: 'Even amidst Sultanate conquests, pilgrims from across Kashmir to Tamil Nadu journeyed to bathe in the holy Ganga at Varanasi.'
  },
  SHRINE_SOMNATH: {
    id: 'SHRINE_SOMNATH',
    name: 'Somnath Jyotirlinga',
    provinceId: 'PROV_GUJARAT',
    tradition: 'DHARMIC',
    deityOrSaint: 'Lord Shiva (First of the Twelve Jyotirlingas)',
    description: 'Legendary coastal pilgrimage temple standing on the shores of Prabhas Patan in Saurashtra.',
    controllerBonus: {
      pietyBonus: 20,
      publicOrderBonus: 10,
      pilgrimRevenue: 45,
      defenseRatingBonus: 15,
      special: '+15 defense rating to Gujarat coastal settlements and +10% naval morale'
    },
    historicalSignificance: 'Repeatedly contested and rebuilt, Somnath remained an enduring symbol of coastal Hindu maritime devotion.'
  },
  SHRINE_AJMER: {
    id: 'SHRINE_AJMER',
    name: 'Ajmer Sharif Dargah',
    provinceId: 'PROV_RAJPUTANA', // Situated at the Aravalli crossroads bordering Mewar and Nagaur
    tradition: 'ISLAMIC',
    deityOrSaint: 'Hazrat Khwaja Moinuddin Chishti (Gharib Nawaz)',
    description: 'The preeminent Sufi resting place in South Asia, drawing millions of both Muslim and Hindu devotees seeking blessings.',
    controllerBonus: {
      pietyBonus: 20,
      publicOrderBonus: 12,
      pilgrimRevenue: 55,
      syncreticOrderBonus: 8,
      special: '+8 public order in all non-Muslim provinces within the empire through Sufi goodwill'
    },
    historicalSignificance: 'Khwaja Gharib Nawaz established the Chishti tradition of universal peace (Sulh-i-Kul), making Ajmer a revered sanctuary for all communities.'
  },
  SHRINE_PANDHARPUR: {
    id: 'SHRINE_PANDHARPUR',
    name: 'Vithoba Temple of Pandharpur',
    provinceId: 'PROV_DAULATABAD', // Located in the southern Maratha-Deccan country
    tradition: 'DHARMIC',
    deityOrSaint: 'Lord Vitthal (Vithoba) & Rukmini',
    description: 'The spiritual home of the Varkari Bhakti movement along the Bhima River, championing casteless devotional love.',
    controllerBonus: {
      pietyBonus: 15,
      publicOrderBonus: 12,
      pilgrimRevenue: 40,
      peasantLoyaltyBonus: 15,
      special: '-20% peasant unrest and rebellion probability throughout the Deccan'
    },
    historicalSignificance: 'Sant Dnyaneshwar and Namdev led annual walking pilgrimages (Vari) to Pandharpur, creating deep social cohesion among the agrarian masses.'
  },
  SHRINE_PURI: {
    id: 'SHRINE_PURI',
    name: 'Jagannath Temple of Puri',
    provinceId: 'PROV_ORISSA',
    tradition: 'DHARMIC',
    deityOrSaint: 'Lord Jagannath, Balabhadra & Subhadra',
    description: 'Colossal seaside temple complex of Kalinga, famed for the annual Ratha Yatra and monumental kitchen (Mahaprasad).',
    controllerBonus: {
      pietyBonus: 25,
      publicOrderBonus: 15,
      pilgrimRevenue: 60,
      armyMoraleBonus: 10,
      special: '+10 army morale when marching with the imperial Gajapati standards'
    },
    historicalSignificance: 'The Eastern Gangas and Gajapatis ruled as servants (Raut) of Lord Jagannath, deriving supreme political and martial legitimacy from the deity.'
  },
  SHRINE_NIZAMUDDIN: {
    id: 'SHRINE_NIZAMUDDIN',
    name: 'Dargah Hazrat Nizamuddin Auliya',
    provinceId: 'PROV_DELHI',
    tradition: 'ISLAMIC',
    deityOrSaint: 'Hazrat Nizamuddin Auliya (Mehboob-e-Elahi) & Amir Khusrau',
    description: 'The spiritual heart of Delhi, drawing emperors, scholars, poets, and commoners to its sacred hospice.',
    controllerBonus: {
      pietyBonus: 15,
      publicOrderBonus: 10,
      pilgrimRevenue: 50,
      researchRateBonus: 0.10,
      special: '+10% empire-wide civic research speed through literary and philosophical patronage'
    },
    historicalSignificance: 'Hazrat Nizamuddin maintained majestic spiritual independence from the Sultanate throne, embodying uncompromised charity and piety.'
  },
  SHRINE_TIRUPATI: {
    id: 'SHRINE_TIRUPATI',
    name: 'Sri Venkateswara Temple of Tirumala',
    provinceId: 'PROV_TONDAI',
    tradition: 'DHARMIC',
    deityOrSaint: 'Lord Venkateswara (Balaji)',
    description: 'Sacred Seven Hills shrine endowed by the Sangama rulers with heaps of gold, jewels, and fertile agrarian lands.',
    controllerBonus: {
      pietyBonus: 25,
      publicOrderBonus: 15,
      pilgrimRevenue: 75,
      treasuryBonus: 50, // Gold per turn from wealthy merchant offerings
      special: '+50 gold/turn royal tribute from temple treasury and +15 public order across Tamil/Telugu lands'
    },
    historicalSignificance: 'Vijayanagara emperors regularly visited Tirumala to perform Kanakabhishekam (showering the deity in gold) to solemnize imperial victories.'
  },
  SHRINE_GAMPOLA_TOOTH: {
    id: 'SHRINE_GAMPOLA_TOOTH',
    name: 'Temple of the Sacred Tooth Relic',
    provinceId: 'PROV_GAMPOLA',
    tradition: 'DHARMIC',
    deityOrSaint: 'The Sacred Danta Dhatu (Tooth Relic of the Buddha)',
    description: 'The supreme palladium of Sinhalese kingship; whoever possessed the Sacred Tooth held the divine right to rule Sri Lanka.',
    controllerBonus: {
      pietyBonus: 25,
      publicOrderBonus: 20,
      pilgrimRevenue: 40,
      diplomaticPrestige: 15,
      special: '+20 public order in all Buddhist provinces and absolute monarchical legitimacy'
    },
    historicalSignificance: 'King Bhuvanaikabahu IV enshrined the Tooth Relic at Gampola, defying South Indian invasions and cementing his sovereign title.'
  }
});

export const TOLERANCE_POLICIES = Object.freeze({
  STRICT_ORTHODOXY: {
    id: 'STRICT_ORTHODOXY',
    name: 'Strict Orthodoxy',
    nameVariants: {
      DHARMIC: 'Vedic Smarta Orthodoxy',
      ISLAMIC: 'Sharia & Jizya Orthodoxy',
      DEFAULT: 'Strict Orthodoxy'
    },
    description: 'The crown enforces canonical theological dogma as sovereign policy. Heretics and religious minorities are subjected to discriminatory taxes and curtailed political rights.',
    modifiers: {
      publicOrderSameReligion: 15,        // +15 in provinces matching state religion
      publicOrderDifferentReligion: -20,  // -20 in minority provinces (severe unrest)
      conversionRatePerTurn: 0.020,       // +2.0% conversion/turn (active state pressure)
      minorityTaxExtractionModifier: 0.15,// +15% tax extracted from non-state religion provinces
      foreignTradeModifier: -0.10,        // -10% trade income due to persecution of foreign merchants
      combatMoraleVsDifferentFaith: 0.10, // +10% troop morale during religious holy wars
      rebellionSeverityMultiplier: 1.5   // Rebellions in minority provinces spawn 50% larger armies
    },
    diplomaticAffinities: {
      sameReligionAndPolicy: 25,          // Greatly praised by orthodox peers
      sameReligionDifferentPolicy: 5,
      differentReligionSameTradition: -15,
      differentTradition: -30             // Severe diplomatic penalty with different faiths
    },
    policySwitchCost: 150,                // Gold cost to enact
    policySwitchUnrestTurns: 3            // Turns of temporary -10 public order during transition
  },

  STATE_PATRONAGE: {
    id: 'STATE_PATRONAGE',
    name: 'State Patronage',
    nameVariants: {
      DHARMIC: 'Rajadharma & Temple Endowments',
      ISLAMIC: 'Waqf Patronage & Dhimmi Protection',
      DEFAULT: 'State Patronage'
    },
    description: 'The ruling dynasty vigorously champions the state religion while respecting customary rights, temple/mosque charters, and tax exemptions of recognized communities.',
    modifiers: {
      publicOrderSameReligion: 8,         // +8 in majority provinces
      publicOrderDifferentReligion: 4,    // +4 in minority provinces (peaceful stability)
      conversionRatePerTurn: 0.008,       // +0.8% organic conversion per turn
      minorityTaxExtractionModifier: 0.00,// Standard tax collection
      foreignTradeModifier: 0.05,         // +5% trade income
      combatMoraleVsDifferentFaith: 0.05, // +5% morale
      rebellionSeverityMultiplier: 1.0   // Standard rebellion size
    },
    diplomaticAffinities: {
      sameReligionAndPolicy: 15,
      sameReligionDifferentPolicy: 10,
      differentReligionSameTradition: 5,
      differentTradition: 0               // Neutral relations across religious lines
    },
    policySwitchCost: 100,
    policySwitchUnrestTurns: 1
  },

  PLURALISTIC_SYNCRETISM: {
    id: 'PLURALISTIC_SYNCRETISM',
    name: 'Pluralistic Syncretism',
    nameVariants: {
      DHARMIC: 'Sarva Dharma Samabhava',
      ISLAMIC: 'Sulh-i-Kul (Universal Harmony)',
      DEFAULT: 'Pluralistic Syncretism'
    },
    description: 'Active philosophical synthesis, joint state patronage of Bhakti sants and Sufi pirs, abolition of all sectarian taxes, and equal opportunity in imperial office.',
    modifiers: {
      publicOrderSameReligion: 5,         // +5 in majority provinces
      publicOrderDifferentReligion: 15,   // +15 in minority/border provinces (eliminates friction)
      conversionRatePerTurn: 0.000,       // 0% forced conversion
      minorityTaxExtractionModifier: 0.00,
      foreignTradeModifier: 0.20,         // +20% international commerce and merchant tariff revenue
      combatMoraleVsDifferentFaith: 0.00, // No religious zealotry bonus
      rebellionSeverityMultiplier: 0.7   // -30% smaller rebellions; communities feel heard
    },
    diplomaticAffinities: {
      sameReligionAndPolicy: 20,
      sameReligionDifferentPolicy: 10,
      differentReligionSameTradition: 15,
      differentTradition: 25              // Exceptional diplomatic warmth with all foreign rulers
    },
    policySwitchCost: 250,                // Higher transition cost (clerical resistance)
    policySwitchUnrestTurns: 2            // Clerical outrage creates 2 turns of friction
  }
});

// ==========================================
// HELPER FUNCTIONS & QUERY METHODS
// ==========================================

/**
 * Retrieve a religion definition by its unique identifier.
 * @param {string} religionId 
 * @returns {object|null}
 */
export function getReligion(religionId) {
  return RELIGIONS[religionId] || null;
}

/**
 * Retrieve a religious tradition definition.
 * @param {string} traditionId 
 * @returns {object|null}
 */
export function getTradition(traditionId) {
  return RELIGIOUS_TRADITIONS[traditionId] || null;
}

/**
 * Retrieve a holy shrine definition by its unique identifier.
 * @param {string} shrineId 
 * @returns {object|null}
 */
export function getHolyShrine(shrineId) {
  return HOLY_SHRINES[shrineId] || null;
}

/**
 * Retrieve all holy shrines located within a specific province.
 * @param {string} provinceId 
 * @returns {Array<object>}
 */
export function getShrinesInProvince(provinceId) {
  return Object.values(HOLY_SHRINES).filter(s => s.provinceId === provinceId);
}

/**
 * Retrieve all holy shrines currently controlled by a faction based on its controlled provinces.
 * @param {Array<string>} controlledProvinceIds 
 * @returns {Array<object>}
 */
export function getShrinesControlledByFaction(controlledProvinceIds = []) {
  const pSet = new Set(controlledProvinceIds);
  return Object.values(HOLY_SHRINES).filter(s => pSet.has(s.provinceId));
}

/**
 * Retrieve a tolerance policy definition by its unique identifier.
 * @param {string} policyId 
 * @returns {object|null}
 */
export function getTolerancePolicy(policyId) {
  return TOLERANCE_POLICIES[policyId] || null;
}

/**
 * Calculate the net religious public order modifier for a province.
 * @param {string} provinceReligionId 
 * @param {string} stateReligionId 
 * @param {string} policyId 
 * @param {Array<string>} controlledShrineIds 
 * @returns {number}
 */
export function calculateReligiousPublicOrderModifier(
  provinceReligionId,
  stateReligionId,
  policyId = 'STATE_PATRONAGE',
  controlledShrineIds = []
) {
  const policy = getTolerancePolicy(policyId) || TOLERANCE_POLICIES.STATE_PATRONAGE;
  const isMatching = provinceReligionId === stateReligionId;

  let orderDelta = isMatching
    ? policy.modifiers.publicOrderSameReligion
    : policy.modifiers.publicOrderDifferentReligion;

  // Add bonuses from controlled holy shrines
  for (const shrineId of controlledShrineIds) {
    const shrine = getHolyShrine(shrineId);
    if (!shrine || !shrine.controllerBonus) continue;

    // Base shrine order bonus
    orderDelta += shrine.controllerBonus.publicOrderBonus || 0;

    // Syncretic shrine bonuses
    if (policyId === 'PLURALISTIC_SYNCRETISM' && shrine.controllerBonus.syncreticOrderBonus) {
      orderDelta += shrine.controllerBonus.syncreticOrderBonus;
    }
  }

  return orderDelta;
}

/**
 * Calculate the bilateral diplomatic relation modifier between two factions based on religion and policies.
 * @param {string} faction1Religion 
 * @param {string} faction1Policy 
 * @param {string} faction2Religion 
 * @param {string} faction2Policy 
 * @returns {number}
 */
export function calculateDiplomaticReligiousModifier(
  faction1Religion,
  faction1Policy = 'STATE_PATRONAGE',
  faction2Religion,
  faction2Policy = 'STATE_PATRONAGE'
) {
  const r1 = getReligion(faction1Religion);
  const r2 = getReligion(faction2Religion);
  const pol1 = getTolerancePolicy(faction1Policy) || TOLERANCE_POLICIES.STATE_PATRONAGE;

  if (!r1 || !r2) return 0;

  const isSameReligion = r1.id === r2.id;
  const isSameTradition = r1.tradition === r2.tradition;
  const isSamePolicy = faction1Policy === faction2Policy;

  if (isSameReligion) {
    return isSamePolicy
      ? pol1.diplomaticAffinities.sameReligionAndPolicy
      : pol1.diplomaticAffinities.sameReligionDifferentPolicy;
  }

  if (isSameTradition) {
    return pol1.diplomaticAffinities.differentReligionSameTradition;
  }

  return pol1.diplomaticAffinities.differentTradition;
}

/**
 * Aggregate all faction-wide benefits conferred by controlling holy pilgrimage shrines.
 * @param {Array<string>} controlledProvinceIds 
 * @returns {object}
 */
export function calculateShrineFactionBonuses(controlledProvinceIds = []) {
  const shrines = getShrinesControlledByFaction(controlledProvinceIds);
  const result = {
    totalPiety: 0,
    totalPilgrimRevenue: 0,
    publicOrderModifier: 0,
    controlledShrineNames: [],
    controlledShrineIds: []
  };

  for (const s of shrines) {
    result.controlledShrineIds.push(s.id);
    result.controlledShrineNames.push(s.name);
    result.totalPiety += s.controllerBonus.pietyBonus || 0;
    result.totalPilgrimRevenue += s.controllerBonus.pilgrimRevenue || 0;
    result.publicOrderModifier += s.controllerBonus.publicOrderBonus || 0;
  }

  return result;
}
