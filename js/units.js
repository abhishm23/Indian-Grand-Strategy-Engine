// Unit Archetypes, Morale Engine, and Combat Matrix for Iron Tactics

export const FACTIONS = {
  BLUE: 'blue', // Player Underdog Army
  RED: 'red'    // Opponent Army
};

export const UNIT_TYPES = {
  SHIELD_GUARD: {
    id: 'SHIELD_GUARD',
    name: 'Shield Guard',
    symbol: '🛡️',
    maxHp: 120,
    attack: 22,
    defense: 20,
    range: 1,
    moveSpeed: 2,
    counterAttack: true,
    desc: 'Elite defensive phalanx. Dominates narrow passes and blocks frontal assaults.'
  },
  PIKEMAN: {
    id: 'PIKEMAN',
    name: 'Royal Pikeman',
    symbol: '🔱',
    maxHp: 95,
    attack: 25,
    defense: 14,
    range: 1,
    moveSpeed: 2,
    antiCavalry: true,
    counterAttack: true,
    desc: 'Heavy anti-cavalry wall. Stops mounted charges cold with lethal counter-pierce.'
  },
  ROYAL_ARCHER: {
    id: 'ROYAL_ARCHER',
    name: 'Longbow Ranger',
    symbol: '🏹',
    maxHp: 65,
    attack: 28,
    defense: 8,
    range: 3,
    moveSpeed: 3,
    counterAttack: false,
    desc: 'Long-range marksmen. Gains +1 range on High Hills and stealth in Forests.'
  },
  VANGUARD_CAVALRY: {
    id: 'VANGUARD_CAVALRY',
    name: 'Vanguard Cavalry',
    symbol: '🐎',
    maxHp: 100,
    attack: 38,
    defense: 12,
    range: 1,
    moveSpeed: 5,
    chargeBonus: true,
    counterAttack: true,
    desc: 'Devastating open-field charge. Vulnerable in forests, swamps, and against pikemen.'
  },
  GUERRILLA_SCOUT: {
    id: 'GUERRILLA_SCOUT',
    name: 'Guerrilla Scout',
    symbol: '🗡️',
    maxHp: 75,
    attack: 30,
    defense: 10,
    range: 1,
    moveSpeed: 4,
    stealthMaster: true,
    counterAttack: true,
    desc: 'Infiltration unit. Invisible in forests, deals massive 2.5x surprise ambush damage.'
  },
  SIEGE_BALLISTA: {
    id: 'SIEGE_BALLISTA',
    name: 'Siege Ballista',
    symbol: '🎯',
    maxHp: 60,
    attack: 50,
    defense: 6,
    range: 4,
    minRange: 2,
    moveSpeed: 1,
    counterAttack: false,
    desc: 'Heavy artillery engine. Shatters clustered enemy formations and fortresses.'
  }
};

export class Unit {
  constructor(id, type, faction, x, y, facing = 'EAST') {
    this.id = id;
    this.type = type;
    this.faction = faction;
    this.x = x;
    this.y = y;
    this.facing = facing; // NORTH, EAST, SOUTH, WEST

    this.maxHp = type.maxHp;
    this.hp = type.maxHp;
    this.attack = type.attack;
    this.defense = type.defense;
    this.range = type.range;
    this.minRange = type.minRange || 1;
    this.moveSpeed = type.moveSpeed;

    this.morale = 100; // 0 - 100
    this.isSupplied = true;
    this.isStealthed = false;
    this.hasMoved = false;
    this.hasAttacked = false;

    // Status effects
    this.phalanxStance = false;
    this.holdLineBuff = false;
  }

  resetTurn() {
    this.hasMoved = false;
    this.hasAttacked = false;
    this.phalanxStance = false;
  }

  // Calculate direction relative to facing (Front, Flank, Rear)
  getAttackAngle(attackerX, attackerY) {
    const dx = attackerX - this.x;
    const dy = attackerY - this.y;

    let attackDir = 'NORTH';
    if (Math.abs(dx) > Math.abs(dy)) {
      attackDir = dx > 0 ? 'EAST' : 'WEST';
    } else {
      attackDir = dy > 0 ? 'SOUTH' : 'NORTH';
    }

    const dirOrder = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
    const facingIdx = dirOrder.indexOf(this.facing);
    const attackIdx = dirOrder.indexOf(attackDir);

    const diff = (attackIdx - facingIdx + 4) % 4;
    if (diff === 0) return 'FRONT';
    if (diff === 2) return 'REAR';
    return 'FLANK';
  }

  // Morale drain
  applyMoraleDamage(amount) {
    this.morale = Math.max(0, this.morale - amount);
    return this.morale === 0;
  }

  isPanicking() {
    return this.morale <= 25;
  }

  isRouted() {
    return this.morale <= 0;
  }
}
