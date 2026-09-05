// Commander Tactical Cards & Force Multiplier Abilities Engine

export class TacticalDeck {
  constructor() {
    this.commandPoints = 100;
    this.maxCommandPoints = 100;
    this.cards = [
      {
        id: 'HOLD_LINE',
        name: '🛡️ Hold The Line',
        cost: 25,
        desc: 'Selected unit locks morale at 100% and gains +100% defense this turn. Essential for holding chokepoints.',
        targetType: 'FRIENDLY_UNIT'
      },
      {
        id: 'FEIGNED_RETREAT',
        name: '🎯 Feigned Retreat',
        cost: 30,
        desc: 'Bait an over-aggressive enemy out of their fortress/high ground into a deadly ambush zone. Drains 25 enemy morale.',
        targetType: 'ENEMY_UNIT'
      },
      {
        id: 'AMBUSH_STRIKE',
        name: '🗡️ Ambush Strike',
        cost: 35,
        desc: 'Order hidden forest unit to launch a surprise strike with +150% critical damage and -40 enemy morale.',
        targetType: 'FRIENDLY_STEALTH'
      },
      {
        id: 'CUT_SUPPLY',
        name: '📦 Cut Supply Line',
        cost: 40,
        desc: 'Sever enemy logistics. Out-of-supply enemy units take -30 morale loss and -25% defense next turn.',
        targetType: 'GLOBAL'
      },
      {
        id: 'SMOKE_SCREEN',
        name: '🌫️ Smoke Screen',
        cost: 30,
        desc: 'Deploy tactical smoke in a 3x3 tile area. Blinds enemy archers and covers unit maneuver.',
        targetType: 'TILE_AREA'
      },
      {
        id: 'PINCER_MANEUVER',
        name: '⚔️ Pincer Strike',
        cost: 45,
        desc: 'Execute simultaneous double-flank attack on an isolated target. Inflicts immediate panic.',
        targetType: 'ENEMY_UNIT'
      }
    ];
  }

  gainPoints(amount) {
    this.commandPoints = Math.min(this.maxCommandPoints, this.commandPoints + amount);
  }

  canAfford(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    return card && this.commandPoints >= card.cost;
  }

  useCard(cardId) {
    const card = this.cards.find(c => c.id === cardId);
    if (card && this.commandPoints >= card.cost) {
      this.commandPoints -= card.cost;
      return true;
    }
    return false;
  }
}
