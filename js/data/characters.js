/**
 * Historical Figures & Characters Database for 14th-Century Indian Subcontinent Grand Strategy
 * 26 authentic historical rulers, generals, ministers, and sages with quantified attributes.
 */

export const CHARACTER_ROLES = Object.freeze({
  RULER: "RULER",
  GENERAL: "GENERAL",
  GOVERNOR: "GOVERNOR",
  MINISTER: "MINISTER",
  IDLE: "IDLE"
});

export const CHARACTERS = Object.freeze({
  CHAR_MBT: {
    id: "CHAR_MBT",
    name: "Muhammad bin Tughlaq",
    title: "Sultan of Delhi",
    factionId: "FAC_DELHI",
    age: 45,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 8,
      governance: 4,
      diplomacy: 3,
      dread: 9,
      piety: 4
    },
    traits: ["Erratic_Genius", "Iron_Fist", "Token_Currency", "Forced_Migrator"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_DELHI",
    locationProvinceId: "PROV_DELHI",
    historicalNotes: "Brilliant polymath and sovereign whose uncompromising vision and draconian punishments alienated vast regions of his empire."
  },
  CHAR_FIRUZ_TUG: {
    id: "CHAR_FIRUZ_TUG",
    name: "Firuz Shah Tughlaq",
    title: "Malik Naib / Imperial Heir",
    factionId: "FAC_DELHI",
    age: 36,
    alive: true,
    loyalty: 85,
    attributes: {
      command: 5,
      governance: 9,
      diplomacy: 7,
      dread: 2,
      piety: 8
    },
    traits: ["Canal_Builder", "Pious_Benefactor", "Reluctant_Warrior"],
    currentRole: CHARACTER_ROLES.GOVERNOR,
    assignmentTarget: "PROV_PUNJAB",
    locationProvinceId: "PROV_PUNJAB",
    historicalNotes: "Cousin to Muhammad bin Tughlaq; famed for commissioning extensive canal networks, educational madrasas, and public works."
  },
  CHAR_MALIK_MAQBUL: {
    id: "CHAR_MALIK_MAQBUL",
    name: "Khan-i-Jahan Maqbul",
    title: "Grand Wazir of Delhi",
    factionId: "FAC_DELHI",
    age: 48,
    alive: true,
    loyalty: 92,
    attributes: {
      command: 4,
      governance: 10,
      diplomacy: 8,
      dread: 5,
      piety: 6
    },
    traits: ["Financial_Mastermind", "Pragmatic_Vizier", "Administrative_Prodigy"],
    currentRole: CHARACTER_ROLES.MINISTER,
    assignmentTarget: "CABINET_WAZIR",
    locationProvinceId: "PROV_DELHI",
    historicalNotes: "Originally a Kakatiya commander from Warangal (Nagaya Ganna) who converted and became one of the greatest fiscal administrators in Delhi Sultanate history."
  },
  CHAR_IBN_BATTUTA: {
    id: "CHAR_IBN_BATTUTA",
    name: "Ibn Battuta",
    title: "Grand Qadi & Imperial Envoy",
    factionId: "FAC_DELHI",
    age: 41,
    alive: true,
    loyalty: 72,
    attributes: {
      command: 2,
      governance: 7,
      diplomacy: 10,
      dread: 1,
      piety: 8
    },
    traits: ["Globe_Trotter", "Polyglot_Jurist", "Keen_Observer"],
    currentRole: CHARACTER_ROLES.MINISTER,
    assignmentTarget: "CABINET_ENVOY",
    locationProvinceId: "PROV_DELHI",
    historicalNotes: "Moroccan scholar and globetrotter serving as Qadi of Delhi and ambassador to China for Sultan Muhammad bin Tughlaq."
  },
  CHAR_AHSAN_SHAH: {
    id: "CHAR_AHSAN_SHAH",
    name: "Jalaluddin Ahsan Khan",
    title: "Governor of Madurai (Rebel Warlord)",
    factionId: "FAC_DELHI",
    age: 50,
    alive: true,
    loyalty: 25,
    attributes: {
      command: 7,
      governance: 4,
      diplomacy: 4,
      dread: 8,
      piety: 5
    },
    traits: ["Madurai_Mutineer", "Ruthless_Taxman", "Desperate_Stand"],
    currentRole: CHARACTER_ROLES.GOVERNOR,
    assignmentTarget: "PROV_MADURAI",
    locationProvinceId: "PROV_MADURAI",
    historicalNotes: "Tughlaq governor in the Tamil south who broke away to declare the short-lived independent Sultanate of Madurai; harbors profound disloyalty."
  },
  CHAR_HARIHARA_I: {
    id: "CHAR_HARIHARA_I",
    name: "Harihara I (Hakka Raya)",
    title: "Maharajadhiraja of Vijayanagara",
    factionId: "FAC_VIJAYANAGARA",
    age: 38,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 7,
      governance: 8,
      diplomacy: 8,
      dread: 4,
      piety: 8
    },
    traits: ["Empire_Founder", "Fortress_Builder", "Dharmic_Guardian"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_VIJAYANAGARA",
    locationProvinceId: "PROV_VIJAYANAGARA",
    historicalNotes: "Eldest Sangama brother who founded the City of Victory on the south bank of the Tungabhadra river in 1336 CE."
  },
  CHAR_BUKKA_I: {
    id: "CHAR_BUKKA_I",
    name: "Bukka Raya I",
    title: "Yuvaraja & Supreme General",
    factionId: "FAC_VIJAYANAGARA",
    age: 35,
    alive: true,
    loyalty: 95,
    attributes: {
      command: 9,
      governance: 7,
      diplomacy: 6,
      dread: 6,
      piety: 7
    },
    traits: ["Vanguard_Commander", "Aggressive_Maneuverer", "Southern_Conqueror"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_VIJ_ROYAL",
    locationProvinceId: "PROV_VIJAYANAGARA",
    historicalNotes: "Dynamic warrior brother and co-architect of Vijayanagara's military supremacy across peninsular southern India."
  },
  CHAR_VIDYARANYA: {
    id: "CHAR_VIDYARANYA",
    name: "Sage Vidyaranya",
    title: "Rajaguru of Vijayanagara",
    factionId: "FAC_VIJAYANAGARA",
    age: 49,
    alive: true,
    loyalty: 98,
    attributes: {
      command: 2,
      governance: 9,
      diplomacy: 9,
      dread: 1,
      piety: 10
    },
    traits: ["Spiritual_Sage", "Cultural_Renewer", "Dharmic_Unifier"],
    currentRole: CHARACTER_ROLES.MINISTER,
    assignmentTarget: "CABINET_RAJAGURU",
    locationProvinceId: "PROV_VIJAYANAGARA",
    historicalNotes: "Pontiff of the Sringeri Sharada Peetham whose spiritual guidance and immense resources inspired the establishment of the empire."
  },
  CHAR_KAMPANA: {
    id: "CHAR_KAMPANA",
    name: "Kumara Kampana",
    title: "Prince & Southern Commander",
    factionId: "FAC_VIJAYANAGARA",
    age: 25,
    alive: true,
    loyalty: 92,
    attributes: {
      command: 9,
      governance: 6,
      diplomacy: 6,
      dread: 7,
      piety: 8
    },
    traits: ["Sultan_Bane", "Heroic_Chivalry", "Beloved_of_Warriors"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_VIJ_SOUTHERN",
    locationProvinceId: "PROV_TONDAI",
    historicalNotes: "Son of Bukka Raya I and hero of the historic epic 'Madhura Vijayam', celebrated for his liberation of southern pilgrimage shrines."
  },
  CHAR_BAHMAN_SHAH: {
    id: "CHAR_BAHMAN_SHAH",
    name: "Ala-ud-Din Bahman Shah",
    title: "Sultan of the Deccan",
    factionId: "FAC_BAHMANI",
    age: 55,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 8,
      governance: 7,
      diplomacy: 7,
      dread: 7,
      piety: 6
    },
    traits: ["Ambitious_Rebel", "Persianate_Patron", "Deccan_Liberator"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_BAHMANI",
    locationProvinceId: "PROV_GULBARGA",
    historicalNotes: "Born Hasan Gangu; rose through revolt against Muhammad bin Tughlaq to establish the Bahmani Sultanate in August 1347 CE."
  },
  CHAR_SAIFUDDIN_GHORI: {
    id: "CHAR_SAIFUDDIN_GHORI",
    name: "Saifuddin Ghori",
    title: "Wazir-us-Saltanat",
    factionId: "FAC_BAHMANI",
    age: 52,
    alive: true,
    loyalty: 94,
    attributes: {
      command: 4,
      governance: 9,
      diplomacy: 8,
      dread: 4,
      piety: 7
    },
    traits: ["Institutional_Architect", "Deccan_Sage", "Fiscal_Stabilizer"],
    currentRole: CHARACTER_ROLES.MINISTER,
    assignmentTarget: "CABINET_WAZIR",
    locationProvinceId: "PROV_GULBARGA",
    historicalNotes: "Venerated chief minister who organized the administrative, revenue, and judicial foundations of the fledgling Bahmani state."
  },
  CHAR_MUHAMMAD_SHAH_I: {
    id: "CHAR_MUHAMMAD_SHAH_I",
    name: "Muhammad Shah I",
    title: "Crown Prince & Field Marshal",
    factionId: "FAC_BAHMANI",
    age: 28,
    alive: true,
    loyalty: 88,
    attributes: {
      command: 8,
      governance: 6,
      diplomacy: 4,
      dread: 8,
      piety: 6
    },
    traits: ["Artillery_Pioneer", "Iron_Disciplinarian", "Fierce_Raider"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_BAH_STRIKE",
    locationProvinceId: "PROV_DAULATABAD",
    historicalNotes: "Heir to Bahman Shah; pioneer in deploying heavy cannons and organizing disciplined royal standing forces."
  },
  CHAR_ILYAS_SHAH: {
    id: "CHAR_ILYAS_SHAH",
    name: "Shamsuddin Ilyas Shah",
    title: "Shah-i-Bangalah",
    factionId: "FAC_BENGAL",
    age: 42,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 9,
      governance: 8,
      diplomacy: 8,
      dread: 6,
      piety: 6
    },
    traits: ["Bangalah_Unifier", "River_Master", "Bold_Strategist"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_BENGAL",
    locationProvinceId: "PROV_BENGAL_NORTH",
    historicalNotes: "Visionary founder of the Ilyas Shahi dynasty who unified all Bengal into a sovereign Sultanate and defied imperial Delhi."
  },
  CHAR_SIKANDAR_SHAH: {
    id: "CHAR_SIKANDAR_SHAH",
    name: "Sikandar Shah",
    title: "Governor & Heir of Bengal",
    factionId: "FAC_BENGAL",
    age: 22,
    alive: true,
    loyalty: 90,
    attributes: {
      command: 7,
      governance: 8,
      diplomacy: 6,
      dread: 5,
      piety: 9
    },
    traits: ["Monumental_Architect", "Adina_Builder", "Resolute_Defender"],
    currentRole: CHARACTER_ROLES.GOVERNOR,
    assignmentTarget: "PROV_BENGAL_SOUTH",
    locationProvinceId: "PROV_BENGAL_SOUTH",
    historicalNotes: "Son of Ilyas Shah; famed for constructing the colossal Adina Mosque and fortifying the Bengal delta against northern incursions."
  },
  CHAR_HAMMIR_SINGH: {
    id: "CHAR_HAMMIR_SINGH",
    name: "Maharana Hammir Singh",
    title: "Rana of Mewar",
    factionId: "FAC_MEWAR",
    age: 46,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 9,
      governance: 7,
      diplomacy: 6,
      dread: 7,
      piety: 8
    },
    traits: ["Liberator_of_Mewar", "Mountain_Guerrilla", "Sisodia_Pride"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_MEWAR",
    locationProvinceId: "PROV_RAJPUTANA",
    historicalNotes: "Warrior hero who regained Chittorgarh in 1326 CE and routed Delhi Sultanate forces at the Battle of Singoli."
  },
  CHAR_CHANDA_RATHORE: {
    id: "CHAR_CHANDA_RATHORE",
    name: "Rao Chanda Rathore",
    title: "Rathore War Captain",
    factionId: "FAC_MEWAR",
    age: 30,
    alive: true,
    loyalty: 78,
    attributes: {
      command: 8,
      governance: 5,
      diplomacy: 5,
      dread: 6,
      piety: 5
    },
    traits: ["Desert_Raider", "Swift_Horseman", "Opportunist"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_MEW_VANGUARD",
    locationProvinceId: "PROV_RAJPUTANA",
    historicalNotes: "Master of desert cavalry skirmishing who helped establish Rathore dominance across western Rajasthan."
  },
  CHAR_SUKHRANGPHA: {
    id: "CHAR_SUKHRANGPHA",
    name: "Chao Sukhrangpha",
    title: "Swargadeo of Ahom",
    factionId: "FAC_AHOM",
    age: 40,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 7,
      governance: 8,
      diplomacy: 7,
      dread: 5,
      piety: 7
    },
    traits: ["Tai_Harmonizer", "Paik_Organizer", "Jungle_Sovereign"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_AHOM",
    locationProvinceId: "PROV_AHOM",
    historicalNotes: "Early Ahom monarch who consolidated Tai rule along the upper Brahmaputra and repelled Kamata expansion."
  },
  CHAR_CHAO_PULAI: {
    id: "CHAR_CHAO_PULAI",
    name: "Chao Pulai",
    title: "Frontier General",
    factionId: "FAC_AHOM",
    age: 34,
    alive: true,
    loyalty: 82,
    attributes: {
      command: 7,
      governance: 6,
      diplomacy: 5,
      dread: 6,
      piety: 5
    },
    traits: ["Frontier_Sentinel", "Elephant_Rider", "Jungle_Ambush"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_AHOM_WARRIORS",
    locationProvinceId: "PROV_KAMRUPA",
    historicalNotes: "Veteran warrior and master of deep jungle elephant warfare defending the western reaches of the Brahmaputra."
  },
  CHAR_SHAH_MIR: {
    id: "CHAR_SHAH_MIR",
    name: "Shah Mir (Sultan Shams-ud-Din)",
    title: "Sultan of Kashmir",
    factionId: "FAC_KASHMIR",
    age: 58,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 7,
      governance: 9,
      diplomacy: 9,
      dread: 4,
      piety: 8
    },
    traits: ["Pragmatic_Unifier", "Tax_Reformer", "Peace_Weaver"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_KASHMIR",
    locationProvinceId: "PROV_KASHMIR",
    historicalNotes: "Wise statesman who pacified warring valley factions and founded Kashmir's first Sultanate in 1339 CE."
  },
  CHAR_ALAUDDIN_KASHMIR: {
    id: "CHAR_ALAUDDIN_KASHMIR",
    name: "Sultan Alauddin (Ali Sher)",
    title: "Frontier Warden & Heir",
    factionId: "FAC_KASHMIR",
    age: 32,
    alive: true,
    loyalty: 90,
    attributes: {
      command: 7,
      governance: 8,
      diplomacy: 6,
      dread: 5,
      piety: 7
    },
    traits: ["Famine_Reliever", "Granary_Overseer", "Pass_Defender"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_KASH_BORDER",
    locationProvinceId: "PROV_LADAKH",
    historicalNotes: "Son of Shah Mir who fortified the mountain passes against central Asian incursions and built public granaries."
  },
  CHAR_LALLESHWARI: {
    id: "CHAR_LALLESHWARI",
    name: "Lalleshwari (Lalla Arifa)",
    title: "Spiritual Counselor & Mystic Poet",
    factionId: "FAC_KASHMIR",
    age: 26,
    alive: true,
    loyalty: 98,
    attributes: {
      command: 1,
      governance: 7,
      diplomacy: 9,
      dread: 0,
      piety: 10
    },
    traits: ["Mystic_Saint", "Harmonizer_of_Faiths", "Voice_of_People"],
    currentRole: CHARACTER_ROLES.MINISTER,
    assignmentTarget: "CABINET_SPIRITUAL",
    locationProvinceId: "PROV_KASHMIR",
    historicalNotes: "Celebrated mystic and Shaivite yogini whose poetic verses harmonized Hindu and Sufi traditions across the valley."
  },
  CHAR_CHANGCHUB: {
    id: "CHAR_CHANGCHUB",
    name: "Tai Situ Changchub Gyaltsen",
    title: "Desi of Tibet & Warden of the Passes",
    factionId: "FAC_KASHMIR",
    age: 44,
    alive: true,
    loyalty: 85,
    attributes: {
      command: 8,
      governance: 9,
      diplomacy: 8,
      dread: 6,
      piety: 9
    },
    traits: ["Tibet_Restorer", "Legal_Codifier", "Pass_Guardian"],
    currentRole: CHARACTER_ROLES.GOVERNOR,
    assignmentTarget: "PROV_GUGE",
    locationProvinceId: "PROV_LHASA",
    historicalNotes: "Legendary Phagmodrupa ruler who rebuilt secular Tibetan sovereignty, codified law, and safeguarded trans-Himalayan trade."
  },
  CHAR_KAPAYA_NAYAKA: {
    id: "CHAR_KAPAYA_NAYAKA",
    name: "Musunuri Kapaya Nayaka",
    title: "Andhradesadhisvara",
    factionId: "FAC_MUSUNURI",
    age: 47,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 8,
      governance: 8,
      diplomacy: 7,
      dread: 5,
      piety: 8
    },
    traits: ["Defender_of_Dharma", "Fortress_Warden", "Confederacy_Hero"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_MUSUNURI",
    locationProvinceId: "PROV_WARANGAL",
    historicalNotes: "Heroic Telugu leader who liberated Warangal in 1336 CE and re-established Dharmic authority across the eastern Deccan."
  },
  CHAR_PROLAYA_VEMA: {
    id: "CHAR_PROLAYA_VEMA",
    name: "Prolaya Vema Reddi",
    title: "Lord of Addanki & Coastal Warden",
    factionId: "FAC_MUSUNURI",
    age: 42,
    alive: true,
    loyalty: 85,
    attributes: {
      command: 8,
      governance: 7,
      diplomacy: 6,
      dread: 5,
      piety: 8
    },
    traits: ["Agrahara_Patron", "Reddi_Warlord", "Unyielding_Wall"],
    currentRole: CHARACTER_ROLES.GENERAL,
    assignmentTarget: "ARMY_MUS_DEFENDER",
    locationProvinceId: "PROV_ANDHRA",
    historicalNotes: "Founder of the Reddi Kingdom and confederate ally of Kapaya Nayaka in restoring temples and resisting external conquest."
  },
  CHAR_MARTANDA: {
    id: "CHAR_MARTANDA",
    name: "Martanda Cinkaiariyan",
    title: "King of Jaffna & Arya Chakravarti",
    factionId: "FAC_JAFFNA",
    age: 39,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 8,
      governance: 7,
      diplomacy: 6,
      dread: 7,
      piety: 6
    },
    traits: ["Pearl_Lord", "Naval_Hegemon", "Strait_Warden"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_JAFFNA",
    locationProvinceId: "PROV_JAFFNA",
    historicalNotes: "Militarily formidable king of Jaffna who expanded Tamil naval control across the Palk Strait and Gulf of Mannar."
  },
  CHAR_BHUVANAIKABAHU: {
    id: "CHAR_BHUVANAIKABAHU",
    name: "Bhuvanaikabahu IV",
    title: "King of Gampola",
    factionId: "FAC_GAMPOLA",
    age: 43,
    alive: true,
    loyalty: 100,
    attributes: {
      command: 6,
      governance: 7,
      diplomacy: 6,
      dread: 4,
      piety: 9
    },
    traits: ["Highland_Guardian", "Temple_Patron", "Elephant_Lord"],
    currentRole: CHARACTER_ROLES.RULER,
    assignmentTarget: "FAC_GAMPOLA",
    locationProvinceId: "PROV_GAMPOLA",
    historicalNotes: "Highland Sinhalese monarch who established the capital at Gampola and patronized the Lankatilaka and Gadaladeniya temples."
  }
});

export const CHARACTER_LIST = Object.freeze(Object.values(CHARACTERS));
export const CHARACTERS_DATA = CHARACTER_LIST;

export function getCharacterById(id) {
  return CHARACTERS[id] || null;
}

export function getCharactersByFaction(factionId) {
  return CHARACTER_LIST.filter(c => c.factionId === factionId);
}

export function getCharactersByRole(role) {
  return CHARACTER_LIST.filter(c => c.currentRole === role);
}
