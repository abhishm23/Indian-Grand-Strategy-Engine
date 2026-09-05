// Core Game Engine, Canvas Renderer & Controller for Iron Tactics

import { MapGrid, TERRAIN_TYPES } from './terrain.js';
import { Unit, UNIT_TYPES, FACTIONS } from './units.js';
import { SCENARIOS } from './scenarios.js';
import { TacticalDeck } from './tactics.js';
import { EnemyAI } from './ai.js';
import { sound } from './sound.js';

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.cols = 15;
    this.rows = 11;
    this.tileSize = 60;
    this.canvas.width = this.cols * this.tileSize;
    this.canvas.height = this.rows * this.tileSize;

    this.map = new MapGrid(this.cols, this.rows, this.tileSize);
    this.units = [];
    this.turn = 1;
    this.currentFaction = FACTIONS.BLUE; // BLUE = Player, RED = Enemy
    this.currentScenarioKey = 'thermopylae';
    this.selectedUnit = null;
    this.activeCard = null;

    this.tacticalDeck = new TacticalDeck();
    this.ai = new EnemyAI(this);

    this.validMoves = [];
    this.validAttacks = [];
    this.floatingTexts = [];
    this.smokeTiles = [];

    this.initUI();
    this.loadScenario(this.currentScenarioKey);
    this.setupEventListeners();
    this.startRenderLoop();
  }

  loadScenario(scenarioKey) {
    this.currentScenarioKey = scenarioKey;
    this.turn = 1;
    this.currentFaction = FACTIONS.BLUE;
    this.selectedUnit = null;
    this.activeCard = null;
    this.units = [];
    this.smokeTiles = [];
    this.floatingTexts = [];
    this.tacticalDeck.commandPoints = 100;

    const sc = SCENARIOS[scenarioKey];
    this.map = new MapGrid(this.cols, this.rows, this.tileSize);
    sc.setup(this.map, this.units);

    this.updateHUD();
    this.updateObjectivesUI();
    this.renderTacticalCards();
    this.updateInspector(null);
    this.log(`Switched Operation: ${sc.name}`, 'system');
    sound.playSelect();
  }

  // --- combat & movement logic ---
  getUnitAt(x, y) {
    return this.units.find(u => u.x === x && u.y === y && !u.isRouted());
  }

  getValidMoves(unit) {
    if (unit.hasMoved) return [];
    const valid = [];
    const visited = new Set();
    const queue = [{ x: unit.x, y: unit.y, cost: 0 }];

    while (queue.length > 0) {
      const current = queue.shift();
      const key = `${current.x},${current.y}`;

      if (visited.has(key)) continue;
      visited.add(key);

      if (current.cost > 0 && !this.getUnitAt(current.x, current.y)) {
        valid.push({ x: current.x, y: current.y });
      }

      const neighbors = this.map.getNeighbors(current.x, current.y);
      neighbors.forEach(n => {
        const tile = this.map.getTile(n.x, n.y);
        const occupancy = this.getUnitAt(n.x, n.y);

        // Cannot pass through enemy units
        if (occupancy && occupancy.faction !== unit.faction) return;

        const moveCost = tile.moveCost;
        if (current.cost + moveCost <= unit.moveSpeed) {
          queue.push({ x: n.x, y: n.y, cost: current.cost + moveCost });
        }
      });
    }

    return valid;
  }

  getValidAttackTargets(unit) {
    if (unit.hasAttacked) return [];
    const targets = [];
    const tile = this.map.getTile(unit.x, unit.y);

    let effectiveRange = unit.range;
    if (tile.elevation > 0 && unit.type.id === 'ROYAL_ARCHER') {
      effectiveRange += 1; // High ground range bonus!
    }

    this.units.forEach(other => {
      if (other.faction !== unit.faction && !other.isRouted()) {
        const dist = this.map.getDistance(unit.x, unit.y, other.x, other.y);
        if (dist >= unit.minRange && dist <= effectiveRange) {
          targets.push(other);
        }
      }
    });
    return targets;
  }

  moveUnit(unit, targetX, targetY) {
    // Determine facing direction based on delta
    const dx = targetX - unit.x;
    const dy = targetY - unit.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      unit.facing = dx > 0 ? 'EAST' : 'WEST';
    } else if (dy !== 0) {
      unit.facing = dy > 0 ? 'SOUTH' : 'NORTH';
    }

    unit.x = targetX;
    unit.y = targetY;
    unit.hasMoved = true;
    unit.isStealthed = false; // Reveal stealth upon movement unless forest

    const tile = this.map.getTile(targetX, targetY);
    if (tile.stealth && unit.type.stealthMaster) {
      unit.isStealthed = true;
    }

    sound.playClick();
    this.updateHUD();
  }

  executeAttack(attacker, defender) {
    attacker.hasAttacked = true;
    attacker.hasMoved = true;

    // Determine attack angle (Front, Flank, Rear)
    const angle = defender.getAttackAngle(attacker.x, attacker.y);
    const defTile = this.map.getTile(defender.x, defender.y);
    const atkTile = this.map.getTile(attacker.x, attacker.y);

    // Calculate base damage
    let damage = attacker.attack * (attacker.hp / attacker.maxHp);

    // Charge Bonus for Vanguard Cavalry
    if (attacker.type.chargeBonus && atkTile.chargeAllowed && angle === 'REAR') {
      damage *= 1.8;
      this.addFloatingText('CAVALRY CHARGE! 🐎', defender.x, defender.y, '#ffb703');
      sound.playCavalryCharge();
    } else if (attacker.type.id === 'ROYAL_ARCHER') {
      sound.playArrowVolley();
    } else {
      sound.playMeleeHit();
    }

    // Stealth Ambush Multiplier
    if (attacker.isStealthed) {
      damage *= 2.5;
      defender.applyMoraleDamage(40);
      this.addFloatingText('AMBUSH 2.5x! 🗡️', defender.x, defender.y, '#00f2fe');
      attacker.isStealthed = false;
    }

    // Angle Multipliers & Morale Drains
    let angleText = 'Frontal Strike';
    if (angle === 'FLANK') {
      damage *= 1.4;
      defender.applyMoraleDamage(20);
      angleText = 'FLANK ATTACK (+40%)';
    } else if (angle === 'REAR') {
      damage *= 2.0;
      defender.applyMoraleDamage(35);
      angleText = 'REAR SURPRISE (2.0x)';
    }

    // High ground advantage
    if (atkTile.elevation > defTile.elevation) {
      damage *= 1.25;
    }

    // Defender Cover & Hold Line Buff
    let defBonus = defTile.defBonus;
    if (defender.holdLineBuff) defBonus += 1.0;
    damage = Math.max(5, Math.round(damage * (1 - defBonus)));

    // Apply HP loss
    defender.hp = Math.max(0, defender.hp - damage);
    this.addFloatingText(`-${damage} HP`, defender.x, defender.y, '#ff4b5c');

    const logColor = attacker.faction === FACTIONS.BLUE ? 'player' : 'enemy';
    this.log(`${attacker.type.name} attacked ${defender.type.name} (${angleText}): -${damage} HP!`, logColor);

    // Morale Panic Check
    if (defender.isRouted()) {
      this.log(`💥 ${defender.type.name} ROUTED! Morale broken!`, logColor);
      this.triggerChainPanic(defender);
    } else if (defender.isPanicking()) {
      sound.playPanicHorn();
      this.addFloatingText('PANIC! 😱', defender.x, defender.y, '#f59e0b');
    }

    // Counter-Attack logic
    if (defender.hp > 0 && defender.type.counterAttack && angle === 'FRONT') {
      const dist = this.map.getDistance(attacker.x, attacker.y, defender.x, defender.y);
      if (dist <= defender.range) {
        let counterDmg = Math.round(defender.attack * 0.5 * (1 - atkTile.defBonus));
        attacker.hp = Math.max(0, attacker.hp - counterDmg);
        this.addFloatingText(`-${counterDmg} Counter`, attacker.x, attacker.y, '#ef4444');
      }
    }

    this.updateHUD();
    this.checkVictoryConditions();
  }

  triggerChainPanic(routedUnit) {
    // Adjacent allies lose morale
    this.units.forEach(u => {
      if (u.faction === routedUnit.faction && !u.isRouted()) {
        const dist = this.map.getDistance(routedUnit.x, routedUnit.y, u.x, u.y);
        if (dist <= 2) {
          u.applyMoraleDamage(20);
          this.addFloatingText('-20 Morale (Chain Panic)', u.x, u.y, '#f59e0b');
        }
      }
    });
  }

  // --- Turn Management ---
  endTurn() {
    if (this.currentFaction === FACTIONS.BLUE) {
      this.currentFaction = FACTIONS.RED;
      this.log(`--- TURN ${this.turn}: ENEMY COMMANDER TURN ---`, 'enemy');
      this.updateTurnUI();
      this.ai.executeTurn(() => {
        this.endEnemyTurn();
      });
    }
  }

  endEnemyTurn() {
    this.currentFaction = FACTIONS.BLUE;
    this.turn++;

    // Reset unit actions & check supply
    this.units.forEach(u => {
      u.resetTurn();
      u.holdLineBuff = false;

      // Supply Line Check
      if (this.map.getTile(u.x, u.y).isSupplyNode) {
        u.morale = Math.min(100, u.morale + 15);
      }
    });

    this.tacticalDeck.gainPoints(20);
    this.log(`--- TURN ${this.turn}: PLAYER COMMANDER TURN ---`, 'player');
    this.updateTurnUI();
    this.updateHUD();
    this.renderTacticalCards();
    this.checkVictoryConditions();
  }

  // --- Tactical Card Abilities ---
  activateCard(cardId) {
    if (!this.tacticalDeck.canAfford(cardId)) {
      this.log('Insufficient Command Points for card!', 'system');
      return;
    }
    const card = this.tacticalDeck.cards.find(c => c.id === cardId);
    this.activeCard = card;
    this.log(`Selected Tactical Card: ${card.name}. Select target tile/unit.`, 'tactics');
    sound.playCardActivate();
  }

  applyTacticalCard(card, targetUnit, tileX, tileY) {
    if (!this.tacticalDeck.useCard(card.id)) return;

    if (card.id === 'HOLD_LINE' && targetUnit) {
      targetUnit.holdLineBuff = true;
      targetUnit.morale = 100;
      this.addFloatingText('HOLD THE LINE! 🛡️', targetUnit.x, targetUnit.y, '#00f2fe');
      this.log(`Applied Hold The Line to ${targetUnit.type.name}!`, 'tactics');
    } else if (card.id === 'FEIGNED_RETREAT' && targetUnit) {
      targetUnit.applyMoraleDamage(25);
      this.addFloatingText('-25 Morale (Baited!)', targetUnit.x, targetUnit.y, '#ffb703');
      this.log(`Feigned Retreat baited ${targetUnit.type.name}! Morale dropped.`, 'tactics');
    } else if (card.id === 'CUT_SUPPLY') {
      const redUnits = this.units.filter(u => u.faction === FACTIONS.RED);
      redUnits.forEach(u => u.applyMoraleDamage(30));
      this.log(`GLOBAL SUPPLY CUT! All enemy units suffered -30 morale loss!`, 'tactics');
      sound.playPanicHorn();
    } else if (card.id === 'SMOKE_SCREEN') {
      this.smokeTiles.push({ x: tileX, y: tileY, duration: 2 });
      this.log(`Deployed Tactical Smoke Screen at (${tileX}, ${tileY})!`, 'tactics');
    }

    this.activeCard = null;
    this.renderTacticalCards();
    this.updateHUD();
  }

  // --- Victory Checker ---
  checkVictoryConditions() {
    const blueAlive = this.units.filter(u => u.faction === FACTIONS.BLUE && !u.isRouted()).length;
    const redAlive = this.units.filter(u => u.faction === FACTIONS.RED && !u.isRouted()).length;

    const scenario = SCENARIOS[this.currentScenarioKey];

    if (redAlive === 0 || (this.turn >= scenario.maxTurns && blueAlive > 0)) {
      this.showEndModal(true);
    } else if (blueAlive === 0) {
      this.showEndModal(false);
    }
  }

  showEndModal(isVictory) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const sub = document.getElementById('modalSubtitle');
    const stats = document.getElementById('modalStats');

    overlay.classList.remove('hidden');

    if (isVictory) {
      sound.playVictoryFanfare();
      title.innerText = '🏆 TACTICAL VICTORY!';
      title.style.color = '#00f2fe';
      sub.innerText = 'Your low troop fraction successfully outsmarted the superior enemy horde using terrain & force multipliers!';
    } else {
      sound.playDefeatSound();
      title.innerText = '💀 DEFEAT';
      title.style.color = '#ff4b5c';
      sub.innerText = 'The enemy numerical swarm overwhelmed your tactical positions. Refine your chokepoints and morale traps.';
    }

    const blueInitial = SCENARIOS[this.currentScenarioKey].id === 'thermopylae' ? 5 : 4;
    const redInitial = SCENARIOS[this.currentScenarioKey].id === 'thermopylae' ? 20 : 14;

    stats.innerHTML = `
      <div><strong>Turns Elapsed:</strong> ${this.turn} / ${SCENARIOS[this.currentScenarioKey].maxTurns}</div>
      <div><strong>Friendly Units Remaining:</strong> ${this.units.filter(u => u.faction === FACTIONS.BLUE && !u.isRouted()).length}</div>
      <div><strong>Enemy Casualties:</strong> ${redInitial - this.units.filter(u => u.faction === FACTIONS.RED && !u.isRouted()).length} / ${redInitial}</div>
      <div><strong>Strategic Rating:</strong> ${isVictory ? '⭐ S-RANK TACTICIAN' : 'C-RANK'}</div>
    `;
  }

  // --- Rendering ---
  startRenderLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Grid Tiles & Terrain
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.map.getTile(c, r);
        const x = c * this.tileSize;
        const y = r * this.tileSize;

        // Base Tile Fill
        this.ctx.fillStyle = tile.color;
        this.ctx.fillRect(x, y, this.tileSize, this.tileSize);

        // Tile Grid Lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);

        // Elevation / Cover Highlighting
        if (tile.elevation > 0) {
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          this.ctx.fillRect(x + 2, y + 2, this.tileSize - 4, this.tileSize - 4);
        }

        // Draw Terrain Symbol
        this.ctx.font = '20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tile.symbol, x + this.tileSize / 2, y + this.tileSize / 2);
      }
    }

    // 2. Draw Movement & Attack Range Highlights
    if (this.selectedUnit && this.currentFaction === FACTIONS.BLUE) {
      this.validMoves.forEach(m => {
        this.ctx.fillStyle = 'rgba(0, 242, 254, 0.25)';
        this.ctx.fillRect(m.x * this.tileSize, m.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.strokeStyle = '#00f2fe';
        this.ctx.strokeRect(m.x * this.tileSize, m.y * this.tileSize, this.tileSize, this.tileSize);
      });

      this.validAttacks.forEach(a => {
        this.ctx.fillStyle = 'rgba(255, 75, 92, 0.3)';
        this.ctx.fillRect(a.x * this.tileSize, a.y * this.tileSize, this.tileSize, this.tileSize);
        this.ctx.strokeStyle = '#ff4b5c';
        this.ctx.strokeRect(a.x * this.tileSize, a.y * this.tileSize, this.tileSize, this.tileSize);
      });
    }

    // 3. Draw Smoke Screens
    this.smokeTiles.forEach(sm => {
      this.ctx.fillStyle = 'rgba(150, 150, 150, 0.6)';
      this.ctx.fillRect(sm.x * this.tileSize, sm.y * this.tileSize, this.tileSize, this.tileSize);
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText('🌫️', sm.x * this.tileSize + 30, sm.y * this.tileSize + 30);
    });

    // 4. Draw Units
    this.units.forEach(unit => {
      if (unit.isRouted()) return;

      const ux = unit.x * this.tileSize;
      const uy = unit.y * this.tileSize;

      // Selection Ring
      if (this.selectedUnit === unit) {
        this.ctx.strokeStyle = '#ffb703';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(ux + 2, uy + 2, this.tileSize - 4, this.tileSize - 4);
        this.ctx.lineWidth = 1;
      }

      // Stealth semi-transparency
      if (unit.isStealthed) {
        this.ctx.globalAlpha = 0.4;
      } else {
        this.ctx.globalAlpha = 1.0;
      }

      // Faction Base Ring
      this.ctx.beginPath();
      this.ctx.arc(ux + 30, uy + 30, 22, 0, Math.PI * 2);
      this.ctx.fillStyle = unit.faction === FACTIONS.BLUE ? 'rgba(37, 117, 252, 0.85)' : 'rgba(230, 57, 70, 0.85)';
      this.ctx.fill();
      this.ctx.strokeStyle = unit.faction === FACTIONS.BLUE ? '#00f2fe' : '#ff4b5c';
      this.ctx.stroke();

      // Symbol
      this.ctx.font = '22px sans-serif';
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(unit.type.symbol, ux + 30, uy + 30);

      // Facing Direction Arrow
      const arrowMap = { NORTH: '⬆️', EAST: '➡️', SOUTH: '⬇️', WEST: '⬅️' };
      this.ctx.font = '10px sans-serif';
      this.ctx.fillText(arrowMap[unit.facing] || '➡️', ux + 52, uy + 12);

      // Health Bar
      const hpPct = unit.hp / unit.maxHp;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(ux + 6, uy + 50, 48, 5);
      this.ctx.fillStyle = hpPct > 0.5 ? '#10b981' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
      this.ctx.fillRect(ux + 6, uy + 50, 48 * hpPct, 5);

      // Morale Indicator Dot
      if (unit.isPanicking()) {
        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(ux + 10, uy + 10, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.globalAlpha = 1.0;
    });

    // 5. Draw Floating Animations Text
    this.floatingTexts.forEach((ft, idx) => {
      this.ctx.font = 'bold 13px JetBrains Mono';
      this.ctx.fillStyle = ft.color || '#fff';
      this.ctx.fillText(ft.text, ft.x * this.tileSize + 30, ft.y * this.tileSize - ft.offset);
      ft.offset += 0.8;
      ft.life -= 1;
      if (ft.life <= 0) {
        this.floatingTexts.splice(idx, 1);
      }
    });
  }

  addFloatingText(text, x, y, color = '#fff') {
    this.floatingTexts.push({ text, x, y, color, offset: 0, life: 40 });
  }

  // --- UI Event Handlers ---
  setupEventListeners() {
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    document.getElementById('scenarioSelect').addEventListener('change', (e) => {
      this.loadScenario(e.target.value);
    });

    document.getElementById('btnRestart').addEventListener('click', () => {
      this.loadScenario(this.currentScenarioKey);
    });

    document.getElementById('btnEndTurn').addEventListener('click', () => {
      if (this.currentFaction === FACTIONS.BLUE) {
        this.endTurn();
      }
    });

    document.getElementById('btnSoundToggle').addEventListener('click', () => {
      const active = sound.toggleSound();
      document.getElementById('btnSoundToggle').innerText = active ? '🔊' : '🔇';
    });

    document.getElementById('btnModalRestart').addEventListener('click', () => {
      document.getElementById('modalOverlay').classList.add('hidden');
      this.loadScenario(this.currentScenarioKey);
    });

    document.getElementById('btnModalNext').addEventListener('click', () => {
      document.getElementById('modalOverlay').classList.add('hidden');
      const scenariosList = ['thermopylae', 'ambush', 'supplyCut', 'citadel', 'skirmish'];
      const currentIdx = scenariosList.indexOf(this.currentScenarioKey);
      const nextKey = scenariosList[(currentIdx + 1) % scenariosList.length];
      document.getElementById('scenarioSelect').value = nextKey;
      this.loadScenario(nextKey);
    });
  }

  onCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const tileX = Math.floor(clickX / this.tileSize);
    const tileY = Math.floor(clickY / this.tileSize);

    if (!this.map.isValid(tileX, tileY)) return;

    const clickedUnit = this.getUnitAt(tileX, tileY);

    // Active Card Mode
    if (this.activeCard) {
      this.applyTacticalCard(this.activeCard, clickedUnit, tileX, tileY);
      return;
    }

    // Player Turn Selection & Controls
    if (this.currentFaction === FACTIONS.BLUE) {
      // Move Execution
      if (this.selectedUnit && this.validMoves.some(m => m.x === tileX && m.y === tileY)) {
        this.moveUnit(this.selectedUnit, tileX, tileY);
        this.validMoves = [];
        this.validAttacks = this.getValidAttackTargets(this.selectedUnit);
        this.updateInspector(this.selectedUnit);
        return;
      }

      // Attack Execution
      if (this.selectedUnit && clickedUnit && this.validAttacks.some(a => a === clickedUnit)) {
        this.executeAttack(this.selectedUnit, clickedUnit);
        this.selectedUnit = null;
        this.validMoves = [];
        this.validAttacks = [];
        this.updateInspector(null);
        return;
      }

      // Select Friendly Unit
      if (clickedUnit && clickedUnit.faction === FACTIONS.BLUE) {
        this.selectedUnit = clickedUnit;
        this.validMoves = this.getValidMoves(clickedUnit);
        this.validAttacks = this.getValidAttackTargets(clickedUnit);
        this.updateInspector(clickedUnit);
        sound.playSelect();
        return;
      }
    }

    // Select/Inspect any unit or tile
    this.selectedUnit = clickedUnit || null;
    this.validMoves = [];
    this.validAttacks = [];
    this.updateInspector(clickedUnit);
  }

  // --- DOM Helpers ---
  initUI() {
    this.updateHUD();
    this.renderTacticalCards();
  }

  updateHUD() {
    const blueCount = this.units.filter(u => u.faction === FACTIONS.BLUE && !u.isRouted()).length;
    const redCount = this.units.filter(u => u.faction === FACTIONS.RED && !u.isRouted()).length;

    document.getElementById('hudPlayerCount').innerText = `🔵 Blue Army: ${blueCount}`;
    document.getElementById('hudEnemyCount').innerText = `🔴 Red Army: ${redCount}`;
    document.getElementById('hudRatio').innerText = `Ratio: 1 : ${(redCount / (blueCount || 1)).toFixed(1)}`;
  }

  updateTurnUI() {
    const badge = document.getElementById('turnBadge');
    document.getElementById('turnNumber').innerText = this.turn;

    if (this.currentFaction === FACTIONS.BLUE) {
      badge.innerText = 'PLAYER TURN';
      badge.classList.remove('enemy');
    } else {
      badge.innerText = 'ENEMY THINKING...';
      badge.classList.add('enemy');
    }
  }

  updateObjectivesUI() {
    const container = document.getElementById('objectivesList');
    const sc = SCENARIOS[this.currentScenarioKey];
    container.innerHTML = sc.objectives.map(o => `
      <div class="objective-item ${o.primary ? 'primary' : ''}">
        <span>${o.primary ? '🎯' : '🔹'}</span>
        <div>${o.text}</div>
      </div>
    `).join('');
  }

  renderTacticalCards() {
    const container = document.getElementById('cardsDock');
    container.innerHTML = this.tacticalDeck.cards.map(c => {
      const disabled = this.tacticalDeck.commandPoints < c.cost;
      return `
        <div class="tactical-card ${disabled ? 'disabled' : ''}" data-card-id="${c.id}">
          <div class="card-title-row">
            <span>${c.name}</span>
            <span class="card-cost">${c.cost} CP</span>
          </div>
          <div class="card-desc">${c.desc}</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.tactical-card').forEach(cardEl => {
      cardEl.addEventListener('click', () => {
        const id = cardEl.getAttribute('data-card-id');
        this.activateCard(id);
      });
    });
  }

  updateInspector(unit) {
    const container = document.getElementById('unitInspector');
    if (!unit) {
      container.innerHTML = '<div class="empty-state">Select any unit on the tactical map to inspect combat stats, morale, and supply line.</div>';
      return;
    }

    const tile = this.map.getTile(unit.x, unit.y);
    const hpPct = Math.round((unit.hp / unit.maxHp) * 100);

    container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <span class="inspector-icon">${unit.type.symbol}</span>
          <div>
            <div class="inspector-name">${unit.type.name}</div>
            <div class="inspector-faction ${unit.faction}">${unit.faction === FACTIONS.BLUE ? 'BLUE VANGUARD' : 'RED HORDE'}</div>
          </div>
        </div>

        <div class="stat-bar-group">
          <div class="stat-row">
            <span>HIT POINTS</span>
            <span>${unit.hp} / ${unit.maxHp}</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill hp ${hpPct < 30 ? 'low' : ''}" style="width: ${hpPct}%"></div>
          </div>

          <div class="stat-row mt-15">
            <span>MORALE DISCIPLINE</span>
            <span>${unit.morale} / 100</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill morale ${unit.isPanicking() ? 'panic' : ''}" style="width: ${unit.morale}%"></div>
          </div>
        </div>

        <div class="stat-grid mt-15">
          <div class="stat-pill"><span class="label">ATK:</span> <span class="val">${unit.attack}</span></div>
          <div class="stat-pill"><span class="label">DEF:</span> <span class="val">${unit.defense} (+${Math.round(tile.defBonus * 100)}%)</span></div>
          <div class="stat-pill"><span class="label">RNG:</span> <span class="val">${unit.range}</span></div>
          <div class="stat-pill"><span class="label">MOV:</span> <span class="val">${unit.moveSpeed}</span></div>
        </div>

        <div class="stat-pill mt-15" style="width: 100%">
          <span class="label">TERRAIN:</span> <span class="val">${tile.symbol} ${tile.name}</span>
        </div>
      </div>
    `;
  }

  log(msg, type = 'system') {
    const logBox = document.getElementById('battleLog');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[T${this.turn}] ${msg}`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
  }
}

// Instantiate engine when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
