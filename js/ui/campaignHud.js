/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/ui/campaignHud.js
 * 
 * Campaign Management HUD:
 * - Top Resource Bar (Turn, Year, Treasury, Net Income, Manpower, Faction Banner, End Turn)
 * - Province Management Drawer (Intel, Terrain, Resources, Tax Policy, Public Order, Governor, Buildings, Garrison/Recruitment)
 * - Army Inspector Card (Commander bonuses, Regiments, Movement Points, Supply Lines)
 * - Notification Log & Event Ticker
 */

import { BUILDINGS, BUILDING_CATEGORIES, getBuilding, getNextUpgrade, calculateProvinceBuildingBonuses, canConstructBuilding, getRecruitableUnits } from '../data/buildings.js';
import { UNIT_TYPES, getUnitType } from '../data/units.js';
import { TERRAIN_TYPES, STRATEGIC_RESOURCES } from '../data/provinces.js';

export const TAX_POLICIES = Object.freeze({
  LOW: { id: 'LOW', label: 'Low (0.8x)', multiplier: 0.8, orderDelta: 5 },
  NORMAL: { id: 'NORMAL', label: 'Normal (1.0x)', multiplier: 1.0, orderDelta: 0 },
  HIGH: { id: 'HIGH', label: 'High (1.2x)', multiplier: 1.2, orderDelta: -6 },
  EXTORTIONATE: { id: 'EXTORTIONATE', label: 'Extortionate (1.4x)', multiplier: 1.4, orderDelta: -15 }
});

export class CampaignHud {
  /**
   * Flexible polymorphic constructor supporting:
   * (container, gameState, options) OR (gameState, campaignMap, options)
   */
  constructor(arg1, arg2, options = {}) {
    if (arg1 && typeof arg1.getProvince === 'function') {
      // Called as: (gameState, campaignMap, options)
      this.gameState = arg1;
      this.campaignMap = arg2 || null;
      this.container = (typeof document !== 'undefined')
        ? (document.getElementById('campaign-view') || document.getElementById('app') || document.body)
        : null;
      this.options = Object.assign(this._defaultOptions(), options);
    } else {
      // Called as: (container, gameState, options)
      this.container = arg1 || null;
      this.gameState = arg2;
      this.campaignMap = null;
      this.options = Object.assign(this._defaultOptions(), options);
    }

    this.selectedProvinceId = null;
    this.selectedArmyId = null;
    this.activeDrawerTab = 'overview'; // 'overview' | 'governor' | 'buildings' | 'recruitment'
    this.notifications = [];
    this.isLogExpanded = false;
    this.isProcessingTurn = false;
    this.taxPolicies = {}; // provinceId -> 'NORMAL' | 'LOW' | 'HIGH' | 'EXTORTIONATE'
    this.showingGovernorPicker = false;

    this._boundOnClick = this._handleClick.bind(this);
    this._boundOnChange = this._handleChange.bind(this);

    if (this.container && typeof this.container.addEventListener === 'function') {
      this.container.addEventListener('click', this._boundOnClick);
      this.container.addEventListener('change', this._boundOnChange);
    }
  }

  _defaultOptions() {
    return {
      onEndTurn: () => {},
      onOpenDiplomacy: () => {},
      onOpenTechnology: () => {},
      onOpenCharacters: () => {},
      onOpenSaveLoad: () => {},
      onProvinceSelected: (provinceId) => {},
      onArmySelected: (armyId) => {},
      onRecruitUnit: (provinceId, unitTypeId) => {},
      onConstructBuilding: (provinceId, buildingId) => {},
      onAssignGovernor: (provinceId, characterId) => {},
      onDismissGovernor: (provinceId) => {},
      onTaxRateChange: (provinceId, taxRate) => {}
    };
  }

  mount() {
    this.render();
  }

  render() {
    this._renderTopBar();
    this._renderDrawer();
    this._renderArmyInspector();
    this._renderTicker();
  }

  update() {
    this._renderTopBar();
    if (this.selectedProvinceId) {
      this._renderDrawer();
    } else if (this.selectedArmyId) {
      this._renderArmyInspector();
    }
  }

  selectProvince(provinceId) {
    this.selectedProvinceId = provinceId;
    this.selectedArmyId = null;
    this.showingGovernorPicker = false;

    if (typeof document !== 'undefined') {
      const drawer = document.getElementById('province-drawer');
      if (drawer) {
        drawer.classList.remove('collapsed');
        drawer.classList.add('open');
      }
      const inspector = document.getElementById('army-inspector');
      if (inspector) {
        inspector.classList.add('hidden');
      }
    }

    this._renderDrawer();
    if (this.options.onProvinceSelected) {
      this.options.onProvinceSelected(provinceId);
    }
  }

  selectArmy(armyId) {
    this.selectedArmyId = armyId;
    this.selectedProvinceId = null;
    this.showingGovernorPicker = false;

    if (typeof document !== 'undefined') {
      const drawer = document.getElementById('province-drawer');
      if (drawer) {
        drawer.classList.add('collapsed');
        drawer.classList.remove('open');
      }
      const inspector = document.getElementById('army-inspector');
      if (inspector) {
        inspector.classList.remove('hidden');
      }
    }

    this._renderArmyInspector();
    if (this.options.onArmySelected) {
      this.options.onArmySelected(armyId);
    }
  }

  deselectAll() {
    this.selectedProvinceId = null;
    this.selectedArmyId = null;
    this.showingGovernorPicker = false;

    if (typeof document !== 'undefined') {
      const drawer = document.getElementById('province-drawer');
      if (drawer) {
        drawer.classList.add('collapsed');
        drawer.classList.remove('open');
      }
      const inspector = document.getElementById('army-inspector');
      if (inspector) {
        inspector.classList.add('hidden');
      }
    }
  }

  setProcessingState(isProcessing) {
    this.isProcessingTurn = isProcessing;
    this._renderTopBar();
  }

  addNotification({ type = 'info', title = '', message = '' }) {
    const item = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      turn: this.gameState ? this.gameState.currentTurn : 1,
      type,
      title,
      message,
      timestamp: new Date()
    };
    this.notifications.unshift(item);
    if (this.notifications.length > 50) this.notifications.pop();
    this._renderTickerLatest(item);
  }

  // =========================================================================
  // 1. Top Resource Bar Rendering & Telemetry
  // =========================================================================

  _renderTopBar() {
    if (typeof document === 'undefined' || !this.gameState) return;

    const playerFacId = this.gameState.playerFactionId;
    const playerFac = this.gameState.getFaction(playerFacId) || {};
    const turn = this.gameState.currentTurn;
    const year = this.gameState.year || (1345 + Math.floor((turn - 1) / 4));
    const seasons = ['Spring', 'Monsoon', 'Autumn', 'Winter'];
    const season = seasons[(turn - 1) % 4];

    const treasury = playerFac.treasury || 0;
    const netIncome = this.calculateNetIncome(playerFacId);
    const manpower = this.calculateEmpireManpower(playerFacId);
    const avgStability = this.calculateEmpireStability(playerFacId);

    // Update Top Bar DOM elements
    const factionShield = document.getElementById('hud-faction-shield');
    if (factionShield) {
      factionShield.style.background = `linear-gradient(135deg, ${playerFac.primaryColor || '#ff9933'}, ${playerFac.secondaryColor || '#800000'})`;
    }

    const factionName = document.getElementById('hud-faction-name');
    if (factionName) {
      factionName.textContent = playerFac.name || 'Faction';
    }

    const rulerName = document.getElementById('hud-ruler-name');
    if (rulerName) {
      const ruler = playerFac.rulerId ? this.gameState.getCharacter(playerFac.rulerId) : null;
      rulerName.textContent = ruler ? `${ruler.title || 'Ruler'} ${ruler.name}` : (playerFac.shortName || '');
    }

    const turnVal = document.getElementById('hud-turn-val');
    if (turnVal) {
      turnVal.textContent = String(turn);
    }

    const yearVal = document.getElementById('hud-year-val');
    if (yearVal) {
      yearVal.textContent = `${season} ${year} CE`;
    }

    const treasuryVal = document.getElementById('hud-treasury-val');
    if (treasuryVal) {
      treasuryVal.textContent = treasury.toLocaleString();
    }

    const incomeDelta = document.getElementById('hud-income-delta');
    if (incomeDelta) {
      const sign = netIncome >= 0 ? '+' : '';
      incomeDelta.textContent = `${sign}${netIncome}/t`;
      incomeDelta.className = `res-delta mono ${netIncome >= 0 ? 'pos' : 'neg'}`;
    }

    const manpowerVal = document.getElementById('hud-manpower-val');
    if (manpowerVal) {
      manpowerVal.textContent = manpower.toLocaleString();
    }

    const stabilityVal = document.getElementById('hud-stability-val');
    if (stabilityVal) {
      stabilityVal.textContent = `${avgStability}%`;
    }

    const endTurnBtn = document.getElementById('btn-end-turn') || document.getElementById('btnCampaignEndTurn');
    if (endTurnBtn) {
      const primaryText = endTurnBtn.querySelector('.btn-primary-text');
      if (primaryText) {
        primaryText.textContent = this.isProcessingTurn ? 'SIMULATING...' : 'PASS TURN';
      } else {
        endTurnBtn.textContent = this.isProcessingTurn ? '⚙️ Processing...' : '⏳ PASS TURN';
      }
      endTurnBtn.disabled = this.isProcessingTurn;
    }
  }

  calculateNetIncome(factionId) {
    if (!this.gameState) return 0;
    let grossTax = 0;
    let totalUpkeep = 0;

    const provinces = this.gameState.getFactionProvinces(factionId);
    provinces.forEach(p => {
      const policyKey = this.taxPolicies[p.id] || 'NORMAL';
      const policyMult = TAX_POLICIES[policyKey] ? TAX_POLICIES[policyKey].multiplier : 1.0;
      const govTaxMod = this.gameState.calculateGovernorTaxModifier(p.governorId);
      const bBonuses = calculateProvinceBuildingBonuses(p.activeBuildings || p.buildings || []);

      grossTax += Math.floor((p.baseTax * policyMult * govTaxMod.taxMultiplier) + bBonuses.taxBonus);
      totalUpkeep += (bBonuses.maintenanceCost || 0);
    });

    const armies = this.gameState.getFactionArmies(factionId);
    armies.forEach(a => {
      (a.regiments || []).forEach(r => {
        totalUpkeep += (r.upkeepCost || r.upkeep || 10);
      });
    });

    return grossTax - totalUpkeep;
  }

  calculateEmpireManpower(factionId) {
    if (!this.gameState) return 0;
    const provinces = this.gameState.getFactionProvinces(factionId);
    return provinces.reduce((sum, p) => sum + (p.baseManpower || 0), 0);
  }

  calculateEmpireStability(factionId) {
    if (!this.gameState) return 80;
    const provinces = this.gameState.getFactionProvinces(factionId);
    if (provinces.length === 0) return 80;
    const totalOrder = provinces.reduce((sum, p) => sum + (p.publicOrder !== undefined ? p.publicOrder : 80), 0);
    return Math.round(totalOrder / provinces.length);
  }

  // =========================================================================
  // 2. Province Management Drawer Rendering
  // =========================================================================

  _renderDrawer() {
    if (typeof document === 'undefined' || !this.selectedProvinceId || !this.gameState) return;

    const prov = this.gameState.getProvince(this.selectedProvinceId);
    if (!prov) return;

    const playerFacId = this.gameState.playerFactionId;
    const isPlayerOwned = (prov.controllingFaction === playerFacId);
    const faction = this.gameState.getFaction(prov.controllingFaction);

    // Update Header
    const nameEl = document.getElementById('drawer-prov-name');
    if (nameEl) nameEl.textContent = `${prov.name} (${prov.capitalCity || prov.capital || ''})`;

    const regionEl = document.getElementById('drawer-prov-region');
    if (regionEl) regionEl.textContent = prov.region || 'Subcontinent';

    const terrainEl = document.getElementById('drawer-prov-terrain');
    if (terrainEl) {
      const tInfo = TERRAIN_TYPES[prov.terrainType];
      terrainEl.textContent = tInfo ? `⛰️ ${tInfo.name}` : prov.terrainType;
    }

    const resourceEl = document.getElementById('drawer-prov-resource');
    if (resourceEl) {
      const rInfo = STRATEGIC_RESOURCES[prov.strategicResource];
      resourceEl.textContent = rInfo ? `💎 ${rInfo.name}` : prov.strategicResource;
    }

    // Demographics & Taxation
    const taxVal = document.getElementById('drawer-tax-val');
    const policyKey = this.taxPolicies[prov.id] || 'NORMAL';
    const policy = TAX_POLICIES[policyKey] || TAX_POLICIES.NORMAL;
    const govTaxMod = this.gameState.calculateGovernorTaxModifier(prov.governorId);
    const bBonuses = calculateProvinceBuildingBonuses(prov.activeBuildings || prov.buildings || []);
    const effectiveTax = Math.floor((prov.baseTax * policy.multiplier * govTaxMod.taxMultiplier) + bBonuses.taxBonus);
    if (taxVal) taxVal.textContent = `${effectiveTax} Gold (Base: ${prov.baseTax})`;

    // Tax Buttons Active State
    document.querySelectorAll('.btn-rate').forEach(btn => {
      const rate = btn.dataset.rate;
      const match = (rate === 'low' && policyKey === 'LOW') ||
                    (rate === 'norm' && policyKey === 'NORMAL') ||
                    (rate === 'high' && policyKey === 'HIGH') ||
                    (rate === 'extortionate' && policyKey === 'EXTORTIONATE');
      btn.classList.toggle('active', match);
    });

    // Public Order Meter
    const orderVal = document.getElementById('drawer-public-order-val');
    const orderBar = document.getElementById('drawer-order-bar');
    const unrestWarning = document.getElementById('drawer-unrest-warning');
    const pOrder = prov.publicOrder !== undefined ? prov.publicOrder : 80;

    if (orderVal) orderVal.textContent = `${pOrder} / 100`;
    if (orderBar) {
      orderBar.style.width = `${Math.min(100, Math.max(0, pOrder))}%`;
      if (pOrder >= 70) {
        orderBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      } else if (pOrder >= 40) {
        orderBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      } else {
        orderBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
      }
    }
    if (unrestWarning) {
      unrestWarning.classList.toggle('hidden', pOrder >= 25);
    }

    // Governor Card
    this._renderGovernorCard(prov, isPlayerOwned);

    // Buildings Grid (5 Categories)
    this._renderBuildingsGrid(prov, isPlayerOwned);

    // Recruitment & Garrison Dock
    this._renderRecruitmentDock(prov, isPlayerOwned);
  }

  _renderGovernorCard(prov, isPlayerOwned) {
    const profileEl = document.getElementById('drawer-governor-profile');
    if (!profileEl) return;

    if (this.showingGovernorPicker) {
      this._renderGovernorPicker(profileEl, prov);
      return;
    }

    if (prov.governorId) {
      const gov = this.gameState.getCharacter(prov.governorId);
      if (gov) {
        const govTax = this.gameState.calculateGovernorTaxModifier(gov.id);
        const govOrder = this.gameState.calculateGovernorPublicOrderModifier(gov.id);
        profileEl.innerHTML = `
          <div class="char-avatar" id="drawer-gov-avatar">👑</div>
          <div class="char-info">
            <div id="drawer-gov-name" class="char-name bold text-gold">${gov.name}</div>
            <div class="char-stats-mini mono text-muted">
              <span>Gov: <strong>${gov.attributes?.governance ?? 5}</strong></span>
              <span>Dread: <strong>${gov.attributes?.dread ?? 2}</strong></span>
              <span>Piety: <strong>${gov.attributes?.piety ?? 5}</strong></span>
            </div>
            <div class="gov-bonuses mono text-green" style="font-size: 0.68rem; margin-top: 2px;">
              Tax Mod: +${Math.round((govTax.taxMultiplier - 1) * 100)}% | Order: +${govOrder.totalOrderModifier}
            </div>
          </div>
          ${isPlayerOwned ? `
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button class="btn btn-sm btn-secondary" data-action="reassign-governor-btn" data-province-id="${prov.id}">Change</button>
              <button class="btn btn-sm btn-danger" data-action="dismiss-governor" data-province-id="${prov.id}" style="color: #ef4444;">Dismiss</button>
            </div>
          ` : ''}
        `;
        return;
      }
    }

    // Vacant Governor Slot
    profileEl.innerHTML = `
      <div class="char-avatar" style="opacity: 0.4;">👤</div>
      <div class="char-info">
        <div class="char-name text-muted">Vacant Seat</div>
        <div class="mono text-muted" style="font-size: 0.68rem;">-10% Tax Yield Penalty</div>
      </div>
      ${isPlayerOwned ? `
        <button class="btn btn-sm btn-accent" data-action="assign-governor-btn" data-province-id="${prov.id}">Appoint</button>
      ` : ''}
    `;
  }

  _renderGovernorPicker(container, prov) {
    const candidates = Object.values(this.gameState.characters || {}).filter(c => 
      c.factionId === this.gameState.playerFactionId && c.alive && c.currentRole !== 'RULER'
    );

    let html = `
      <div style="width: 100%; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="mono bold text-gold" style="font-size: 0.72rem;">SELECT GOVERNOR:</span>
          <button class="btn btn-sm" data-action="cancel-gov-picker" style="padding: 2px 6px;">✕</button>
        </div>
        <div style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
    `;

    if (candidates.length === 0) {
      html += `<div class="text-muted" style="font-size: 0.72rem;">No unassigned court nobles available.</div>`;
    } else {
      candidates.forEach(c => {
        html += `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(20,26,38,0.8); padding: 4px 8px; border-radius: 4px;">
            <div style="font-size: 0.72rem;">
              <strong class="text-gold">${c.name}</strong> (Gov ${c.attributes?.governance ?? 5}, Role: ${c.currentRole})
            </div>
            <button class="btn btn-sm btn-accent" data-action="select-governor" data-province-id="${prov.id}" data-character-id="${c.id}" style="padding: 2px 8px; font-size: 0.68rem;">
              Appoint
            </button>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;
  }

  _renderBuildingsGrid(prov, isPlayerOwned) {
    const grid = document.getElementById('drawer-building-slots');
    if (!grid) return;

    const categories = [
      { id: 'BARRACKS', name: 'Barracks', icon: '⚔️' },
      { id: 'WALLS', name: 'Walls', icon: '🛡️' },
      { id: 'IRRIGATION', name: 'Canals', icon: '🌾' },
      { id: 'MARKET', name: 'Market', icon: '🪙' },
      { id: 'SHRINE', name: 'Shrine', icon: '🛕' }
    ];

    const activeBuildings = prov.activeBuildings || prov.buildings || [];
    const playerFac = this.gameState.getFaction(this.gameState.playerFactionId) || {};
    const treasury = playerFac.treasury || 0;
    const resources = prov.strategicResource ? [prov.strategicResource] : [];

    grid.innerHTML = categories.map(cat => {
      // Find current building in this category
      let currentTier = 0;
      let currentBuilding = null;
      for (const bId of activeBuildings) {
        const b = getBuilding(bId);
        if (b && b.category === cat.id) {
          if (b.tier > currentTier) {
            currentTier = b.tier;
            currentBuilding = b;
          }
        }
      }

      const nextUpgrade = currentBuilding ? getNextUpgrade(currentBuilding.id) : getBuilding(`${cat.id.toLowerCase()}_t1`);
      let actionBtnHTML = '';

      if (isPlayerOwned && nextUpgrade) {
        const check = canConstructBuilding(nextUpgrade.id, activeBuildings, treasury, resources);
        if (check.canBuild) {
          actionBtnHTML = `
            <button class="btn btn-sm btn-accent" data-action="build-upgrade" data-province-id="${prov.id}" data-building-id="${nextUpgrade.id}" style="padding: 2px 6px; font-size: 0.62rem; margin-top: 4px;">
              Upgrade (${nextUpgrade.cost}g)
            </button>
          `;
        } else {
          actionBtnHTML = `
            <button class="btn btn-sm" disabled title="${check.reason}" style="padding: 2px 6px; font-size: 0.62rem; margin-top: 4px; opacity: 0.5;">
              ${nextUpgrade.cost}g 🔒
            </button>
          `;
        }
      } else if (currentTier >= 3) {
        actionBtnHTML = `<span class="mono text-green" style="font-size: 0.62rem;">MAX TIER</span>`;
      }

      return `
        <div class="building-slot-card" title="${currentBuilding ? currentBuilding.name : 'Undeveloped'}">
          <div class="b-icon">${cat.icon}</div>
          <span class="b-name">${cat.name}</span>
          <span class="b-tier">Tier ${currentTier}/3</span>
          ${actionBtnHTML}
        </div>
      `;
    }).join('');
  }

  _renderRecruitmentDock(prov, isPlayerOwned) {
    const dock = document.getElementById('drawer-recruitment-dock');
    if (!dock) return;

    const activeBuildings = prov.activeBuildings || prov.buildings || [];
    const recruitable = getRecruitableUnits(activeBuildings, prov.strategicResource);
    const playerFac = this.gameState.getFaction(this.gameState.playerFactionId) || {};
    const treasury = playerFac.treasury || 0;

    const unitList = [
      { id: 'RAJPUT_LEVIES', icon: '🛡️' },
      { id: 'PAIKS', icon: '🏹' },
      { id: 'HORSE_ARCHERS', icon: '🐎' },
      { id: 'HEAVY_CAVALRY', icon: '🏇' },
      { id: 'WAR_ELEPHANTS', icon: '🐘' },
      { id: 'SIEGE_ENGINES', icon: '⚙️' }
    ];

    dock.innerHTML = unitList.map(item => {
      const unit = getUnitType(item.id);
      if (!unit) return '';

      const isUnlocked = recruitable.includes(item.id);
      const canAfford = treasury >= unit.recruitmentCost;
      const canRecruit = isPlayerOwned && isUnlocked && canAfford;

      return `
        <div class="recruitment-card" style="display: flex; justify-content: space-between; align-items: center; background: rgba(16,22,34,0.8); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 6px 10px; margin-bottom: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">${item.icon}</span>
            <div>
              <div class="bold" style="font-size: 0.78rem; color: #f1f5f9;">${unit.name}</div>
              <div class="mono text-muted" style="font-size: 0.65rem;">HP: ${unit.maxHp} | Atk: ${unit.meleeAttack} | Def: ${unit.meleeDefense}</div>
            </div>
          </div>
          <div>
            ${canRecruit ? `
              <button class="btn btn-sm btn-accent" data-action="recruit-regiment" data-province-id="${prov.id}" data-unit-id="${unit.id}" style="padding: 4px 8px; font-size: 0.72rem;">
                Recruit (${unit.recruitmentCost}g)
              </button>
            ` : `
              <button class="btn btn-sm" disabled style="padding: 4px 8px; font-size: 0.72rem; opacity: 0.4;" title="${!isUnlocked ? 'Requires Barracks upgrade or Resource' : 'Insufficient gold'}">
                ${unit.recruitmentCost}g ${!isUnlocked ? '🔒' : '🪙'}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // =========================================================================
  // 3. Army Inspector Card Rendering
  // =========================================================================

  _renderArmyInspector() {
    if (typeof document === 'undefined' || !this.selectedArmyId || !this.gameState) return;

    const army = this.gameState.getArmy(this.selectedArmyId);
    if (!army) return;

    const inspector = document.getElementById('army-inspector');
    if (!inspector) return;

    const titleEl = document.getElementById('army-inspector-title');
    if (titleEl) titleEl.textContent = army.name || 'Army Host';

    const commanderEl = document.getElementById('army-inspector-commander');
    if (commanderEl) {
      if (army.generalId) {
        const general = this.gameState.getCharacter(army.generalId);
        if (general) {
          const comBuff = this.gameState.calculateGeneralCombatBonus(general.id);
          commanderEl.textContent = `General: ${general.name} (Command ${comBuff.command} | +${Math.round((comBuff.attackMultiplier - 1) * 100)}% ATK)`;
        } else {
          commanderEl.textContent = 'General: Assigned';
        }
      } else {
        commanderEl.textContent = 'Unled Host (Captain Command)';
      }
    }

    const movePtsEl = document.getElementById('army-move-pts');
    if (movePtsEl) {
      movePtsEl.textContent = `${army.movementPoints || 0} / ${army.maxMovementPoints || 100} MP`;
    }

    const supplyEl = document.getElementById('army-supply-status');
    if (supplyEl) {
      const state = army.supplyState || 'SUPPLIED';
      supplyEl.textContent = state === 'SUPPLIED' ? 'In Supply (Friendly Lines)' : 'OUT OF SUPPLY (Attrition Risk)';
      supplyEl.className = `badge-supply ${state === 'SUPPLIED' ? 'ok' : 'danger'}`;
    }

    // Regiments Roster Dock
    const dock = document.getElementById('army-regiments-dock');
    if (dock) {
      const UNIT_ICONS = {
        WAR_ELEPHANTS: '🐘',
        HORSE_ARCHERS: '🐎',
        RAJPUT_LEVIES: '🛡️',
        PAIKS: '🏹',
        HEAVY_CAVALRY: '🏇',
        SIEGE_ENGINES: '⚙️'
      };

      const regiments = army.regiments || [];
      if (regiments.length === 0) {
        dock.innerHTML = `<div class="text-muted" style="font-size: 0.75rem; padding: 8px;">No active regiments in this army.</div>`;
      } else {
        dock.innerHTML = regiments.map((r, idx) => {
          const icon = UNIT_ICONS[r.unitTypeId || r.type] || '⚔️';
          const hpPercent = Math.round((r.hp / (r.maxHp || 100)) * 100);
          const moralePercent = Math.round((r.morale / (r.maxMorale || 100)) * 100);

          return `
            <div class="regiment-card" style="background: rgba(16,22,34,0.85); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 6px 10px; margin-bottom: 6px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="bold" style="font-size: 0.78rem; color: #fff;">${icon} ${r.name || r.unitTypeId}</span>
                <span class="mono text-muted" style="font-size: 0.65rem;">Atk: ${r.meleeAtk || r.meleeAttack || 30} | Def: ${r.meleeDef || r.meleeDefense || 20}</span>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 4px; font-size: 0.65rem;" class="mono">
                <div style="flex: 1;">
                  HP: ${r.hp}/${r.maxHp || 100}
                  <div class="progress-bar-bg"><div class="progress-bar-fill hp" style="width: ${hpPercent}%;"></div></div>
                </div>
                <div style="flex: 1;">
                  Morale: ${r.morale}/${r.maxMorale || 100}
                  <div class="progress-bar-bg"><div class="progress-bar-fill morale" style="width: ${moralePercent}%;"></div></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // =========================================================================
  // 4. Notification Ticker & Log Stream
  // =========================================================================

  _renderTicker() {
    if (typeof document === 'undefined') return;
    const stream = document.getElementById('ticker-stream');
    if (!stream) return;

    if (this.notifications.length === 0) {
      stream.innerHTML = `<div class="ticker-item system">Turn 1: Realms assessed. Frontiers secure. Awaiting imperial decrees.</div>`;
      return;
    }

    stream.innerHTML = this.notifications.slice(0, 3).map(n => `
      <div class="ticker-item ${n.type}">
        <strong>[Turn ${n.turn}]</strong> ${n.title ? n.title + ': ' : ''}${n.message}
      </div>
    `).join('');
  }

  _renderTickerLatest(item) {
    this._renderTicker();
  }

  // =========================================================================
  // 5. Unified Event Routing (Click & Change)
  // =========================================================================

  _handleClick(e) {
    const btn = e.target.closest('[data-action]') || e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action || btn.id;

    switch (action) {
      case 'end-turn':
      case 'btn-end-turn':
      case 'btnCampaignEndTurn':
        if (!this.isProcessingTurn && this.options.onEndTurn) {
          this.options.onEndTurn();
        }
        break;

      case 'open-diplomacy':
      case 'btn-open-diplomacy':
        if (this.options.onOpenDiplomacy) this.options.onOpenDiplomacy();
        break;

      case 'open-technology':
      case 'btn-open-tech':
        if (this.options.onOpenTechnology) this.options.onOpenTechnology();
        break;

      case 'open-characters':
      case 'btn-open-characters':
        if (this.options.onOpenCharacters) this.options.onOpenCharacters();
        break;

      case 'open-saveload':
      case 'btn-open-saveload':
        if (this.options.onOpenSaveLoad) this.options.onOpenSaveLoad();
        break;

      case 'close-drawer':
      case 'btn-close-drawer':
        this.deselectAll();
        break;

      case 'close-army-inspector':
      case 'btn-close-army-inspector':
        this.deselectAll();
        break;

      case 'build-upgrade':
        if (this.options.onConstructBuilding) {
          this.options.onConstructBuilding(btn.dataset.provinceId, btn.dataset.buildingId);
        }
        break;

      case 'recruit-regiment':
        if (this.options.onRecruitUnit) {
          this.options.onRecruitUnit(btn.dataset.provinceId, btn.dataset.unitId);
        }
        break;

      case 'assign-governor-btn':
      case 'reassign-governor-btn':
        this.showingGovernorPicker = true;
        this._renderDrawer();
        break;

      case 'cancel-gov-picker':
        this.showingGovernorPicker = false;
        this._renderDrawer();
        break;

      case 'select-governor':
        this.showingGovernorPicker = false;
        if (this.options.onAssignGovernor) {
          this.options.onAssignGovernor(btn.dataset.provinceId, btn.dataset.characterId);
        }
        break;

      case 'dismiss-governor':
        if (this.options.onDismissGovernor) {
          this.options.onDismissGovernor(btn.dataset.provinceId);
        }
        break;

      case 'drawer-toggle':
        const drawer = document.getElementById('province-drawer');
        if (drawer) {
          drawer.classList.toggle('collapsed');
        }
        break;
    }

    // Rate button handling
    if (btn.classList.contains('btn-rate')) {
      const rate = btn.dataset.rate;
      const policyMap = { low: 'LOW', norm: 'NORMAL', high: 'HIGH', extortionate: 'EXTORTIONATE' };
      const selectedPolicy = policyMap[rate] || 'NORMAL';

      if (this.selectedProvinceId) {
        this.taxPolicies[this.selectedProvinceId] = selectedPolicy;
        if (this.options.onTaxRateChange) {
          this.options.onTaxRateChange(this.selectedProvinceId, selectedPolicy);
        }
        this.update();
      }
    }
  }

  _handleChange(e) {
    if (e.target.dataset.control === 'tax-rate-select') {
      const pId = e.target.dataset.provinceId;
      const policy = e.target.value;
      this.taxPolicies[pId] = policy;
      if (this.options.onTaxRateChange) {
        this.options.onTaxRateChange(pId, policy);
      }
      this.update();
    }
  }

  destroy() {
    if (this.container && typeof this.container.removeEventListener === 'function') {
      this.container.removeEventListener('click', this._boundOnClick);
      this.container.removeEventListener('change', this._boundOnChange);
    }
  }
}
