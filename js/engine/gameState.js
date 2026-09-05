/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/engine/gameState.js
 * 
 * Central State Container, Query Engine, Character Stat Application,
 * and Deterministic Serialization Engine.
 */

import { PROVINCES } from '../data/provinces.js';
import { FACTIONS } from '../data/factions.js';
import { CHARACTERS } from '../data/characters.js';
import { UNIT_TYPES } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { TECH_TREE } from '../data/techTree.js';
import { RELIGIONS, HOLY_SHRINES, TOLERANCE_POLICIES } from '../data/religions.js';

/**
 * Transparent in-memory Storage polyfill for headless Node.js testing.
 */
export class MemoryStorageAdapter {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] || null;
  }
}

/**
 * Dual-environment storage resolution (browser localStorage or Node.js memory fallback).
 */
export function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  if (!globalThis.__ironTacticsMemoryStorage) {
    globalThis.__ironTacticsMemoryStorage = new MemoryStorageAdapter();
  }
  return globalThis.__ironTacticsMemoryStorage;
}

/**
 * Deep-clone helper avoiding shared memory references.
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep recursive key-sorting for deterministic JSON serialization.
 */
export function sortKeysDeterministic(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortKeysDeterministic(obj[key]);
  }
  return sorted;
}

/**
 * Central authoritative GameState container.
 */
export class GameState {
  constructor(initialData = null) {
    this.version = '1.0.0';
    this.currentTurn = 1;
    this.year = 1345;
    this.playerFactionId = 'FAC_VIJAYANAGARA';

    // Core Entity Collections (Keyed by String ID)
    this.provinces = {};
    this.factions = {};
    this.characters = {};
    this.armies = {};

    // Grand Strategy Subsystem Containers
    this.diplomacy = {
      treaties: [],
      relations: {}
    };
    this.technologies = {};
    this.techProgress = {};
    this.activeRebellions = [];

    if (initialData) {
      this.importSaveObject(initialData);
    }
  }

  // ==========================================
  // Lifecycle & Initialization
  // ==========================================

  initNewGame(playerFactionId = 'FAC_VIJAYANAGARA', customData = null) {
    const rawProvinces = (customData && customData.provinces) || PROVINCES;
    const rawFactions = (customData && customData.factions) || FACTIONS;
    const rawCharacters = (customData && customData.characters) || CHARACTERS;

    this.currentTurn = 1;
    this.year = 1345;

    // 1. Initialize Provinces
    this.provinces = {};
    for (const [id, p] of Object.entries(rawProvinces)) {
      this.provinces[id] = {
        id: p.id,
        name: p.name,
        capitalCity: p.capitalCity || p.capital || p.name,
        region: p.region,
        canvasCoords: { x: p.canvasCoords.x, y: p.canvasCoords.y },
        terrainType: p.terrainType,
        strategicResource: p.strategicResource,
        baseTax: p.baseTax,
        baseManpower: p.baseManpower,
        publicOrder: p.publicOrder !== undefined ? p.publicOrder : 80,
        defenseLevel: p.defenseLevel !== undefined ? p.defenseLevel : 1,
        controllingFaction: p.controllingFaction,
        governorId: p.governorId || null,
        connections: [...(p.connections || [])],
        navalConnections: [...(p.navalConnections || [])],
        buildings: [...(p.buildings || [])],
        activeBuildings: [...(p.buildings || p.activeBuildings || [])]
      };
    }

    // 2. Initialize Factions
    this.factions = {};
    for (const [id, f] of Object.entries(rawFactions)) {
      this.factions[id] = {
        id: f.id,
        name: f.name,
        shortName: f.shortName || f.name,
        capitalProvinceId: f.capitalProvinceId,
        primaryColor: f.primaryColor,
        secondaryColor: f.secondaryColor,
        rulerId: f.rulerId,
        treasury: f.treasury || 3000,
        cultureGroup: f.cultureGroup || 'Regional',
        religion: f.religion || 'HINDUISM_SMARTHA',
        tolerancePolicy: f.tolerancePolicy || 'STATE_PATRONAGE',
        startingProvinces: [...(f.startingProvinces || [])],
        traits: [...(f.traits || [])],
        aiPersonality: f.aiPersonality || 'DEFENSIVE_TRADITIONALIST',
        isAlive: true
      };
    }

    // 3. Initialize Characters
    this.characters = {};
    for (const [id, c] of Object.entries(rawCharacters)) {
      this.characters[id] = {
        id: c.id,
        name: c.name,
        title: c.title || 'Noble',
        factionId: c.factionId,
        age: c.age || 35,
        alive: c.alive !== undefined ? c.alive : true,
        loyalty: c.loyalty !== undefined ? c.loyalty : 80,
        attributes: {
          command: c.attributes?.command ?? 5,
          governance: c.attributes?.governance ?? 5,
          diplomacy: c.attributes?.diplomacy ?? 5,
          dread: c.attributes?.dread ?? 2,
          piety: c.attributes?.piety ?? 5
        },

        traits: [...(c.traits || [])],
        currentRole: c.currentRole || 'IDLE',
        assignmentTarget: c.assignmentTarget || null,
        locationProvinceId: c.locationProvinceId || c.assignmentTarget || 'PROV_DELHI',
        historicalNotes: c.historicalNotes || ''
      };
    }

    // Resolve player faction ID
    this.playerFactionId = this._normalizeFactionId(playerFactionId) || 'FAC_VIJAYANAGARA';

    // 4. Initialize Starting Armies
    this.armies = {};
    if (customData && customData.armies) {
      this.armies = deepClone(customData.armies);
    } else {
      this._spawnStartingArmies();
    }

    // 5. Initialize Diplomacy
    this.diplomacy = (customData && customData.diplomacy) ? deepClone(customData.diplomacy) : {
      treaties: [],
      relations: {}
    };
    if (Object.keys(this.diplomacy.relations).length === 0) {
      this._initializeDiplomaticRelations();
    }

    // 6. Initialize Technologies
    this.technologies = (customData && customData.technologies) ? deepClone(customData.technologies) : {};
    this.techProgress = (customData && customData.techProgress) ? deepClone(customData.techProgress) : {};
    for (const facId of Object.keys(this.factions)) {
      if (!this.technologies[facId]) {
        this.technologies[facId] = {
          unlocked: [],
          currentResearch: null,
          accumulatedPoints: {}
        };
      }
      if (!this.techProgress[facId]) {
        this.techProgress[facId] = {
          activeTechId: null,
          remainingCost: 0,
          unlockedTechs: []
        };
      }
    }

    this.activeRebellions = (customData && customData.activeRebellions) ? deepClone(customData.activeRebellions) : [];

    return this;
  }

  _spawnStartingArmies() {
    // Vijayanagara Royal Vanguard
    this.createArmy('FAC_VIJAYANAGARA', 'PROV_VIJAYANAGARA', [
      { id: 'REG_VIJ_1', unitTypeId: 'HEAVY_CAVALRY', type: 'HEAVY_CAVALRY', name: 'Carnatic Royal Guard Cavalry', hp: 160, maxHp: 160, morale: 100, maxMorale: 100, meleeAtk: 42, meleeDef: 26 },
      { id: 'REG_VIJ_2', unitTypeId: 'WAR_ELEPHANTS', type: 'WAR_ELEPHANTS', name: 'Tungabhadra War Elephants', hp: 350, maxHp: 350, morale: 100, maxMorale: 100, meleeAtk: 48, meleeDef: 28 },
      { id: 'REG_VIJ_3', unitTypeId: 'RAJPUT_LEVIES', type: 'RAJPUT_LEVIES', name: 'Hampi Spear Phalanx', hp: 130, maxHp: 130, morale: 100, maxMorale: 100, meleeAtk: 36, meleeDef: 22 }
    ], 'CHAR_BUKKA_I', 'Vanguard of the Tungabhadra');

    // Delhi Sultanate Imperial Host
    this.createArmy('FAC_DELHI', 'PROV_DELHI', [
      { id: 'REG_DEL_1', unitTypeId: 'HEAVY_CAVALRY', type: 'HEAVY_CAVALRY', name: 'Imperial Ghulam Lancers', hp: 160, maxHp: 160, morale: 100, maxMorale: 100, meleeAtk: 42, meleeDef: 26 },
      { id: 'REG_DEL_2', unitTypeId: 'HORSE_ARCHERS', type: 'HORSE_ARCHERS', name: 'Turkic Imperial Horse Archers', hp: 90, maxHp: 90, morale: 80, maxMorale: 80, meleeAtk: 26, meleeDef: 12 },
      { id: 'REG_DEL_3', unitTypeId: 'WAR_ELEPHANTS', type: 'WAR_ELEPHANTS', name: 'Sultanate Gaja Battery', hp: 350, maxHp: 350, morale: 100, maxMorale: 100, meleeAtk: 48, meleeDef: 28 },
      { id: 'REG_DEL_4', unitTypeId: 'SIEGE_ENGINES', type: 'SIEGE_ENGINES', name: 'Manjaniq Siege Train', hp: 70, maxHp: 70, morale: 60, maxMorale: 60, meleeAtk: 65, meleeDef: 6 }
    ], 'CHAR_MBT', 'Imperial Army of Delhi');

    // Bahmani Deccan Strike Army
    this.createArmy('FAC_BAHMANI', 'PROV_GULBARGA', [
      { id: 'REG_BAH_1', unitTypeId: 'HEAVY_CAVALRY', type: 'HEAVY_CAVALRY', name: 'Deccan Royal Lancers', hp: 160, maxHp: 160, morale: 100, maxMorale: 100, meleeAtk: 42, meleeDef: 26 },
      { id: 'REG_BAH_2', unitTypeId: 'HORSE_ARCHERS', type: 'HORSE_ARCHERS', name: 'Foreign Mercenary Horse Archers', hp: 90, maxHp: 90, morale: 80, maxMorale: 80, meleeAtk: 26, meleeDef: 12 }
    ], 'CHAR_MUHAMMAD_SHAH_I', 'Deccan Strike Force');

    // Bengal Flotilla & Paik Host
    this.createArmy('FAC_BENGAL', 'PROV_BENGAL_NORTH', [
      { id: 'REG_BEN_1', unitTypeId: 'PAIKS', type: 'PAIKS', name: 'Lakhnauti Paik Archers', hp: 105, maxHp: 105, morale: 75, maxMorale: 75, meleeAtk: 30, meleeDef: 14 },
      { id: 'REG_BEN_2', unitTypeId: 'PAIKS', type: 'PAIKS', name: 'Pandua River Foot Guard', hp: 105, maxHp: 105, morale: 75, maxMorale: 75, meleeAtk: 30, meleeDef: 14 },
      { id: 'REG_BEN_3', unitTypeId: 'WAR_ELEPHANTS', type: 'WAR_ELEPHANTS', name: 'Gaur War Elephants', hp: 350, maxHp: 350, morale: 100, maxMorale: 100, meleeAtk: 48, meleeDef: 28 }
    ], null, 'Army of Bangalah');

    // Mewar Sisodia Guard
    this.createArmy('FAC_MEWAR', 'PROV_RAJPUTANA', [
      { id: 'REG_MEW_1', unitTypeId: 'RAJPUT_LEVIES', type: 'RAJPUT_LEVIES', name: 'Sisodia Rajput Spear Guard', hp: 130, maxHp: 130, morale: 110, maxMorale: 110, meleeAtk: 36, meleeDef: 22 },
      { id: 'REG_MEW_2', unitTypeId: 'HEAVY_CAVALRY', type: 'HEAVY_CAVALRY', name: 'Marwar Desert Knights', hp: 160, maxHp: 160, morale: 100, maxMorale: 100, meleeAtk: 42, meleeDef: 26 }
    ], 'CHAR_CHANDA_RATHORE', 'Mewar Vanguard');
  }

  _initializeDiplomaticRelations() {
    const factionsList = Object.keys(this.factions);
    for (const f1 of factionsList) {
      this.diplomacy.relations[f1] = {};
      for (const f2 of factionsList) {
        if (f1 === f2) {
          this.diplomacy.relations[f1][f2] = 100;
        } else {
          // Historical hostility between Bahmani and Vijayanagara
          if ((f1 === 'FAC_BAHMANI' && f2 === 'FAC_VIJAYANAGARA') || (f1 === 'FAC_VIJAYANAGARA' && f2 === 'FAC_BAHMANI')) {
            this.diplomacy.relations[f1][f2] = -50;
          } else if ((f1 === 'FAC_DELHI' && f2 === 'FAC_BAHMANI') || (f1 === 'FAC_BAHMANI' && f2 === 'FAC_DELHI')) {
            this.diplomacy.relations[f1][f2] = -75; // Rebel province
          } else if ((f1 === 'FAC_DELHI' && f2 === 'FAC_BENGAL') || (f1 === 'FAC_BENGAL' && f2 === 'FAC_DELHI')) {
            this.diplomacy.relations[f1][f2] = -40;
          } else {
            this.diplomacy.relations[f1][f2] = 0; // Neutral
          }
        }
      }
    }
  }

  // ==========================================
  // Entity Normalization & Lookups
  // ==========================================

  _normalizeProvinceId(id) {
    if (!id || typeof id !== 'string') return id;
    if (this.provinces[id]) return id;
    const upper = id.toUpperCase();
    if (this.provinces[upper]) return upper;
    if (this.provinces['PROV_' + upper]) return 'PROV_' + upper;
    return id;
  }

  _normalizeFactionId(id) {
    if (!id || typeof id !== 'string') return id;
    if (this.factions[id]) return id;
    const upper = id.toUpperCase();
    if (this.factions[upper]) return upper;
    if (this.factions['FAC_' + upper]) return 'FAC_' + upper;
    return id;
  }

  _normalizeCharacterId(id) {
    if (!id || typeof id !== 'string') return id;
    if (this.characters[id]) return id;
    const upper = id.toUpperCase();
    if (this.characters[upper]) return upper;
    if (this.characters['CHAR_' + upper]) return 'CHAR_' + upper;
    return id;
  }

  getProvince(provinceId) {
    const id = this._normalizeProvinceId(provinceId);
    return this.provinces[id] || null;
  }

  getFaction(factionId) {
    const id = this._normalizeFactionId(factionId);
    if (this.factions[id]) return this.factions[id];
    if (id === 'FAC_REBEL' || id === 'FAC_REBELS') {
      return {
        id: 'FAC_REBEL',
        name: 'Armed Partisans & Rebel Host',
        shortName: 'Rebels',
        primaryColor: '#555555',
        secondaryColor: '#8B0000',
        treasury: 0,
        cultureGroup: 'Local Insurgents',
        religion: 'LOCAL_CUSTOMS',
        traits: ['Popular Uprising'],
        aiPersonality: 'EXPANSIONIST_MILITANT'
      };
    }
    return null;
  }

  getCharacter(characterId) {
    const id = this._normalizeCharacterId(characterId);
    return this.characters[id] || null;
  }

  getArmy(armyId) {
    return this.armies[armyId] || null;
  }

  getArmiesInProvince(provinceId) {
    const id = this._normalizeProvinceId(provinceId);
    return Object.values(this.armies).filter(a => a.provinceId === id);
  }

  getFactionArmies(factionId) {
    const id = this._normalizeFactionId(factionId);
    return Object.values(this.armies).filter(a => a.factionId === id);
  }

  getFactionProvinces(factionId) {
    const id = this._normalizeFactionId(factionId);
    return Object.values(this.provinces).filter(p => p.controllingFaction === id);
  }

  getFactionCharacters(factionId) {
    const id = this._normalizeFactionId(factionId);
    return Object.values(this.characters).filter(c => c.factionId === id);
  }

  // ==========================================
  // Imperial Treasuries
  // ==========================================

  get imperialTreasuries() {
    const map = {};
    for (const [id, f] of Object.entries(this.factions)) {
      map[id] = f.treasury || 0;
    }
    return map;
  }

  getTreasury(factionId) {
    const f = this.getFaction(factionId);
    return f ? f.treasury : 0;
  }

  setTreasury(factionId, amount) {
    const f = this.getFaction(factionId);
    if (!f) return false;
    f.treasury = Math.max(0, Math.floor(amount));
    return true;
  }

  modifyTreasury(factionId, delta) {
    const f = this.getFaction(factionId);
    if (!f) return 0;
    f.treasury = Math.max(0, f.treasury + Math.floor(delta));
    return f.treasury;
  }

  // ==========================================
  // State Mutation Helpers
  // ==========================================

  createArmy(factionId, provinceId, regiments = [], generalId = null, name = null) {
    const f = this.getFaction(factionId);
    const p = this.getProvince(provinceId);
    if (!f) throw new Error(`Faction not found: ${factionId}`);
    if (!p) throw new Error(`Province not found: ${provinceId}`);

    const armyCount = Object.keys(this.armies).length + 1;
    const armyId = `ARMY_${f.id}_${armyCount}_${Date.now()}`;
    const armyName = name || `${f.name} Host ${armyCount}`;

    const army = {
      id: armyId,
      factionId: f.id,
      name: armyName,
      generalId: null,
      provinceId: p.id,
      regiments: deepClone(regiments),
      maxMovementPoints: 100,
      movementPoints: 100,
      stance: 'NORMAL',
      supplyState: 'SUPPLIED',
      unsuppliedTurns: 0,
      isBesieging: false,
      besiegedProvinceId: null
    };

    if (generalId) {
      const g = this.getCharacter(generalId);
      if (g && g.alive) {
        army.generalId = g.id;
        this.assignCharacterRole(g.id, 'GENERAL', armyId);
      }
    }

    this.armies[armyId] = army;
    return army;
  }

  deleteArmy(armyId) {
    const army = this.getArmy(armyId);
    if (!army) return false;
    if (army.generalId) {
      const g = this.getCharacter(army.generalId);
      if (g) {
        g.currentRole = 'IDLE';
        g.assignmentTarget = null;
      }
    }
    delete this.armies[armyId];
    return true;
  }

  assignCharacterRole(characterId, role, targetId = null) {
    const c = this.getCharacter(characterId);
    if (!c || !c.alive) return false;
    if (c.currentRole === 'CAPTIVE') return false;

    const validRoles = ['RULER', 'GENERAL', 'GOVERNOR', 'MINISTER', 'IDLE'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Clean up previous role assignments
    if (c.currentRole === 'GOVERNOR' && c.assignmentTarget) {
      const oldProv = this.getProvince(c.assignmentTarget);
      if (oldProv && oldProv.governorId === c.id) {
        oldProv.governorId = null;
      }
    }
    if (c.currentRole === 'GENERAL' && c.assignmentTarget) {
      const oldArmy = this.getArmy(c.assignmentTarget);
      if (oldArmy && oldArmy.generalId === c.id) {
        oldArmy.generalId = null;
      }
    }

    c.currentRole = role;
    c.assignmentTarget = targetId;

    if (role === 'GOVERNOR' && targetId) {
      const prov = this.getProvince(targetId);
      if (prov) {
        prov.governorId = c.id;
        c.locationProvinceId = prov.id;
      }
    } else if (role === 'GENERAL' && targetId) {
      const army = this.getArmy(targetId);
      if (army) {
        army.generalId = c.id;
        c.locationProvinceId = army.provinceId;
      }
    } else if (role === 'IDLE') {
      c.assignmentTarget = null;
    }

    return true;
  }

  transferProvinceControl(provinceId, newFactionId) {
    const p = this.getProvince(provinceId);
    const f = this.getFaction(newFactionId);
    if (!p || !f) return false;

    // Reset governor if belonged to opposing faction
    if (p.governorId) {
      const gov = this.getCharacter(p.governorId);
      if (gov && gov.factionId !== f.id) {
        gov.currentRole = 'IDLE';
        gov.assignmentTarget = null;
        p.governorId = null;
      }
    }

    p.controllingFaction = f.id;
    p.publicOrder = Math.min(p.publicOrder, 50); // Unrest from conquest
    return true;
  }

  advanceTurn(options = {}) {
    this.currentTurn += 1;
    this.year = 1345 + Math.floor((this.currentTurn - 1) / 4);

    // Reset army movement points
    for (const army of Object.values(this.armies)) {
      army.movementPoints = army.maxMovementPoints || 100;
    }

    // Process technology research for all active factions
    for (const factionId of Object.keys(this.factions)) {
      this.processResearchTurn(factionId);
    }

    // Process public order drift & rebellions if tax policies passed
    if (options.taxPolicies) {
      this.processPublicOrderTurn(options.taxPolicies);
    }

    return this.currentTurn;
  }

  processTurn(options = {}) {
    return this.advanceTurn(options);
  }

  // ==========================================
  // Technology Research System
  // ==========================================

  setResearch(factionId, techId) {
    const fId = this._normalizeFactionId(factionId);
    const tech = TECH_TREE[techId];
    if (!tech) return false;

    if (!this.techProgress[fId]) {
      this.techProgress[fId] = {
        activeTechId: null,
        remainingCost: 0,
        pointsPerTurn: 40,
        unlockedTechs: []
      };
    }

    const progress = this.techProgress[fId];
    if (progress.unlockedTechs.includes(techId)) return false;

    progress.activeTechId = techId;
    progress.remainingCost = tech.researchCost || tech.cost || 100;

    if (!this.technologies[fId]) {
      this.technologies[fId] = { unlocked: [], currentResearch: null, accumulatedPoints: {} };
    }
    this.technologies[fId].currentResearch = techId;
    return true;
  }

  processResearchTurn(factionId) {
    const fId = this._normalizeFactionId(factionId);
    const progress = this.techProgress[fId];
    if (!progress || !progress.activeTechId) return null;

    const points = progress.pointsPerTurn || 40;
    progress.remainingCost = Math.max(0, progress.remainingCost - points);

    if (progress.remainingCost === 0) {
      const completedTechId = progress.activeTechId;
      if (!progress.unlockedTechs.includes(completedTechId)) {
        progress.unlockedTechs.push(completedTechId);
      }
      if (!this.technologies[fId]) {
        this.technologies[fId] = { unlocked: [], currentResearch: null, accumulatedPoints: {} };
      }
      if (!this.technologies[fId].unlocked.includes(completedTechId)) {
        this.technologies[fId].unlocked.push(completedTechId);
      }
      progress.activeTechId = null;
      this.technologies[fId].currentResearch = null;
      return completedTechId;
    }
    return null;
  }

  // ==========================================
  // Public Order & Rebellion System
  // ==========================================

  processPublicOrderTurn(taxPolicies = {}) {
    const spawnedRebellions = [];

    for (const p of Object.values(this.provinces)) {
      if (p.publicOrder === undefined) p.publicOrder = 80;

      // 1. Tax Policy Modifier
      const policy = taxPolicies[p.id] || 'NORMAL';
      if (policy === 'HIGH') p.publicOrder -= 4;
      else if (policy === 'EXTORTIONATE') p.publicOrder -= 12;
      else if (policy === 'LOW') p.publicOrder += 3;

      // 2. Governor Public Order Modifier
      if (p.governorId) {
        const govBonus = this.calculateGovernorPublicOrderModifier(p.governorId);
        p.publicOrder += Math.round(govBonus.totalOrderModifier || 0);
      }

      // 3. Garrison Presence (+1 per garrison regiment up to +5)
      const friendlyArmies = Object.values(this.armies).filter(a => a.provinceId === p.id && a.factionId === p.controllingFaction);
      let garrisonCount = 0;
      friendlyArmies.forEach(a => { garrisonCount += (a.regiments || []).length; });
      p.publicOrder += Math.min(5, garrisonCount);

      // Clamp strictly between 0 and 100
      p.publicOrder = Math.max(0, Math.min(100, p.publicOrder));

      // 4. Rebellion Trigger at 0 Public Order
      if (p.publicOrder === 0) {
        const alreadyRebelling = (this.activeRebellions || []).some(r => r.provinceId === p.id);
        if (!alreadyRebelling) {
          p.siegeStatus = true;
          const rebelArmy = this.createArmy('FAC_REBEL', p.id, [
            { id: `REG_REB_${Date.now()}_1`, unitTypeId: 'RAJPUT_LEVIES', name: `${p.name} Partisan Spearmen`, hp: 120, maxHp: 120, morale: 80, maxMorale: 80, meleeAtk: 32, meleeDef: 18 },
            { id: `REG_REB_${Date.now()}_2`, unitTypeId: 'PAIKS', name: `${p.name} Peasant Rabble`, hp: 90, maxHp: 90, morale: 65, maxMorale: 65, meleeAtk: 26, meleeDef: 12 }
          ], null, `${p.name} Armed Revolt`);

          const rebellionRecord = {
            provinceId: p.id,
            rebelArmyId: rebelArmy.id,
            turnSpawned: this.currentTurn
          };

          if (!this.activeRebellions) this.activeRebellions = [];
          this.activeRebellions.push(rebellionRecord);
          spawnedRebellions.push({ province: p, army: rebelArmy });
        }
      }
    }

    return spawnedRebellions;
  }

  // ==========================================
  // Character Stat Application Helpers
  // ==========================================

  calculateGeneralCombatBonus(characterId) {
    const defaultStats = {
      attackMultiplier: 1.0,
      defenseMultiplier: 1.0,
      autoResolveModifier: 1.0,
      auraRadius: 2,
      baseMoraleBonus: 0,
      dreadMoraleShock: 5,
      movementPointsBonus: 0,
      command: 0,
      dread: 0,
      piety: 0
    };

    if (!characterId) return defaultStats;
    const c = this.getCharacter(characterId);
    if (!c || !c.alive || !c.attributes) return defaultStats;

    const com = c.attributes.command ?? 1;
    const dre = c.attributes.dread ?? 0;
    const pie = c.attributes.piety ?? 0;

    return {
      attackMultiplier: Number((1.0 + (com * 0.035)).toFixed(4)),
      defenseMultiplier: Number((1.0 + (com * 0.02) + (dre * 0.01)).toFixed(4)),
      autoResolveModifier: Number((1.0 + (com * 0.04) + (dre * 0.02)).toFixed(4)),
      auraRadius: Math.max(2, Math.floor(com / 2) + 1),
      baseMoraleBonus: Number(((com * 2.5) + (pie * 1.5)).toFixed(2)),
      dreadMoraleShock: Number((5 + (dre * 1.5)).toFixed(2)),
      movementPointsBonus: Math.floor((com - 5) * 1.5),
      command: com,
      dread: dre,
      piety: pie
    };
  }

  calculateGovernorTaxModifier(characterId) {
    const defaultStats = {
      taxMultiplier: 1.0,
      corruption: 0.0,
      grossBonus: 0.0,
      governance: 0,
      dread: 0,
      piety: 0
    };

    if (!characterId) return defaultStats;
    const c = this.getCharacter(characterId);
    if (!c || !c.alive || !c.attributes) return defaultStats;

    const gov = c.attributes.governance ?? 1;
    const dre = c.attributes.dread ?? 0;
    const pie = c.attributes.piety ?? 0;

    const rawCorruption = (10 - gov) * 0.02 - (pie * 0.01);
    const corruption = Number(Math.max(0, rawCorruption).toFixed(4));
    const grossBonus = Number(((gov * 0.05) + (dre * 0.02)).toFixed(4));
    const taxMultiplier = Number((1.0 + grossBonus - corruption).toFixed(4));

    return {
      taxMultiplier,
      corruption,
      grossBonus,
      governance: gov,
      dread: dre,
      piety: pie
    };
  }

  calculateGovernorPublicOrderModifier(characterId) {
    const defaultStats = {
      totalOrderModifier: 0,
      governanceBonus: 0,
      dreadBonus: 0,
      pietyBonus: 0,
      nullifiesReligiousFriction: false,
      valueOf() { return this.totalOrderModifier; }
    };

    if (!characterId) return defaultStats;
    const c = this.getCharacter(characterId);
    if (!c || !c.alive || !c.attributes) return defaultStats;

    const gov = c.attributes.governance ?? 1;
    const dre = c.attributes.dread ?? 0;
    const pie = c.attributes.piety ?? 0;

    const governanceBonus = Number((gov * 0.6).toFixed(2));
    const dreadBonus = Number((dre * 0.8).toFixed(2));
    const pietyBonus = Number((pie * 0.7).toFixed(2));
    const totalOrderModifier = Number((governanceBonus + dreadBonus + pietyBonus).toFixed(2));

    const traits = c.traits || [];
    const nullifiesReligiousFriction = pie >= 9 || 
      traits.includes('Harmonizer') || 
      traits.includes('Harmonizer_of_Faiths');

    return {
      totalOrderModifier,
      governanceBonus,
      dreadBonus,
      pietyBonus,
      nullifiesReligiousFriction,
      valueOf() { return this.totalOrderModifier; }
    };
  }

  calculateMinisterDiplomacyModifier(characterId) {
    const defaultStats = {
      treatyScoreBonus: 0,
      researchModifier: 1.0,
      diplomacy: 0,
      governance: 0,
      piety: 0
    };

    if (!characterId) return defaultStats;
    const c = this.getCharacter(characterId);
    if (!c || !c.alive || !c.attributes) return defaultStats;

    const dip = c.attributes.diplomacy ?? 1;
    const gov = c.attributes.governance ?? 1;
    const pie = c.attributes.piety ?? 0;

    const treatyScoreBonus = Number((dip * 4.5).toFixed(2));
    const researchModifier = Number((1.0 + (pie * 0.03) + (gov * 0.04)).toFixed(4));

    return {
      treatyScoreBonus,
      researchModifier,
      diplomacy: dip,
      governance: gov,
      piety: pie
    };
  }

  // ==========================================
  // Serialization & Deserialization
  // ==========================================

  exportSaveObject() {
    if (!this.saveDate) {
      this.saveDate = new Date().toISOString();
    }
    return {
      meta: {
        version: this.version,
        gameTitle: 'Iron Tactics: 14th-Century Subcontinent',
        saveDate: this.saveDate,
        currentTurn: this.currentTurn,
        year: this.year,
        playerFactionId: this.playerFactionId
      },
      state: {
        version: this.version,
        currentTurn: this.currentTurn,
        year: this.year,
        saveDate: this.saveDate,
        playerFactionId: this.playerFactionId,
        provinces: deepClone(this.provinces),
        factions: deepClone(this.factions),
        characters: deepClone(this.characters),
        armies: deepClone(this.armies),
        diplomacy: deepClone(this.diplomacy),
        technologies: deepClone(this.technologies),
        techProgress: deepClone(this.techProgress),
        activeRebellions: deepClone(this.activeRebellions)
      }
    };
  }

  importSaveObject(saveObj) {
    if (!saveObj || typeof saveObj !== 'object') {
      throw new Error('Invalid save state object: payload must be a non-null object');
    }

    const payload = saveObj.state || saveObj;

    if (!payload.provinces || !payload.factions || !payload.characters || !payload.armies) {
      throw new Error('Malformed save state object: missing required entity collections');
    }

    this.version = payload.version || '1.0.0';
    this.currentTurn = payload.currentTurn || 1;
    this.year = payload.year !== undefined ? payload.year : (1345 + Math.floor((this.currentTurn - 1) / 4));
    this.saveDate = payload.saveDate || (saveObj.meta && saveObj.meta.saveDate) || this.saveDate;
    this.playerFactionId = payload.playerFactionId || 'FAC_VIJAYANAGARA';
    this.provinces = deepClone(payload.provinces);
    this.factions = deepClone(payload.factions);
    this.characters = deepClone(payload.characters);
    this.armies = deepClone(payload.armies);
    this.diplomacy = deepClone(payload.diplomacy || { treaties: [], relations: {} });
    this.technologies = deepClone(payload.technologies || {});
    this.techProgress = deepClone(payload.techProgress || {});
    this.activeRebellions = deepClone(payload.activeRebellions || []);

    return this;
  }


  serialize() {
    const raw = this.exportSaveObject();
    const sorted = sortKeysDeterministic(raw);
    return JSON.stringify(sorted, null, 2);
  }

  deserialize(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid JSON string passed to deserialize');
    }
    let data;
    try {
      data = JSON.parse(jsonString);
    } catch (err) {
      throw new Error(`JSON parse error during state deserialization: ${err.message}`);
    }
    return this.importSaveObject(data);
  }

  static fromJSON(jsonString) {
    const state = new GameState();
    state.deserialize(jsonString);
    return state;
  }

  // ==========================================
  // Storage Integration (LocalStorage & Node)
  // ==========================================

  saveToLocalStorage(slotKey = 'iron_tactics_quicksave') {
    const storage = getStorage();
    const serialized = this.serialize();
    try {
      storage.setItem(slotKey, serialized);

      // Update save index
      let index = [];
      const rawIndex = storage.getItem('iron_tactics_save_index');
      if (rawIndex) {
        try { index = JSON.parse(rawIndex); } catch (_) { index = []; }
      }
      index = index.filter(item => item.slotKey !== slotKey);
      index.unshift({
        slotKey,
        currentTurn: this.currentTurn,
        year: this.year,
        playerFactionId: this.playerFactionId,
        timestamp: new Date().toISOString()
      });
      storage.setItem('iron_tactics_save_index', JSON.stringify(index));

      return { success: true, slotKey, timestamp: new Date().toISOString() };
    } catch (e) {
      throw new Error(`Failed to save state to storage: ${e.message}`);
    }
  }

  loadFromLocalStorage(slotKey = 'iron_tactics_quicksave') {
    const storage = getStorage();
    const raw = storage.getItem(slotKey);
    if (!raw) {
      throw new Error(`Save slot not found in storage: ${slotKey}`);
    }
    this.deserialize(raw);
    return true;
  }

  listSavedGames() {
    const storage = getStorage();
    const rawIndex = storage.getItem('iron_tactics_save_index');
    if (!rawIndex) return [];
    try {
      return JSON.parse(rawIndex);
    } catch (_) {
      return [];
    }
  }

  deleteSaveFromLocalStorage(slotKey) {
    const storage = getStorage();
    storage.removeItem(slotKey);
    const rawIndex = storage.getItem('iron_tactics_save_index');
    if (rawIndex) {
      try {
        let index = JSON.parse(rawIndex);
        index = index.filter(i => i.slotKey !== slotKey);
        storage.setItem('iron_tactics_save_index', JSON.stringify(index));
      } catch (_) {}
    }
    return true;
  }
}
