/**
 * Historical Factions Database for 14th-Century Indian Subcontinent Grand Strategy
 * Encompasses 10 historical powers contending across the subcontinent circa 1345-1347 CE.
 */

export const AI_PERSONALITIES = Object.freeze({
  ERRATIC_AUTOCRAT: "ERRATIC_AUTOCRAT",
  DEFENSIVE_TRADITIONALIST: "DEFENSIVE_TRADITIONALIST",
  EXPANSIONIST_MILITANT: "EXPANSIONIST_MILITANT",
  MERCANTILE_OPPORTUNIST: "MERCANTILE_OPPORTUNIST",
  PIOUS_CRUSADER: "PIOUS_CRUSADER",
  DIPLOMATIC_PACIFIER: "DIPLOMATIC_PACIFIER"
});

export const FACTIONS = Object.freeze({
  FAC_DELHI: {
    id: "FAC_DELHI",
    name: "Delhi Sultanate",
    shortName: "Delhi",
    capitalProvinceId: "PROV_DELHI",
    primaryColor: "#1B4D3E",
    secondaryColor: "#D4AF37",
    rulerId: "CHAR_MBT",
    treasury: 8500,
    cultureGroup: "Turko-Afghan / Indo-Persian",
    religion: "ISLAM_SUNNI",
    startingProvinces: [
      "PROV_DELHI", "PROV_PUNJAB", "PROV_MULTAN", "PROV_SINDH",
      "PROV_GHAZNI", "PROV_KANDAHAR", "PROV_KABUL", "PROV_KHYBER",
      "PROV_AWADH", "PROV_JAUNPUR", "PROV_BIHAR", "PROV_GUJARAT",
      "PROV_MALWA", "PROV_BUNDELKHAND", "PROV_MADURAI"
    ],
    traits: [
      "Imperial Bureaucracy (+15% base tax collection empire-wide)",
      "Royal Karkhana (-20% elite cavalry recruitment costs)",
      "Volatile Realm (-15 Public Order in distant provinces)"
    ],
    aiPersonality: AI_PERSONALITIES.ERRATIC_AUTOCRAT,
    historicalNotes: "Vast but turbulent empire ruled by the visionary yet mercurial Sultan Muhammad bin Tughlaq."
  },
  FAC_VIJAYANAGARA: {
    id: "FAC_VIJAYANAGARA",
    name: "Vijayanagara Empire",
    shortName: "Vijayanagara",
    capitalProvinceId: "PROV_VIJAYANAGARA",
    primaryColor: "#FF9933",
    secondaryColor: "#800000",
    rulerId: "CHAR_HARIHARA_I",
    treasury: 5200,
    cultureGroup: "Kannada-Telugu (Carnatic)",
    religion: "HINDUISM_SMARTHA",
    startingProvinces: [
      "PROV_VIJAYANAGARA", "PROV_KONKAN", "PROV_MYSORE",
      "PROV_TONDAI", "PROV_MALABAR"
    ],
    traits: [
      "Dharmic Citadel (+20% fortress defense in home provinces)",
      "Goa Maritime Trade (+10% cavalry attack from Arabian horse imports)",
      "Nayankara System (-20% garrison upkeep costs)"
    ],
    aiPersonality: AI_PERSONALITIES.DEFENSIVE_TRADITIONALIST,
    historicalNotes: "Founded in 1336 by Harihara I and Bukka Raya I with the guidance of Sage Vidyaranya; guardian of Carnatic sovereignty."
  },
  FAC_BAHMANI: {
    id: "FAC_BAHMANI",
    name: "Bahmani Sultanate",
    shortName: "Bahmani",
    capitalProvinceId: "PROV_GULBARGA",
    primaryColor: "#0047AB",
    secondaryColor: "#C0C0C0",
    rulerId: "CHAR_BAHMAN_SHAH",
    treasury: 4600,
    cultureGroup: "Dakhani / Persianate",
    religion: "ISLAM_SUNNI",
    startingProvinces: [
      "PROV_GULBARGA", "PROV_DAULATABAD", "PROV_KHANDESH"
    ],
    traits: [
      "Deccan Pioneer (+25% cavalry charge shock bonus on arid plateaus)",
      "Sufi Patronage (+10 Public Order from religious shrines)",
      "Gharbian Mercenary Corps (Recruits foreign heavy cavalry with +15% attack)"
    ],
    aiPersonality: AI_PERSONALITIES.EXPANSIONIST_MILITANT,
    historicalNotes: "First independent Muslim kingdom of the Deccan, proclaimed by Ala-ud-Din Bahman Shah at Daulatabad and Gulbarga."
  },
  FAC_BENGAL: {
    id: "FAC_BENGAL",
    name: "Bengal Sultanate",
    shortName: "Bengal",
    capitalProvinceId: "PROV_BENGAL_NORTH",
    primaryColor: "#2E8B57",
    secondaryColor: "#FFD700",
    rulerId: "CHAR_ILYAS_SHAH",
    treasury: 6200,
    cultureGroup: "Bengali-Persian",
    religion: "ISLAM_SUNNI",
    startingProvinces: [
      "PROV_BENGAL_NORTH", "PROV_BENGAL_SOUTH", "PROV_ORISSA", "PROV_ARAKAN"
    ],
    traits: [
      "Shah-i-Bangalah (River flotillas eliminate river-crossing transit penalties)",
      "Silk & Muslin Monopoly (+35% provincial commercial income from textile provinces)",
      "Paik Archery Line (+20% arrow damage for foot paiks)"
    ],
    aiPersonality: AI_PERSONALITIES.MERCANTILE_OPPORTUNIST,
    historicalNotes: "Unification of Lakhnauti, Satgaon, and Sonargaon by Shamsuddin Ilyas Shah, dominating fertile eastern trade routes."
  },
  FAC_MEWAR: {
    id: "FAC_MEWAR",
    name: "Rajput Confederacy of Mewar",
    shortName: "Mewar",
    capitalProvinceId: "PROV_RAJPUTANA",
    primaryColor: "#DC143C",
    secondaryColor: "#FFD700",
    rulerId: "CHAR_HAMMIR_SINGH",
    treasury: 3100,
    cultureGroup: "Rajasthani / Rajput",
    religion: "HINDUISM_SHAIVITE",
    startingProvinces: [
      "PROV_RAJPUTANA"
    ],
    traits: [
      "Pride of Chittor (Levies resist initial charge shock; +30% attack in hills)",
      "Kshatriya Chivalry (Troops possess high morale floor and resist panic)",
      "Hill Fort Bastion (Fortresses take 50% longer to starve in a siege)"
    ],
    aiPersonality: AI_PERSONALITIES.PIOUS_CRUSADER,
    historicalNotes: "Revived by Maharana Hammir Singh Sisodia following the reclamation of Chittorgarh in 1326 CE."
  },
  FAC_AHOM: {
    id: "FAC_AHOM",
    name: "Ahom Kingdom",
    shortName: "Ahom",
    capitalProvinceId: "PROV_AHOM",
    primaryColor: "#8B0000",
    secondaryColor: "#000000",
    rulerId: "CHAR_SUKHRANGPHA",
    treasury: 2800,
    cultureGroup: "Tai-Ahom",
    religion: "TRADITIONAL_TAI",
    startingProvinces: [
      "PROV_AHOM", "PROV_KAMRUPA", "PROV_UPPER_BURMA", "PROV_LOWER_BURMA"
    ],
    traits: [
      "Paik Corvee System (Infrastructure projects complete 25% faster)",
      "Jungle Mastery (Immune to jungle movement attrition; +30% ambush damage)",
      "Mung-Dun-Sun-Kham (War Elephants have -20% upkeep and +25% HP)"
    ],
    aiPersonality: AI_PERSONALITIES.DEFENSIVE_TRADITIONALIST,
    historicalNotes: "Tai sovereign power ruled by Chao Sukhrangpha, entrenched along the Upper Brahmaputra river valley."
  },
  FAC_KASHMIR: {
    id: "FAC_KASHMIR",
    name: "Sultanate of Kashmir",
    shortName: "Kashmir",
    capitalProvinceId: "PROV_KASHMIR",
    primaryColor: "#4682B4",
    secondaryColor: "#E0EEEE",
    rulerId: "CHAR_SHAH_MIR",
    treasury: 2900,
    cultureGroup: "Kashmiri / Persianate",
    religion: "ISLAM_SUNNI",
    startingProvinces: [
      "PROV_KASHMIR", "PROV_LADAKH", "PROV_GUGE", "PROV_LHASA"
    ],
    traits: [
      "Alpine Sovereignty (Zero army attrition across snow-bound mountain passes)",
      "Rishi Syncretism (Negates religious friction between Hindu and Muslim populations)",
      "Pashmina Guilds (+25% luxury wool commercial value)"
    ],
    aiPersonality: AI_PERSONALITIES.DIPLOMATIC_PACIFIER,
    historicalNotes: "Founded by Shah Mir (Sultan Shams-ud-Din) in 1339, harmonizing diverse Himalayan faiths and protecting mountain passes."
  },
  FAC_MUSUNURI: {
    id: "FAC_MUSUNURI",
    name: "Musunuri Nayakas of Warangal",
    shortName: "Musunuri",
    capitalProvinceId: "PROV_WARANGAL",
    primaryColor: "#DAA520",
    secondaryColor: "#8B4513",
    rulerId: "CHAR_KAPAYA_NAYAKA",
    treasury: 3800,
    cultureGroup: "Telugu / Kakatiya Heritage",
    religion: "HINDUISM_SHAIVITE",
    startingProvinces: [
      "PROV_WARANGAL", "PROV_ANDHRA"
    ],
    traits: [
      "Andhradesadhisvara (+20% combat defense when defending stone fortresses)",
      "Golkonda Diamond Mines (+50 gold flat income per turn)",
      "Kakatiya Heritage (Infantry units gain +15% defense against cavalry charges)"
    ],
    aiPersonality: AI_PERSONALITIES.DEFENSIVE_TRADITIONALIST,
    historicalNotes: "Confederacy of Telugu chieftains led by Musunuri Kapaya Nayaka that reclaimed Warangal from the Tughlaq governors."
  },
  FAC_JAFFNA: {
    id: "FAC_JAFFNA",
    name: "Kingdom of Jaffna",
    shortName: "Jaffna",
    capitalProvinceId: "PROV_JAFFNA",
    primaryColor: "#800080",
    secondaryColor: "#FFD700",
    rulerId: "CHAR_MARTANDA",
    treasury: 2400,
    cultureGroup: "Sri Lankan Tamil",
    religion: "HINDUISM_SHAIVITE",
    startingProvinces: [
      "PROV_JAFFNA"
    ],
    traits: [
      "Arya Chakravarti Fleet (Controls maritime Palk Strait ferry crossing)",
      "Mannar Pearl Fisheries (+30% maritime commercial revenue)"
    ],
    aiPersonality: AI_PERSONALITIES.MERCANTILE_OPPORTUNIST,
    historicalNotes: "Flourishing northern Sri Lankan Tamil kingdom ruled by King Martanda Cinkaiariyan of the Arya Chakravartis."
  },
  FAC_GAMPOLA: {
    id: "FAC_GAMPOLA",
    name: "Kingdom of Gampola",
    shortName: "Gampola",
    capitalProvinceId: "PROV_GAMPOLA",
    primaryColor: "#B8860B",
    secondaryColor: "#FFFFFF",
    rulerId: "CHAR_BHUVANAIKABAHU",
    treasury: 2200,
    cultureGroup: "Sinhalese",
    religion: "BUDDHISM_THERAVADA",
    startingProvinces: [
      "PROV_GAMPOLA"
    ],
    traits: [
      "Sacred Tooth Relic Sanctuary (+20 Faction-wide Public Order)",
      "Cinnamon Route (Unlocks rare spice export bonus treaties)"
    ],
    aiPersonality: AI_PERSONALITIES.DEFENSIVE_TRADITIONALIST,
    historicalNotes: "Central highland Sinhalese kingdom established by King Bhuvanaikabahu IV, safeguarding Theravada Buddhism."
  }
});

export const FACTION_LIST = Object.freeze(Object.values(FACTIONS));
export const FACTIONS_DATA = FACTION_LIST;

export function getFactionById(id) {

  return FACTIONS[id] || null;
}

export function getAllFactions() {
  return FACTION_LIST;
}
