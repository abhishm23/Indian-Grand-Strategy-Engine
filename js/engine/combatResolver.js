/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/engine/combatResolver.js
 *
 * Probabilistic Auto-Resolve Combat Engine.
 * Calculates win probability, applies casualties, and returns battle results.
 */

import { UNIT_TYPES, getCounterMultiplier } from '../data/units.js';
import { TERRAIN_TYPES } from '../data/provinces.js';

/**
 * Normalizes general bonuses from either a Character object, a bonus object,
 * or raw multipliers. Handles null/undefined safely.
 */
export function normalizeGeneralBonus(genOrBonus) {
  if (!genOrBonus) {
    return {
      attackMultiplier: 1.0,
      defenseMultiplier: 1.0,
      autoResolveModifier: 1.0
    };
  }

  // If passed a Character instance / character data with attributes
  if (genOrBonus.attributes) {
    const com = Number(genOrBonus.attributes.command ?? 0);
    const dre = Number(genOrBonus.attributes.dread ?? 0);
    return {
      attackMultiplier: 1.0 + com * 0.035,
      defenseMultiplier: 1.0 + com * 0.02 + dre * 0.01,
      autoResolveModifier: 1.0 + com * 0.04 + dre * 0.02
    };
  }

  // If passed an existing bonus object
  const atk = Number(genOrBonus.attackMultiplier ?? 1.0);
  const def = Number(genOrBonus.defenseMultiplier ?? 1.0);
  const auto = Number(genOrBonus.autoResolveModifier ?? genOrBonus.attackMultiplier ?? 1.0);

  return {
    attackMultiplier: atk,
    defenseMultiplier: def,
    autoResolveModifier: auto
  };
}

/**
 * Calculate the raw combat power of a single regiment.
 */
export function regimentCombatPower(reg) {
  const hpRatio = (reg.hp || reg.maxHp || 100) / (reg.maxHp || 100);
  const moraleRatio = (reg.morale || reg.maxMorale || 100) / (reg.maxMorale || 100);
  const atk = reg.meleeAtk || reg.meleeAttack || 30;
  const def = reg.meleeDef || reg.meleeDefense || 15;
  const hp = reg.hp || reg.maxHp || 100;
  return (atk + def * 0.5) * hpRatio * (0.5 + 0.5 * moraleRatio) * (hp / 100);
}

/**
 * Calculate total army combat power with general bonuses.
 */
export function armyCombatPower(army, generalBonus = null) {
  let totalPower = 0;
  for (const reg of (army?.regiments || [])) {
    if ((reg.hp || 0) <= 0) continue;
    totalPower += regimentCombatPower(reg);
  }

  if (generalBonus) {
    const norm = normalizeGeneralBonus(generalBonus);
    totalPower *= (norm.autoResolveModifier || norm.attackMultiplier || 1.0);
  }

  return totalPower;
}

/**
 * Get terrain modifier for the defending army.
 */
export function getTerrainDefenseModifier(province) {
  if (!province || !province.terrainType) return 1.0;
  const terrain = TERRAIN_TYPES[province.terrainType];
  if (!terrain) return 1.0;
  return 1.0 + (terrain.tacticalDefenseBonus || 0);
}

/**
 * Get fortification defense modifier from province defense level.
 */
export function getFortificationModifier(province) {
  if (!province) return 1.0;
  const defLevel = province.defenseLevel || 0;
  return 1.0 + defLevel * 0.15; // Each defense level adds 15%
}

/**
 * Calculate win probability for the attacker.
 * Returns an enriched Number instance with properties:
 * { attackerWinProb, defenderWinProb, ratio, attackerPower, defenderPower }
 */
export function calculateWinProbability(attackerArmy, defenderArmy, province, attackerGenBonus = null, defenderGenBonus = null) {
  const attBonus = normalizeGeneralBonus(attackerGenBonus);
  const defBonus = normalizeGeneralBonus(defenderGenBonus);

  const attackerPower = armyCombatPower(attackerArmy, attBonus);

  const terrainMod = getTerrainDefenseModifier(province);
  const fortMod = getFortificationModifier(province);
  const defenderPower = armyCombatPower(defenderArmy, defBonus) * terrainMod * fortMod;

  let clampedProb = 0.5;
  let ratio = 1.0;

  if (attackerPower <= 0 && defenderPower <= 0) {
    clampedProb = 0.5;
    ratio = 1.0;
  } else if (defenderPower <= 0) {
    clampedProb = 0.95;
    ratio = 999.0;
  } else if (attackerPower <= 0) {
    clampedProb = 0.05;
    ratio = 0.001;
  } else {
    // Sigmoid-based probability curve
    ratio = attackerPower / defenderPower;
    // logistic: P = 1 / (1 + e^(-k*(ratio-1)))
    const k = 3.0; // steepness
    const rawProb = 1.0 / (1.0 + Math.exp(-k * (ratio - 1.0)));
    clampedProb = Math.max(0.05, Math.min(0.95, rawProb));
  }

  const res = Object.assign(new Number(clampedProb), {
    attackerWinProb: clampedProb,
    defenderWinProb: Number((1.0 - clampedProb).toFixed(4)),
    ratio: Number(ratio.toFixed(4)),
    attackerPower: Number(attackerPower.toFixed(2)),
    defenderPower: Number(defenderPower.toFixed(2))
  });

  return res;
}

/**
 * Format win probability as an integer percentage string (e.g. '68%').
 */
export function formatWinOdds(prob) {
  const num = typeof prob === 'number' || prob instanceof Number ? Number(prob) : 0.5;
  return `${Math.round(num * 100)}%`;
}

/**
 * Apply proportional casualties to an army based on engagement intensity.
 * lossFactor: 0.0 (no losses) to 1.0 (total annihilation)
 */
export function applyCasualties(army, lossFactor, isWinner) {
  const casualties = [];
  const baseLoss = isWinner
    ? lossFactor * 0.3  // winners take 30% of the loss factor
    : lossFactor * 0.7; // losers take 70% of the loss factor

  for (const reg of (army?.regiments || [])) {
    if ((reg.hp || 0) <= 0) continue;

    // Randomize per-regiment losses slightly
    const variance = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
    const regLossFraction = Math.min(0.95, baseLoss * variance);

    // Enforce at least 1 HP lost so neither army emerges unscathed
    const hpLost = Math.max(1, Math.floor((reg.maxHp || 100) * regLossFraction));
    const prevHp = reg.hp;
    reg.hp = Math.max(0, reg.hp - hpLost);

    // Morale damage from casualties
    const moraleLoss = Math.floor(regLossFraction * 40 + (isWinner ? 0 : 15));
    reg.morale = Math.max(0, (reg.morale || 100) - moraleLoss);

    casualties.push({
      regId: reg.id,
      regName: reg.name || reg.unitTypeId,
      hpBefore: prevHp,
      hpAfter: reg.hp,
      hpLost,
      destroyed: reg.hp <= 0
    });
  }

  return casualties;
}

/**
 * Remove destroyed regiments from an army.
 */
export function removeDestroyedRegiments(army) {
  const destroyed = [];
  army.regiments = (army?.regiments || []).filter(reg => {
    if ((reg.hp || 0) <= 0) {
      destroyed.push(reg);
      return false;
    }
    return true;
  });
  return destroyed;
}

/**
 * Resolves general fate on battle completion.
 * Slain (10%), Captured (15%), Escape (75%).
 * Victorious general gains +5 loyalty.
 */
export function resolveGeneralFate(character, isWinner, armyDestroyed = false, winnerFactionId = null, factionCapitalId = null, forcedRoll = null) {
  if (!character || !character.alive) return { status: 'NONE' };

  if (isWinner) {
    character.loyalty = Math.min(100, (character.loyalty ?? 80) + 5);
    return {
      status: 'VICTORIOUS',
      fate: 'VICTORIOUS',
      characterId: character.id,
      name: character.name,
      loyalty: character.loyalty
    };
  }

  // Defeated general fate dice roll (1 - 100)
  const roll = forcedRoll !== null ? forcedRoll : (Math.floor(Math.random() * 100) + 1);

  if (roll <= 10) {
    // 10% Slain in battle
    character.alive = false;
    character.currentRole = 'DEAD';
    character.assignmentTarget = null;
    return {
      status: 'DECEASED',
      fate: 'SLAIN',
      characterId: character.id,
      name: character.name,
      roll
    };
  } else if (roll <= 25) {
    // 15% Captured as prisoner of war
    character.currentRole = 'CAPTIVE';
    character.assignmentTarget = null;
    character.capturedByFactionId = winnerFactionId;
    return {
      status: 'CAPTURED',
      fate: 'CAPTURED',
      characterId: character.id,
      name: character.name,
      roll
    };
  } else {
    // 75% Escapes
    if (armyDestroyed) {
      character.currentRole = 'IDLE';
      character.assignmentTarget = null;
      if (factionCapitalId) {
        character.locationProvinceId = factionCapitalId;
      }
      character.loyalty = Math.max(10, (character.loyalty ?? 80) - 10);
      return {
        status: 'ESCAPED',
        fate: 'ESCAPED_TO_CAPITAL',
        characterId: character.id,
        name: character.name,
        roll
      };
    } else {
      character.loyalty = Math.max(10, (character.loyalty ?? 80) - 5);
      return {
        status: 'RETREATED',
        fate: 'ESCAPED_WITH_ARMY',
        characterId: character.id,
        name: character.name,
        roll
      };
    }
  }
}

/**
 * Finds a valid retreat province for a defeated army.
 * Prioritizes connected friendly provinces without hostiles,
 * then falls back to any connected province without hostiles.
 * Returns null if completely surrounded/trapped.
 */
export function findRetreatProvince(gameState, currentProv, armyFactionId) {
  if (!gameState || !currentProv) return null;
  const connections = currentProv.connections || [];

  // 1. Prioritize friendly-controlled adjacent province with no hostile armies
  for (const connId of connections) {
    const prov = gameState.getProvince(connId);
    if (!prov) continue;
    const hasHostiles = gameState.getArmiesInProvince(connId)
      .some(a => a.factionId !== armyFactionId && (a.regiments || []).length > 0);
    if (prov.controllingFaction === armyFactionId && !hasHostiles) {
      return prov;
    }
  }

  // 2. Fallback to any connected province with no hostile armies
  for (const connId of connections) {
    const prov = gameState.getProvince(connId);
    if (!prov) continue;
    const hasHostiles = gameState.getArmiesInProvince(connId)
      .some(a => a.factionId !== armyFactionId && (a.regiments || []).length > 0);
    if (!hasHostiles) {
      return prov;
    }
  }

  return null; // Surrounded / trapped
}

/**
 * Full auto-resolve battle.
 * Returns a BattleResult object.
 */
export function autoResolveBattle(attackerArmy, defenderArmy, province, gameStateOrGen = null, defenderGenBonus = null) {
  let gameState = null;
  let attackerGenBonus = null;
  let defGenBonus = null;

  if (gameStateOrGen && typeof gameStateOrGen.calculateGeneralCombatBonus === 'function') {
    gameState = gameStateOrGen;
    attackerGenBonus = gameState.calculateGeneralCombatBonus(attackerArmy.generalId);
    defGenBonus = gameState.calculateGeneralCombatBonus(defenderArmy.generalId);
  } else {
    attackerGenBonus = normalizeGeneralBonus(gameStateOrGen);
    defGenBonus = normalizeGeneralBonus(defenderGenBonus);
  }

  // Calculate win probability
  const winProbObj = calculateWinProbability(
    attackerArmy, defenderArmy, province,
    attackerGenBonus, defGenBonus
  );
  const winProb = Number(winProbObj);

  // Roll the dice
  const roll = Math.random();
  const attackerWins = roll < winProb;

  // Determine engagement intensity (how bloody was the fight)
  // Closer match = bloodier fight
  const powerRatio = armyCombatPower(attackerArmy, attackerGenBonus) /
    Math.max(1, armyCombatPower(defenderArmy, defGenBonus));
  const closeness = 1.0 - Math.abs(powerRatio - 1.0) / (powerRatio + 1.0);
  const intensity = 0.3 + closeness * 0.5; // 0.3 to 0.8

  // Apply casualties to both sides
  const attackerCasualties = applyCasualties(attackerArmy, intensity, attackerWins);
  const defenderCasualties = applyCasualties(defenderArmy, intensity, !attackerWins);

  // Remove destroyed regiments
  const attackerDestroyed = removeDestroyedRegiments(attackerArmy);
  const defenderDestroyed = removeDestroyedRegiments(defenderArmy);

  // Check if either army is fully destroyed
  const attackerAlive = (attackerArmy.regiments || []).length > 0;
  const defenderAlive = (defenderArmy.regiments || []).length > 0;

  let outcome;
  if (attackerWins && !defenderAlive) outcome = 'DECISIVE_VICTORY';
  else if (attackerWins) outcome = 'VICTORY';
  else if (!attackerWins && !attackerAlive) outcome = 'DECISIVE_DEFEAT';
  else outcome = 'DEFEAT';

  // Compute general fates if GameState is available
  let generalFates = null;
  if (gameState) {
    const attGen = attackerArmy.generalId ? gameState.getCharacter(attackerArmy.generalId) : null;
    const defGen = defenderArmy.generalId ? gameState.getCharacter(defenderArmy.generalId) : null;
    const attFaction = gameState.getFaction(attackerArmy.factionId);
    const defFaction = gameState.getFaction(defenderArmy.factionId);

    generalFates = {
      attacker: resolveGeneralFate(attGen, attackerWins, !attackerAlive, defenderArmy.factionId, attFaction?.capitalProvinceId),
      defender: resolveGeneralFate(defGen, !attackerWins, !defenderAlive, attackerArmy.factionId, defFaction?.capitalProvinceId)
    };

    if (generalFates.attacker?.status === 'DECEASED' || generalFates.attacker?.status === 'CAPTURED') {
      attackerArmy.generalId = null;
    }
    if (generalFates.defender?.status === 'DECEASED' || generalFates.defender?.status === 'CAPTURED') {
      defenderArmy.generalId = null;
    }
  }

  return {
    attackerWins,
    winner: attackerWins ? 'attacker' : 'defender',
    outcome,
    winProbability: winProbObj,
    roll,
    intensity,
    conquered: false,
    province: province ? { id: province.id, name: province.name, terrainType: province.terrainType } : null,
    attacker: {
      armyId: attackerArmy.id,
      armyName: attackerArmy.name,
      factionId: attackerArmy.factionId,
      generalId: attackerArmy.generalId,
      casualties: attackerCasualties,
      destroyed: attackerDestroyed.map(r => r.name || r.id),
      survivingRegiments: (attackerArmy.regiments || []).length,
      totalRegimentsBefore: attackerCasualties.length
    },
    defender: {
      armyId: defenderArmy.id,
      armyName: defenderArmy.name,
      factionId: defenderArmy.factionId,
      generalId: defenderArmy.generalId,
      casualties: defenderCasualties,
      destroyed: defenderDestroyed.map(r => r.name || r.id),
      survivingRegiments: (defenderArmy.regiments || []).length,
      totalRegimentsBefore: defenderCasualties.length
    },
    generalFates
  };
}

/**
 * Applies campaign state mutations resulting from an auto-resolve battle:
 * - Deletes fully destroyed armies
 * - Advances victorious attacker into target province (and deducts 50 MP)
 * - Retreats surviving defeated defender along valid connections (or destroys if trapped)
 * - Transfers province control if defender eliminated/cleared and no other hostiles remain
 * - Updates character and general location states
 */
export function applyBattleOutcome(gameState, result) {
  if (!gameState || !result) return result;

  const attackerArmy = gameState.getArmy(result.attacker.armyId);
  const defenderArmy = gameState.getArmy(result.defender.armyId);
  const province = gameState.getProvince(result.province?.id);

  if (!attackerArmy || !defenderArmy || !province) return result;

  const attackerWins = result.attackerWins;
  const attackerAlive = (attackerArmy.regiments || []).length > 0;
  const defenderAlive = (defenderArmy.regiments || []).length > 0;

  // Resolve general fates if not already resolved
  if (!result.generalFates) {
    const attGen = attackerArmy.generalId ? gameState.getCharacter(attackerArmy.generalId) : null;
    const defGen = defenderArmy.generalId ? gameState.getCharacter(defenderArmy.generalId) : null;
    const attFaction = gameState.getFaction(attackerArmy.factionId);
    const defFaction = gameState.getFaction(defenderArmy.factionId);

    result.generalFates = {
      attacker: resolveGeneralFate(attGen, attackerWins, !attackerAlive, defenderArmy.factionId, attFaction?.capitalProvinceId),
      defender: resolveGeneralFate(defGen, !attackerWins, !defenderAlive, attackerArmy.factionId, defFaction?.capitalProvinceId)
    };

    if (result.generalFates.attacker?.status === 'DECEASED' || result.generalFates.attacker?.status === 'CAPTURED') {
      attackerArmy.generalId = null;
    }
    if (result.generalFates.defender?.status === 'DECEASED' || result.generalFates.defender?.status === 'CAPTURED') {
      defenderArmy.generalId = null;
    }
  }

  // 1. Destroy empty armies
  if (!attackerAlive) {
    gameState.deleteArmy(attackerArmy.id);
  }
  if (!defenderAlive) {
    gameState.deleteArmy(defenderArmy.id);
  }

  // 2. Movement & Retreat Handling
  result.provinceConquered = false;
  result.conquered = false;

  if (attackerWins) {
    // Attacker occupies province if surviving
    if (attackerAlive) {
      attackerArmy.provinceId = province.id;
      attackerArmy.movementPoints = Math.max(0, (attackerArmy.movementPoints || 100) - 50);
      if (attackerArmy.generalId) {
        const attGen = gameState.getCharacter(attackerArmy.generalId);
        if (attGen && attGen.alive) {
          attGen.locationProvinceId = province.id;
        }
      }
    }

    // Defender retreats if surviving
    if (defenderAlive) {
      const retreatProv = findRetreatProvince(gameState, province, defenderArmy.factionId);
      if (retreatProv) {
        defenderArmy.provinceId = retreatProv.id;
        defenderArmy.movementPoints = 0;
        if (defenderArmy.generalId) {
          const defGen = gameState.getCharacter(defenderArmy.generalId);
          if (defGen && defGen.alive) {
            defGen.locationProvinceId = retreatProv.id;
          }
        }
      } else {
        // Surrounded / trapped -> destroyed
        gameState.deleteArmy(defenderArmy.id);
        result.defenderTrapped = true;
      }
    }

    // 3. Province Control Transfer
    const hostiles = gameState.getArmiesInProvince(province.id)
      .filter(a => a.factionId !== attackerArmy.factionId && a.id !== defenderArmy.id && (a.regiments || []).length > 0);

    if (attackerAlive && hostiles.length === 0 && province.controllingFaction !== attackerArmy.factionId) {
      gameState.transferProvinceControl(province.id, attackerArmy.factionId);
      result.provinceConquered = true;
      result.conquered = true;
      if (Array.isArray(gameState.activeRebellions)) {
        gameState.activeRebellions = gameState.activeRebellions.filter(id => id !== province.id);
      }
    }
  } else {
    // Defender won: Defender holds province
    attackerArmy.movementPoints = 0;
  }

  return result;
}
