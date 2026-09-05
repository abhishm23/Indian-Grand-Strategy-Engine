// Enemy Commander AI Logic for Iron Tactics

import { FACTIONS } from './units.js';

export class EnemyAI {
  constructor(gameEngine) {
    this.game = gameEngine;
  }

  executeTurn(onComplete) {
    const enemyUnits = this.game.units.filter(u => u.faction === FACTIONS.RED && !u.isRouted());
    
    let delay = 0;
    enemyUnits.forEach((unit, index) => {
      setTimeout(() => {
        if (!unit.isRouted()) {
          this.processUnit(unit);
        }
        if (index === enemyUnits.length - 1) {
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 300);
        }
      }, delay);
      delay += 250;
    });

    if (enemyUnits.length === 0 && onComplete) {
      onComplete();
    }
  }

  processUnit(unit) {
    // 1. Check if panicked (morale <= 25)
    if (unit.isPanicking()) {
      // Flee away from nearest blue unit
      const nearestPlayer = this.findNearestPlayerUnit(unit);
      if (nearestPlayer) {
        const fleeTile = this.getFleeTile(unit, nearestPlayer);
        if (fleeTile) {
          this.game.moveUnit(unit, fleeTile.x, fleeTile.y);
          this.game.log(`🔴 Red ${unit.type.name} at (${unit.x},${unit.y}) is PANICKING and flees!`, 'enemy');
          return;
        }
      }
    }

    // 2. Search for immediate attack targets
    const attackableTargets = this.game.getValidAttackTargets(unit);
    if (attackableTargets.length > 0) {
      // Pick best target (lowest HP or highest threat like archers/scouts)
      attackableTargets.sort((a, b) => {
        const scoreA = (a.maxHp - a.hp) + (a.type.id === 'ROYAL_ARCHER' ? 40 : 0);
        const scoreB = (b.maxHp - b.hp) + (b.type.id === 'ROYAL_ARCHER' ? 40 : 0);
        return scoreB - scoreA;
      });

      const target = attackableTargets[0];
      this.game.executeAttack(unit, target);
      return;
    }

    // 3. Move towards nearest player unit or objective
    if (!unit.hasMoved) {
      const nearestPlayer = this.findNearestPlayerUnit(unit);
      if (nearestPlayer) {
        const bestMove = this.findBestMoveTowards(unit, nearestPlayer.x, nearestPlayer.y);
        if (bestMove) {
          this.game.moveUnit(unit, bestMove.x, bestMove.y);

          // Check if can attack post-movement
          const postAttackTargets = this.game.getValidAttackTargets(unit);
          if (postAttackTargets.length > 0) {
            this.game.executeAttack(unit, postAttackTargets[0]);
          }
        }
      }
    }
  }

  findNearestPlayerUnit(unit) {
    const playerUnits = this.game.units.filter(u => u.faction === FACTIONS.BLUE && !u.isRouted() && !u.isStealthed);
    if (playerUnits.length === 0) return null;

    playerUnits.sort((a, b) => {
      const distA = Math.abs(unit.x - a.x) + Math.abs(unit.y - a.y);
      const distB = Math.abs(unit.x - b.x) + Math.abs(unit.y - b.y);
      return distA - distB;
    });

    return playerUnits[0];
  }

  getFleeTile(unit, enemyUnit) {
    const dx = Math.sign(unit.x - enemyUnit.x);
    const dy = Math.sign(unit.y - enemyUnit.y);
    const fx = unit.x + (dx || 1);
    const fy = unit.y + (dy || 0);

    if (this.game.map.isValid(fx, fy) && !this.game.getUnitAt(fx, fy)) {
      return { x: fx, y: fy };
    }
    return null;
  }

  findBestMoveTowards(unit, tx, ty) {
    const validMoves = this.game.getValidMoves(unit);
    if (validMoves.length === 0) return null;

    validMoves.sort((a, b) => {
      const distA = Math.abs(a.x - tx) + Math.abs(a.y - ty);
      const distB = Math.abs(b.x - tx) + Math.abs(b.y - ty);
      return distA - distB;
    });

    return validMoves[0];
  }
}
