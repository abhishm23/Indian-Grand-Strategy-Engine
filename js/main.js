/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/main.js
 * 
 * Master Runtime Coordinator:
 * - Web Audio Autoplay Compliance Trap
 * - GameState instantiation and initialization
 * - CampaignMap & CampaignHud instantiation and synchronization
 * - Dual-View Architecture view toggling (Campaign vs. Tactical)
 * - Modal overlays coordination (Diplomacy, Technology, Characters, Save/Load, Battle Encounter)
 * - Turn advancement & action dispatch
 */

import { GameState } from './engine/gameState.js';
import { CampaignMap } from './ui/campaignMap.js';
import { CampaignHud } from './ui/campaignHud.js';
import { sound } from './sound.js';
import { FACTIONS } from './data/factions.js';
import { PROVINCES, areProvincesAdjacent } from './data/provinces.js';
import { CHARACTERS } from './data/characters.js';
import { TECH_TREE } from './data/techTree.js';
import { BUILDINGS, getBuilding, canConstructBuilding } from './data/buildings.js';
import { UNIT_TYPES, getUnitType } from './data/units.js';
import {
  calculateWinProbability,
  autoResolveBattle,
  formatWinOdds,
  armyCombatPower,
  getTerrainDefenseModifier,
  getFortificationModifier,
  applyBattleOutcome
} from './engine/combatResolver.js';
import { TERRAIN_TYPES } from './data/provinces.js';
import { TacticalBattlefield } from './ui/tacticalView.js';
import { TacticalEngine } from './engine/tacticalEngine.js';
import { processAiTurn } from './engine/campaignAi.js';
import {
  evaluateTreatyProposal,
  executeTreaty,
  TREATY_TYPES,
  TREATY_THRESHOLDS,
  tickDiplomacyTurn
} from './engine/diplomacyAi.js';

export class GameApp {
  constructor() {
    this.gameState = new GameState();
    this.campaignMap = null;
    this.campaignHud = null;
    this.selectedFactionId = 'FAC_VIJAYANAGARA';
    this.activeView = 'campaign-view';
    this.currentDiploTargetId = 'FAC_BAHMANI';
    this.currentTechBranch = 'MILITARY';
    this.pendingBattle = null; // { attackerArmy, defenderArmy, province }
    this.tacticalBattlefield = null;

    // Milestone 3 Diplomacy UI State
    this.selectedTreatyType = 'TRADE_AGREEMENT';
    this.diploSweetenerGold = 0;
  }

  init() {
    // 1. Setup Universal Audio Gesture Trap
    this.setupAudioTrap();

    // 2. Populate Start Modal Faction Picker
    this.renderStartModalFactions();

    // 3. Wire Global Navigation & Modal Triggers
    this.setupModalListeners();

    // 4. Wire View Toggling Events
    this.setupViewSwitching();

    // 5. Expose globals for debugging and automated verification
    if (typeof window !== 'undefined') {
      window.gameApp = this;
      window.gameState = this.gameState;
    }
  }

  // =========================================================================
  // 1. Web Audio Autoplay Compliance
  // =========================================================================

  setupAudioTrap() {
    const unlock = () => {
      if (sound) {
        if (typeof sound.unlockAudio === 'function') {
          sound.unlockAudio();
        } else if (typeof sound.init === 'function') {
          sound.init();
        }
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('click', unlock, true);
      window.addEventListener('keydown', unlock, true);
    }

    // Audio Mute Toggle Button
    const audioBtn = document.getElementById('btn-audio-toggle');
    const audioIcon = document.getElementById('audio-icon');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        if (sound) {
          const active = sound.toggleSound();
          if (audioIcon) {
            audioIcon.textContent = active ? '🔊' : '🔇';
          }
        }
      });
    }
  }

  // =========================================================================
  // 2. Start Campaign Faction Select Modal
  // =========================================================================

  renderStartModalFactions() {
    const grid = document.getElementById('start-faction-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.values(FACTIONS).forEach(f => {
      const card = document.createElement('div');
      card.className = `start-faction-card ${f.id === this.selectedFactionId ? 'selected' : ''}`;
      card.dataset.factionId = f.id;
      card.innerHTML = `
        <div class="heraldic-shield" style="background: linear-gradient(135deg, ${f.primaryColor}, ${f.secondaryColor})">⚜️</div>
        <div class="font-title bold" style="font-size: 0.85rem; color: #fff;">${f.name}</div>
        <span class="mono text-muted" style="font-size: 0.68rem;">Capital: ${(f.capitalProvinceId || '').replace('PROV_', '')}</span>
      `;
      card.addEventListener('click', () => {
        document.querySelectorAll('.start-faction-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedFactionId = f.id;
        if (sound && typeof sound.playClick === 'function') sound.playClick();
      });
      grid.appendChild(card);
    });

    const startBtn = document.getElementById('btn-start-campaign');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (sound) {
          if (typeof sound.unlockAudio === 'function') sound.unlockAudio();
          if (typeof sound.playVictory === 'function') sound.playVictory();
          else if (typeof sound.playVictoryFanfare === 'function') sound.playVictoryFanfare();
        }
        this.startCampaign(this.selectedFactionId);
      });
    }
  }

  // =========================================================================
  // 3. Start Campaign & Lifecycle Bootstrapping
  // =========================================================================

  startCampaign(factionId = 'FAC_VIJAYANAGARA') {
    this.selectedFactionId = factionId;
    this.gameState.initNewGame(factionId);

    // Initialize Campaign Map
    const mapCanvas = document.getElementById('campaignCanvas');
    this.campaignMap = new CampaignMap(
      mapCanvas,
      this.gameState,
      (prov) => {
        if (this.campaignHud) {
          this.campaignHud.selectProvince(prov ? prov.id : null);
        }
      },
      (army) => {
        if (this.campaignHud) {
          this.campaignHud.selectArmy(army ? army.id : null);
        }
      }
    );

    // Initialize Campaign HUD
    const campaignView = document.getElementById('campaign-view') || document.body;
    this.campaignHud = new CampaignHud(
      campaignView,
      this.gameState,
      {
        onEndTurn: () => this.handleEndTurn(),
        onOpenDiplomacy: () => this.openDiplomacyModal(),
        onOpenTechnology: () => this.openTechModal(),
        onOpenCharacters: () => this.openCharacterModal(),
        onOpenSaveLoad: () => this.openSaveLoadModal(),
        onProvinceSelected: (provId) => {
          if (this.campaignMap) this.campaignMap.selectedProvinceId = provId;
        },
        onArmySelected: (armyId) => {
          if (this.campaignMap) this.campaignMap.selectedArmyId = armyId;
        },
        onConstructBuilding: (provId, buildingId) => this.handleConstructBuilding(provId, buildingId),
        onRecruitUnit: (provId, unitTypeId) => this.handleRecruitUnit(provId, unitTypeId),
        onAssignGovernor: (provId, characterId) => this.handleAssignGovernor(provId, characterId),
        onDismissGovernor: (provId) => this.handleDismissGovernor(provId),
        onTaxRateChange: (provId, rate) => this.handleTaxRateChange(provId, rate)
      }
    );

    // Wire Right-Click Move Command on Map
    this.campaignMap.setMoveCommandCallback((armyId, targetProvId) => {
      this.handleMoveArmy(armyId, targetProvId);
    });

    // Wire Map Zoom Controls
    const zoomInBtn = document.getElementById('btn-zoom-in');
    if (zoomInBtn) zoomInBtn.onclick = () => this.campaignMap.setViewport(undefined, undefined, this.campaignMap.zoom * 1.2);
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    if (zoomOutBtn) zoomOutBtn.onclick = () => this.campaignMap.setViewport(undefined, undefined, this.campaignMap.zoom / 1.2);
    const zoomResetBtn = document.getElementById('btn-zoom-reset');
    if (zoomResetBtn) zoomResetBtn.onclick = () => this.campaignMap.resetView();

    // Wire Map Layer Pilling
    document.querySelectorAll('.layer-pill').forEach(pill => {
      pill.onclick = () => {
        document.querySelectorAll('.layer-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.campaignMap.setLayer(pill.dataset.layer);
      };
    });

    // Wire Pre-Battle encounter modal buttons
    this.setupBattleModalHandlers();

    // Hide Start Modal & Activate Campaign View
    const startModal = document.getElementById('start-modal');
    if (startModal) startModal.classList.add('hidden');

    this.switchView('campaign-view');
    this.campaignHud.mount();
    this.campaignMap.render();

    this.campaignHud.addNotification({
      type: 'info',
      title: 'Campaign Commenced',
      message: `Reign of ${(this.gameState.getFaction(factionId)?.name || 'the realm')} declared in 1345 CE.`
    });

    // Expose globals
    if (typeof window !== 'undefined') {
      window.campaignMap = this.campaignMap;
      window.campaignHud = this.campaignHud;
    }
  }

  // =========================================================================
  // 4. View Toggling (Campaign vs. Tactical)
  // =========================================================================

  switchView(viewId) {
    this.activeView = viewId;
    if (typeof document === 'undefined') return;
    const cView = document.getElementById('campaign-view');
    const tView = document.getElementById('tactical-view');

    if (viewId === 'campaign-view') {
      if (tView) {
        tView.classList.remove('active');
        tView.classList.add('hidden');
      }
      if (cView) {
        cView.classList.remove('hidden');
        cView.classList.add('active');
      }
      if (this.campaignMap) this.campaignMap.render();
      if (this.campaignHud) this.campaignHud.update();
    } else if (viewId === 'tactical-view') {
      if (cView) {
        cView.classList.remove('active');
        cView.classList.add('hidden');
      }
      if (tView) {
        tView.classList.remove('hidden');
        tView.classList.add('active');
      }
    }
  }

  setupViewSwitching() {
    if (typeof window !== 'undefined') {
      window.switchGameView = (viewId) => this.switchView(viewId);
    }

    const retreatBtn = document.getElementById('btn-tactical-retreat');
    if (retreatBtn) {
      retreatBtn.onclick = () => {
        this.handleTacticalRetreat();
      };
    }
  }

  // =========================================================================
  // 5. Campaign Gameplay Actions
  // =========================================================================

  handleMoveArmy(armyId, targetProvId) {
    const army = this.gameState.getArmy(armyId);
    const targetProv = this.gameState.getProvince(targetProvId);
    if (!army || !targetProv) return;

    if (!areProvincesAdjacent(army.provinceId, targetProv.id)) return;

    // Check if target province contains a hostile army
    const hostileArmies = this.gameState.getArmiesInProvince(targetProvId).filter(a => a.factionId !== army.factionId);

    if (hostileArmies.length > 0) {
      // Trigger clash modal
      this.pendingBattle = {
        attackerArmy: army,
        defenderArmy: hostileArmies[0],
        province: targetProv
      };
      this.openBattleModal();
      return;
    }

    // Friendly/empty transit
    army.provinceId = targetProv.id;
    army.movementPoints = Math.max(0, (army.movementPoints || 100) - 50);

    if (sound && typeof sound.playMarch === 'function') {
      sound.playMarch();
    }

    if (this.campaignHud) {
      this.campaignHud.addNotification({
        type: 'info',
        title: 'Troop Transit',
        message: `${army.name} marched to ${targetProv.name}.`
      });
      this.campaignHud.update();
    }
    if (this.campaignMap) {
      this.campaignMap.render();
    }
  }

  handleConstructBuilding(provId, buildingId) {
    const prov = this.gameState.getProvince(provId);
    const b = getBuilding(buildingId);
    if (!prov || !b) return;

    const playerFac = this.gameState.getFaction(this.gameState.playerFactionId);
    if (!playerFac || playerFac.treasury < b.cost) {
      if (this.campaignHud) {
        this.campaignHud.addNotification({
          type: 'warning',
          title: 'Treasury Depleted',
          message: `Insufficient gold for ${b.name} (Requires ${b.cost}g).`
        });
      }
      return;
    }

    // Deduct cost and add building
    playerFac.treasury -= b.cost;
    if (!prov.activeBuildings) prov.activeBuildings = [...(prov.buildings || [])];
    prov.activeBuildings.push(b.id);
    if (!prov.buildings.includes(b.id)) prov.buildings.push(b.id);

    if (b.defenseRating) {
      prov.defenseLevel = Math.min(3, (prov.defenseLevel || 1) + 1);
    }

    if (sound && typeof sound.playClick === 'function') sound.playClick();

    if (this.campaignHud) {
      this.campaignHud.addNotification({
        type: 'success',
        title: 'Commission Completed',
        message: `${b.name} completed in ${prov.name}.`
      });
      this.campaignHud.update();
    }
    if (this.campaignMap) this.campaignMap.render();
  }

  handleRecruitUnit(provId, unitTypeId) {
    const prov = this.gameState.getProvince(provId);
    const unit = getUnitType(unitTypeId);
    if (!prov || !unit) return;

    const playerFac = this.gameState.getFaction(this.gameState.playerFactionId);
    if (!playerFac || playerFac.treasury < unit.recruitmentCost) {
      if (this.campaignHud) {
        this.campaignHud.addNotification({
          type: 'warning',
          title: 'Treasury Depleted',
          message: `Insufficient gold to recruit ${unit.name}.`
        });
      }
      return;
    }

    playerFac.treasury -= unit.recruitmentCost;

    // Find or create player army in province
    let army = this.gameState.getArmiesInProvince(provId).find(a => a.factionId === playerFac.id);
    if (!army) {
      army = this.gameState.createArmy(playerFac.id, provId, [], null, `${prov.name} Garrison Host`);
    }

    const newReg = {
      id: `REG_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      unitTypeId: unit.id,
      name: `${unit.name} (${prov.capitalCity || prov.name})`,
      hp: unit.maxHp,
      maxHp: unit.maxHp,
      morale: unit.baseMorale || 100,
      maxMorale: unit.baseMorale || 100,
      meleeAtk: unit.meleeAttack,
      meleeDef: unit.meleeDefense
    };

    army.regiments.push(newReg);

    if (sound && typeof sound.playClick === 'function') sound.playClick();

    if (this.campaignHud) {
      this.campaignHud.addNotification({
        type: 'success',
        title: 'Muster Complete',
        message: `${unit.name} mustered into ${army.name}.`
      });
      this.campaignHud.update();
    }
    if (this.campaignMap) this.campaignMap.render();
  }

  handleAssignGovernor(provId, characterId) {
    this.gameState.assignCharacterRole(characterId, 'GOVERNOR', provId);
    const char = this.gameState.getCharacter(characterId);
    const prov = this.gameState.getProvince(provId);

    if (sound && typeof sound.playClick === 'function') sound.playClick();

    if (this.campaignHud) {
      this.campaignHud.addNotification({
        type: 'info',
        title: 'Governor Appointed',
        message: `${char?.name} assigned to govern ${prov?.name}.`
      });
      this.campaignHud.update();
    }
    if (this.campaignMap) this.campaignMap.render();
  }

  handleDismissGovernor(provId) {
    const prov = this.gameState.getProvince(provId);
    if (prov && prov.governorId) {
      const govId = prov.governorId;
      this.gameState.assignCharacterRole(govId, 'IDLE');
      prov.governorId = null;

      if (this.campaignHud) {
        this.campaignHud.addNotification({
          type: 'info',
          title: 'Governor Relieved',
          message: `Governor relieved of post in ${prov.name}.`
        });
        this.campaignHud.update();
      }
      if (this.campaignMap) this.campaignMap.render();
    }
  }

  handleTaxRateChange(provId, rate) {
    const prov = this.gameState.getProvince(provId);
    if (this.campaignHud) {
      this.campaignHud.addNotification({
        type: 'info',
        title: 'Tax Policy Adjusted',
        message: `${prov?.name} tax rate set to ${rate}.`
      });
    }
  }

  handleEndTurn() {
    if (this.campaignHud) this.campaignHud.setProcessingState(true);

    setTimeout(() => {
      // 1. Process taxation and revenue collection for player
      const playerFacId = this.gameState.playerFactionId;
      const netIncome = this.campaignHud ? this.campaignHud.calculateNetIncome(playerFacId) : 100;
      this.gameState.modifyTreasury(playerFacId, netIncome);

      // 2. Advance turn in GameState
      this.gameState.advanceTurn();

      // 3. Process diplomacy lifecycle and vassal tributes
      tickDiplomacyTurn(this.gameState);

      // 4. Execute AI Faction Turns with Hostile Clash Detection
      let playerClash = null;
      const aiResults = processAiTurn(this.gameState, {
        onEncounterClash: (clash) => {
          if (!playerClash && (clash.defenderArmy?.factionId === playerFacId || clash.attackerArmy?.factionId === playerFacId)) {
            playerClash = clash;
          }
        }
      });

      // 5. Replenish movement points for all active armies
      Object.values(this.gameState.armies || {}).forEach(a => {
        a.movementPoints = a.maxMovementPoints || 100;
      });

      // 6. Update public order drift & rebellion checks
      const rebellions = this.gameState.processPublicOrderTurn(this.campaignHud?.taxPolicies || {});
      if (rebellions && rebellions.length > 0) {
        rebellions.forEach(reb => {
          if (this.campaignHud) {
            this.campaignHud.addNotification({
              type: 'danger',
              title: '🔥 ARMED REBELLION!',
              message: `Desperate populace in ${reb.province.name} took up arms! An insurgent rebel army has besieged the provincial citadel!`
            });
          }
        });
      }

      // 7. Check for completed technology research for player
      const playerTechProgress = this.gameState.techProgress?.[playerFacId];
      if (playerTechProgress?.unlockedTechs && playerTechProgress.unlockedTechs.length > 0) {
        const latestUnlocked = playerTechProgress.unlockedTechs[playerTechProgress.unlockedTechs.length - 1];
        if (this._lastNotifiedTech !== latestUnlocked) {
          this._lastNotifiedTech = latestUnlocked;
          const techObj = TECH_TREE?.[latestUnlocked];
          if (this.campaignHud) {
            this.campaignHud.addNotification({
              type: 'success',
              title: '✨ Technology Mastered!',
              message: `Imperial scholars have completed research into "${techObj?.name || latestUnlocked}". Empire-wide doctrines enacted!`
            });
          }
        }
      }

      // 8. Reset UI processing state & dispatch notifications
      if (this.campaignHud) {
        this.campaignHud.setProcessingState(false);
        this.campaignHud.addNotification({
          type: 'info',
          title: `Turn ${this.gameState.currentTurn} Commenced`,
          message: `Revenues collected (${netIncome >= 0 ? '+' : ''}${netIncome} gold). Imperial frontiers updated.`
        });

        // Dispatch notifications from AI activity if significant events occurred
        if (aiResults?.summary) {
          if (aiResults.summary.recruitedCount > 0) {
            this.campaignHud.addNotification({
              type: 'neutral',
              title: 'Foreign Intelligence',
              message: `Scouts report neighboring realms mustered ${aiResults.summary.recruitedCount} new regiments.`
            });
          }
          if (aiResults.summary.battlesFought > 0) {
            this.campaignHud.addNotification({
              type: 'warning',
              title: 'Border Clashes',
              message: `${aiResults.summary.battlesFought} skirmishes erupted across the subcontinent.`
            });
          }
        }

        this.campaignHud.update();
      }

      // 8. Visual Synchronization: Re-render Campaign Map
      if (this.campaignMap) {
        this.campaignMap.render();
      }

      if (sound && typeof sound.playClick === 'function') sound.playClick();

      // 9. If an AI army moved into a player-held province with stationed troops, open Battle Modal!
      if (playerClash) {
        this.pendingBattle = playerClash;
        this.openBattleModal();
      }
    }, 200);
  }

  // =========================================================================
  // 6. Pre-Battle Encounter Modal
  // =========================================================================

  openBattleModal() {
    if (!this.pendingBattle) return;
    const { attackerArmy, defenderArmy, province } = this.pendingBattle;

    const modal = document.getElementById('battle-modal');
    if (!modal) return;

    const attGen = attackerArmy.generalId ? this.gameState.getCharacter(attackerArmy.generalId) : null;
    const defGen = defenderArmy.generalId ? this.gameState.getCharacter(defenderArmy.generalId) : null;
    const attBonus = this.gameState.calculateGeneralCombatBonus(attackerArmy.generalId);
    const defBonus = this.gameState.calculateGeneralCombatBonus(defenderArmy.generalId);

    // Dynamic Win Probability & Powers
    const winProbObj = calculateWinProbability(attackerArmy, defenderArmy, province, attBonus, defBonus);
    const winPercent = Math.round(Number(winProbObj) * 100);

    const locEl = document.getElementById('battle-encounter-location');
    if (locEl) locEl.textContent = `Province: ${province.name} (${province.capitalCity || ''})`;

    // Attacker Dossier
    const attAvatar = document.getElementById('battle-attacker-avatar');
    if (attAvatar) attAvatar.textContent = attGen ? '👑' : '🚩';

    const attName = document.getElementById('battle-attacker-name');
    if (attName) attName.textContent = attGen ? `${attGen.name} (${attackerArmy.name})` : attackerArmy.name;

    const attStats = modal.querySelector('.army-side.attacker .commander-stats');
    if (attStats) {
      attStats.textContent = attGen
        ? `Command: ${attGen.attributes?.command ?? 0} | Dread: ${attGen.attributes?.dread ?? 0}`
        : 'No Commander Appointed';
    }

    const attPower = document.getElementById('battle-attacker-power');
    if (attPower) attPower.textContent = `Combat Power: ${Math.round(winProbObj.attackerPower).toLocaleString()}`;

    const attRoster = document.getElementById('battle-attacker-roster');
    if (attRoster) {
      attRoster.innerHTML = (attackerArmy.regiments || []).map(r => `
        <div class="roster-chip" style="font-size:0.75rem; padding:2px 6px; background:rgba(255,255,255,0.06); border-radius:4px; margin:2px; display:inline-block;">
          ${r.name || r.unitTypeId} <span class="mono" style="color:var(--stat-hp);">${r.hp || 100} HP</span>
        </div>
      `).join('');
    }

    // Defender Dossier
    const defAvatar = document.getElementById('battle-defender-avatar');
    if (defAvatar) defAvatar.textContent = defGen ? '🛡️' : '🚩';

    const defName = document.getElementById('battle-defender-name');
    if (defName) defName.textContent = defGen ? `${defGen.name} (${defenderArmy.name})` : defenderArmy.name;

    const defStats = modal.querySelector('.army-side.defender .commander-stats');
    if (defStats) {
      defStats.textContent = defGen
        ? `Command: ${defGen.attributes?.command ?? 0} | Dread: ${defGen.attributes?.dread ?? 0}`
        : 'No Commander Appointed';
    }

    const defPower = document.getElementById('battle-defender-power');
    if (defPower) defPower.textContent = `Combat Power: ${Math.round(winProbObj.defenderPower).toLocaleString()}`;

    const defRoster = document.getElementById('battle-defender-roster');
    if (defRoster) {
      defRoster.innerHTML = (defenderArmy.regiments || []).map(r => `
        <div class="roster-chip" style="font-size:0.75rem; padding:2px 6px; background:rgba(255,255,255,0.06); border-radius:4px; margin:2px; display:inline-block;">
          ${r.name || r.unitTypeId} <span class="mono" style="color:var(--stat-hp);">${r.hp || 100} HP</span>
        </div>
      `).join('');
    }

    // Odds and Terrain Buffs
    const oddsVal = document.getElementById('battle-win-chance');
    if (oddsVal) oddsVal.textContent = `${winPercent}%`;

    const buffsBox = document.getElementById('battle-terrain-buffs');
    if (buffsBox) {
      const terrainMod = getTerrainDefenseModifier(province);
      const fortMod = getFortificationModifier(province);
      const pills = [];
      if (terrainMod > 1.0) {
        pills.push(`<span class="buff-pill">⛰️ ${province.terrainType.replace('_', ' ')} (+${Math.round((terrainMod - 1) * 100)}% Def)</span>`);
      }
      if (fortMod > 1.0) {
        pills.push(`<span class="buff-pill">🏰 Fortification Lvl ${province.defenseLevel || 0} (+${Math.round((fortMod - 1) * 100)}% Def)</span>`);
      }
      buffsBox.innerHTML = pills.length > 0 ? pills.join(' ') : `<span class="buff-pill text-muted">Plains (Neutral)</span>`;
    }

    modal.classList.remove('hidden');
    if (sound && typeof sound.playHorn === 'function') sound.playHorn();
  }

  setupBattleModalHandlers() {
    const autoBtn = document.getElementById('btn-battle-autoresolve');
    if (autoBtn) {
      autoBtn.onclick = () => {
        const modal = document.getElementById('battle-modal');
        if (modal) modal.classList.add('hidden');

        if (!this.pendingBattle) return;
        const { attackerArmy, defenderArmy, province } = this.pendingBattle;

        // 1. Run auto-resolve calculation
        const rawResult = autoResolveBattle(attackerArmy, defenderArmy, province, this.gameState);

        // 2. Apply campaign state mutations
        const result = applyBattleOutcome(this.gameState, rawResult);

        // 3. Audio feedback
        const playerWon = (result.attackerWins && attackerArmy.factionId === this.gameState.playerFactionId) ||
                          (!result.attackerWins && defenderArmy.factionId === this.gameState.playerFactionId);
        if (sound) {
          if (playerWon && typeof sound.playVictory === 'function') {
            sound.playVictory();
          } else if (!playerWon && typeof sound.playDefeat === 'function') {
            sound.playDefeat();
          } else if (typeof sound.playCombatClash === 'function') {
            sound.playCombatClash();
          }
        }

        // 4. Dispatch Campaign Notification
        if (this.campaignHud) {
          const outcomeText = result.outcome.replace('_', ' ');
          const notifType = playerWon ? 'success' : 'danger';
          let msg = `${result.attacker.armyName} fought ${result.defender.armyName} at ${province.name} (${outcomeText}). `;
          msg += `Losses: ${result.attacker.destroyed.length} attacker, ${result.defender.destroyed.length} defender regiments destroyed.`;
          if (result.conquered || result.provinceConquered) {
            msg += ` 🚩 ${province.name} has been captured!`;
          }
          if (result.generalFates?.defender?.status === 'DECEASED') {
            msg += ` 💀 Defending general ${result.generalFates.defender.name} was slain!`;
          } else if (result.generalFates?.defender?.status === 'CAPTURED') {
            msg += ` ⛓️ Defending general ${result.generalFates.defender.name} was taken captive!`;
          }
          this.campaignHud.addNotification({
            type: notifType,
            title: `Auto-Resolve: ${outcomeText}`,
            message: msg
          });
        }

        // 5. Clean up selection states if selected entities were destroyed
        if (this.campaignMap) {
          if (this.campaignMap.selectedArmyId && !this.gameState.getArmy(this.campaignMap.selectedArmyId)) {
            this.campaignMap.selectedArmyId = null;
          }
          if (result.conquered || result.provinceConquered) {
            this.campaignMap.selectedProvinceId = province.id;
          }
          this.campaignMap.render();
        }

        if (this.campaignHud) {
          if (this.campaignHud.selectedArmyId && !this.gameState.getArmy(this.campaignHud.selectedArmyId)) {
            this.campaignHud.deselectAll();
          }
          if (result.conquered || result.provinceConquered) {
            this.campaignHud.selectProvince(province.id);
          } else {
            this.campaignHud.update();
          }
        }

        this.pendingBattle = null;
      };
    }

    const manualBtn = document.getElementById('btn-battle-manual');
    if (manualBtn) {
      manualBtn.onclick = () => {
        const modal = document.getElementById('battle-modal');
        if (modal) modal.classList.add('hidden');
        this.startTacticalBattle();
      };
    }

    const retreatBtn = document.getElementById('btn-battle-retreat');
    if (retreatBtn) {
      retreatBtn.onclick = () => {
        const modal = document.getElementById('battle-modal');
        if (modal) modal.classList.add('hidden');
        this.pendingBattle = null;
      };
    }
  }

  startTacticalBattle() {
    if (!this.pendingBattle) return;
    const { attackerArmy, defenderArmy, province } = this.pendingBattle;
    const canvas = document.getElementById('tacticalCanvas');
    if (!canvas) {
      this.switchView('tactical-view');
      return;
    }

    this.switchView('tactical-view');

    const attGen = attackerArmy.generalId ? this.gameState.getCharacter(attackerArmy.generalId) : null;
    const defGen = defenderArmy.generalId ? this.gameState.getCharacter(defenderArmy.generalId) : null;

    this.tacticalBattlefield = new TacticalBattlefield({
      canvas,
      attackerArmy,
      defenderArmy,
      province,
      attackerGeneral: attGen,
      defenderGeneral: defGen,
      gameState: this.gameState,
      onBattleEnd: (result) => this.handleTacticalBattleEnd(result)
    });

    this.tacticalBattlefield.start();
  }

  handleTacticalBattleEnd(tacticalOutcome) {
    if (!this.pendingBattle) return;
    const { attackerArmy, defenderArmy, province } = this.pendingBattle;

    // 1. Feed tactical outcome into applyBattleOutcome
    const result = applyBattleOutcome(this.gameState, tacticalOutcome);

    // 2. Audio feedback
    const playerWon = (result.attackerWins && attackerArmy.factionId === this.gameState.playerFactionId) ||
                      (!result.attackerWins && defenderArmy.factionId === this.gameState.playerFactionId);
    if (sound) {
      if (playerWon && typeof sound.playVictory === 'function') {
        sound.playVictory();
      } else if (!playerWon && typeof sound.playDefeat === 'function') {
        sound.playDefeat();
      } else if (typeof sound.playCombatClash === 'function') {
        sound.playCombatClash();
      }
    }

    // 3. Campaign Notification
    if (this.campaignHud) {
      const outcomeText = (result.outcome || 'VICTORY').replace(/_/g, ' ');
      const notifType = playerWon ? 'success' : 'danger';
      let msg = `${result.attacker.armyName} fought ${result.defender.armyName} at ${province.name} (${outcomeText}). `;
      msg += `Losses: ${result.attacker.destroyed.length} attacker, ${result.defender.destroyed.length} defender regiments destroyed.`;
      if (result.conquered || result.provinceConquered) {
        msg += ` 🚩 ${province.name} has been captured!`;
      }
      if (result.generalFates?.defender?.status === 'DECEASED') {
        msg += ` 💀 Defending general ${result.generalFates.defender.name} was slain!`;
      } else if (result.generalFates?.defender?.status === 'CAPTURED') {
        msg += ` ⛓️ Defending general ${result.generalFates.defender.name} was taken captive!`;
      }
      if (result.generalFates?.attacker?.status === 'DECEASED') {
        msg += ` 💀 Attacking general ${result.generalFates.attacker.name} was slain!`;
      } else if (result.generalFates?.attacker?.status === 'CAPTURED') {
        msg += ` ⛓️ Attacking general ${result.generalFates.attacker.name} was taken captive!`;
      }
      this.campaignHud.addNotification({
        type: notifType,
        title: `Tactical Battle: ${outcomeText}`,
        message: msg
      });
    }

    // 4. Update Campaign Map & HUD Selection
    if (this.campaignMap) {
      if (this.campaignMap.selectedArmyId && !this.gameState.getArmy(this.campaignMap.selectedArmyId)) {
        this.campaignMap.selectedArmyId = null;
      }
      if (result.conquered || result.provinceConquered) {
        this.campaignMap.selectedProvinceId = province.id;
      }
      this.campaignMap.render();
    }

    if (this.campaignHud) {
      if (this.campaignHud.selectedArmyId && !this.gameState.getArmy(this.campaignHud.selectedArmyId)) {
        this.campaignHud.deselectAll();
      }
      if (result.conquered || result.provinceConquered) {
        this.campaignHud.selectProvince(province.id);
      } else {
        this.campaignHud.update();
      }
    }

    // 5. Cleanup Tactical View & Return to Campaign
    if (this.tacticalBattlefield) {
      this.tacticalBattlefield.destroy();
      this.tacticalBattlefield = null;
    }
    this.pendingBattle = null;
    this.switchView('campaign-view');
  }

  handleTacticalRetreat() {
    if (this.tacticalBattlefield) {
      if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
        const confirmed = window.confirm('Sound full tactical withdrawal? Your army will concede the field.');
        if (!confirmed) return;
      }
      if (sound && typeof sound.playPanicHorn === 'function') sound.playPanicHorn();
      const playerSide = (this.pendingBattle?.attackerArmy?.factionId === this.gameState?.playerFactionId) ? 'ATTACKER' : 'DEFENDER';
      const outcome = this.tacticalBattlefield.engine.retreat(playerSide);
      this.handleTacticalBattleEnd(outcome);
    } else {
      this.switchView('campaign-view');
      this.pendingBattle = null;
    }
  }

  // =========================================================================
  // 7. Modals: Diplomacy, Tech, Characters, Save/Load
  // =========================================================================

  setupModalListeners() {
    if (typeof document === 'undefined') return;
    const bindModal = (btnId, modalId, closeBtnId) => {
      const btn = document.getElementById(btnId);
      const modal = document.getElementById(modalId);
      const closeBtn = document.getElementById(closeBtnId);
      if (btn && modal) {
        btn.addEventListener('click', () => {
          modal.classList.remove('hidden');
          if (sound && typeof sound.playClick === 'function') sound.playClick();
        });
      }
      if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
          modal.classList.add('hidden');
          if (sound && typeof sound.playClick === 'function') sound.playClick();
        });
      }
    };

    bindModal('btn-open-diplomacy', 'diplomacy-modal', 'btn-close-diplomacy');
    bindModal('btn-open-tech', 'tech-modal', 'btn-close-tech');
    bindModal('btn-open-characters', 'character-modal', 'btn-close-characters');
    bindModal('btn-open-saveload', 'save-load-modal', 'btn-close-saveload');

    // Wire Character Filter Buttons
    document.querySelectorAll('.character-filter-bar .filter-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.character-filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderCharacterLedger(btn.dataset.role);
      };
    });

    // Wire Tech Branch Tabs
    document.querySelectorAll('.tech-branch-tabs .tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tech-branch-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTechBranch = btn.dataset.branch;
        this.renderTechTree(this.currentTechBranch);
      };
    });

    // Wire Save/Load Buttons
    const quickSaveBtn = document.getElementById('btn-quick-save');
    if (quickSaveBtn) {
      quickSaveBtn.onclick = () => {
        this.gameState.saveToLocalStorage();
        if (this.campaignHud) {
          this.campaignHud.addNotification({
            type: 'success',
            title: 'Campaign Saved',
            message: 'Game state saved to browser local storage.'
          });
        }
      };
    }

    const quickLoadBtn = document.getElementById('btn-quick-load');
    if (quickLoadBtn) {
      quickLoadBtn.onclick = () => {
        try {
          this.gameState.loadFromLocalStorage();
          this.campaignHud.update();
          this.campaignMap.render();
          if (this.campaignHud) {
            this.campaignHud.addNotification({
              type: 'info',
              title: 'Campaign Loaded',
              message: 'State restored successfully.'
            });
          }
        } catch (e) {
          alert('No saved campaign found in browser storage.');
        }
      };
    }

    const exportBtn = document.getElementById('btn-export-json');
    const textarea = document.getElementById('save-json-textarea');
    if (exportBtn && textarea) {
      exportBtn.onclick = () => {
        textarea.value = this.gameState.serialize();
      };
    }

    const importBtn = document.getElementById('btn-import-json');
    if (importBtn && textarea) {
      importBtn.onclick = () => {
        try {
          this.gameState.deserialize(textarea.value);
          this.campaignHud.update();
          this.campaignMap.render();
          const modal = document.getElementById('save-load-modal');
          if (modal) modal.classList.add('hidden');
        } catch (err) {
          alert(`Failed to load JSON: ${err.message}`);
        }
      };
    }

    // Wire Disk Save / Load Buttons (Server API)
    const serverSaveBtn = document.getElementById('btn-server-save');
    const serverLoadBtn = document.getElementById('btn-server-load');
    const serverSavesList = document.getElementById('server-saves-list');

    const refreshServerSaves = async () => {
      if (!serverSavesList) return;
      serverSavesList.innerHTML = '<div style="font-size:0.75rem; color:#94a3b8; padding:4px;">Fetching disk saves...</div>';
      serverSavesList.classList.remove('hidden');
      try {
        const res = await fetch('/api/saves');
        const json = await res.json();
        if (!json.success || !json.saves || json.saves.length === 0) {
          serverSavesList.innerHTML = '<div style="font-size:0.75rem; color:#94a3b8; padding:4px;">No disk save files found in /saves directory.</div>';
          return;
        }

        serverSavesList.innerHTML = json.saves.map(s => {
          const dt = new Date(s.modified).toLocaleString();
          const kb = (s.sizeBytes / 1024).toFixed(1);
          return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:6px; border-bottom:1px solid #1e293b; font-size:0.8rem;">
              <div>
                <strong style="color:#38bdf8;">${s.filename}</strong>
                <span style="color:#64748b; margin-left:8px; font-size:0.7rem;">${dt} (${kb} KB)</span>
              </div>
              <button class="btn btn-sm btn-accent btn-load-server-file" data-file="${s.filename}" style="padding:2px 8px; font-size:0.75rem;">Load</button>
            </div>
          `;
        }).join('');

        serverSavesList.querySelectorAll('.btn-load-server-file').forEach(b => {
          b.onclick = async () => {
            const fname = b.dataset.file;
            try {
              const fileRes = await fetch(`/api/save/${encodeURIComponent(fname)}`);
              const fileJson = await fileRes.json();
              if (fileJson.success && fileJson.state) {
                const raw = typeof fileJson.state === 'string' ? fileJson.state : JSON.stringify(fileJson.state);
                this.gameState.deserialize(raw);
                this.campaignHud.update();
                this.campaignMap.render();
                const modal = document.getElementById('save-load-modal');
                if (modal) modal.classList.add('hidden');
                if (this.campaignHud) {
                  this.campaignHud.addNotification({
                    type: 'success',
                    title: 'Campaign Loaded',
                    message: `Restored campaign state from ${fname}.`
                  });
                }
              } else {
                alert(`Failed to load ${fname}: ${fileJson.error || 'Unknown error'}`);
              }
            } catch (loadErr) {
              alert(`Error loading save file: ${loadErr.message}`);
            }
          };
        });
      } catch (err) {
        serverSavesList.innerHTML = `<div style="font-size:0.75rem; color:#f87171; padding:4px;">Cannot reach server API: ${err.message}</div>`;
      }
    };

    if (serverSaveBtn) {
      serverSaveBtn.onclick = async () => {
        const facId = this.gameState.playerFactionId || 'PLAYER';
        const saveName = `${facId}_turn${this.gameState.currentTurn}_${Date.now()}`;
        try {
          const res = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: saveName,
              state: this.gameState.serialize()
            })
          });
          const json = await res.json();
          if (json.success) {
            if (this.campaignHud) {
              this.campaignHud.addNotification({
                type: 'success',
                title: 'Saved to Disk',
                message: `Campaign persisted to /saves/${json.filename}`
              });
            }
            if (serverSavesList && !serverSavesList.classList.contains('hidden')) {
              refreshServerSaves();
            }
          } else {
            alert(`Disk save failed: ${json.error || 'Server error'}`);
          }
        } catch (err) {
          alert(`Could not save to disk (is server.js running?): ${err.message}`);
        }
      };
    }

    if (serverLoadBtn) {
      serverLoadBtn.onclick = () => {
        if (serverSavesList && !serverSavesList.classList.contains('hidden')) {
          serverSavesList.classList.add('hidden');
        } else {
          refreshServerSaves();
        }
      };
    }

    // Wire Diplomacy Modal Elements
    const TREATY_TYPE_MAP = {
      PEACE: 'PEACE_TREATY',
      PEACE_TREATY: 'PEACE_TREATY',
      NON_AGGRESSION: 'NON_AGGRESSION_PACT',
      NON_AGGRESSION_PACT: 'NON_AGGRESSION_PACT',
      TRADE: 'TRADE_AGREEMENT',
      TRADE_AGREEMENT: 'TRADE_AGREEMENT',
      ALLIANCE: 'MILITARY_ALLIANCE',
      MILITARY_ALLIANCE: 'MILITARY_ALLIANCE',
      VASSALAGE: 'VASSALAGE'
    };

    // Wire Treaty Type Selector Buttons (.btn-treaty)
    document.querySelectorAll('.btn-treaty').forEach(btn => {
      btn.onclick = () => {
        const rawType = btn.dataset.treaty;
        this.selectedTreatyType = TREATY_TYPE_MAP[rawType] || rawType;
        if (sound && typeof sound.playClick === 'function') sound.playClick();
        this.renderDiplomacyDossier(this.currentDiploTargetId);
      };
    });

    // Wire Dynamic Sweetener Slider
    const sweetenerSlider = document.getElementById('diplo-gold-sweetener');
    if (sweetenerSlider) {
      sweetenerSlider.oninput = (e) => {
        this.diploSweetenerGold = parseInt(e.target.value, 10) || 0;
        const sweetenerValEl = document.getElementById('diplo-sweetener-val');
        if (sweetenerValEl) sweetenerValEl.textContent = `${this.diploSweetenerGold} Gold`;
        this.updateDiplomacyAcceptancePreview();
      };
    }

    // Wire Send Emissary Button (#btn-send-emissary)
    const sendEnvoyBtn = document.getElementById('btn-send-emissary');
    if (sendEnvoyBtn) {
      sendEnvoyBtn.onclick = () => {
        const playerFacId = this.gameState.playerFactionId;
        const targetFacId = this.currentDiploTargetId;
        const playerFac = this.gameState.getFaction(playerFacId);
        const targetFac = this.gameState.getFaction(targetFacId);

        if (!playerFac || !targetFac) return;

        // 1. Treasury Validation for Sweetener
        if (this.diploSweetenerGold > 0 && playerFac.treasury < this.diploSweetenerGold) {
          if (this.campaignHud) {
            this.campaignHud.addNotification({
              type: 'warning',
              title: 'Insufficient Treasury',
              message: `Cannot dispatch envoy: Offered sweetener of ${this.diploSweetenerGold}g exceeds imperial treasury (${playerFac.treasury}g).`
            });
          }
          return;
        }

        // 2. Evaluate Proposal via diplomacyAi.js
        const currentRelation = this.gameState.diplomacy?.relations?.[playerFacId]?.[targetFacId] ?? 0;
        const diplomatChar = Object.values(this.gameState.characters || {}).find(c => 
          c.factionId === playerFacId && c.alive && c.currentRole === 'MINISTER'
        ) || null;

        const evalResult = evaluateTreatyProposal({
          gameState: this.gameState,
          treatyType: this.selectedTreatyType,
          proposingFaction: playerFac,
          targetFaction: targetFac,
          diplomatCharacter: diplomatChar,
          sweetenerGold: this.diploSweetenerGold,
          currentRelation,
          isAtWar: currentRelation <= -50
        });

        const treatyLabel = this.selectedTreatyType.replace(/_/g, ' ');

        if (evalResult.accepted) {
          // 3. Acceptance: Execute Treaty & Apply State Mutations
          const execRes = executeTreaty(this.gameState, this.selectedTreatyType, playerFacId, targetFacId, this.diploSweetenerGold);

          if (execRes.success) {
            if (sound) {
              if (typeof sound.playVictoryFanfare === 'function') sound.playVictoryFanfare();
              else if (typeof sound.playVictory === 'function') sound.playVictory();
              else if (typeof sound.playClick === 'function') sound.playClick();
            }

            if (this.campaignHud) {
              this.campaignHud.addNotification({
                type: 'success',
                title: 'Treaty Ratified!',
                message: `${targetFac.name} agreed to the ${treatyLabel}! Bilateral relations improved.`
              });
              this.campaignHud.update();
            }

            // Reset sweetener slider for next proposal
            this.diploSweetenerGold = 0;
            this.renderDiplomacyDossier(targetFacId);
          } else {
            if (this.campaignHud) {
              this.campaignHud.addNotification({
                type: 'info',
                title: 'Treaty Active',
                message: execRes.message
              });
            }
          }
        } else {
          // 4. Rejection: Slight diplomatic friction & notification
          if (!this.gameState.diplomacy.relations) this.gameState.diplomacy.relations = {};
          if (!this.gameState.diplomacy.relations[playerFacId]) this.gameState.diplomacy.relations[playerFacId] = {};
          if (!this.gameState.diplomacy.relations[targetFacId]) this.gameState.diplomacy.relations[targetFacId] = {};

          this.gameState.diplomacy.relations[playerFacId][targetFacId] = Math.max(-100, currentRelation - 5);
          this.gameState.diplomacy.relations[targetFacId][playerFacId] = Math.max(-100, currentRelation - 5);

          if (sound) {
            if (typeof sound.playDefeatSound === 'function') sound.playDefeatSound();
            else if (typeof sound.playClick === 'function') sound.playClick();
          }

          if (this.campaignHud) {
            this.campaignHud.addNotification({
              type: 'warning',
              title: 'Proposal Dismissed',
              message: `${targetFac.name} rejected our terms for ${treatyLabel} (Score: ${evalResult.score} vs Threshold: ${evalResult.threshold}).`
            });
          }

          this.renderDiplomacyDossier(targetFacId);
        }
      };
    }
  }

  openDiplomacyModal() {
    const modal = document.getElementById('diplomacy-modal');
    if (!modal) return;
    this.renderDiplomacyList();
    modal.classList.remove('hidden');
  }

  renderDiplomacyList() {
    const list = document.getElementById('diplo-factions-list');
    if (!list) return;

    const playerFacId = this.gameState.playerFactionId;
    const factions = Object.values(this.gameState.factions || {}).filter(f => f.id !== playerFacId);

    list.innerHTML = factions.map(f => `
      <div class="foreign-faction-item ${f.id === this.currentDiploTargetId ? 'selected' : ''}" data-faction-id="${f.id}">
        <div class="heraldic-shield" style="width: 24px; height: 30px; font-size: 0.8rem; background: linear-gradient(135deg, ${f.primaryColor}, ${f.secondaryColor})">🛡️</div>
        <div>
          <div class="bold" style="font-size: 0.75rem; color: #fff;">${f.name}</div>
          <div class="mono text-muted" style="font-size: 0.65rem;">Personality: ${(f.aiPersonality || '').replace('_', ' ')}</div>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('.foreign-faction-item').forEach(item => {
      item.onclick = () => {
        list.querySelectorAll('.foreign-faction-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        this.currentDiploTargetId = item.dataset.factionId;
        this.renderDiplomacyDossier(this.currentDiploTargetId);
      };
    });

    this.renderDiplomacyDossier(this.currentDiploTargetId);
  }

  renderDiplomacyDossier(facId) {
    const f = this.gameState.getFaction(facId);
    if (!f) return;

    const playerFacId = this.gameState.playerFactionId;
    const playerFac = this.gameState.getFaction(playerFacId);

    // 1. Faction Identity & Shield
    const nameEl = document.getElementById('diplo-faction-name');
    if (nameEl) nameEl.textContent = f.name;

    const rulerEl = document.getElementById('diplo-ruler-title');
    if (rulerEl) {
      const ruler = f.rulerId ? this.gameState.getCharacter(f.rulerId) : null;
      rulerEl.textContent = ruler ? `${ruler.title || 'Ruler'} ${ruler.name}` : f.shortName;
    }

    const badgeEl = document.getElementById('diplo-personality-badge');
    if (badgeEl) badgeEl.textContent = (f.aiPersonality || 'DEFENSIVE').replace(/_/g, ' ');

    const shieldEl = document.getElementById('diplo-shield');
    if (shieldEl) {
      shieldEl.style.background = `linear-gradient(135deg, ${f.primaryColor}, ${f.secondaryColor})`;
    }

    // 2. Bilateral Relations Bar & Attitude Text
    const currentRelation = this.gameState.diplomacy?.relations?.[playerFacId]?.[facId] ?? 0;
    const relValEl = document.getElementById('diplo-relation-val');
    const relBarEl = document.getElementById('diplo-relation-bar');

    let attitudeText = 'Neutral';
    if (currentRelation <= -60) attitudeText = 'Open Hostilities / War';
    else if (currentRelation <= -25) attitudeText = 'Hostile';
    else if (currentRelation < 0) attitudeText = 'Distrustful';
    else if (currentRelation >= 60) attitudeText = 'Brotherly Alliance';
    else if (currentRelation >= 25) attitudeText = 'Amicable';

    if (relValEl) {
      const sign = currentRelation > 0 ? '+' : '';
      relValEl.textContent = `${sign}${currentRelation} (${attitudeText})`;
      relValEl.className = `mono bold ${currentRelation >= 25 ? 'text-green' : currentRelation < 0 ? 'text-danger' : 'text-gold'}`;
    }

    if (relBarEl) {
      const pct = Math.max(0, Math.min(100, Math.round(((currentRelation + 100) / 200) * 100)));
      relBarEl.style.width = `${pct}%`;
      if (currentRelation >= 25) {
        relBarEl.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      } else if (currentRelation < -20) {
        relBarEl.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
      } else {
        relBarEl.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      }
    }

    // 3. Active Treaties Tags
    const activeTreatiesEl = document.getElementById('diplo-active-treaties-list');
    if (activeTreatiesEl) {
      const allTreaties = this.gameState.diplomacy?.treaties || [];
      const factionTreaties = allTreaties.filter(t => 
        t.isActive && !t.broken &&
        ((t.signatories && t.signatories.includes(playerFacId) && t.signatories.includes(facId)) ||
         (t.faction1Id === playerFacId && t.faction2Id === facId) ||
         (t.faction1Id === facId && t.faction2Id === playerFacId))
      );

      if (factionTreaties.length === 0) {
        activeTreatiesEl.innerHTML = `<span class="treaty-tag none">${currentRelation <= -50 ? 'No active treaties (Open Hostilities)' : 'No active treaties (Peaceful Coexistence)'}</span>`;
      } else {
        activeTreatiesEl.innerHTML = factionTreaties.map(t => {
          const treatyLabel = (t.type || '').replace(/_/g, ' ');
          return `<span class="treaty-tag active">📜 ${treatyLabel} (Turn ${t.startTurn || t.turnSigned || 1})</span>`;
        }).join(' ');
      }
    }

    // 4. Highlight Selected Treaty Button
    const TREATY_MAP = {
      PEACE: 'PEACE_TREATY',
      PEACE_TREATY: 'PEACE_TREATY',
      NON_AGGRESSION: 'NON_AGGRESSION_PACT',
      NON_AGGRESSION_PACT: 'NON_AGGRESSION_PACT',
      TRADE: 'TRADE_AGREEMENT',
      TRADE_AGREEMENT: 'TRADE_AGREEMENT',
      ALLIANCE: 'MILITARY_ALLIANCE',
      MILITARY_ALLIANCE: 'MILITARY_ALLIANCE',
      VASSALAGE: 'VASSALAGE'
    };
    document.querySelectorAll('.btn-treaty').forEach(btn => {
      const rawType = btn.dataset.treaty;
      const mapped = TREATY_MAP[rawType] || rawType;
      btn.classList.toggle('active', mapped === this.selectedTreatyType);
    });

    // 5. Update Sweetener Slider & Text Display
    const slider = document.getElementById('diplo-gold-sweetener');
    const sweetenerValEl = document.getElementById('diplo-sweetener-val');
    if (slider) {
      slider.value = this.diploSweetenerGold;
      const maxTreasury = playerFac?.treasury || 1000;
      slider.max = Math.max(1000, maxTreasury);
    }
    if (sweetenerValEl) {
      sweetenerValEl.textContent = `${this.diploSweetenerGold} Gold`;
    }

    // 6. Recalculate and Display Live AI Acceptance Status
    this.updateDiplomacyAcceptancePreview();
  }

  updateDiplomacyAcceptancePreview() {
    const targetFacId = this.currentDiploTargetId;
    const playerFacId = this.gameState.playerFactionId;
    const targetFaction = this.gameState.getFaction(targetFacId);
    const proposingFaction = this.gameState.getFaction(playerFacId);
    if (!targetFaction || !proposingFaction) return;

    const currentRelation = this.gameState.diplomacy?.relations?.[playerFacId]?.[targetFacId] ?? 0;

    const diplomatChar = Object.values(this.gameState.characters || {}).find(c => 
      c.factionId === playerFacId && c.alive && c.currentRole === 'MINISTER'
    ) || null;

    const evaluation = evaluateTreatyProposal({
      gameState: this.gameState,
      treatyType: this.selectedTreatyType,
      proposingFaction,
      targetFaction,
      diplomatCharacter: diplomatChar,
      sweetenerGold: this.diploSweetenerGold,
      currentRelation,
      isAtWar: currentRelation <= -50
    });

    const statusEl = document.getElementById('diplo-acceptance-status');
    if (statusEl) {
      const scoreSign = evaluation.score >= 0 ? '+' : '';
      if (evaluation.accepted) {
        statusEl.textContent = `${evaluation.likelihood} (Score: ${scoreSign}${evaluation.score} / Req: ${evaluation.threshold})`;
        statusEl.className = 'mono bold text-green';
      } else {
        statusEl.textContent = `${evaluation.likelihood} (Score: ${scoreSign}${evaluation.score} / Req: ${evaluation.threshold})`;
        statusEl.className = 'mono bold text-danger';
      }
    }
  }

  openTechModal() {
    const modal = document.getElementById('tech-modal');
    if (!modal) return;
    this.renderTechTree(this.currentTechBranch);
    modal.classList.remove('hidden');
  }

  renderTechTree(branchName = 'MILITARY') {
    const workspace = document.getElementById('tech-tree-workspace');
    if (!workspace) return;

    const playerFacId = this.gameState.playerFactionId;
    const progress = this.gameState.techProgress?.[playerFacId] || { unlockedTechs: [], activeTechId: null, pointsPerTurn: 40 };
    const unlocked = progress.unlockedTechs || [];
    const activeTechId = progress.activeTechId;
    const rateIndicator = document.getElementById('tech-rate-indicator');
    if (rateIndicator) {
      rateIndicator.textContent = `Research Rate: ${progress.pointsPerTurn || 40} RP / turn`;
    }

    const techs = Object.values(TECH_TREE || {}).filter(t => t.branch === branchName);

    workspace.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 14px;">
        ${techs.map(t => {
          const isMastered = unlocked.includes(t.id);
          const isCurrent = activeTechId === t.id;
          let borderStyle = 'border: 1px solid var(--border-gold-subtle);';
          let badge = `<span class="mono text-gold" style="font-size: 0.65rem;">TIER ${t.tier}</span>`;
          let actionBtn = `<button class="btn btn-sm btn-accent btn-start-research" data-tech-id="${t.id}" style="margin-top: 6px; font-size: 0.68rem;">Research</button>`;

          if (isMastered) {
            borderStyle = 'border: 2px solid #22c55e; background: rgba(34, 197, 94, 0.08);';
            badge = `<span class="mono" style="font-size: 0.65rem; color: #22c55e; font-weight: bold;">✓ MASTERED</span>`;
            actionBtn = `<button class="btn btn-sm" disabled style="margin-top: 6px; font-size: 0.68rem; opacity: 0.6; cursor: default;">✓ Completed</button>`;
          } else if (isCurrent) {
            borderStyle = 'border: 2px solid #38bdf8; background: rgba(56, 189, 248, 0.12);';
            badge = `<span class="mono" style="font-size: 0.65rem; color: #38bdf8; font-weight: bold;">⚡ IN PROGRESS (${t.cost - progress.remainingCost}/${t.cost} RP)</span>`;
            actionBtn = `<button class="btn btn-sm btn-secondary" disabled style="margin-top: 6px; font-size: 0.68rem; cursor: default;">Researching...</button>`;
          }

          return `
            <div style="background: rgba(16,22,34,0.85); ${borderStyle} border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px;">
              ${badge}
              <div class="bold" style="font-size: 0.85rem; color: #fff;">${t.name}</div>
              <div class="text-muted" style="font-size: 0.7rem; flex: 1;">${t.description}</div>
              <div class="mono text-cyan" style="font-size: 0.68rem;">Cost: ${t.cost} RP</div>
              ${actionBtn}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Wire research button clicks
    workspace.querySelectorAll('.btn-start-research').forEach(btn => {
      btn.onclick = () => {
        const techId = btn.dataset.techId;
        const success = this.gameState.setResearch(playerFacId, techId);
        if (success) {
          const tech = TECH_TREE[techId];
          if (sound && typeof sound.playClick === 'function') sound.playClick();
          if (this.campaignHud) {
            this.campaignHud.addNotification({
              type: 'info',
              title: 'Research Initiated',
              message: `Imperial scholars began researching "${tech?.name || techId}". (${Math.ceil((tech?.cost || 100) / (progress.pointsPerTurn || 40))} turns remaining)`
            });
          }
          this.renderTechTree(branchName);
        }
      };
    });
  }

  openCharacterModal() {
    const modal = document.getElementById('character-modal');
    if (!modal) return;
    this.renderCharacterLedger('all');
    modal.classList.remove('hidden');
  }

  renderCharacterLedger(roleFilter = 'all') {
    const grid = document.getElementById('characters-ledger-grid');
    if (!grid) return;

    let chars = Object.values(this.gameState.characters || {});
    if (roleFilter !== 'all') {
      chars = chars.filter(c => c.currentRole === roleFilter);
    }

    grid.innerHTML = chars.map(c => `
      <div class="character-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong class="text-gold" style="font-size: 0.9rem;">${c.name}</strong>
          <span class="tag" style="font-size: 0.62rem;">${c.currentRole || 'IDLE'}</span>
        </div>
        <div class="text-muted" style="font-size: 0.72rem;">${c.title || 'Noble'} (${c.age || 35} yrs)</div>
        <div class="mono" style="font-size: 0.7rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 4px;">
          <span>COM: ${c.attributes?.command ?? 5}</span>
          <span>GOV: ${c.attributes?.governance ?? 5}</span>
          <span>DIP: ${c.attributes?.diplomacy ?? 5}</span>
          <span>DRE: ${c.attributes?.dread ?? 2}</span>
          <span>PIE: ${c.attributes?.piety ?? 5}</span>
          <span>LOY: ${c.loyalty ?? 80}</span>
        </div>
        <div style="font-size: 0.68rem; color: #94a3b8; font-style: italic;">
          Traits: ${(c.traits || []).join(', ') || 'None'}
        </div>
      </div>
    `).join('');
  }

  openSaveLoadModal() {
    const modal = document.getElementById('save-load-modal');
    if (!modal) return;
    const textarea = document.getElementById('save-json-textarea');
    if (textarea) textarea.value = this.gameState.serialize();
    modal.classList.remove('hidden');
  }
}

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.gameApp = new GameApp();
    window.gameApp.init();
  });
}
