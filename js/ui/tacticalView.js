/**
 * js/ui/tacticalView.js
 * 
 * Interactive HTML5 Canvas Renderer & Tactical UI Coordinator
 * For 14th-Century Indian Subcontinent Grand Strategy Game.
 * 
 * Renders on #tacticalCanvas (1000x700 px, 20x14 tile grid).
 * Coordinates:
 * - Doctrinal cards dock (#tactical-cards-dock)
 * - Regiment telemetry inspector (#tactical-unit-inspector)
 * - Combat dispatch feed (#tactical-battle-log)
 * - Balance of power header (#tactical-balance-fill, #tactical-player-power, #tactical-enemy-power)
 * - Tactical withdrawal / retreat
 */

import { TacticalEngine, TacticalCombatMath, FACING } from '../engine/tacticalEngine.js';
import { sound } from '../sound.js';

export class TacticalBattlefield {
  constructor(config) {
    this.canvas = config.canvas;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.onBattleEnd = config.onBattleEnd || (() => {});
    this.gameState = config.gameState || null;

    // Tactical Engine instance
    this.engine = new TacticalEngine({
      attackerArmy: config.attackerArmy,
      defenderArmy: config.defenderArmy,
      province: config.province,
      attackerGeneral: config.attackerGeneral,
      defenderGeneral: config.defenderGeneral,
      gameState: config.gameState,
      onLog: (msg, type) => this.logMessage(msg, type),
      onBattleEnd: (result) => this.handleEngineBattleEnd(result)
    });

    // View state
    this.selectedUnit = null;
    this.hoverTile = null;
    this.reachableTiles = [];
    this.attackTargets = [];
    this.animId = null;
    this.isDestroyed = false;

    // Doctrinal Cards Cooldowns (in rounds)
    this.cardCooldowns = {
      'feigned-retreat': 0,
      'elephant-charge': 0,
      'shield-wall': 0
    };

    this.initUI();
    this.bindEvents();
    this.updateBalanceOfPower();
  }

  initUI() {
    if (typeof document === 'undefined') return;

    // Update Header Encounter Details
    const prov = this.engine.province;
    const titleEl = document.getElementById('tactical-encounter-title');
    if (titleEl && prov) {
      titleEl.textContent = `BATTLE OF ${prov.name.toUpperCase()}`;
    }

    const intelEl = document.getElementById('tactical-terrain-intel');
    if (intelEl && prov) {
      const pType = (prov.terrainType || 'FLOODPLAIN').replace(/_/g, ' ');
      intelEl.textContent = `Terrain: ${pType} | High Ground: +25% DMG | Forest: 50% Missile Prot`;
    }

    // Ensure End Phase button exists in header actions
    const headerActions = document.querySelector('.tactical-header-actions');
    if (headerActions) {
      let endPhaseBtn = document.getElementById('btn-tactical-end-phase');
      if (!endPhaseBtn) {
        endPhaseBtn = document.createElement('button');
        endPhaseBtn.id = 'btn-tactical-end-phase';
        endPhaseBtn.className = 'btn btn-primary';
        endPhaseBtn.style.marginRight = '8px';
        endPhaseBtn.textContent = '⏳ End Phase';
        endPhaseBtn.title = 'Complete turn and execute enemy phase';
        headerActions.insertBefore(endPhaseBtn, headerActions.firstChild);
      }
      endPhaseBtn.onclick = () => this.handleEndPhase();
    }

    // Initial battle log entry
    this.logMessage(`Tactical engagement commenced at ${prov?.name || 'the frontier'}. Command your host!`, 'system');

    this.updateUnitInspector(null);
    this.updateCardsDockUI();
  }

  start() {
    if (!this.canvas || !this.ctx) return;
    this.isDestroyed = false;

    const renderLoop = () => {
      if (this.isDestroyed) return;
      this.render();
      this.animId = requestAnimationFrame(renderLoop);
    };

    this.animId = requestAnimationFrame(renderLoop);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    this.unbindEvents();
  }

  bindEvents() {
    if (!this.canvas) return;

    this.onCanvasClick = (e) => this.handleClick(e);
    this.onCanvasMouseMove = (e) => this.handleMouseMove(e);
    this.onCanvasMouseLeave = () => this.handleMouseLeave();

    this.canvas.addEventListener('click', this.onCanvasClick);
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove);
    this.canvas.addEventListener('mouseleave', this.onCanvasMouseLeave);

    // Cards Dock Binding
    if (typeof document !== 'undefined') {
      const dock = document.getElementById('tactical-cards-dock');
      if (dock) {
        this.onCardClick = (e) => {
          const card = e.target.closest('.tactical-action-card');
          if (!card) return;
          const action = card.dataset.action;
          this.triggerDoctrineCard(action);
        };
        dock.addEventListener('click', this.onCardClick);
      }
    }
  }

  unbindEvents() {
    if (this.canvas) {
      if (this.onCanvasClick) this.canvas.removeEventListener('click', this.onCanvasClick);
      if (this.onCanvasMouseMove) this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
      if (this.onCanvasMouseLeave) this.canvas.removeEventListener('mouseleave', this.onCanvasMouseLeave);
    }

    if (typeof document !== 'undefined') {
      const dock = document.getElementById('tactical-cards-dock');
      if (dock && this.onCardClick) {
        dock.removeEventListener('click', this.onCardClick);
      }
    }
  }

  // =========================================================================
  // Canvas Mouse & Interaction Handlers
  // =========================================================================

  getCanvasTileCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 700 / rect.height;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const col = Math.floor((clientX * scaleX) / 50);
    const row = Math.floor((clientY * scaleY) / 50);

    return {
      col: Math.max(0, Math.min(19, col)),
      row: Math.max(0, Math.min(13, row))
    };
  }

  handleClick(e) {
    if (this.engine.isOver) return;
    const { col, row } = this.getCanvasTileCoords(e);
    const clickedUnit = this.engine.getUnitAt(col, row);

    // 1. If no unit selected, select clicked friendly unit
    if (!this.selectedUnit) {
      if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.isRouted) {
        this.selectUnit(clickedUnit);
      } else if (clickedUnit) {
        this.updateUnitInspector(clickedUnit);
      }
      return;
    }

    // 2. Clicked another friendly unit -> switch selection
    if (clickedUnit && clickedUnit.isPlayer && !clickedUnit.isRouted) {
      this.selectUnit(clickedUnit);
      return;
    }

    // 3. Clicked attackable enemy unit -> execute attack
    if (clickedUnit && clickedUnit.side !== this.selectedUnit.side && this.isTileAttackable(col, row)) {
      this.executePlayerAttack(this.selectedUnit, clickedUnit);
      return;
    }

    // 4. Clicked reachable empty tile -> move selected unit
    if (!clickedUnit && this.isTileReachable(col, row)) {
      this.moveSelectedUnit(col, row);
      return;
    }

    // Clicked elsewhere -> inspect or deselect
    if (clickedUnit) {
      this.updateUnitInspector(clickedUnit);
    } else {
      this.deselectUnit();
    }
  }

  handleMouseMove(e) {
    const { col, row } = this.getCanvasTileCoords(e);
    this.hoverTile = { col, row };

    const tile = this.engine.grid.getTile(col, row);
    const unit = this.engine.getUnitAt(col, row);

    const intelText = document.getElementById('tactical-hover-text');
    if (!intelText) return;

    if (unit) {
      if (this.selectedUnit && unit.side !== this.selectedUnit.side && this.isTileAttackable(col, row)) {
        // Combat forecast
        const angle = TacticalCombatMath.calculateApproachAngle(unit.facing, unit.col, unit.row, this.selectedUnit.col, this.selectedUnit.row);
        const dir = TacticalCombatMath.calculateDirectionalAttack(angle);
        const counterMult = (unit.spearBrace && (this.selectedUnit.unitClass === 'SHOCK_CAVALRY') && dir.direction === 'FRONT') ? 'SPEAR BRACE (2.0x COUNTER)' : 'STANDARD';
        intelText.textContent = `🎯 TARGET: ${unit.name} | Arc: ${dir.direction} (${dir.damageMultiplier}x) | Defense: ${unit.meleeDef} (${Math.round((1 - dir.armorReduction) * 100)}% Armor) | Counter: ${counterMult}`;
        intelText.style.color = 'var(--gold-bright)';
      } else {
        intelText.textContent = `${unit.isPlayer ? '🛡️ ALLY' : '⚔️ ENEMY'}: ${unit.name} (${unit.unitClass}) | HP: ${unit.hp}/${unit.maxHp} | Morale: ${unit.morale} (${unit.moraleState}) | Facing: ${unit.facing}`;
        intelText.style.color = unit.isPlayer ? 'var(--stat-cyan)' : 'var(--stat-danger)';
      }
    } else if (tile) {
      const terrainDesc = tile.terrainType.replace(/_/g, ' ');
      const elevText = tile.elevation > 0 ? ` | High Ground +${tile.elevation}` : '';
      const coverText = tile.isCover ? ' | Forest Cover (50% Missile Prot)' : '';
      intelText.textContent = `Tile [${col}, ${row}]: ${terrainDesc}${elevText}${coverText}`;
      intelText.style.color = '#94a3b8';
    }
  }

  handleMouseLeave() {
    this.hoverTile = null;
    const intelText = document.getElementById('tactical-hover-text');
    if (intelText) {
      intelText.textContent = 'Hover over regiment or terrain tile for telemetry';
      intelText.style.color = '#94a3b8';
    }
  }

  selectUnit(unit) {
    this.selectedUnit = unit;
    const selection = this.engine.selectUnit(unit.id);
    this.reachableTiles = selection ? selection.reachableTiles : [];
    this.attackTargets = selection ? selection.attackTargets : [];
    this.updateUnitInspector(unit);
  }

  deselectUnit() {
    this.selectedUnit = null;
    this.reachableTiles = [];
    this.attackTargets = [];
    this.updateUnitInspector(null);
  }

  isTileReachable(col, row) {
    return this.reachableTiles.some(t => t.col === col && t.row === row);
  }

  isTileAttackable(col, row) {
    return this.attackTargets.some(u => u.col === col && u.row === row);
  }

  moveSelectedUnit(targetCol, targetRow) {
    if (!this.selectedUnit) return;
    const unitId = this.selectedUnit.id;
    const res = this.engine.moveUnit(unitId, targetCol, targetRow);

    if (res.success) {
      if (sound && typeof sound.playMarch === 'function') sound.playMarch();
      this.logMessage(`${this.selectedUnit.name} advanced to [${targetCol}, ${targetRow}] facing ${res.newFacing}.`, 'player');

      // Refresh selection state with updated AP & position
      this.selectUnit(this.selectedUnit);
    }
  }

  executePlayerAttack(attacker, defender) {
    const res = this.engine.attackUnit(attacker.id, defender.id, {
      elephantCharge: this.engine.activeDoctrines.elephantCharge,
      shieldWall: this.engine.activeDoctrines.shieldWall
    });

    if (res.success) {
      if (sound && typeof sound.playCombatClash === 'function') sound.playCombatClash();

      let msg = `${attacker.name} struck ${defender.name} from the ${res.direction} dealing ${res.damageDealt} damage!`;
      if (res.counterDamage > 0) {
        msg += ` ${defender.name} counter-attacked for ${res.counterDamage} damage.`;
      }
      if (res.defenderRouted) {
        msg += ` 🚩 ${defender.name} has ROUTED!`;
      }
      if (res.defenderDied) {
        msg += ` 💀 ${defender.name} has been ANNIHILATED!`;
      }
      this.logMessage(msg, 'player');

      // Refresh selection or deselect if no AP left
      if (attacker.canAct()) {
        this.selectUnit(attacker);
      } else {
        this.deselectUnit();
      }

      this.updateBalanceOfPower();

      if (this.engine.isOver) {
        this.handleEngineBattleEnd(this.engine.getBattleOutcome());
      }
    }
  }

  handleEndPhase() {
    if (this.engine.isOver) {
      this.handleEngineBattleEnd(this.engine.getBattleOutcome());
      return;
    }

    this.deselectUnit();
    this.logMessage(`--- Round ${this.engine.round} Enemy Phase Commenced ---`, 'system');

    // Run AI Phase
    this.engine.endPlayerPhase();

    if (this.engine.isOver) {
      this.updateBalanceOfPower();
      this.handleEngineBattleEnd(this.engine.getBattleOutcome());
      return;
    }

    // Decrement doctrinal card cooldowns
    for (const action in this.cardCooldowns) {
      if (this.cardCooldowns[action] > 0) {
        this.cardCooldowns[action]--;
      }
    }
    // Reset transient round doctrines
    this.engine.activeDoctrines.elephantCharge = false;
    this.engine.activeDoctrines.shieldWall = false;

    this.updateCardsDockUI();
    this.updateBalanceOfPower();

    this.logMessage(`--- Round ${this.engine.round} Player Phase Commenced (AP Refreshed) ---`, 'system');
  }

  triggerDoctrineCard(action) {
    if (this.cardCooldowns[action] > 0) {
      this.logMessage(`Doctrine card is recharging (${this.cardCooldowns[action]} rounds remaining).`, 'system');
      return;
    }

    if (action === 'feigned-retreat') {
      // Lures nearest enemy within 4 tiles 2 steps forward toward player lines
      const playerUnits = this.engine.units.filter(u => u.isPlayer && u.hp > 0 && !u.isRouted);
      const enemyUnits = this.engine.units.filter(u => !u.isPlayer && u.hp > 0 && !u.isRouted);

      let targetEnemy = null;
      let minDistance = 5;

      enemyUnits.forEach(eu => {
        playerUnits.forEach(pu => {
          const d = this.engine.grid.getDistance(eu.col, eu.row, pu.col, pu.row);
          if (d < minDistance && d >= 2) {
            minDistance = d;
            targetEnemy = eu;
          }
        });
      });

      if (targetEnemy) {
        const stepCol = Math.max(0, targetEnemy.col - 2);
        if (!this.engine.getUnitAt(stepCol, targetEnemy.row)) {
          targetEnemy.col = stepCol;
          this.engine.syncGridUnits();
        }
        targetEnemy.drainMorale(15);
        this.cardCooldowns['feigned-retreat'] = 3;
        this.logMessage(`[TACTICS] Feigned Retreat executed: ${targetEnemy.name} lured forward into exposed ground (-15 Morale)!`, 'system');
      } else {
        this.logMessage('[TACTICS] Feigned Retreat: No suitable enemy regiment within lure range.', 'system');
      }
    } else if (action === 'elephant-charge') {
      const hasElephant = this.engine.units.some(u => u.isPlayer && u.unitClass === 'SHOCK_MONSTER' && u.hp > 0);
      if (!hasElephant) {
        this.logMessage('[TACTICS] Gaja Shock Charge requires active War Elephants in your battle line!', 'system');
        return;
      }
      this.engine.activeDoctrines.elephantCharge = true;
      this.cardCooldowns['elephant-charge'] = 3;
      this.logMessage('[TACTICS] Gaja Shock Charge primed: Next War Elephant attack gains +50% charge damage and -30 Terror shock!', 'system');
    } else if (action === 'shield-wall') {
      this.engine.activeDoctrines.shieldWall = true;
      this.cardCooldowns['shield-wall'] = 2;
      this.logMessage('[TACTICS] Phalanx Shield Wall formed: Friendly infantry lock ranks (+50% Def vs Cavalry, +30% vs Missile)!', 'system');
    }

    this.updateCardsDockUI();
  }

  updateCardsDockUI() {
    const dock = document.getElementById('tactical-cards-dock');
    if (!dock) return;

    dock.querySelectorAll('.tactical-action-card').forEach(card => {
      const action = card.dataset.action;
      const cd = this.cardCooldowns[action] || 0;

      let cdBadge = card.querySelector('.cd-badge');
      if (cd > 0) {
        card.classList.add('cooldown');
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
        if (!cdBadge) {
          cdBadge = document.createElement('span');
          cdBadge.className = 'cd-badge mono';
          cdBadge.style.fontSize = '0.7rem';
          cdBadge.style.color = 'var(--gold-bright)';
          card.appendChild(cdBadge);
        }
        cdBadge.textContent = `⏳ ${cd} rds`;
      } else {
        card.classList.remove('cooldown');
        card.style.opacity = '1.0';
        card.style.pointerEvents = 'auto';
        if (cdBadge) cdBadge.remove();
      }
    });
  }

  handleEngineBattleEnd(result) {
    if (this._battleEnded) return;
    this._battleEnded = true;
    if (this.onBattleEnd) {
      this.onBattleEnd(result);
    }
  }

  // =========================================================================
  // Canvas 2D Rendering Pipeline
  // =========================================================================

  render() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, 1000, 700);

    // 1. Grid & Terrain Contours
    this.renderGridTiles();

    // 2. Deployment Zones subtle highlights
    this.renderDeploymentZones();

    // 3. Range Overlays (Movement & Attack)
    this.renderOverlays();

    // 4. General Leadership Auras
    this.renderGeneralAuras();

    // 5. Unit Regiment Tokens
    this.renderUnits();

    // 6. Hover Target Reticle
    this.renderHoverTile();
  }

  renderGridTiles() {
    for (let r = 0; r < 14; r++) {
      for (let c = 0; c < 20; c++) {
        const tile = this.engine.grid.getTile(c, r);
        const px = c * 50;
        const py = r * 50;

        // Base terrain fill
        let fill = '#1c2836';
        if (tile.terrainType === 'HILL') fill = '#3f382a';
        else if (tile.terrainType === 'CRAG') fill = '#5a4f3b';
        else if (tile.isRiver && !tile.isBridge) fill = '#133e54';
        else if (tile.isBridge) fill = '#6a492f';
        else if (tile.isMarsh) fill = '#1f3b37';
        else if (tile.isCover || tile.terrainType === 'FOREST') fill = '#1a3321';
        else if (tile.terrainType === 'MOUNTAIN') fill = '#23201d';

        this.ctx.fillStyle = fill;
        this.ctx.fillRect(px, py, 50, 50);

        // River rendering with ripples
        if (tile.isRiver && !tile.isBridge) {
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(px + 5, py + 25);
          this.ctx.quadraticCurveTo(px + 25, py + 18, px + 45, py + 25);
          this.ctx.stroke();
        }

        // Bridge timber planks
        if (tile.isBridge) {
          this.ctx.strokeStyle = '#3d2516';
          this.ctx.lineWidth = 2;
          for (let pyPlank = py + 10; pyPlank < py + 50; pyPlank += 12) {
            this.ctx.beginPath();
            this.ctx.moveTo(px + 2, pyPlank);
            this.ctx.lineTo(px + 48, pyPlank);
            this.ctx.stroke();
          }
        }

        // Forest tree crowns
        if (tile.isCover || tile.terrainType === 'FOREST') {
          this.ctx.fillStyle = '#2d5c38';
          this.ctx.beginPath();
          this.ctx.arc(px + 18, py + 22, 10, 0, Math.PI * 2);
          this.ctx.arc(px + 32, py + 24, 11, 0, Math.PI * 2);
          this.ctx.arc(px + 25, py + 34, 12, 0, Math.PI * 2);
          this.ctx.fill();
        }

        // Grid border lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(px, py, 50, 50);

        // Elevation badge
        if (tile.elevation > 0) {
          this.ctx.fillStyle = tile.elevation >= 2 ? '#ffd700' : 'rgba(255, 215, 0, 0.5)';
          this.ctx.font = 'bold 10px monospace';
          this.ctx.fillText(`+${tile.elevation}`, px + 4, py + 12);
        }
      }
    }
  }

  renderDeploymentZones() {
    // Attacker West (cols 0-3): subtle blue tint
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.04)';
    this.ctx.fillRect(0, 0, 4 * 50, 700);

    // Defender East (cols 16-19): subtle red tint
    this.ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
    this.ctx.fillRect(16 * 50, 0, 4 * 50, 700);
  }

  renderOverlays() {
    if (!this.selectedUnit) return;

    // Movement Reach Overlay (Cyan)
    this.reachableTiles.forEach(t => {
      const px = t.col * 50;
      const py = t.row * 50;

      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.22)';
      this.ctx.fillRect(px + 1, py + 1, 48, 48);

      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(px + 1, py + 1, 48, 48);

      // Center waypoint dot
      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(px + 25, py + 25, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Attack Target Overlay (Red brackets)
    this.attackTargets.forEach(u => {
      const px = u.col * 50;
      const py = u.row * 50;

      this.ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      this.ctx.fillRect(px + 2, py + 2, 46, 46);

      this.ctx.strokeStyle = '#ef4444';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(px + 2, py + 2, 46, 46);

      // Crossed swords indicator
      this.ctx.font = '12px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('⚔️', px + 25, py + 12);
    });

    // Selected Unit Tile (Gold Border)
    const spx = this.selectedUnit.col * 50;
    const spy = this.selectedUnit.row * 50;
    this.ctx.strokeStyle = '#ffd700';
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeRect(spx + 1, spy + 1, 48, 48);
  }

  renderGeneralAuras() {
    const commanders = this.engine.units.filter(u => u.isCommander && u.hp > 0 && !u.isRouted && !u.hasExited);

    commanders.forEach(gen => {
      const cx = gen.col * 50 + 25;
      const cy = gen.row * 50 + 25;
      const rPx = gen.auraRadius * 50;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([8, 6]);
      this.ctx.lineDashOffset = (Date.now() / 60) % 14;
      this.ctx.stroke();

      const grad = this.ctx.createRadialGradient(cx, cy, rPx * 0.1, cx, cy, rPx);
      grad.addColorStop(0, 'rgba(255, 215, 0, 0.08)');
      grad.addColorStop(1, 'rgba(255, 215, 0, 0.0)');
      this.ctx.fillStyle = grad;
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  renderUnits() {
    this.engine.units.forEach(u => {
      if (u.hp <= 0 || u.hasExited) return;

      const cx = u.col * 50 + 25;
      const cy = u.row * 50 + 25;

      this.ctx.save();

      // Token circular body
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, 18, 0, Math.PI * 2);

      // Gradient fill based on player vs enemy
      const grad = this.ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 18);
      if (u.isPlayer) {
        grad.addColorStop(0, '#f59e0b');
        grad.addColorStop(1, '#b45309');
      } else {
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(1, '#1e3a8a');
      }
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Border styling
      if (this.selectedUnit && this.selectedUnit.id === u.id) {
        this.ctx.strokeStyle = '#ffd700';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#ffd700';
        this.ctx.shadowBlur = 8;
        this.ctx.stroke();
      } else if (u.isRouted) {
        this.ctx.strokeStyle = '#ef4444';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([3, 3]);
        this.ctx.stroke();
      } else {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }

      // Unit Glyph
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '16px "Noto Sans", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const glyphs = {
        WAR_ELEPHANTS: '🐘',
        HORSE_ARCHERS: '🏹',
        RAJPUT_LEVIES: '🛡️',
        PAIKS: '🌾',
        HEAVY_CAVALRY: '🐎',
        SIEGE_ENGINES: '🎯'
      };
      this.ctx.fillText(glyphs[u.unitTypeId] || '⚔️', cx, cy);

      // Facing Chevron
      this.renderFacingChevron(cx, cy, u.facing, u.isPlayer);

      // HP and Morale Micro-bars
      this.renderMicroBars(cx, cy, u);

      // Badges
      if (u.isCommander) {
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('👑', cx, cy - 27);
      }
      if (u.isRouted) {
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('🚩', cx + 14, cy - 14);
      }

      this.ctx.restore();
    });
  }

  renderFacingChevron(cx, cy, facing, isPlayer) {
    const f = (FACING[facing] || FACING.E);
    const dc = f.dc;
    const dr = f.dr;

    const tipDist = 22;
    const baseDist = 17;
    const wingDist = 4;

    const tipX = cx + dc * tipDist;
    const tipY = cy + dr * tipDist;

    // Perpendicular vector (-dr, dc)
    const perpX = -dr;
    const perpY = dc;

    const b1X = cx + dc * baseDist + perpX * wingDist;
    const b1Y = cy + dr * baseDist + perpY * wingDist;

    const b2X = cx + dc * baseDist - perpX * wingDist;
    const b2Y = cy + dr * baseDist - perpY * wingDist;

    this.ctx.beginPath();
    this.ctx.moveTo(tipX, tipY);
    this.ctx.lineTo(b1X, b1Y);
    this.ctx.lineTo(b2X, b2Y);
    this.ctx.closePath();

    this.ctx.fillStyle = isPlayer ? '#ffd700' : '#f87171';
    this.ctx.fill();
  }

  renderMicroBars(cx, cy, u) {
    const barW = 34;

    // HP Bar above (cy - 22)
    const hpRatio = Math.max(0, Math.min(1, u.hp / u.maxHp));
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(cx - barW / 2, cy - 23, barW, 4);

    let hpColor = '#10b981';
    if (hpRatio < 0.25) hpColor = '#ef4444';
    else if (hpRatio < 0.5) hpColor = '#f59e0b';

    this.ctx.fillStyle = hpColor;
    this.ctx.fillRect(cx - barW / 2, cy - 23, Math.round(barW * hpRatio), 4);

    // Morale Bar below (cy + 19)
    const moraleRatio = Math.max(0, Math.min(1, u.morale / u.maxMorale));
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fillRect(cx - barW / 2, cy + 19, barW, 3);

    let moraleColor = '#3b82f6';
    if (u.isRouted) moraleColor = '#ef4444';
    else if (moraleRatio < 0.25) moraleColor = '#f97316';
    else if (moraleRatio < 0.5) moraleColor = '#eab308';

    this.ctx.fillStyle = moraleColor;
    this.ctx.fillRect(cx - barW / 2, cy + 19, Math.round(barW * moraleRatio), 3);
  }

  renderHoverTile() {
    if (!this.hoverTile) return;
    const px = this.hoverTile.col * 50;
    const py = this.hoverTile.row * 50;

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px, py, 50, 50);
  }

  // =========================================================================
  // UI Panels Synchronization
  // =========================================================================

  updateUnitInspector(unit) {
    const inspector = document.getElementById('tactical-unit-inspector');
    if (!inspector) return;

    if (!unit) {
      inspector.innerHTML = `<div class="empty-state">Select any regiment on the field to inspect combat stats, facing, and morale.</div>`;
      return;
    }

    const hpPct = Math.max(0, Math.min(100, Math.round((unit.hp / unit.maxHp) * 100)));
    const moralePct = Math.max(0, Math.min(100, Math.round((unit.morale / unit.maxMorale) * 100)));

    const tile = this.engine.grid.getTile(unit.col, unit.row);
    const elev = tile ? tile.elevation : 0;
    const inCover = tile ? tile.isCover : false;

    inspector.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header" style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.6rem;">${unit.isCommander ? '👑' : '🛡️'}</span>
          <div>
            <h3 style="margin:0; font-size:0.95rem; color:#fff;">${unit.name}</h3>
            <span class="subtext mono" style="color:var(--gold-bright); font-size:0.75rem;">${unit.unitClass} | Facing: ${unit.facing}</span>
          </div>
        </div>

        <div class="stat-row mt-8" style="display:flex; justify-content:space-between; font-size:0.75rem;">
          <span class="mono">Health</span>
          <span class="mono text-cyan">${unit.hp} / ${unit.maxHp} (${hpPct}%)</span>
        </div>
        <div class="progress-bar-bg" style="height:6px; background:rgba(0,0,0,0.5); border-radius:3px; overflow:hidden;">
          <div style="width:${hpPct}%; height:100%; background:${hpPct > 50 ? '#10b981' : hpPct > 25 ? '#f59e0b' : '#ef4444'};"></div>
        </div>

        <div class="stat-row mt-8" style="display:flex; justify-content:space-between; font-size:0.75rem;">
          <span class="mono">Morale</span>
          <span class="mono" style="color:${unit.isRouted ? '#ef4444' : '#3b82f6'};">${unit.morale} / ${unit.maxMorale} (${unit.moraleState})</span>
        </div>
        <div class="progress-bar-bg" style="height:6px; background:rgba(0,0,0,0.5); border-radius:3px; overflow:hidden;">
          <div style="width:${moralePct}%; height:100%; background:${unit.isRouted ? '#ef4444' : '#3b82f6'};"></div>
        </div>

        <div class="stats-grid-mini mt-12" style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.75rem;">
          <div class="stat-box">⚔️ Melee Atk: <strong class="text-gold">${unit.meleeAtk}</strong></div>
          <div class="stat-box">🛡️ Melee Def: <strong class="text-cyan">${unit.meleeDef}</strong></div>
          <div class="stat-box">🎯 Range: <strong class="text-gold">${unit.range}</strong></div>
          <div class="stat-box">⚡ Move / AP: <strong class="text-cyan">${unit.actionPoints} AP</strong></div>
        </div>

        <div class="tactical-buffs mt-8" style="font-size:0.72rem; color:#94a3b8; display:flex; flex-direction:column; gap:4px;">
          ${unit.inGeneralAura ? `<div class="text-gold">👑 General Aura: Panic Immune & Combat Buff</div>` : ''}
          ${elev > 0 ? `<div class="text-cyan">⛰️ High Ground +${elev} (+${elev * 25}% Attack, +${elev} Range)</div>` : ''}
          ${inCover ? `<div class="text-emerald">🌲 Forest Cover (50% Missile Protection)</div>` : ''}
          ${unit.spearBrace ? `<div class="text-gold">🛡️ Spear Brace (2.0x vs Cavalry Charge)</div>` : ''}
          ${unit.marshImmunity ? `<div class="text-cyan">🌊 Marsh Immunity (Zero Movement Penalty)</div>` : ''}
        </div>
      </div>
    `;
  }

  updateBalanceOfPower() {
    if (typeof document === 'undefined') return;
    let pPlayer = 0;
    let pEnemy = 0;

    this.engine.units.forEach(u => {
      if (u.hp <= 0 || u.hasExited) return;
      const power = (u.hp / u.maxHp) * (u.meleeAtk * 2 + u.meleeDef) * (0.5 + 0.5 * (u.morale / 100));
      if (u.isPlayer) pPlayer += power;
      else pEnemy += power;
    });

    const total = pPlayer + pEnemy;
    const ratio = total > 0 ? Math.max(5, Math.min(95, Math.round((pPlayer / total) * 100))) : 50;

    const pEl = document.getElementById('tactical-player-power');
    if (pEl) pEl.textContent = `Player: ${Math.round(pPlayer).toLocaleString()}`;

    const eEl = document.getElementById('tactical-enemy-power');
    if (eEl) eEl.textContent = `Enemy: ${Math.round(pEnemy).toLocaleString()}`;

    const rEl = document.getElementById('tactical-balance-ratio');
    if (rEl) rEl.textContent = `${ratio}% / ${100 - ratio}%`;

    const fillEl = document.getElementById('tactical-balance-fill');
    if (fillEl) fillEl.style.width = `${ratio}%`;
  }

  logMessage(msg, type = 'system') {
    const log = document.getElementById('tactical-battle-log');
    if (!log) return;

    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }
}

export { TacticalBattlefield as TacticalView };
