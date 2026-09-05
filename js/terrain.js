// Terrain & Map Grid System for Iron Tactics

export const TERRAIN_TYPES = {
  PLAIN: {
    id: 'PLAIN',
    name: 'Plain',
    symbol: '🌾',
    color: '#1a2636',
    moveCost: 1.0,
    defBonus: 0,
    rangedCover: 0,
    elevation: 0,
    chargeAllowed: true,
    stealth: false
  },
  HILL: {
    id: 'HILL',
    name: 'High Hill',
    symbol: '⛰️',
    color: '#2a3b4e',
    moveCost: 1.5,
    defBonus: 0.25, // 25% defense bonus
    rangedCover: 0.1,
    elevation: 1, // Range bonus +1
    chargeAllowed: true,
    stealth: false
  },
  FOREST: {
    id: 'FOREST',
    name: 'Dense Forest',
    symbol: '🌲',
    color: '#122e22',
    moveCost: 1.8,
    defBonus: 0.40, // 40% ranged cover
    rangedCover: 0.4,
    elevation: 0,
    chargeAllowed: false,
    stealth: true // Hides scouts/archers
  },
  SWAMP: {
    id: 'SWAMP',
    name: 'Mud Swampland',
    symbol: '🌿',
    color: '#222d1d',
    moveCost: 2.5,
    defBonus: -0.10,
    rangedCover: 0,
    elevation: 0,
    chargeAllowed: false, // Halts cavalry charges completely
    stealth: false
  },
  PASS: {
    id: 'PASS',
    name: 'Mountain Pass',
    symbol: '🏔️',
    color: '#34495e',
    moveCost: 1.2,
    defBonus: 0.35,
    rangedCover: 0.2,
    elevation: 0,
    chargeAllowed: false,
    chokepoint: true, // Limits battle line width
    stealth: false
  },
  FORTRESS: {
    id: 'FORTRESS',
    name: 'Stone Fortress',
    symbol: '🏰',
    color: '#4a5568',
    moveCost: 2.0,
    defBonus: 0.50, // 50% damage reduction
    rangedCover: 0.5,
    elevation: 1,
    chargeAllowed: false,
    stealth: false
  },
  BRIDGE: {
    id: 'BRIDGE',
    name: 'River Bridge',
    symbol: '🌉',
    color: '#3b4252',
    moveCost: 1.2,
    defBonus: 0.10,
    rangedCover: 0,
    elevation: 0,
    chargeAllowed: false,
    chokepoint: true,
    stealth: false
  },
  RIVER: {
    id: 'RIVER',
    name: 'Deep River',
    symbol: '🌊',
    color: '#0f2b48',
    moveCost: 999, // Impassable
    defBonus: 0,
    rangedCover: 0,
    elevation: 0,
    chargeAllowed: false,
    impassable: true,
    stealth: false
  },
  DEPOT: {
    id: 'DEPOT',
    name: 'Supply Depot',
    symbol: '📦',
    color: '#3e2723',
    moveCost: 1.0,
    defBonus: 0.15,
    rangedCover: 0,
    elevation: 0,
    chargeAllowed: true,
    isSupplyNode: true,
    stealth: false
  }
};

export class MapGrid {
  constructor(cols = 15, rows = 11, tileSize = 50) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = Array(rows).fill(null).map(() => Array(cols).fill(TERRAIN_TYPES.PLAIN));
  }

  setTile(x, y, terrainType) {
    if (this.isValid(x, y)) {
      this.tiles[y][x] = terrainType;
    }
  }

  getTile(x, y) {
    if (this.isValid(x, y)) {
      return this.tiles[y][x];
    }
    return TERRAIN_TYPES.PLAIN;
  }

  isValid(x, y) {
    return x >= 0 && x < this.cols && y >= 0 && y < this.rows;
  }

  getNeighbors(x, y) {
    const neighbors = [];
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 }
    ];

    dirs.forEach(d => {
      const nx = x + d.x;
      const ny = y + d.y;
      if (this.isValid(nx, ny) && !this.tiles[ny][nx].impassable) {
        neighbors.push({ x: nx, y: ny });
      }
    });
    return neighbors;
  }

  // Manhattan distance
  getDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }
}
