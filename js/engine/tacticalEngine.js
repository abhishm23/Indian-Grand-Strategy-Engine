/**
 * js/engine/tacticalEngine.js
 * 
 * Pure ES6 Headless 2D Tactical Battlefield Engine
 * For 14th-Century Indian Subcontinent Grand Strategy Game.
 * 
 * ZERO DOM / Canvas dependencies. 100% Headless testable in Node.js.
 * Grid: 20x14 square tiles (50px tiles on 1000x700 canvas = 280 tiles).
 * Attacker West (cols 0-3), Defender East (cols 16-19), No-man's land (cols 4-15).
 */

import { UNIT_TYPES, COUNTER_MATRIX } from '../data/units.js';

// ============================================================================
// 1. Facings and Vectors (8-Directional & 4-Cardinal)
// ============================================================================

export const FACING = Object.freeze({
  N:  { dc: 0,  dr: -1, angle: 270, name: 'NORTH',     code: 'N' },
  NE: { dc: 1,  dr: -1, angle: 315, name: 'NORTHEAST', code: 'NE' },
  E:  { dc: 1,  dr: 0,  angle: 0,   name: 'EAST',      code: 'E' },
  SE: { dc: 1,  dr: 1,  angle: 45,  name: 'SOUTHEAST', code: 'SE' },
  S:  { dc: 0,  dr: 1,  angle: 90,  name: 'SOUTH',     code: 'S' },
  SW: { dc: -1, dr: 1,  angle: 135, name: 'SOUTHWEST', code: 'SW' },
  W:  { dc: -1, dr: 0,  angle: 180, name: 'WEST',      code: 'W' },
  NW: { dc: -1, dr: -1, angle: 225, name: 'NORTHWEST', code: 'NW' },

  // Aliases for cardinal names
  NORTH:     { dc: 0,  dr: -1, angle: 270, name: 'NORTH',     code: 'N' },
  NORTHEAST: { dc: 1,  dr: -1, angle: 315, name: 'NORTHEAST', code: 'NE' },
  EAST:      { dc: 1,  dr: 0,  angle: 0,   name: 'EAST',      code: 'E' },
  SOUTHEAST: { dc: 1,  dr: 1,  angle: 45,  name: 'SOUTHEAST', code: 'SE' },
  SOUTH:     { dc: 0,  dr: 1,  angle: 90,  name: 'SOUTH',     code: 'S' },
  SOUTHWEST: { dc: -1, dr: 1,  angle: 135, name: 'SOUTHWEST', code: 'SW' },
  WEST:      { dc: -1, dr: 0,  angle: 180, name: 'WEST',      code: 'W' },
  NORTHWEST: { dc: -1, dr: -1, angle: 225, name: 'NORTHWEST', code: 'NW' }
});

// ============================================================================
// 2. Tactical Combat Mathematics
// ============================================================================

export class TacticalCombatMath {
  /**
   * Returns normalized directional facing vector { dc, dr }.
   */
  static calculateFacingVector(facing) {
    const f = FACING[facing] || FACING.EAST;
    const len = Math.hypot(f.dc, f.dr) || 1;
    return { dc: f.dc / len, dr: f.dr / len, rawDc: f.dc, rawDr: f.dr };
  }

  /**
   * Determines best 8-direction facing string from a vector (dc, dr).
   */
  static calculateVectorFacing(dc, dr) {
    if (dc === 0 && dr === 0) return 'E';
    const angle = (Math.atan2(dr, dc) * 180 / Math.PI + 360) % 360;

    if (angle >= 337.5 || angle < 22.5) return 'E';
    if (angle >= 22.5 && angle < 67.5) return 'SE';
    if (angle >= 67.5 && angle < 112.5) return 'S';
    if (angle >= 112.5 && angle < 157.5) return 'SW';
    if (angle >= 157.5 && angle < 202.5) return 'W';
    if (angle >= 202.5 && angle < 247.5) return 'NW';
    if (angle >= 247.5 && angle < 292.5) return 'N';
    return 'NE';
  }

  /**
   * Calculates approach angle between defender's facing and the incoming attack vector.
   * Angle in degrees: 0..180
   */
  static calculateApproachAngle(defenderFacing, defCol, defRow, atkCol, atkRow) {
    const f = this.calculateFacingVector(defenderFacing);

    // Vector from defender to attacker
    const vDc = atkCol - defCol;
    const vDr = atkRow - defRow;
    const vLen = Math.hypot(vDc, vDr) || 1;

    const normVDc = vDc / vLen;
    const normVDr = vDr / vLen;

    // Dot product: f . v
    const dot = f.dc * normVDc + f.dr * normVDr;
    const clampedDot = Math.max(-1.0, Math.min(1.0, dot));
    const angle = Math.acos(clampedDot) * (180 / Math.PI);

    return Math.round(angle * 100) / 100;
  }

  /**
   * Maps angle to Front, Flank, or Rear directional combat properties.
   * - Front (0°–45°): 1.0x damage, 0 morale shock, 0% armor reduction, counter allowed
   * - Flank (46°–135°): 1.4x damage, -20 morale shock, 50% armor reduction, counter allowed
   * - Rear (136°–180°): 2.0x damage, -40 morale shock, 100% armor reduction (bypass), NO counter
   */
  static calculateDirectionalAttack(angleDegrees) {
    if (angleDegrees <= 45.0) {
      return {
        direction: 'FRONT',
        damageMultiplier: 1.0,
        moraleShock: 0,
        armorReduction: 0.0,
        counterAllowed: true
      };
    } else if (angleDegrees <= 135.0) {
      return {
        direction: 'FLANK',
        damageMultiplier: 1.4,
        moraleShock: -20,
        armorReduction: 0.50,
        counterAllowed: true
      };
    } else {
      return {
        direction: 'REAR',
        damageMultiplier: 2.0,
        moraleShock: -40,
        armorReduction: 1.0,
        counterAllowed: false
      };
    }
  }

  /**
   * Elevation combat modifier:
   * +25% attack per downhill level, +1 missile range
   * -25% attack per uphill level, -1 missile range
   */
  static calculateElevationModifier(atkElev = 0, defElev = 0) {
    const delta = atkElev - defElev;
    if (delta > 0) {
      return {
        damageMultiplier: 1.0 + 0.25 * delta,
        rangeBonus: delta
      };
    } else if (delta < 0) {
      return {
        damageMultiplier: Math.max(0.25, 1.0 + 0.25 * delta),
        rangeBonus: delta
      };
    }
    return { damageMultiplier: 1.0, rangeBonus: 0 };
  }

  /**
   * Terrain cover modifiers.
   */
  static calculateTerrainCoverModifier(tile, isMissile = false) {
    if (!tile) {
      return { damageReduction: 0.0, chargeAllowed: true, defenseModifier: 1.0, grantsStealth: false };
    }

    if (tile.isCover || tile.terrainType === 'FOREST' || tile.terrainType === 'JUNGLE') {
      return {
        damageReduction: isMissile ? 0.50 : 0.0, // 50% missile protection
        chargeAllowed: false,                    // breaks cavalry charge
        defenseModifier: 1.25,                   // >= 25% defense bonus
        grantsStealth: true
      };
    }

    if (tile.isMarsh || tile.terrainType === 'MARSH' || (tile.isRiver && !tile.isBridge)) {
      return {
        damageReduction: 0.0,
        chargeAllowed: false,
        defenseModifier: 0.75, // -25% defense penalty in swamp/water
        grantsStealth: false
      };
    }

    if (tile.terrainType === 'MOUNTAIN' || tile.terrainType === 'MOUNTAIN_PASS') {
      return {
        damageReduction: 0.25,
        chargeAllowed: false,
        defenseModifier: 1.25,
        grantsStealth: false
      };
    }

    return { damageReduction: 0.0, chargeAllowed: true, defenseModifier: 1.0, grantsStealth: false };
  }

  /**
   * General leadership aura radius:
   * max(2, floor(command / 2) + 1)
   */
  static calculateGeneralAuraRadius(command = 0) {
    return Math.max(2, Math.floor((command || 0) / 2) + 1);
  }

  /**
   * Classify morale state:
   * >= 50: STEADY
   * 25-49: SHAKEN
   * 21-24: PANICKING
   * <= 20: ROUTED
   */
  static classifyMorale(morale) {
    if (morale <= 20) return 'ROUTED';
    if (morale < 25) return 'PANICKING';
    if (morale < 50) return 'SHAKEN';
    return 'STEADY';
  }
}

// ============================================================================
// 3. Tactical Unit Entity
// ============================================================================

export class TacticalUnit {
  constructor(regimentData, side, isPlayer = false, generalData = null) {
    const typeKey = regimentData.unitTypeId || regimentData.id || 'RAJPUT_LEVIES';
    const uType = UNIT_TYPES[typeKey] || UNIT_TYPES.RAJPUT_LEVIES;

    this.id = regimentData.id || `reg_${side.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    this.originalRegiment = regimentData;
    this.unitTypeId = uType.id;
    this.name = regimentData.name || uType.name;
    this.regionalName = uType.regionalName || uType.name;
    this.unitClass = uType.unitClass || uType.class || 'FEROCIOUS_INFANTRY';
    this.side = side; // 'ATTACKER' or 'DEFENDER'
    this.isAttacker = (side === 'ATTACKER');
    this.isPlayer = Boolean(isPlayer);

    // Spatial State
    this.col = 0;
    this.row = 0;
    this.facing = this.isAttacker ? 'E' : 'W';
    this.facingVector = TacticalCombatMath.calculateFacingVector(this.facing);

    // Combat Stats
    this.maxHp = uType.maxHp || 100;
    this.hp = Math.min(this.maxHp, regimentData.hp ?? this.maxHp);
    this.meleeAtk = uType.meleeAttack || uType.meleeAtk || 30;
    this.meleeDef = uType.meleeDefense || uType.meleeDef || 15;
    this.range = uType.range || 1;
    this.minRange = uType.minRange || 1;
    this.moveSpeed = uType.moveSpeed || 3;
    this.remainingMp = this.moveSpeed;

    // Action Points: 2 AP per turn
    this.maxAP = 2;
    this.actionPoints = 2;
    this.hasMoved = false;
    this.hasAttacked = false;
    this.movedDistance = 0;

    // Morale & Psychology
    this.baseMorale = uType.baseMorale || 100;
    this.maxMorale = this.baseMorale;
    this.morale = Math.min(this.maxMorale, regimentData.morale ?? this.baseMorale);
    this.moraleState = TacticalCombatMath.classifyMorale(this.morale);
    this.isRouted = (this.morale <= 20);
    this.hasExited = false;
    this.hasFrenzied = false; // For War Elephant Berserk Frenzy

    // General & Aura State
    this.isCommander = Boolean(generalData);
    this.generalData = generalData;
    this.command = generalData?.attributes?.command || generalData?.command || 0;
    this.dread = generalData?.attributes?.dread || generalData?.dread || 0;
    this.piety = generalData?.attributes?.piety || generalData?.piety || 0;
    this.auraRadius = this.isCommander ? TacticalCombatMath.calculateGeneralAuraRadius(this.command) : 0;
    this.inGeneralAura = false;

    // Special Class Abilities
    this.terrorMoraleDrain = uType.terrorMoraleDrain || (uType.id === 'WAR_ELEPHANTS' ? 30 : 0);
    this.skirmishRetreat = Boolean(uType.skirmishRetreat);
    this.marshImmunity = Boolean(uType.specialAbility === 'MARSH_IMMUNITY' || uType.id === 'PAIKS');
    this.jungleStealth = Boolean(uType.id === 'PAIKS');
    this.spearBrace = Boolean(uType.id === 'RAJPUT_LEVIES');
    this.hillCombatBonus = uType.hillCombatBonus || (uType.id === 'RAJPUT_LEVIES' ? 0.35 : 0.0);
    this.minMoraleFloor = uType.minMoraleFloor || (uType.id === 'RAJPUT_LEVIES' ? 25 : 0);
    this.chargeMultiplier = uType.chargeMultiplier || (uType.id === 'HEAVY_CAVALRY' ? 2.2 : 1.0);
    this.aoeRadius = uType.aoeRadius || (uType.id === 'SIEGE_ENGINES' ? 1 : 0);

    // Apply General Starting Morale Boost if commander
    if (this.isCommander) {
      const boost = Math.floor(this.command * 2.5) + Math.floor(this.piety * 1.5);
      this.maxMorale = Math.min(150, this.baseMorale + boost);
      this.morale = Math.min(this.maxMorale, this.morale + boost);
      this.moraleState = TacticalCombatMath.classifyMorale(this.morale);
    }
  }

  canAct() {
    return this.actionPoints > 0 && !this.isRouted && this.hp > 0 && !this.hasExited;
  }

  setFacing(newFacing) {
    const code = (FACING[newFacing] || FACING.E).code;
    this.facing = code;
    this.facingVector = TacticalCombatMath.calculateFacingVector(code);
  }

  takeDamage(amount) {
    const actualDmg = Math.max(0, Math.min(this.hp, Math.round(amount)));
    this.hp -= actualDmg;
    return actualDmg;
  }

  drainMorale(amount, isCasualtyDrain = false) {
    let loss = Math.max(0, Math.round(amount));

    // Rajput Levies Jauhar floor: casualty shock cannot drop morale below 25
    if (isCasualtyDrain && this.minMoraleFloor > 0 && this.morale > this.minMoraleFloor) {
      const floor = this.minMoraleFloor;
      if (this.morale - loss < floor) {
        loss = Math.max(0, this.morale - floor);
      }
    }

    this.morale = Math.max(0, this.morale - loss);
    this.moraleState = TacticalCombatMath.classifyMorale(this.morale);

    if (this.morale <= 20) {
      this.isRouted = true;
    }
    return loss;
  }

  recoverMorale(amount) {
    if (this.isRouted || this.hp <= 0) return 0;
    const gained = Math.min(this.maxMorale - this.morale, Math.max(0, Math.round(amount)));
    this.morale += gained;
    this.moraleState = TacticalCombatMath.classifyMorale(this.morale);
    return gained;
  }

  resetTurn() {
    this.actionPoints = 2;
    this.remainingMp = this.moveSpeed;
    this.hasMoved = false;
    this.hasAttacked = false;
    this.movedDistance = 0;
  }
}

// ============================================================================
// 4. Tactical Grid (20x14 Matrix & Procedural Terrain)
// ============================================================================

export class TacticalGrid {
  constructor(cols = 20, rows = 14, province = null) {
    this.cols = cols;
    this.rows = rows;
    this.province = province;
    this.tiles = [];
    this.init(province);
  }

  init(province = null) {
    this.province = province;
    this.tiles = [];

    // 1. Create base 20x14 tile matrix
    for (let r = 0; r < this.rows; r++) {
      this.tiles[r] = [];
      for (let c = 0; c < this.cols; c++) {
        let zone = null;
        if (c <= 3) zone = 'ATTACKER';
        else if (c >= 16) zone = 'DEFENDER';

        this.tiles[r][c] = {
          col: c,
          row: r,
          terrainType: 'PLAIN',
          elevation: 0,
          movementCost: 1.0,
          isCover: false,
          isImpassable: false,
          isRiver: false,
          isBridge: false,
          isMarsh: false,
          deploymentZone: zone,
          unitId: null
        };
      }
    }

    // 2. Procedural features based on province terrain
    const pType = province?.terrainType || 'FLOODPLAIN';

    if (pType === 'FLOODPLAIN' || pType === 'RIVER_DELTA') {
      // River along cols 9-10
      for (let r = 0; r < this.rows; r++) {
        for (const c of [9, 10]) {
          const tile = this.tiles[r][c];
          tile.isRiver = true;
          tile.terrainType = 'RIVER';
          tile.isImpassable = true;
          tile.movementCost = 999;
        }
      }
      // Bridges at rows 3, 4, 9, 10
      [3, 4, 9, 10].forEach(r => {
        for (const c of [9, 10]) {
          const tile = this.tiles[r][c];
          tile.isImpassable = false;
          tile.isBridge = true;
          tile.terrainType = 'BRIDGE';
          tile.movementCost = 1.0;
        }
      });
      // Marsh fringe in delta
      if (pType === 'RIVER_DELTA') {
        for (let r = 1; r < this.rows - 1; r++) {
          for (const c of [8, 11]) {
            if (r % 2 === 0) {
              const tile = this.tiles[r][c];
              tile.isMarsh = true;
              tile.terrainType = 'MARSH';
              tile.movementCost = 2.0; // 50% movement penalty
            }
          }
        }
      }
    } else if (pType === 'HIGHLAND_HILLS') {
      // Hills in cols 7-12
      for (let r = 0; r < this.rows; r++) {
        for (let c = 6; c <= 13; c++) {
          this.tiles[r][c].elevation = 1;
          this.tiles[r][c].terrainType = 'HILL';
          this.tiles[r][c].movementCost = 1.5;
        }
      }
      // Crag peak in cols 9-11 (rows 4-9)
      for (let r = 4; r <= 9; r++) {
        for (let c = 8; c <= 11; c++) {
          this.tiles[r][c].elevation = 2;
          this.tiles[r][c].terrainType = 'CRAG';
          this.tiles[r][c].movementCost = 2.0;
        }
      }
    } else if (pType === 'JUNGLE') {
      // Clustered forest in cols 5-14
      for (let r = 1; r < this.rows - 1; r++) {
        for (let c = 5; c <= 14; c++) {
          if ((c * 3 + r * 7) % 5 <= 2) {
            const tile = this.tiles[r][c];
            tile.isCover = true;
            tile.terrainType = 'FOREST';
            tile.movementCost = 1.8;
          }
        }
      }
    } else if (pType === 'MOUNTAIN_PASS') {
      // Top & bottom mountain barriers
      for (let c = 6; c <= 13; c++) {
        for (let r = 0; r <= 3; r++) {
          this.tiles[r][c].isImpassable = true;
          this.tiles[r][c].terrainType = 'MOUNTAIN';
          this.tiles[r][c].movementCost = 999;
        }
        for (let r = 10; r <= 13; r++) {
          this.tiles[r][c].isImpassable = true;
          this.tiles[r][c].terrainType = 'MOUNTAIN';
          this.tiles[r][c].movementCost = 999;
        }
      }
      // Narrow pass with elevation 1 flanks
      for (let r = 4; r <= 9; r++) {
        this.tiles[r][6].elevation = 1;
        this.tiles[r][13].elevation = 1;
      }
    } else if (pType === 'ARID_PLATEAU' || pType === 'DESERT_WASTELAND') {
      // Open hardpack with isolated elevation 1 mesas
      for (const r of [3, 4, 9, 10]) {
        for (const c of [7, 8, 12, 13]) {
          this.tiles[r][c].elevation = 1;
          this.tiles[r][c].terrainType = 'HILL';
        }
      }
    }
  }

  getTile(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.tiles[row][col];
  }

  isValidCoord(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  getDistance(c1, r1, c2, r2) {
    return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));
  }

  isPassable(col, row, unit = null) {
    const tile = this.getTile(col, row);
    if (!tile || tile.isImpassable) return false;
    // Marsh immunity for Paiks
    return true;
  }

  getNeighbors(col, row, allowDiagonals = true) {
    const neighbors = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dc === 0 && dr === 0) continue;
        if (!allowDiagonals && Math.abs(dc) + Math.abs(dr) > 1) continue;
        const nc = col + dc;
        const nr = row + dr;
        if (this.isValidCoord(nc, nr)) {
          neighbors.push(this.tiles[nr][nc]);
        }
      }
    }
    return neighbors;
  }

  /**
   * Calculates tile movement cost for a unit, factoring in terrain and abilities.
   */
  getTileMoveCost(tile, unit) {
    if (!tile || tile.isImpassable) return Infinity;
    if (unit && unit.marshImmunity && (tile.isMarsh || tile.terrainType === 'MARSH' || tile.isRiver)) {
      return 1.0; // Paiks Marsh Immunity
    }
    return tile.movementCost || 1.0;
  }

  /**
   * Breadth-First-Search / Dijkstra to find reachable tiles for unit.
   * Returns Array of { col, row, cost, path }.
   */
  getReachableTiles(unit, allUnits = []) {
    if (!unit || unit.actionPoints <= 0 || unit.isRouted || unit.hp <= 0) return [];

    const startCol = unit.col;
    const startRow = unit.row;
    const maxDistance = unit.remainingMp ?? unit.moveSpeed;

    const unitMap = new Map();
    allUnits.forEach(u => {
      if (u.hp > 0 && !u.hasExited && !(u.col === startCol && u.row === startRow)) {
        unitMap.set(`${u.col},${u.row}`, u);
      }
    });

    // Dijkstra priority queue / distance map
    const distMap = new Map();
    const parentMap = new Map();
    const key = (c, r) => `${c},${r}`;

    distMap.set(key(startCol, startRow), 0);
    const queue = [{ col: startCol, row: startRow, cost: 0 }];

    const reachable = [];

    while (queue.length > 0) {
      // Sort for smallest cost
      queue.sort((a, b) => a.cost - b.cost);
      const curr = queue.shift();

      const currKey = key(curr.col, curr.row);
      if (curr.cost > distMap.get(currKey)) continue;

      const neighbors = this.getNeighbors(curr.col, curr.row, true);
      for (const nextTile of neighbors) {
        const nextKey = key(nextTile.col, nextTile.row);

        // Check occupancy
        const occ = unitMap.get(nextKey);
        // Cannot pass through enemy units (Zone of Control / block)
        if (occ && occ.side !== unit.side) continue;

        const stepCost = this.getTileMoveCost(nextTile, unit);
        if (stepCost === Infinity) continue;

        const newCost = curr.cost + stepCost;

        if (newCost <= maxDistance + 0.001) {
          if (!distMap.has(nextKey) || newCost < distMap.get(nextKey)) {
            distMap.set(nextKey, newCost);
            parentMap.set(nextKey, { col: curr.col, row: curr.row });
            queue.push({ col: nextTile.col, row: nextTile.row, cost: newCost });

            // Cannot land on occupied friendly unit's tile, but can pass through
            if (!occ) {
              reachable.push({
                col: nextTile.col,
                row: nextTile.row,
                cost: newCost
              });
            }
          }
        }
      }
    }

    // Deduplicate reachable tiles
    const seen = new Set();
    const result = [];
    for (const item of reachable) {
      const k = key(item.col, item.row);
      if (!seen.has(k)) {
        seen.add(k);
        result.push(item);
      }
    }
    return result;
  }

  /**
   * BFS Pathfinding from start to target.
   * Returns Array of { col, row } path or null if unreachable.
   */
  findPath(startCol, startRow, targetCol, targetRow, unit, allUnits = []) {
    if (startCol === targetCol && startRow === targetRow) return [];

    const unitMap = new Map();
    allUnits.forEach(u => {
      if (u.hp > 0 && !u.hasExited && !(u.col === startCol && u.row === startRow) && !(u.col === targetCol && u.row === targetRow)) {
        unitMap.set(`${u.col},${u.row}`, u);
      }
    });

    const key = (c, r) => `${c},${r}`;
    const distMap = new Map();
    const parentMap = new Map();

    distMap.set(key(startCol, startRow), 0);
    const queue = [{ col: startCol, row: startRow, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const curr = queue.shift();

      if (curr.col === targetCol && curr.row === targetRow) {
        // Reconstruct path
        const path = [];
        let currStep = { col: targetCol, row: targetRow };
        while (currStep) {
          path.unshift(currStep);
          currStep = parentMap.get(key(currStep.col, currStep.row));
        }
        return path; // includes start and end
      }

      const neighbors = this.getNeighbors(curr.col, curr.row, true);
      for (const nextTile of neighbors) {
        const nextKey = key(nextTile.col, nextTile.row);

        const occ = unitMap.get(nextKey);
        if (occ && occ.side !== unit?.side && !(nextTile.col === targetCol && nextTile.row === targetRow)) {
          continue;
        }

        const stepCost = this.getTileMoveCost(nextTile, unit);
        if (stepCost === Infinity) continue;

        const newCost = curr.cost + stepCost;
        if (!distMap.has(nextKey) || newCost < distMap.get(nextKey)) {
          distMap.set(nextKey, newCost);
          parentMap.set(nextKey, { col: curr.col, row: curr.row });
          queue.push({ col: nextTile.col, row: nextTile.row, cost: newCost });
        }
      }
    }

    return null;
  }
}

// ============================================================================
// 5. Tactical Battlefield State Machine & Engine
// ============================================================================

export class TacticalEngine {
  constructor(config = {}) {
    this.width = 20;
    this.height = 14;
    this.attackerArmy = config.attackerArmy || { id: 'att_army', factionId: 'FAC_PLAYER', regiments: [] };
    this.defenderArmy = config.defenderArmy || { id: 'def_army', factionId: 'FAC_ENEMY', regiments: [] };
    this.province = config.province || { id: 'PROV_KRISHNA', name: 'Krishna River', terrainType: 'FLOODPLAIN' };
    this.attackerGeneral = config.attackerGeneral || null;
    this.defenderGeneral = config.defenderGeneral || null;
    this.gameState = config.gameState || null;

    this.onLog = config.onLog || (() => {});
    this.onBattleEnd = config.onBattleEnd || (() => {});

    this.grid = new TacticalGrid(this.width, this.height, this.province);
    this.units = [];
    this.round = 1;
    this.currentPhase = 'PLAYER_TURN'; // 'PLAYER_TURN' | 'AI_TURN' | 'BATTLE_OVER'
    this.isOver = false;
    this.winner = null; // 'attacker' | 'defender'
    this._battleEndFired = false;
    this._initialized = false;

    // Telemetry & Logs
    this.combatLog = [];

    // Active Doctrines
    this.activeDoctrines = {
      elephantCharge: false,
      shieldWall: false,
      feignedRetreat: false
    };

    this.init();
    this._initialized = true;
  }

  init() {
    this.units = [];
    this.deployArmies();
    this.updateAuras();
    this.checkBattleEnd();
  }

  deployArmies() {
    const isPlayerAttacker = this.attackerArmy.factionId === (this.gameState?.playerFactionId || this.attackerArmy.factionId);

    // Deploy Attacker in cols 0-3 (facing EAST)
    const attRegs = this.attackerArmy.regiments || [];
    const attGen = this.attackerGeneral || (this.attackerArmy.generalId ? this.gameState?.getCharacter(this.attackerArmy.generalId) : null);

    attRegs.forEach((reg, idx) => {
      const isCommander = idx === 0 && Boolean(attGen);
      const unit = new TacticalUnit(reg, 'ATTACKER', isPlayerAttacker, isCommander ? attGen : null);

      // Positioning in cols 1-3
      const col = 1 + Math.floor(idx / 10);
      const row = Math.min(12, 2 + (idx % 10));
      unit.col = Math.min(3, Math.max(0, col));
      unit.row = Math.min(13, Math.max(0, row));
      unit.setFacing('E');

      this.units.push(unit);
    });

    // Deploy Defender in cols 16-19 (facing WEST)
    const defRegs = this.defenderArmy.regiments || [];
    const defGen = this.defenderGeneral || (this.defenderArmy.generalId ? this.gameState?.getCharacter(this.defenderArmy.generalId) : null);
    const isPlayerDefender = this.defenderArmy.factionId === this.gameState?.playerFactionId;

    defRegs.forEach((reg, idx) => {
      const isCommander = idx === 0 && Boolean(defGen);
      const unit = new TacticalUnit(reg, 'DEFENDER', isPlayerDefender, isCommander ? defGen : null);

      // Positioning in cols 17-18
      const col = 18 - Math.floor(idx / 10);
      const row = Math.min(12, 2 + (idx % 10));
      unit.col = Math.min(19, Math.max(16, col));
      unit.row = Math.min(13, Math.max(0, row));
      unit.setFacing('W');

      this.units.push(unit);
    });

    // Sync units with grid
    this.syncGridUnits();
  }

  syncGridUnits() {
    // Clear all tile units
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        this.grid.tiles[r][c].unitId = null;
      }
    }
    // Set units
    this.units.forEach(u => {
      if (u.hp > 0 && !u.hasExited) {
        const tile = this.grid.getTile(u.col, u.row);
        if (tile) tile.unitId = u.id;
      }
    });
  }

  getUnitAt(col, row) {
    return this.units.find(u => u.col === col && u.row === row && u.hp > 0 && !u.hasExited) || null;
  }

  getUnit(unitId) {
    return this.units.find(u => u.id === unitId) || null;
  }

  /**
   * Updates general leadership auras across all active friendly units.
   */
  updateAuras() {
    const commanders = this.units.filter(u => u.isCommander && u.hp > 0 && !u.isRouted && !u.hasExited);

    this.units.forEach(u => {
      if (u.hp <= 0 || u.hasExited) {
        u.inGeneralAura = false;
        return;
      }
      u.inGeneralAura = commanders.some(c => 
        c.side === u.side && 
        this.grid.getDistance(c.col, c.row, u.col, u.row) <= c.auraRadius
      );
    });
  }

  /**
   * Selects a unit and returns its reachable tiles and attack targets.
   */
  selectUnit(unitId) {
    const unit = this.getUnit(unitId);
    if (!unit) return null;

    const reachableTiles = unit.canAct() ? this.grid.getReachableTiles(unit, this.units) : [];
    const attackTargets = unit.canAct() ? this.getAttackTargets(unit) : [];

    return { unit, reachableTiles, attackTargets };
  }

  /**
   * Get all enemy units within attack range.
   */
  getAttackTargets(unit) {
    if (!unit || unit.actionPoints <= 0 || unit.isRouted || unit.hp <= 0) return [];

    const targets = [];
    const attTile = this.grid.getTile(unit.col, unit.row);
    const minRange = unit.minRange || 1;

    this.units.forEach(other => {
      if (other.side !== unit.side && other.hp > 0 && !other.hasExited) {
        const defTile = this.grid.getTile(other.col, other.row);
        const elevDelta = (attTile?.elevation || 0) - (defTile?.elevation || 0);
        const maxRange = Math.max(1, unit.range + (unit.range > 1 ? elevDelta : 0));
        const dist = this.grid.getDistance(unit.col, unit.row, other.col, other.row);
        if (dist >= minRange && dist <= maxRange) {
          targets.push(other);
        }
      }
    });

    return targets;
  }

  /**
   * Move a unit to a target tile.
   */
  moveUnit(unitId, targetCol, targetRow) {
    const unit = this.getUnit(unitId);
    if (!unit || !unit.canAct()) {
      return { success: false, reason: 'Unit cannot act' };
    }

    if (!this.grid.isValidCoord(targetCol, targetRow)) {
      return { success: false, reason: 'Invalid coordinate' };
    }

    const targetOccupant = this.getUnitAt(targetCol, targetRow);
    if (targetOccupant && targetOccupant.id !== unit.id) {
      return { success: false, reason: 'Tile is occupied' };
    }

    // Verify reachability
    const reachable = this.grid.getReachableTiles(unit, this.units);
    const match = reachable.find(t => t.col === targetCol && t.row === targetRow);
    if (!match) {
      return { success: false, reason: 'Tile not reachable' };
    }

    // Find path for facing orientation and distance calculation
    const path = this.grid.findPath(unit.col, unit.row, targetCol, targetRow, unit, this.units);
    const distanceMoved = path ? path.length - 1 : this.grid.getDistance(unit.col, unit.row, targetCol, targetRow);

    // Update facing to vector of movement
    const dc = targetCol - unit.col;
    const dr = targetRow - unit.row;
    const newFacing = TacticalCombatMath.calculateVectorFacing(dc, dr);
    unit.setFacing(newFacing);

    // Move unit
    unit.col = targetCol;
    unit.row = targetRow;
    unit.actionPoints = Math.max(0, unit.actionPoints - 1);
    unit.hasMoved = true;
    unit.movedDistance += distanceMoved;
    unit.remainingMp = Math.max(0, (unit.remainingMp ?? unit.moveSpeed) - match.cost);

    this.syncGridUnits();
    this.updateAuras();

    return {
      success: true,
      unit,
      path,
      newFacing,
      remainingAP: unit.actionPoints
    };
  }

  /**
   * Execute combat attack from attacker to defender.
   */
  attackUnit(attackerId, defenderId, options = {}) {
    const attacker = this.getUnit(attackerId);
    const defender = this.getUnit(defenderId);

    if (!attacker || !defender) return { success: false, reason: 'Invalid unit IDs' };
    if (!attacker.canAct()) return { success: false, reason: 'Attacker cannot act' };
    if (defender.hp <= 0 || defender.hasExited) return { success: false, reason: 'Defender inactive' };

    const dist = this.grid.getDistance(attacker.col, attacker.row, defender.col, defender.row);
    const attTile = this.grid.getTile(attacker.col, attacker.row);
    const defTile = this.grid.getTile(defender.col, defender.row);

    const elevDelta = (attTile?.elevation || 0) - (defTile?.elevation || 0);
    const maxRange = Math.max(1, attacker.range + (attacker.range > 1 ? elevDelta : 0));
    const minRange = attacker.minRange || 1;

    if (dist < minRange || dist > maxRange) {
      return { success: false, reason: 'Target out of attack range' };
    }

    // Attacker turns to face defender
    const atkDc = defender.col - attacker.col;
    const atkDr = defender.row - attacker.row;
    attacker.setFacing(TacticalCombatMath.calculateVectorFacing(atkDc, atkDr));

    // 1. Directional Combat Calculation
    const approachAngle = TacticalCombatMath.calculateApproachAngle(
      defender.facing,
      defender.col, defender.row,
      attacker.col, attacker.row
    );
    const dirAttack = TacticalCombatMath.calculateDirectionalAttack(approachAngle);

    // 2. Rock-Paper-Scissors Counter Multiplier
    const isCharging = (attacker.unitClass === 'SHOCK_CAVALRY') &&
      attacker.movedDistance >= 2 &&
      !(defTile?.isCover || defTile?.terrainType === 'FOREST' || defTile?.terrainType === 'JUNGLE') &&
      !(defender.spearBrace && dirAttack.direction === 'FRONT');

    let counterMult = COUNTER_MATRIX.getMultiplier(attacker.unitClass, defender.unitClass, isCharging);

    // Special Rajput Levies vs Cavalry Spear Brace
    if (defender.spearBrace && (attacker.unitClass === 'SHOCK_CAVALRY' || attacker.unitClass === 'SKIRMISH_CAVALRY')) {
      if (dirAttack.direction === 'FRONT') {
        // Charge negated
        counterMult = Math.min(counterMult, 1.0);
      }
    }

    // 3. Elevation Modifier
    const elevMod = TacticalCombatMath.calculateElevationModifier(attTile?.elevation || 0, defTile?.elevation || 0);

    // 4. Terrain Cover Modifier
    const isMissile = attacker.range > 1;
    const coverMod = TacticalCombatMath.calculateTerrainCoverModifier(defTile, isMissile);

    // 5. General Aura & Commander Buffs
    const atkCommander = attacker.isCommander ? attacker : this.units.find(u => u.side === attacker.side && u.isCommander && u.hp > 0 && !u.isRouted && !u.hasExited);
    const defCommander = defender.isCommander ? defender : this.units.find(u => u.side === defender.side && u.isCommander && u.hp > 0 && !u.isRouted && !u.hasExited);

    const atkCmd = atkCommander ? atkCommander.command : attacker.command;
    const defCmd = defCommander ? defCommander.command : defender.command;
    const defDread = defCommander ? defCommander.dread : defender.dread;

    const genAtkBuff = attacker.inGeneralAura ? (1.0 + atkCmd * 0.035) : 1.0;
    const genDefBuff = defender.inGeneralAura ? (1.0 + defCmd * 0.02 + defDread * 0.01) : 1.0;

    // 6. Doctrinal Options
    let cardDmgMult = 1.0;
    let extraMoraleShock = 0;
    if (options.elephantCharge || this.activeDoctrines.elephantCharge) {
      if (attacker.unitClass === 'SHOCK_MONSTER') {
        cardDmgMult = 1.5;
        extraMoraleShock = -30;
      }
    }

    let defBonus = 1.0;
    if (options.shieldWall || this.activeDoctrines.shieldWall) {
      if (defender.unitClass === 'FEROCIOUS_INFANTRY' || defender.unitClass === 'WETLAND_INFANTRY') {
        if (attacker.unitClass === 'SHOCK_CAVALRY' || attacker.unitClass === 'SHOCK_MONSTER') {
          defBonus = 1.5; // +50% defense vs cavalry
        } else if (isMissile) {
          defBonus = 1.3; // +30% defense vs missile
        }
      }
    }

    // 7. Calculate Attack Damage
    // Effective Attack Power
    const chargeMult = isCharging ? (attacker.chargeMultiplier || 1.5) : 1.0;
    const effectiveAtk = attacker.meleeAtk * counterMult * chargeMult * dirAttack.damageMultiplier * elevMod.damageMultiplier * genAtkBuff * cardDmgMult;
    
    // Paiks with Marsh Immunity suffer no defense reduction in wetlands
    const defCoverModifier = (defender.marshImmunity && (defTile?.isMarsh || defTile?.terrainType === 'RIVER' || defTile?.terrainType === 'MARSH')) ? 1.0 : coverMod.defenseModifier;

    // Effective Armor
    const effectiveDef = defender.meleeDef * (1.0 - dirAttack.armorReduction) * genDefBuff * defBonus * defCoverModifier;

    // Base damage with armor mitigation and cover reduction
    const mitigation = 35 / (35 + Math.max(0, effectiveDef));
    const rawDamage = Math.max(5, Math.round(effectiveAtk * mitigation * (1.0 - coverMod.damageReduction)));
    const damageDealt = defender.takeDamage(rawDamage);

    // 8. Morale Shock
    const casualtyShock = Math.floor((damageDealt / defender.maxHp) * 40);
    const totalMoraleDrain = casualtyShock + Math.abs(dirAttack.moraleShock) + Math.abs(extraMoraleShock);
    defender.drainMorale(totalMoraleDrain, true);

    const wasRoutedBefore = defender.isRouted;
    if (defender.morale <= 20) {
      defender.isRouted = true;
      if (!wasRoutedBefore) {
        this.triggerChainPanic(defender);
      }
    }

    // 9. Counter-Attack Resolution
    let counterDamage = 0;
    if (dirAttack.counterAllowed && defender.hp > 0 && !defender.isRouted && dist <= defender.range) {
      // Defender strikes back
      let defCounterMult = COUNTER_MATRIX.getMultiplier(defender.unitClass, attacker.unitClass, false);
      if (defender.spearBrace && (attacker.unitClass === 'SHOCK_CAVALRY' || attacker.unitClass === 'SKIRMISH_CAVALRY') && dirAttack.direction === 'FRONT') {
        defCounterMult = 2.0; // Spear brace counter deals 2.0x
      }

      const counterEffectiveAtk = defender.meleeAtk * defCounterMult * 0.60; // 60% standard counter efficiency
      const counterMitigation = 35 / (35 + attacker.meleeDef);
      const rawCounter = Math.max(2, Math.round(counterEffectiveAtk * counterMitigation));
      counterDamage = attacker.takeDamage(rawCounter);

      const counterCasShock = Math.floor((counterDamage / attacker.maxHp) * 40);
      attacker.drainMorale(counterCasShock, true);
    }

    // Expends 1 AP
    attacker.actionPoints = Math.max(0, attacker.actionPoints - 1);
    attacker.hasAttacked = true;
    if (!attacker.skirmishRetreat) {
      attacker.remainingMp = 0;
    }

    // Sync state
    this.syncGridUnits();
    this.updateAuras();
    this.checkBattleEnd();

    const logEntry = {
      round: this.round,
      attacker: attacker.name,
      defender: defender.name,
      direction: dirAttack.direction,
      damageDealt,
      counterDamage,
      defenderHp: defender.hp,
      defenderMorale: defender.morale,
      defenderRouted: defender.isRouted,
      defenderDied: defender.hp <= 0
    };
    this.combatLog.push(logEntry);

    return {
      success: true,
      rawDamage,
      damageDealt,
      counterDamage,
      direction: dirAttack.direction,
      approachAngle,
      defenderDied: defender.hp <= 0,
      defenderRouted: defender.isRouted,
      moraleLoss: totalMoraleDrain,
      attackerHp: attacker.hp,
      defenderHp: defender.hp
    };
  }

  /**
   * When a unit routs, allies within 3 tiles suffer -15 morale shock,
   * UNLESS protected by a General's Leadership Aura.
   */
  triggerChainPanic(routedUnit) {
    this.units.forEach(u => {
      if (u.side === routedUnit.side && u.id !== routedUnit.id && u.hp > 0 && !u.hasExited) {
        const dist = this.grid.getDistance(u.col, u.row, routedUnit.col, routedUnit.row);
        if (dist <= 3) {
          if (!u.inGeneralAura) {
            u.drainMorale(15, false);
          }
        }
      }
    });
  }

  /**
   * War Elephant Berserk Frenzy:
   * Broken War Elephants at 0 morale trigger Berserk Frenzy dealing 24 damage to all adjacent units.
   */
  processBerserkFrenzy() {
    const frenziedUnits = [];
    this.units.forEach(u => {
      if (u.unitClass === 'SHOCK_MONSTER' && u.morale === 0 && u.hp > 0 && !u.hasFrenzied) {
        u.hasFrenzied = true;
        frenziedUnits.push(u);

        // Deal 24 damage to all adjacent units (friendly and hostile)
        const neighbors = this.grid.getNeighbors(u.col, u.row, true);
        neighbors.forEach(tile => {
          const adj = this.getUnitAt(tile.col, tile.row);
          if (adj && adj.id !== u.id && adj.hp > 0) {
            adj.takeDamage(24);
            adj.drainMorale(15, true);
          }
        });
      }
    });
    return frenziedUnits;
  }

  /**
   * War Elephant Terror Aura:
   * At start of turn, enemy units adjacent to War Elephants suffer -30 morale.
   */
  applyTerrorAuras(activeSide) {
    const enemyElephants = this.units.filter(u => 
      u.side !== activeSide && 
      u.unitClass === 'SHOCK_MONSTER' && 
      u.hp > 0 && 
      !u.isRouted && 
      !u.hasExited
    );

    if (enemyElephants.length === 0) return;

    this.units.forEach(u => {
      if (u.side === activeSide && u.hp > 0 && !u.isRouted && !u.hasExited) {
        const isNearElephant = enemyElephants.some(ele => 
          this.grid.getDistance(u.col, u.row, ele.col, ele.row) <= 1
        );
        if (isNearElephant) {
          u.drainMorale(30, false);
        }
      }
    });
  }

  /**
   * Auto-moves routed units toward army's retreat edge:
   * Attacker -> Col 0 (West)
   * Defender -> Col 19 (East)
   */
  processRoutingUnits(side) {
    const targetCol = (side === 'ATTACKER') ? 0 : 19;
    const routedUnits = this.units.filter(u => u.side === side && u.isRouted && u.hp > 0 && !u.hasExited);

    routedUnits.forEach(u => {
      // If already at retreat boundary, exit board
      if (u.col === targetCol) {
        u.hasExited = true;
        const tile = this.grid.getTile(u.col, u.row);
        if (tile) tile.unitId = null;
        return;
      }

      // Step towards retreat boundary
      const step = (side === 'ATTACKER') ? -1 : 1;
      const nextCol = u.col + step;
      if (this.grid.isValidCoord(nextCol, u.row)) {
        const occupant = this.getUnitAt(nextCol, u.row);
        if (!occupant) {
          u.col = nextCol;
          u.setFacing(step < 0 ? 'W' : 'E');
        } else {
          // Try sidestep row
          for (const altRow of [u.row - 1, u.row + 1]) {
            if (this.grid.isValidCoord(nextCol, altRow) && !this.getUnitAt(nextCol, altRow)) {
              u.col = nextCol;
              u.row = altRow;
              u.setFacing(step < 0 ? 'W' : 'E');
              break;
            }
          }
        }
      }

      // Check if stepped onto edge
      if (u.col === targetCol) {
        u.hasExited = true;
      }
    });

    this.syncGridUnits();
  }

  /**
   * Executes AI phase:
   * 1. Morale recovery in aura
   * 2. Terror aura drain
   * 3. Move routed units
   * 4. AI units move & attack
   */
  processAiTurn() {
    this.currentPhase = 'AI_TURN';
    const aiSide = this.units.find(u => !u.isPlayer)?.side || 'DEFENDER';

    // 1. Morale recovery for AI units inside aura
    this.units.forEach(u => {
      if (u.side === aiSide && u.inGeneralAura) {
        u.recoverMorale(5);
      }
    });

    // 2. Terror aura
    this.applyTerrorAuras(aiSide);

    // 3. Move routed AI units
    this.processRoutingUnits(aiSide);

    // 4. AI Combat Decision Loop
    const aiUnits = this.units.filter(u => u.side === aiSide && u.canAct());

    aiUnits.forEach(unit => {
      if (!unit.canAct()) return;

      // Check immediate attack targets
      let targets = this.getAttackTargets(unit);

      if (targets.length === 0) {
        // Move towards nearest enemy
        const reachable = this.grid.getReachableTiles(unit, this.units);
        if (reachable.length > 0) {
          const enemies = this.units.filter(e => e.side !== unit.side && e.hp > 0 && !e.hasExited);
          if (enemies.length > 0) {
            // Find reachable tile that minimizes distance to closest enemy
            let bestTile = null;
            let minDistance = Infinity;

            reachable.forEach(t => {
              enemies.forEach(e => {
                const d = this.grid.getDistance(t.col, t.row, e.col, e.row);
                if (d < minDistance) {
                  minDistance = d;
                  bestTile = t;
                }
              });
            });

            if (bestTile) {
              this.moveUnit(unit.id, bestTile.col, bestTile.row);
              targets = this.getAttackTargets(unit);
            }
          }
        }
      }

      // Attack if target available
      if (targets.length > 0 && unit.actionPoints > 0) {
        // Prioritize target with highest counter bonus or lowest HP
        targets.sort((a, b) => {
          const multA = COUNTER_MATRIX.getMultiplier(unit.unitClass, a.unitClass);
          const multB = COUNTER_MATRIX.getMultiplier(unit.unitClass, b.unitClass);
          return multB - multA;
        });
        this.attackUnit(unit.id, targets[0].id);
      }
    });

    // 5. Berserk Frenzy check
    this.processBerserkFrenzy();

    // 6. End of Round Cleanup & Reset AP for Player
    this.endRoundCleanup();
  }

  /**
   * Called when player ends phase or after AI finishes.
   */
  endPlayerPhase() {
    if (this.isOver) return;

    // Run AI turn
    this.processAiTurn();

    // Move player routed units
    const playerSide = this.units.find(u => u.isPlayer)?.side || 'ATTACKER';
    this.processRoutingUnits(playerSide);

    // Morale recovery for player units in general aura
    this.units.forEach(u => {
      if (u.side === playerSide && u.inGeneralAura) {
        u.recoverMorale(5);
      }
    });

    this.currentPhase = 'PLAYER_TURN';
    this.checkBattleEnd();
  }

  endRoundCleanup() {
    this.round++;
    this.units.forEach(u => u.resetTurn());
    this.updateAuras();
    this.checkBattleEnd();
  }

  /**
   * Check victory conditions:
   * All enemy units destroyed/exited -> Attacker/Defender Victory
   */
  checkBattleEnd() {
    const attAlive = this.units.some(u => u.side === 'ATTACKER' && u.hp > 0 && !u.hasExited && !u.isRouted);
    const defAlive = this.units.some(u => u.side === 'DEFENDER' && u.hp > 0 && !u.hasExited && !u.isRouted);

    if (!attAlive && !defAlive) {
      this.isOver = true;
      this.winner = 'defender'; // Defender holds field in mutual rout
    } else if (!attAlive) {
      this.isOver = true;
      this.winner = 'defender';
    } else if (!defAlive) {
      this.isOver = true;
      this.winner = 'attacker';
    }

    if (this.isOver) {
      this.currentPhase = 'BATTLE_OVER';
      if (!this._battleEndFired && typeof this.onBattleEnd === 'function') {
        this._battleEndFired = true;
        this.onBattleEnd(this.getBattleOutcome());
      }
    }

    return this.isOver;
  }

  /**
   * Concede / sound retreat.
   */
  retreat(retreatingSide = 'ATTACKER') {
    this.isOver = true;
    this.winner = (retreatingSide === 'ATTACKER') ? 'defender' : 'attacker';
    this.currentPhase = 'BATTLE_OVER';
    if (!this._battleEndFired && typeof this.onBattleEnd === 'function') {
      this._battleEndFired = true;
      this.onBattleEnd(this.getBattleOutcome());
    }
    return this.getBattleOutcome();
  }

  /**
   * Compiles comprehensive campaign battle outcome matching applyBattleOutcome() contract.
   */
  getBattleOutcome() {
    const attackerWins = (this.winner === 'attacker');
    const attUnits = this.units.filter(u => u.side === 'ATTACKER');
    const defUnits = this.units.filter(u => u.side === 'DEFENDER');

    const compileRoster = (units, army) => {
      const casualties = [];
      const destroyed = [];

      units.forEach(tu => {
        const reg = (army.regiments || []).find(r => r.id === tu.id) || tu.originalRegiment;
        const hpLost = Math.max(0, (tu.maxHp || 100) - Math.max(0, tu.hp));
        if (tu.hp <= 0) {
          destroyed.push(tu.name || tu.unitTypeId);
        }
        casualties.push({
          regId: tu.id,
          regName: tu.name,
          hpBefore: tu.maxHp,
          hpAfter: Math.max(0, tu.hp),
          hpLost,
          destroyed: tu.hp <= 0
        });

        if (reg) {
          reg.hp = Math.max(0, tu.hp);
          reg.morale = Math.max(0, tu.morale);
        }
      });

      // Surviving non-zero HP regiments
      const survivingCount = units.filter(u => u.hp > 0).length;

      return { casualties, destroyed, survivingCount };
    };

    const attSummary = compileRoster(attUnits, this.attackerArmy);
    const defSummary = compileRoster(defUnits, this.defenderArmy);

    // Update armies' regiments array (filter dead ones)
    if (this.attackerArmy.regiments) {
      this.attackerArmy.regiments = this.attackerArmy.regiments.filter(r => (r.hp || 0) > 0);
    }
    if (this.defenderArmy.regiments) {
      this.defenderArmy.regiments = this.defenderArmy.regiments.filter(r => (r.hp || 0) > 0);
    }

    const isDecisive = (attackerWins && defSummary.survivingCount === 0) ||
                       (!attackerWins && attSummary.survivingCount === 0);
    const outcome = attackerWins
      ? (isDecisive ? 'DECISIVE_VICTORY' : 'VICTORY')
      : (isDecisive ? 'DECISIVE_DEFEAT' : 'DEFEAT');

    return {
      attackerWins,
      winner: this.winner,
      outcome,
      conquered: false,
      province: {
        id: this.province.id,
        name: this.province.name,
        terrainType: this.province.terrainType
      },
      attacker: {
        armyId: this.attackerArmy.id,
        armyName: this.attackerArmy.name,
        factionId: this.attackerArmy.factionId,
        generalId: this.attackerArmy.generalId,
        casualties: attSummary.casualties,
        destroyed: attSummary.destroyed,
        survivingRegiments: attSummary.survivingCount,
        totalRegimentsBefore: attUnits.length
      },
      defender: {
        armyId: this.defenderArmy.id,
        armyName: this.defenderArmy.name,
        factionId: this.defenderArmy.factionId,
        generalId: this.defenderArmy.generalId,
        casualties: defSummary.casualties,
        destroyed: defSummary.destroyed,
        survivingRegiments: defSummary.survivingCount,
        totalRegimentsBefore: defUnits.length
      },
      tacticalUnits: this.units,
      tacticalSummary: {
        rounds: this.round,
        combatLog: this.combatLog
      }
    };
  }
}
