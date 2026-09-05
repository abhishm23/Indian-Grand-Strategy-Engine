// tests/fixtures/spec_oracle.js
// Authoritative Specification Reference Implementation & Mathematical Oracle
// Derived strictly from spec_miner_survey_2/report.md, spec_miner_survey_3/report.md, and PROJECT.md

export const PROVINCES_DATA = [
  { id: 'PROV_KABUL', name: 'Kabul & Parwan', capitalCity: 'Kabul', region: 'NORTHWEST', canvasCoords: { x: 140, y: 110 }, terrainType: 'MOUNTAIN_PASS', strategicResource: 'HORSES', baseTax: 140, baseManpower: 700, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_KHYBER', 'PROV_GHAZNI'] },
  { id: 'PROV_KHYBER', name: 'Gandhara & Khyber', capitalCity: 'Peshawar', region: 'NORTHWEST', canvasCoords: { x: 220, y: 140 }, terrainType: 'MOUNTAIN_PASS', strategicResource: 'IRON', baseTax: 160, baseManpower: 900, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_KABUL', 'PROV_PUNJAB', 'PROV_KASHMIR'] },
  { id: 'PROV_GHAZNI', name: 'Zabulistan', capitalCity: 'Ghazni', region: 'NORTHWEST', canvasCoords: { x: 130, y: 190 }, terrainType: 'ARID_PLATEAU', strategicResource: 'HORSES', baseTax: 130, baseManpower: 650, defenseLevel: 1, controllingFaction: 'FAC_DELHI', connections: ['PROV_KABUL', 'PROV_KANDAHAR', 'PROV_MULTAN'] },
  { id: 'PROV_KANDAHAR', name: 'Arachosia', capitalCity: 'Kandahar', region: 'NORTHWEST', canvasCoords: { x: 100, y: 270 }, terrainType: 'DESERT_WASTELAND', strategicResource: 'IRON', baseTax: 120, baseManpower: 550, defenseLevel: 1, controllingFaction: 'FAC_DELHI', connections: ['PROV_GHAZNI', 'PROV_SINDH'] },
  { id: 'PROV_KASHMIR', name: 'Valley of Kashmir', capitalCity: 'Srinagar', region: 'NORTH_HIMALAYA', canvasCoords: { x: 280, y: 120 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'TEXTILES', baseTax: 220, baseManpower: 800, defenseLevel: 2, controllingFaction: 'FAC_KASHMIR', connections: ['PROV_KHYBER', 'PROV_PUNJAB', 'PROV_LADAKH'] },
  { id: 'PROV_LADAKH', name: 'Ladakh & Baltistan', capitalCity: 'Leh', region: 'NORTH_HIMALAYA', canvasCoords: { x: 350, y: 110 }, terrainType: 'MOUNTAIN_PASS', strategicResource: 'PRECIOUS_STONES', baseTax: 110, baseManpower: 400, defenseLevel: 1, controllingFaction: 'FAC_KASHMIR', connections: ['PROV_KASHMIR', 'PROV_GUGE', 'PROV_PUNJAB'] },
  { id: 'PROV_GUGE', name: 'Western Tibet', capitalCity: 'Tholing', region: 'NORTH_HIMALAYA', canvasCoords: { x: 430, y: 160 }, terrainType: 'ARID_PLATEAU', strategicResource: 'SALT', baseTax: 95, baseManpower: 350, defenseLevel: 1, controllingFaction: 'FAC_TIBET_PHAG', connections: ['PROV_LADAKH', 'PROV_LHASA', 'PROV_DELHI'] },
  { id: 'PROV_LHASA', name: 'Central Tibet (Ü-Tsang)', capitalCity: 'Lhasa', region: 'NORTH_HIMALAYA', canvasCoords: { x: 670, y: 180 }, terrainType: 'MOUNTAIN_PASS', strategicResource: 'PRECIOUS_STONES', baseTax: 160, baseManpower: 600, defenseLevel: 2, controllingFaction: 'FAC_TIBET_PHAG', connections: ['PROV_GUGE', 'PROV_KAMRUPA', 'PROV_AHOM'] },
  { id: 'PROV_PUNJAB', name: 'Punjab (Lahore Doab)', capitalCity: 'Lahore', region: 'PUNJAB_SINDH', canvasCoords: { x: 290, y: 210 }, terrainType: 'FLOODPLAIN', strategicResource: 'HORSES', baseTax: 320, baseManpower: 2100, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_KHYBER', 'PROV_KASHMIR', 'PROV_LADAKH', 'PROV_MULTAN', 'PROV_DELHI'] },
  { id: 'PROV_MULTAN', name: 'Multan & Derajat', capitalCity: 'Multan', region: 'PUNJAB_SINDH', canvasCoords: { x: 230, y: 290 }, terrainType: 'ARID_PLATEAU', strategicResource: 'SALT', baseTax: 240, baseManpower: 1400, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_PUNJAB', 'PROV_GHAZNI', 'PROV_SINDH', 'PROV_RAJPUTANA'] },
  { id: 'PROV_SINDH', name: 'Lower Indus Delta', capitalCity: 'Thatta', region: 'PUNJAB_SINDH', canvasCoords: { x: 180, y: 390 }, terrainType: 'RIVER_DELTA', strategicResource: 'HORSES', baseTax: 260, baseManpower: 1300, defenseLevel: 1, controllingFaction: 'FAC_DELHI', connections: ['PROV_MULTAN', 'PROV_KANDAHAR', 'PROV_GUJARAT'] },
  { id: 'PROV_DELHI', name: 'Delhi & Upper Doab', capitalCity: 'Delhi', region: 'GANGETIC_HEARTLAND', canvasCoords: { x: 380, y: 270 }, terrainType: 'FLOODPLAIN', strategicResource: 'IRON', baseTax: 480, baseManpower: 2800, defenseLevel: 3, controllingFaction: 'FAC_DELHI', connections: ['PROV_PUNJAB', 'PROV_GUGE', 'PROV_AWADH', 'PROV_RAJPUTANA', 'PROV_MALWA'] },
  { id: 'PROV_AWADH', name: 'Awadh & Kanauj', capitalCity: 'Ayodhya', region: 'GANGETIC_HEARTLAND', canvasCoords: { x: 490, y: 300 }, terrainType: 'FLOODPLAIN', strategicResource: 'TEXTILES', baseTax: 360, baseManpower: 2200, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_DELHI', 'PROV_JAUNPUR', 'PROV_BUNDELKHAND'] },
  { id: 'PROV_JAUNPUR', name: 'Jaunpur & Varanasi', capitalCity: 'Jaunpur', region: 'GANGETIC_HEARTLAND', canvasCoords: { x: 580, y: 330 }, terrainType: 'FLOODPLAIN', strategicResource: 'TEXTILES', baseTax: 340, baseManpower: 2000, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_AWADH', 'PROV_BIHAR', 'PROV_BUNDELKHAND'] },
  { id: 'PROV_BIHAR', name: 'Magadha & Mithila', capitalCity: 'Patna', region: 'GANGETIC_HEARTLAND', canvasCoords: { x: 660, y: 350 }, terrainType: 'FLOODPLAIN', strategicResource: 'IRON', baseTax: 310, baseManpower: 1900, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_JAUNPUR', 'PROV_BENGAL_NORTH', 'PROV_ORISSA'] },
  { id: 'PROV_BENGAL_NORTH', name: 'Gaur & Pandua', capitalCity: 'Pandua', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 750, y: 360 }, terrainType: 'FLOODPLAIN', strategicResource: 'TEXTILES', baseTax: 420, baseManpower: 2500, defenseLevel: 2, controllingFaction: 'FAC_BENGAL', connections: ['PROV_BIHAR', 'PROV_BENGAL_SOUTH', 'PROV_KAMRUPA'] },
  { id: 'PROV_BENGAL_SOUTH', name: 'Sonargaon & Delta', capitalCity: 'Sonargaon', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 810, y: 420 }, terrainType: 'RIVER_DELTA', strategicResource: 'TIMBER', baseTax: 450, baseManpower: 2600, defenseLevel: 2, controllingFaction: 'FAC_BENGAL', connections: ['PROV_BENGAL_NORTH', 'PROV_ARAKAN', 'PROV_ORISSA'] },
  { id: 'PROV_KAMRUPA', name: 'Lower Brahmaputra', capitalCity: 'Kamarupanagara', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 840, y: 320 }, terrainType: 'JUNGLE', strategicResource: 'WAR_ELEPHANTS', baseTax: 210, baseManpower: 1200, defenseLevel: 1, controllingFaction: 'FAC_AHOM', connections: ['PROV_BENGAL_NORTH', 'PROV_AHOM', 'PROV_LHASA'] },
  { id: 'PROV_AHOM', name: 'Upper Brahmaputra', capitalCity: 'Charaideo', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 950, y: 290 }, terrainType: 'JUNGLE', strategicResource: 'WAR_ELEPHANTS', baseTax: 250, baseManpower: 1400, defenseLevel: 2, controllingFaction: 'FAC_AHOM', connections: ['PROV_KAMRUPA', 'PROV_LHASA', 'PROV_UPPER_BURMA'] },
  { id: 'PROV_ARAKAN', name: 'Arakan Coast', capitalCity: 'Mrauk-U', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 890, y: 470 }, terrainType: 'COASTAL_PORT', strategicResource: 'TIMBER', baseTax: 230, baseManpower: 1100, defenseLevel: 1, controllingFaction: 'FAC_ARAKAN', connections: ['PROV_BENGAL_SOUTH', 'PROV_UPPER_BURMA', 'PROV_LOWER_BURMA'] },
  { id: 'PROV_UPPER_BURMA', name: 'Irrawaddy Valley', capitalCity: 'Ava', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 990, y: 420 }, terrainType: 'RIVER_DELTA', strategicResource: 'PRECIOUS_STONES', baseTax: 280, baseManpower: 1600, defenseLevel: 2, controllingFaction: 'FAC_AVA', connections: ['PROV_AHOM', 'PROV_ARAKAN', 'PROV_LOWER_BURMA'] },
  { id: 'PROV_LOWER_BURMA', name: 'Mon Coast & Pegu', capitalCity: 'Pegu', region: 'BENGAL_ASSAM_BURMA', canvasCoords: { x: 1030, y: 530 }, terrainType: 'COASTAL_PORT', strategicResource: 'SPICES', baseTax: 270, baseManpower: 1500, defenseLevel: 1, controllingFaction: 'FAC_AVA', connections: ['PROV_ARAKAN', 'PROV_UPPER_BURMA'] },
  { id: 'PROV_RAJPUTANA', name: 'Mewar & Aravallis', capitalCity: 'Chittorgarh', region: 'WEST_CENTRAL_INDIA', canvasCoords: { x: 320, y: 370 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'PRECIOUS_STONES', baseTax: 260, baseManpower: 1500, defenseLevel: 3, controllingFaction: 'FAC_MEWAR', connections: ['PROV_DELHI', 'PROV_MULTAN', 'PROV_GUJARAT', 'PROV_MALWA'] },
  { id: 'PROV_GUJARAT', name: 'Anartapura & Cambay', capitalCity: 'Patan', region: 'WEST_CENTRAL_INDIA', canvasCoords: { x: 260, y: 470 }, terrainType: 'COASTAL_PORT', strategicResource: 'HORSES', baseTax: 440, baseManpower: 2200, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_SINDH', 'PROV_RAJPUTANA', 'PROV_MALWA', 'PROV_KHANDESH'] },
  { id: 'PROV_MALWA', name: 'Malwa Plateau', capitalCity: 'Ujjain', region: 'WEST_CENTRAL_INDIA', canvasCoords: { x: 390, y: 420 }, terrainType: 'ARID_PLATEAU', strategicResource: 'IRON', baseTax: 330, baseManpower: 1800, defenseLevel: 2, controllingFaction: 'FAC_DELHI', connections: ['PROV_DELHI', 'PROV_RAJPUTANA', 'PROV_GUJARAT', 'PROV_BUNDELKHAND', 'PROV_KHANDESH'] },
  { id: 'PROV_BUNDELKHAND', name: 'Kalinjar & Mahoba', capitalCity: 'Kalinjar', region: 'WEST_CENTRAL_INDIA', canvasCoords: { x: 480, y: 390 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'IRON', baseTax: 220, baseManpower: 1200, defenseLevel: 3, controllingFaction: 'FAC_DELHI', connections: ['PROV_AWADH', 'PROV_JAUNPUR', 'PROV_MALWA', 'PROV_DAULATABAD'] },
  { id: 'PROV_KHANDESH', name: 'Tapti Basin', capitalCity: 'Burhanpur', region: 'DECCAN', canvasCoords: { x: 370, y: 500 }, terrainType: 'MOUNTAIN_PASS', strategicResource: 'TEXTILES', baseTax: 250, baseManpower: 1300, defenseLevel: 1, controllingFaction: 'FAC_BAHMANI', connections: ['PROV_GUJARAT', 'PROV_MALWA', 'PROV_DAULATABAD'] },
  { id: 'PROV_DAULATABAD', name: 'Devagiri', capitalCity: 'Daulatabad', region: 'DECCAN', canvasCoords: { x: 400, y: 560 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'IRON', baseTax: 380, baseManpower: 2100, defenseLevel: 3, controllingFaction: 'FAC_BAHMANI', connections: ['PROV_KHANDESH', 'PROV_BUNDELKHAND', 'PROV_GULBARGA', 'PROV_WARANGAL'] },
  { id: 'PROV_GULBARGA', name: 'Gulbarga (Ahsanabad)', capitalCity: 'Gulbarga', region: 'DECCAN', canvasCoords: { x: 420, y: 640 }, terrainType: 'ARID_PLATEAU', strategicResource: 'HORSES', baseTax: 390, baseManpower: 2200, defenseLevel: 2, controllingFaction: 'FAC_BAHMANI', connections: ['PROV_DAULATABAD', 'PROV_WARANGAL', 'PROV_KONKAN', 'PROV_VIJAYANAGARA'] },
  { id: 'PROV_WARANGAL', name: 'Telangana Plateau', capitalCity: 'Warangal', region: 'DECCAN', canvasCoords: { x: 520, y: 580 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'PRECIOUS_STONES', baseTax: 350, baseManpower: 1900, defenseLevel: 2, controllingFaction: 'FAC_MUSUNURI', connections: ['PROV_DAULATABAD', 'PROV_GULBARGA', 'PROV_ANDHRA', 'PROV_ORISSA'] },
  { id: 'PROV_ORISSA', name: 'Kalinga & Utkala', capitalCity: 'Cuttack', region: 'DECCAN', canvasCoords: { x: 680, y: 480 }, terrainType: 'COASTAL_PORT', strategicResource: 'WAR_ELEPHANTS', baseTax: 330, baseManpower: 1900, defenseLevel: 2, controllingFaction: 'FAC_ORISSA_GAJ', connections: ['PROV_BIHAR', 'PROV_BENGAL_SOUTH', 'PROV_WARANGAL', 'PROV_ANDHRA'] },
  { id: 'PROV_KONKAN', name: 'Konkan Coast & Goa', capitalCity: 'Goa', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 330, y: 680 }, terrainType: 'COASTAL_PORT', strategicResource: 'HORSES', baseTax: 340, baseManpower: 1400, defenseLevel: 2, controllingFaction: 'FAC_VIJAYANAGARA', connections: ['PROV_GULBARGA', 'PROV_VIJAYANAGARA', 'PROV_MALABAR'] },
  { id: 'PROV_VIJAYANAGARA', name: 'Tungabhadra Basin', capitalCity: 'Vijayanagara', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 420, y: 720 }, terrainType: 'ARID_PLATEAU', strategicResource: 'IRON', baseTax: 460, baseManpower: 2700, defenseLevel: 3, controllingFaction: 'FAC_VIJAYANAGARA', connections: ['PROV_GULBARGA', 'PROV_KONKAN', 'PROV_MYSORE', 'PROV_TONDAI'] },
  { id: 'PROV_ANDHRA', name: 'Krishna-Godavari Delta', capitalCity: 'Rajahmundry', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 570, y: 650 }, terrainType: 'RIVER_DELTA', strategicResource: 'TEXTILES', baseTax: 320, baseManpower: 1800, defenseLevel: 2, controllingFaction: 'FAC_MUSUNURI', connections: ['PROV_WARANGAL', 'PROV_ORISSA', 'PROV_TONDAI'] },
  { id: 'PROV_MYSORE', name: 'Southern Carnatic', capitalCity: 'Srirangapatna', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 390, y: 790 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'SPICES', baseTax: 300, baseManpower: 1600, defenseLevel: 2, controllingFaction: 'FAC_VIJAYANAGARA', connections: ['PROV_VIJAYANAGARA', 'PROV_MALABAR', 'PROV_TONDAI', 'PROV_MADURAI'] },
  { id: 'PROV_TONDAI', name: 'Tondaimandalam', capitalCity: 'Kanchipuram', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 490, y: 760 }, terrainType: 'COASTAL_PORT', strategicResource: 'TEXTILES', baseTax: 370, baseManpower: 2100, defenseLevel: 2, controllingFaction: 'FAC_VIJAYANAGARA', connections: ['PROV_VIJAYANAGARA', 'PROV_ANDHRA', 'PROV_MYSORE', 'PROV_MADURAI'] },
  { id: 'PROV_MALABAR', name: 'Kerala Coast', capitalCity: 'Kozhikode', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 360, y: 840 }, terrainType: 'COASTAL_PORT', strategicResource: 'SPICES', baseTax: 380, baseManpower: 1700, defenseLevel: 1, controllingFaction: 'FAC_SAMUTHIRI', connections: ['PROV_KONKAN', 'PROV_MYSORE', 'PROV_MADURAI'] },
  { id: 'PROV_MADURAI', name: 'Pandya Coast & Delta', capitalCity: 'Madurai', region: 'PENINSULAR_SOUTH', canvasCoords: { x: 450, y: 840 }, terrainType: 'FLOODPLAIN', strategicResource: 'SPICES', baseTax: 310, baseManpower: 1700, defenseLevel: 2, controllingFaction: 'FAC_MADURAI', connections: ['PROV_MYSORE', 'PROV_TONDAI', 'PROV_MALABAR', 'PROV_JAFFNA'] },
  { id: 'PROV_JAFFNA', name: 'Jaffna Peninsula', capitalCity: 'Nallur', region: 'SRI_LANKA', canvasCoords: { x: 500, y: 870 }, terrainType: 'COASTAL_PORT', strategicResource: 'PRECIOUS_STONES', baseTax: 240, baseManpower: 1100, defenseLevel: 1, controllingFaction: 'FAC_JAFFNA', connections: ['PROV_MADURAI', 'PROV_GAMPOLA'] },
  { id: 'PROV_GAMPOLA', name: 'Central Highlands', capitalCity: 'Gampola', region: 'SRI_LANKA', canvasCoords: { x: 520, y: 895 }, terrainType: 'HIGHLAND_HILLS', strategicResource: 'SPICES', baseTax: 260, baseManpower: 1300, defenseLevel: 2, controllingFaction: 'FAC_GAMPOLA', connections: ['PROV_JAFFNA'] }
];

export const FACTIONS_DATA = [
  { id: 'FAC_DELHI', name: 'Delhi Sultanate', shortName: 'Delhi', capitalProvinceId: 'PROV_DELHI', primaryColor: '#1a472a', secondaryColor: '#d4af37', rulerId: 'CHAR_MBT', treasury: 8500, cultureGroup: 'Turko-Afghan', religion: 'ISLAM_SUNNI', startingProvinces: ['PROV_DELHI', 'PROV_PUNJAB', 'PROV_MULTAN', 'PROV_AWADH', 'PROV_JAUNPUR', 'PROV_BIHAR', 'PROV_GUJARAT', 'PROV_MALWA', 'PROV_BUNDELKHAND', 'PROV_KABUL', 'PROV_KHYBER'], traits: ['Imperial_Bureaucracy', 'Royal_Karkhana', 'Volatile_Realm'], aiPersonality: 'ERRATIC_AUTOCRAT' },
  { id: 'FAC_VIJAYANAGARA', name: 'Vijayanagara Empire', shortName: 'Vijayanagara', capitalProvinceId: 'PROV_VIJAYANAGARA', primaryColor: '#b85d19', secondaryColor: '#ffd700', rulerId: 'CHAR_HARIHARA_I', treasury: 5200, cultureGroup: 'Carnatic', religion: 'HINDUISM_SMARTHA', startingProvinces: ['PROV_VIJAYANAGARA', 'PROV_KONKAN', 'PROV_MYSORE', 'PROV_TONDAI'], traits: ['Dharmic_Citadel', 'Arabian_Horse_Trade', 'Nayankara_System'], aiPersonality: 'DEFENSIVE_TRADITIONALIST' },
  { id: 'FAC_BAHMANI', name: 'Bahmani Sultanate', shortName: 'Bahmani', capitalProvinceId: 'PROV_GULBARGA', primaryColor: '#204060', secondaryColor: '#c0c0c0', rulerId: 'CHAR_BAHMAN_SHAH', treasury: 4600, cultureGroup: 'Dakhani', religion: 'ISLAM_SUNNI', startingProvinces: ['PROV_GULBARGA', 'PROV_DAULATABAD', 'PROV_KHANDESH'], traits: ['Deccan_Pioneer', 'Sufi_Patronage', 'Foreign_Mercenary_Corps'], aiPersonality: 'EXPANSIONIST_MILITANT' },
  { id: 'FAC_BENGAL', name: 'Bengal Sultanate', shortName: 'Bengal', capitalProvinceId: 'PROV_BENGAL_NORTH', primaryColor: '#2b580c', secondaryColor: '#f4f4f4', rulerId: 'CHAR_ILYAS_SHAH', treasury: 6200, cultureGroup: 'Bengali-Persian', religion: 'ISLAM_SUNNI', startingProvinces: ['PROV_BENGAL_NORTH', 'PROV_BENGAL_SOUTH'], traits: ['Shah_i_Bangalah', 'Silk_Muslin_Monopoly', 'Paik_Archery_Line'], aiPersonality: 'MERCANTILE_OPPORTUNIST' },
  { id: 'FAC_MEWAR', name: 'Rajput Confederacy of Mewar', shortName: 'Mewar', capitalProvinceId: 'PROV_RAJPUTANA', primaryColor: '#8b0000', secondaryColor: '#ffbf00', rulerId: 'CHAR_HAMMIR_SINGH', treasury: 3100, cultureGroup: 'Rajasthani', religion: 'HINDUISM_SHAIVITE', startingProvinces: ['PROV_RAJPUTANA'], traits: ['Pride_of_Chittor', 'Rajput_Chivalry', 'Hill_Fort_Bastion'], aiPersonality: 'PIOUS_CRUSADER' },
  { id: 'FAC_AHOM', name: 'Ahom Kingdom', shortName: 'Ahom', capitalProvinceId: 'PROV_AHOM', primaryColor: '#005f73', secondaryColor: '#94d2bd', rulerId: 'CHAR_SUKHRANGPHA', treasury: 2800, cultureGroup: 'Tai-Ahom', religion: 'TRADITIONAL_TAI', startingProvinces: ['PROV_AHOM', 'PROV_KAMRUPA'], traits: ['Paik_Labor_Corvee', 'Jungle_Warfare', 'Mung_Dun_Sun_Kham'], aiPersonality: 'DEFENSIVE_TRADITIONALIST' },
  { id: 'FAC_KASHMIR', name: 'Sultanate of Kashmir', shortName: 'Kashmir', capitalProvinceId: 'PROV_KASHMIR', primaryColor: '#3d5a80', secondaryColor: '#e0fbfc', rulerId: 'CHAR_ALAUDDIN_KASHMIR', treasury: 2900, cultureGroup: 'Kashmiri', religion: 'ISLAM_SUNNI', startingProvinces: ['PROV_KASHMIR', 'PROV_LADAKH'], traits: ['Alpine_Sovereignty', 'Rishi_Harmony', 'Pashmina_Guilds'], aiPersonality: 'DIPLOMATIC_PACIFIER' },
  { id: 'FAC_MUSUNURI', name: 'Musunuri Nayakas of Warangal', shortName: 'Musunuri', capitalProvinceId: 'PROV_WARANGAL', primaryColor: '#9d0208', secondaryColor: '#faa307', rulerId: 'CHAR_KAPAYA_NAYAKA', treasury: 3800, cultureGroup: 'Telugu', religion: 'HINDUISM_SHAIVITE', startingProvinces: ['PROV_WARANGAL', 'PROV_ANDHRA'], traits: ['Andhradesadhisvara', 'Golkonda_Mines', 'Kakatiya_Heritage'], aiPersonality: 'DEFENSIVE_TRADITIONALIST' },
  { id: 'FAC_JAFFNA', name: 'Kingdom of Jaffna', shortName: 'Jaffna', capitalProvinceId: 'PROV_JAFFNA', primaryColor: '#6a0572', secondaryColor: '#ab83a1', rulerId: 'CHAR_MARTANDA', treasury: 2400, cultureGroup: 'Tamil', religion: 'HINDUISM_SHAIVITE', startingProvinces: ['PROV_JAFFNA'], traits: ['Arya_Chakravarti_Fleet', 'Pearl_Fishery_Tax'], aiPersonality: 'MERCANTILE_OPPORTUNIST' },
  { id: 'FAC_GAMPOLA', name: 'Kingdom of Gampola', shortName: 'Gampola', capitalProvinceId: 'PROV_GAMPOLA', primaryColor: '#d48806', secondaryColor: '#fff1b8', rulerId: 'CHAR_BHUVANAIKABAHU', treasury: 2200, cultureGroup: 'Sinhalese', religion: 'BUDDHISM_THERAVADA', startingProvinces: ['PROV_GAMPOLA'], traits: ['Highland_Relic_Sanctuary', 'Cinnamon_Route'], aiPersonality: 'DEFENSIVE_TRADITIONALIST' }
];

export const CHARACTERS_DATA = [
  { id: 'CHAR_MBT', name: 'Muhammad bin Tughlaq', title: 'Sultan of Delhi', factionId: 'FAC_DELHI', age: 45, alive: true, loyalty: 100, attributes: { command: 8, governance: 4, diplomacy: 3, dread: 9, piety: 4 }, traits: ['Erratic_Genius', 'Iron_Fist', 'Token_Currency'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_DELHI' },
  { id: 'CHAR_FIRUZ_TUG', name: 'Firuz Shah Tughlaq', title: 'Heir & Governor of Punjab', factionId: 'FAC_DELHI', age: 36, alive: true, loyalty: 85, attributes: { command: 5, governance: 9, diplomacy: 7, dread: 2, piety: 8 }, traits: ['Canal_Builder', 'Pious_Benefactor', 'Reluctant_Warrior'], currentRole: 'GOVERNOR', assignmentTarget: 'PROV_PUNJAB', locationProvinceId: 'PROV_PUNJAB' },
  { id: 'CHAR_MALIK_MAQBUL', name: 'Khan-i-Jahan Maqbul', title: 'Grand Wazir', factionId: 'FAC_DELHI', age: 48, alive: true, loyalty: 92, attributes: { command: 4, governance: 10, diplomacy: 8, dread: 5, piety: 6 }, traits: ['Financial_Mastermind', 'Pragmatic_Vizier'], currentRole: 'MINISTER', assignmentTarget: 'CABINET_FINANCE', locationProvinceId: 'PROV_DELHI' },
  { id: 'CHAR_IBN_BATTUTA', name: 'Ibn Battuta', title: 'Chief Qadi & Imperial Envoy', factionId: 'FAC_DELHI', age: 41, alive: true, loyalty: 72, attributes: { command: 2, governance: 7, diplomacy: 10, dread: 1, piety: 8 }, traits: ['Globe_Trotter', 'Polyglot_Jurist'], currentRole: 'MINISTER', assignmentTarget: 'CABINET_DIPLOMACY', locationProvinceId: 'PROV_DELHI' },
  { id: 'CHAR_HARIHARA_I', name: 'Harihara I (Hakka)', title: 'Maharajadhiraja of Vijayanagara', factionId: 'FAC_VIJAYANAGARA', age: 42, alive: true, loyalty: 100, attributes: { command: 7, governance: 8, diplomacy: 8, dread: 4, piety: 8 }, traits: ['Empire_Founder', 'Fortress_Builder'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_VIJAYANAGARA' },
  { id: 'CHAR_BUKKA_I', name: 'Bukka Raya I', title: 'Yuvaraja & Commander of the Carnatic', factionId: 'FAC_VIJAYANAGARA', age: 39, alive: true, loyalty: 95, attributes: { command: 9, governance: 7, diplomacy: 6, dread: 6, piety: 7 }, traits: ['Vanguard_Commander', 'Aggressive_Maneuverer'], currentRole: 'GENERAL', assignmentTarget: 'ARMY_VIJ_VANGUARD', locationProvinceId: 'PROV_VIJAYANAGARA' },
  { id: 'CHAR_VIDYARANYA', name: 'Sage Vidyaranya', title: 'Rajaguru of Vijayanagara', factionId: 'FAC_VIJAYANAGARA', age: 50, alive: true, loyalty: 98, attributes: { command: 2, governance: 9, diplomacy: 9, dread: 1, piety: 10 }, traits: ['Spiritual_Sage', 'Cultural_Renewer'], currentRole: 'MINISTER', assignmentTarget: 'CABINET_CIVIC', locationProvinceId: 'PROV_VIJAYANAGARA' },
  { id: 'CHAR_KAMPANA', name: 'Kumara Kampana', title: 'Governor of Tondaimandalam', factionId: 'FAC_VIJAYANAGARA', age: 24, alive: true, loyalty: 92, attributes: { command: 9, governance: 6, diplomacy: 6, dread: 7, piety: 8 }, traits: ['Sultan_Bane', 'Heroic_Chivalry'], currentRole: 'GOVERNOR', assignmentTarget: 'PROV_TONDAI', locationProvinceId: 'PROV_TONDAI' },
  { id: 'CHAR_BAHMAN_SHAH', name: 'Ala-ud-Din Bahman Shah (Hasan Gangu)', title: 'Sultan of the Deccan', factionId: 'FAC_BAHMANI', age: 54, alive: true, loyalty: 100, attributes: { command: 8, governance: 7, diplomacy: 7, dread: 7, piety: 6 }, traits: ['Ambitious_Rebel', 'Persianate_Patron'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_GULBARGA' },
  { id: 'CHAR_SAIFUDDIN_GHORI', name: 'Saifuddin Ghori', title: 'Wazir-i-Azam', factionId: 'FAC_BAHMANI', age: 52, alive: true, loyalty: 94, attributes: { command: 4, governance: 9, diplomacy: 8, dread: 4, piety: 7 }, traits: ['Institutional_Architect', 'Fiscal_Stabilizer'], currentRole: 'MINISTER', assignmentTarget: 'CABINET_FINANCE', locationProvinceId: 'PROV_GULBARGA' },
  { id: 'CHAR_MUHAMMAD_SHAH_I', name: 'Muhammad Shah I', title: 'Crown Prince of Bahmani', factionId: 'FAC_BAHMANI', age: 28, alive: true, loyalty: 88, attributes: { command: 8, governance: 6, diplomacy: 4, dread: 8, piety: 6 }, traits: ['Artillery_Pioneer', 'Iron_Disciplinarian'], currentRole: 'GENERAL', assignmentTarget: 'ARMY_BAHMANI_ROYAL', locationProvinceId: 'PROV_GULBARGA' },
  { id: 'CHAR_ILYAS_SHAH', name: 'Shamsuddin Ilyas Shah', title: 'Shah-i-Bangalah', factionId: 'FAC_BENGAL', age: 44, alive: true, loyalty: 100, attributes: { command: 9, governance: 8, diplomacy: 8, dread: 6, piety: 6 }, traits: ['Bangalah_Unifier', 'River_Master'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_BENGAL_NORTH' },
  { id: 'CHAR_SIKANDAR_SHAH', name: 'Sikandar Shah', title: 'Governor of Sonargaon', factionId: 'FAC_BENGAL', age: 26, alive: true, loyalty: 90, attributes: { command: 7, governance: 8, diplomacy: 6, dread: 5, piety: 9 }, traits: ['Monumental_Architect', 'Adina_Builder'], currentRole: 'GOVERNOR', assignmentTarget: 'PROV_BENGAL_SOUTH', locationProvinceId: 'PROV_BENGAL_SOUTH' },
  { id: 'CHAR_HAMMIR_SINGH', name: 'Maharana Hammir Singh', title: 'Maharana of Mewar', factionId: 'FAC_MEWAR', age: 43, alive: true, loyalty: 100, attributes: { command: 9, governance: 7, diplomacy: 6, dread: 7, piety: 8 }, traits: ['Liberator_of_Mewar', 'Mountain_Guerrilla'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_RAJPUTANA' },
  { id: 'CHAR_CHANDA_RATHORE', name: 'Rao Chanda Rathore', title: 'Vanguard of Marwar', factionId: 'FAC_MEWAR', age: 31, alive: true, loyalty: 78, attributes: { command: 8, governance: 5, diplomacy: 5, dread: 6, piety: 5 }, traits: ['Desert_Raider', 'Swift_Horseman'], currentRole: 'GENERAL', assignmentTarget: 'ARMY_MEWAR_CAV', locationProvinceId: 'PROV_RAJPUTANA' },
  { id: 'CHAR_SUKHRANGPHA', name: 'Chao Sukhrangpha', title: 'Swargadeo of Ahom', factionId: 'FAC_AHOM', age: 38, alive: true, loyalty: 100, attributes: { command: 7, governance: 8, diplomacy: 7, dread: 5, piety: 7 }, traits: ['Tai_Harmonizer', 'Paik_Organizer'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_AHOM' },
  { id: 'CHAR_CHAO_PULAI', name: 'Chao Pulai', title: 'Frontier General of Kamrupa', factionId: 'FAC_AHOM', age: 34, alive: true, loyalty: 82, attributes: { command: 7, governance: 6, diplomacy: 5, dread: 6, piety: 5 }, traits: ['Frontier_Sentinel', 'Elephant_Rider'], currentRole: 'GENERAL', assignmentTarget: 'ARMY_AHOM_JUNGLE', locationProvinceId: 'PROV_KAMRUPA' },
  { id: 'CHAR_KAPAYA_NAYAKA', name: 'Musunuri Kapaya Nayaka', title: 'Andhradesadhisvara', factionId: 'FAC_MUSUNURI', age: 46, alive: true, loyalty: 100, attributes: { command: 8, governance: 8, diplomacy: 7, dread: 5, piety: 8 }, traits: ['Defender_of_Dharma', 'Fortress_Warden'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_WARANGAL' },
  { id: 'CHAR_PROLAYA_VEMA', name: 'Prolaya Vema Reddi', title: 'Ruler of Kondavidu & Ally', factionId: 'FAC_MUSUNURI', age: 40, alive: true, loyalty: 85, attributes: { command: 8, governance: 7, diplomacy: 6, dread: 5, piety: 8 }, traits: ['Agrahara_Patron', 'Unyielding_Wall'], currentRole: 'GENERAL', assignmentTarget: 'ARMY_REDDI_HOST', locationProvinceId: 'PROV_ANDHRA' },
  { id: 'CHAR_SHAH_MIR', name: 'Shah Mir (Shams-ud-Din)', title: 'Founder of Shah Mir Dynasty', factionId: 'FAC_KASHMIR', age: 55, alive: true, loyalty: 100, attributes: { command: 7, governance: 9, diplomacy: 9, dread: 4, piety: 8 }, traits: ['Pragmatic_Unifier', 'Tax_Reformer'], currentRole: 'MINISTER', assignmentTarget: 'CABINET_RULER_COUNCIL', locationProvinceId: 'PROV_KASHMIR' },
  { id: 'CHAR_ALAUDDIN_KASHMIR', name: 'Sultan Alauddin (Ali Sher)', title: 'Sultan of Kashmir', factionId: 'FAC_KASHMIR', age: 33, alive: true, loyalty: 100, attributes: { command: 7, governance: 8, diplomacy: 6, dread: 5, piety: 7 }, traits: ['Famine_Reliever', 'Pass_Defender'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_KASHMIR' },
  { id: 'CHAR_LALLESHWARI', name: 'Lalleshwari (Lalla Arifa)', title: 'Mystic Poetess & Spiritual Guide', factionId: 'FAC_KASHMIR', age: 25, alive: true, loyalty: 98, attributes: { command: 1, governance: 7, diplomacy: 9, dread: 0, piety: 10 }, traits: ['Mystic_Saint', 'Harmonizer_of_Faiths'], currentRole: 'MINISTER', assignmentTarget: 'CABINET_RELIGION', locationProvinceId: 'PROV_KASHMIR' },
  { id: 'CHAR_MARTANDA', name: 'Martanda Cinkaiariyan', title: 'Arya Chakravarti King', factionId: 'FAC_JAFFNA', age: 42, alive: true, loyalty: 100, attributes: { command: 8, governance: 7, diplomacy: 6, dread: 7, piety: 6 }, traits: ['Pearl_Lord', 'Naval_Hegemon'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_JAFFNA' },
  { id: 'CHAR_BHUVANAIKABAHU', name: 'Bhuvanaikabahu IV', title: 'King of Gampola', factionId: 'FAC_GAMPOLA', age: 37, alive: true, loyalty: 100, attributes: { command: 6, governance: 7, diplomacy: 6, dread: 4, piety: 9 }, traits: ['Highland_Guardian', 'Temple_Patron'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_GAMPOLA' },
  { id: 'CHAR_CHANGCHUB', name: 'Tai Situ Changchub Gyaltsen', title: 'Desi of Tibet', factionId: 'FAC_TIBET_PHAG', age: 43, alive: true, loyalty: 100, attributes: { command: 8, governance: 9, diplomacy: 8, dread: 6, piety: 9 }, traits: ['Tibet_Restorer', 'Legal_Codifier'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_LHASA' },
  { id: 'CHAR_AHSAN_SHAH', name: 'Jalaluddin Ahsan Khan', title: 'Sultan of Madurai', factionId: 'FAC_MADURAI', age: 46, alive: true, loyalty: 55, attributes: { command: 7, governance: 4, diplomacy: 4, dread: 8, piety: 5 }, traits: ['Madurai_Mutineer', 'Ruthless_Taxman'], currentRole: 'RULER', assignmentTarget: null, locationProvinceId: 'PROV_MADURAI' }
];

export const REGIONAL_UNITS = {
  WAR_ELEPHANTS: { id: 'WAR_ELEPHANTS', name: 'Armored War Elephants', unitClass: 'SHOCK_MONSTER', maxHp: 350, meleeAtk: 48, meleeDef: 28, range: 1, moveSpeed: 3, recruitmentCost: 400, upkeep: 45, specialAbility: 'TRAMPLE_TERROR', terrorMoraleDrain: 30 },
  HORSE_ARCHERS: { id: 'HORSE_ARCHERS', name: 'Turkic Horse Archers', unitClass: 'SKIRMISH_CAVALRY', maxHp: 90, meleeAtk: 26, meleeDef: 12, range: 4, moveSpeed: 5, recruitmentCost: 240, upkeep: 25, specialAbility: 'PARTHIAN_VOLLEY', skirmishRetreat: true },
  RAJPUT_LEVIES: { id: 'RAJPUT_LEVIES', name: 'Rajput Levies & Knights', unitClass: 'FEROCIOUS_INFANTRY', maxHp: 130, meleeAtk: 36, meleeDef: 22, range: 1, moveSpeed: 3, recruitmentCost: 180, upkeep: 18, specialAbility: 'JAUHAR_VOW', hillCombatBonus: 0.35, minMoraleFloor: 25 },
  PAIKS: { id: 'PAIKS', name: 'Bengali/Assamese Paiks', unitClass: 'WETLAND_INFANTRY', maxHp: 105, meleeAtk: 30, meleeDef: 14, range: 3, moveSpeed: 4, recruitmentCost: 140, upkeep: 14, specialAbility: 'MARSH_IMMUNITY', poisonArrows: true },
  HEAVY_GHULAM_CAVALRY: { id: 'HEAVY_GHULAM_CAVALRY', name: 'Heavy Ghulam Cavalry', unitClass: 'SHOCK_CAVALRY', maxHp: 160, meleeAtk: 42, meleeDef: 26, range: 1, moveSpeed: 4, recruitmentCost: 320, upkeep: 35, specialAbility: 'LANCE_CHARGE', chargeMultiplier: 2.2 },
  SIEGE_MANJANIQ: { id: 'SIEGE_MANJANIQ', name: 'Counterweight Manjaniq', unitClass: 'ARTILLERY_ENGINE', maxHp: 70, meleeAtk: 65, meleeDef: 6, range: 6, minRange: 2, moveSpeed: 1, recruitmentCost: 350, upkeep: 40, specialAbility: 'WALL_BREACH', aoeRadius: 1 }
};

export const COUNTER_MATRIX = {
  getMultiplier(attackerClass, defenderClass, isCharging = false) {
    if (attackerClass === 'SPEARMAN' && (defenderClass === 'SHOCK_CAVALRY' || defenderClass === 'SHOCK_MONSTER')) {
      return 2.5;
    }
    if (attackerClass === 'SHOCK_CAVALRY' && (defenderClass === 'ARCHER' || defenderClass === 'SWORDSMAN') && isCharging) {
      return 2.2;
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
    return 1.0;
  }
};

export const BUILDINGS_DATA = {
  FORTIFICATIONS: [
    { tier: 1, name: 'Mud Rampart & Palisade', cost: 100, turns: 2, defenseBonus: 20, garrisonSlots: 1 },
    { tier: 2, name: 'Stone Curtain Walls', cost: 250, turns: 4, defenseBonus: 50, garrisonSlots: 2 },
    { tier: 3, name: 'Hill Citadel / Qila', cost: 500, turns: 6, defenseBonus: 100, garrisonSlots: 3 }
  ],
  BARRACKS: [
    { tier: 1, name: 'Muster Ground', cost: 100, turns: 2, unlocks: ['PAIKS', 'RAJPUT_LEVIES'] },
    { tier: 2, name: 'Armory & Training Grounds', cost: 250, turns: 4, unlocks: ['HORSE_ARCHERS'] },
    { tier: 3, name: 'Imperial Stables & Elephant Stupa', cost: 500, turns: 6, unlocks: ['HEAVY_GHULAM_CAVALRY', 'WAR_ELEPHANTS'] }
  ],
  AGRICULTURE: [
    { tier: 1, name: 'Canal Ditches & Wells', cost: 100, turns: 2, growthBonus: 0.05, goldIncome: 15 },
    { tier: 2, name: 'Grand Anicut / Water Tank', cost: 250, turns: 4, growthBonus: 0.12, goldIncome: 35 },
    { tier: 3, name: 'River Canal Network', cost: 500, turns: 6, growthBonus: 0.20, goldIncome: 70, publicOrderBonus: 5 }
  ],
  COMMERCE: [
    { tier: 1, name: 'Local Bazaar', cost: 100, turns: 2, goldIncome: 25 },
    { tier: 2, name: 'Caravanserai & River Port', cost: 250, turns: 4, goldIncome: 60, tradeMultiplier: 0.10 },
    { tier: 3, name: 'Grand Mint & Guildhall', cost: 500, turns: 6, goldIncome: 120, corruptionReduction: 0.15 }
  ],
  RELIGION: [
    { tier: 1, name: 'Shrine / Village Mosque', cost: 100, turns: 2, publicOrderBonus: 5, conversionRate: 0.005 },
    { tier: 2, name: 'Mandir / Jami Masjid', cost: 250, turns: 4, publicOrderBonus: 12, conversionRate: 0.015, pietyBonus: 10 },
    { tier: 3, name: 'Grand Monumental Temple / Dargah', cost: 500, turns: 6, publicOrderBonus: 20, conversionRate: 0.030 }
  ]
};

export const TECH_TREE_DATA = {
  MILITARY: [
    { tier: 1, id: 'TECH_MIL_1', name: 'Combined Arms Drills', cost: 100, buff: { infantryMelee: 0.10 } },
    { tier: 2, id: 'TECH_MIL_2', name: 'Elephant Howdah Armor', cost: 220, buff: { elephantHp: 0.25 }, prereq: 'TECH_MIL_1' },
    { tier: 3, id: 'TECH_MIL_3', name: 'Supply Train Depots', cost: 360, buff: { supplyRadiusBonus: 1, terrainAttritionReduction: 0.50 }, prereq: 'TECH_MIL_2' },
    { tier: 4, id: 'TECH_MIL_4', name: 'Imperial Command Staff', cost: 550, buff: { movementPointsBonus: 0.15, generalCommandBonus: 1 }, prereq: 'TECH_MIL_3' }
  ],
  SIEGE_METALLURGY: [
    { tier: 1, id: 'TECH_SIEGE_1', name: 'Wootz Crucible Steel', cost: 100, buff: { eliteDamage: 0.15 } },
    { tier: 2, id: 'TECH_SIEGE_2', name: 'Sapping & Countervallation', cost: 220, buff: { siegeSpeed: 0.30 }, prereq: 'TECH_SIEGE_1' },
    { tier: 3, id: 'TECH_SIEGE_3', name: 'Counterweight Manjaniqs', cost: 360, buff: { unlocksManjaniq: true }, prereq: 'TECH_SIEGE_2' },
    { tier: 4, id: 'TECH_SIEGE_4', name: 'Architectural Bastions', cost: 550, buff: { fortDefenseBonus: 50 }, prereq: 'TECH_SIEGE_3' }
  ],
  ADMIN_AGRONOMY: [
    { tier: 1, id: 'TECH_ADM_1', name: 'Zabt Revenue Cadastre', cost: 100, buff: { taxIncomeBonus: 0.15 } },
    { tier: 2, id: 'TECH_ADM_2', name: 'State Granary Network', cost: 220, buff: { famineImmunity: true }, prereq: 'TECH_ADM_1' },
    { tier: 3, id: 'TECH_ADM_3', name: 'Barid Postal Runners', cost: 360, buff: { distantPublicOrder: 10 }, prereq: 'TECH_ADM_2' },
    { tier: 4, id: 'TECH_ADM_4', name: 'Codified Imperial Edicts', cost: 550, buff: { corruptionReduction: 0.25, maxPublicOrderCap: 115 }, prereq: 'TECH_ADM_3' }
  ]
};

// Character Stat Mathematical Formulas
export function calculateGeneralAttackMultiplier(command) {
  return 1.0 + (command * 0.035);
}

export function calculateGeneralDefenseMultiplier(command, dread) {
  return 1.0 + (command * 0.02) + (dread * 0.01);
}

export function calculateGeneralAuraRadius(command) {
  return Math.max(2, Math.floor(command / 2) + 1);
}

export function calculateArmyBaseMorale(command, piety) {
  return Math.min(150, 100 + (command * 2.5) + (piety * 1.5));
}

export function calculateClashMoraleShock(dread) {
  return 5 + (dread * 1.5);
}

export function calculateCampaignMovementPoints(command) {
  return 10 + Math.floor((command - 5) * 1.5);
}

export function calculateGovernorCorruption(governance, piety) {
  return Math.max(0, (10 - governance) * 0.02 - (piety * 0.01));
}

export function calculateGovernorTaxYield(baseTax, governance, dread, piety) {
  const corruption = calculateGovernorCorruption(governance, piety);
  const multiplier = 1.0 + (governance * 0.05) + (dread * 0.02) - corruption;
  return Math.round(baseTax * multiplier);
}

export function calculateConstructionTurns(baseTurns, governance, hasMasterArchitect = false) {
  let turns = Math.max(1, Math.ceil(baseTurns / (1.0 + governance * 0.08)));
  if (hasMasterArchitect) {
    turns = Math.max(1, turns - 1);
  }
  return turns;
}

export function calculatePublicOrderDelta(governance, dread, piety, taxRate = 'NORMAL', religiousMatch = true, warExhaustion = 0) {
  const taxPenalties = { LOW: -5, NORMAL: 0, HIGH: 10, EXTORTIONATE: 25 };
  const taxPenalty = taxPenalties[taxRate] !== undefined ? taxPenalties[taxRate] : 0;
  const religiousFriction = religiousMatch ? 0 : (piety >= 9 ? 0 : 15);

  const gain = (governance * 0.6) + (dread * 0.8) + (piety * 0.7);
  const delta = gain - taxPenalty - religiousFriction - warExhaustion;
  return Math.round(delta * 10) / 10;
}

export function calculateMinisterTechPoints(baseTechPoints, piety, governance) {
  return Math.round(baseTechPoints * (1.0 + (piety * 0.03) + (governance * 0.04)));
}

export function calculateDiplomaticOfferScore(baseAttitude, diplomacy, powerRatioModifier, religiousAffinityBonus, tributeSweetener = 0, threatLevel = 0) {
  const dipScore = diplomacy * 4.5;
  const sweetenerBonus = tributeSweetener * 0.05;
  return Math.round(baseAttitude + dipScore + powerRatioModifier + religiousAffinityBonus + sweetenerBonus - threatLevel);
}

export function calculateLoyaltyDrift(rulerPiety, charPiety, rulerDread, isAmbitious, rolePrestige = 0, isBankrupt = false) {
  let drift = (rulerPiety * 0.2) + (charPiety * 0.3);
  if (isAmbitious) {
    drift -= (rulerDread * 0.25);
  }
  drift += rolePrestige;
  if (isBankrupt) {
    drift -= 10;
  }
  return Math.round(drift * 10) / 10;
}

export function calculateRebellionProbability(loyalty) {
  if (loyalty >= 25) return 0;
  return (25 - loyalty) * 0.02; // e.g. loyalty 20 -> 5 * 2% = 10%
}

// Combat Math Formulas
export function calculateAutoResolvePower(army, general = null, fortTier = 0, terrainBonus = 0) {
  let rawPower = 0;
  for (const reg of army.regiments) {
    const hpRatio = reg.hp / reg.maxHp;
    const moraleFactor = 0.5 + 0.5 * (reg.morale / 100);
    const counterBonus = reg.counterBonus || 0;
    const baseP = reg.basePower || (reg.meleeAtk * 2 + reg.meleeDef);
    rawPower += baseP * hpRatio * moraleFactor * (1 + counterBonus);
  }

  let genMod = 1.0;
  if (general) {
    genMod += (general.attributes.command * 0.04) + (general.attributes.dread * 0.02);
  }

  const defFactor = 1.0 + terrainBonus + (0.15 * fortTier);
  return rawPower * genMod * defFactor;
}

export function calculateAutoResolveOdds(attackerPower, defenderPower) {
  if (attackerPower <= 0 && defenderPower <= 0) {
    return { attackerWinChance: 50, defenderWinChance: 50 };
  }
  const ratio = attackerPower / (attackerPower + defenderPower);
  let odds = Math.round(ratio * 100);
  // Clamped strictly between 5% and 95%
  odds = Math.max(5, Math.min(95, odds));
  return {
    attackerWinChance: odds,
    defenderWinChance: 100 - odds,
    attackerRatio: ratio
  };
}

export function calculateDirectionalAttack(angleDegrees) {
  // [0, 45] -> FRONT, (45, 135] -> FLANK, (135, 180] -> REAR
  const absAngle = Math.abs(angleDegrees);
  if (absAngle <= 45) {
    return { direction: 'FRONT', damageMultiplier: 1.0, moraleShock: 0, armorReduction: 0, counterAllowed: true };
  } else if (absAngle <= 135) {
    return { direction: 'FLANK', damageMultiplier: 1.4, moraleShock: -20, armorReduction: 0.50, counterAllowed: true };
  } else {
    return { direction: 'REAR', damageMultiplier: 2.0, moraleShock: -40, armorReduction: 1.0, counterAllowed: false };
  }
}

export function calculateElevationCombatModifier(attackerElevation, defenderElevation) {
  const delta = attackerElevation - defenderElevation;
  if (delta > 0) {
    return { damageMultiplier: 1.0 + (0.25 * delta), rangeBonus: delta };
  } else if (delta < 0) {
    return { damageMultiplier: Math.max(0.25, 1.0 + (0.25 * delta)), rangeBonus: delta };
  }
  return { damageMultiplier: 1.0, rangeBonus: 0 };
}

export function calculateTerrainCoverModifier(terrainType, isMissile) {
  if (terrainType === 'JUNGLE' || terrainType === 'FOREST') {
    return {
      damageReduction: isMissile ? 0.50 : 0.0,
      chargeAllowed: false,
      grantsStealth: true
    };
  }
  if (terrainType === 'MOUNTAIN_PASS') {
    return {
      damageReduction: 0.25,
      chargeAllowed: false,
      chokepoint: true
    };
  }
  return {
    damageReduction: 0.0,
    chargeAllowed: true,
    grantsStealth: false
  };
}

// Minimal In-Memory GameState Oracle for Testing Serialization & Engine Loops
export class GameStateOracle {
  constructor() {
    this.currentTurn = 1;
    this.year = 1345;
    this.playerFactionId = 'FAC_VIJAYANAGARA';
    this.provinces = {};
    this.factions = {};
    this.characters = {};
    this.armies = {};
    this.diplomacy = {};
    this.techProgress = {};
    this.activeRebellions = [];

    this.initDefault();
  }

  initDefault() {
    PROVINCES_DATA.forEach(p => {
      this.provinces[p.id] = {
        ...p,
        publicOrder: 75,
        governorId: null,
        activeBuildings: [],
        underConstruction: null,
        siegeStatus: false
      };
    });

    FACTIONS_DATA.forEach(f => {
      this.factions[f.id] = {
        ...f,
        treasury: f.treasury,
        heldProvinces: [...f.startingProvinces],
        tolerancePolicy: 'STATE_PATRONAGE'
      };
    });

    CHARACTERS_DATA.forEach(c => {
      this.characters[c.id] = {
        ...c,
        attributes: { ...c.attributes },
        traits: [...c.traits]
      };
    });

    this.armies['ARMY_VIJ_1'] = {
      id: 'ARMY_VIJ_1',
      factionId: 'FAC_VIJAYANAGARA',
      name: 'Carnatic Host',
      generalId: 'CHAR_BUKKA_I',
      provinceId: 'PROV_VIJAYANAGARA',
      movementPoints: 100,
      supplyState: 'SUPPLIED',
      regiments: [
        { type: 'WAR_ELEPHANTS', hp: 350, maxHp: 350, morale: 100, meleeAtk: 48, meleeDef: 28 },
        { type: 'RAJPUT_LEVIES', hp: 130, maxHp: 130, morale: 100, meleeAtk: 36, meleeDef: 22 }
      ]
    };
  }

  serialize() {
    return JSON.stringify({
      currentTurn: this.currentTurn,
      year: this.year,
      playerFactionId: this.playerFactionId,
      provinces: this.provinces,
      factions: this.factions,
      characters: this.characters,
      armies: this.armies,
      diplomacy: this.diplomacy,
      techProgress: this.techProgress,
      activeRebellions: this.activeRebellions
    });
  }

  deserialize(jsonStr) {
    const data = JSON.parse(jsonStr);
    this.currentTurn = data.currentTurn;
    this.year = data.year;
    this.playerFactionId = data.playerFactionId;
    this.provinces = data.provinces;
    this.factions = data.factions;
    this.characters = data.characters;
    this.armies = data.armies;
    this.diplomacy = data.diplomacy;
    this.techProgress = data.techProgress;
    this.activeRebellions = data.activeRebellions || [];
    return this;
  }

  processTurn() {
    this.currentTurn += 1;
    if (this.currentTurn % 4 === 0) {
      this.year += 1;
    }

    // Process Province Economics, Public Order, & Construction
    for (const [pId, prov] of Object.entries(this.provinces)) {
      const faction = this.factions[prov.controllingFaction];
      if (!faction) continue;

      // Building construction tick
      if (prov.underConstruction) {
        prov.underConstruction.remainingTurns -= 1;
        if (prov.underConstruction.remainingTurns <= 0) {
          prov.activeBuildings.push(prov.underConstruction.buildingType);
          prov.underConstruction = null;
        }
      }

      // Public order adjustment
      let deltaOrder = 2; // base equilibrium
      const taxRate = prov.taxRate || 'NORMAL';
      const religiousMatch = prov.religiousMatch !== undefined ? prov.religiousMatch : true;
      if (prov.governorId && this.characters[prov.governorId]) {
        const gov = this.characters[prov.governorId];
        deltaOrder = calculatePublicOrderDelta(gov.attributes.governance, gov.attributes.dread, gov.attributes.piety, taxRate, religiousMatch, prov.warExhaustion || 0);
      } else {
        const taxPenalties = { LOW: 5, NORMAL: 0, HIGH: -10, EXTORTIONATE: -25 };
        deltaOrder += (taxPenalties[taxRate] || 0);
        if (!religiousMatch) deltaOrder -= 15;
      }

      if (prov.publicOrder === 0 || prov.publicOrder + deltaOrder <= 0) {
        prov.publicOrder = 0;
      } else {
        prov.publicOrder = Math.min(100, prov.publicOrder + deltaOrder);
      }

      // Rebellion Trigger at 0 Public Order
      if (prov.publicOrder === 0 && !prov.siegeStatus) {
        prov.siegeStatus = true;
        const rebelArmyId = `REBEL_${prov.id}_${this.currentTurn}`;
        const rebelArmy = {
          id: rebelArmyId,
          factionId: 'FAC_REBEL',
          name: `Rebels of ${prov.name}`,
          provinceId: prov.id,
          generalId: null,
          regiments: [
            { type: 'RAJPUT_LEVIES', hp: 130, maxHp: 130, morale: 80, meleeAtk: 30, meleeDef: 18 },
            { type: 'PAIKS', hp: 105, maxHp: 105, morale: 80, meleeAtk: 28, meleeDef: 12 }
          ]
        };
        this.armies[rebelArmyId] = rebelArmy;
        this.activeRebellions.push({ provinceId: prov.id, rebelArmyId, turnsActive: 1 });
      }

      // Tax generation (0 if under siege by rebels)
      if (!prov.siegeStatus) {
        let tax = prov.baseTax;
        if (prov.governorId && this.characters[prov.governorId]) {
          const gov = this.characters[prov.governorId];
          tax = calculateGovernorTaxYield(prov.baseTax, gov.attributes.governance, gov.attributes.dread, gov.attributes.piety);
        }
        faction.treasury += tax;
      }
    }

    // Technology Progress
    for (const [fId, tech] of Object.entries(this.techProgress)) {
      if (tech.activeTechId && tech.remainingCost > 0) {
        tech.remainingCost -= (tech.pointsPerTurn || 50);
        if (tech.remainingCost <= 0) {
          tech.unlockedTechs = tech.unlockedTechs || [];
          tech.unlockedTechs.push(tech.activeTechId);
          tech.activeTechId = null;
        }
      }
    }
  }
}
