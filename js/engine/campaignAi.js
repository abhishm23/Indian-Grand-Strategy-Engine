/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/engine/campaignAi.js
 * 
 * Campaign Layer AI Engine for Non-Player Factions:
 * - Economic accounting (provincial gross tax, building yields, regiment upkeep)
 * - Infrastructure construction prioritization weighted by AI personality
 * - Unit recruitment & military force limits (barracks prerequisites, personality weighting)
 * - Strategic movement, hostile target selection, and player encounter clash detection
 */

import { UNIT_TYPES } from '../data/units.js';
import {
  BUILDINGS,
  BUILDING_CATEGORIES,
  canConstructBuilding,
  calculateProvinceBuildingBonuses,
  getRecruitableUnits,
  getBuilding
} from '../data/buildings.js';
import { areProvincesAdjacent } from '../data/provinces.js';
import { AI_PERSONALITIES } from '../data/factions.js';
import { autoResolveBattle, applyBattleOutcome } from './combatResolver.js';

// ============================================================================
// 1. Personality Weight Configurations
// ============================================================================

export const PERSONALITY_BUILDING_WEIGHTS = Object.freeze({
  EXPANSIONIST_MILITANT: {
    BARRACKS: 40,
    WALLS: 25,
    MARKET: 15,
    IRRIGATION: 10,
    SHRINE: 10
  },
  DEFENSIVE_TRADITIONALIST: {
    WALLS: 40,
    SHRINE: 25,
    IRRIGATION: 20,
    BARRACKS: 10,
    MARKET: 5
  },
  MERCANTILE_OPPORTUNIST: {
    MARKET: 40,
    IRRIGATION: 30,
    WALLS: 15,
    BARRACKS: 10,
    SHRINE: 5
  },
  PIOUS_CRUSADER: {
    SHRINE: 45,
    WALLS: 25,
    BARRACKS: 15,
    IRRIGATION: 10,
    MARKET: 5
  },
  DIPLOMATIC_PACIFIER: {
    MARKET: 30,
    SHRINE: 25,
    WALLS: 25,
    IRRIGATION: 15,
    BARRACKS: 5
  },
  ERRATIC_AUTOCRAT: {
    BARRACKS: 35,
    SHRINE: 25,
    MARKET: 20,
    WALLS: 10,
    IRRIGATION: 10
  }
});

export const PERSONALITY_UNIT_WEIGHTS = Object.freeze({
  EXPANSIONIST_MILITANT: {
    WAR_ELEPHANTS: 35,
    HEAVY_CAVALRY: 35,
    HORSE_ARCHERS: 15,
    RAJPUT_LEVIES: 10,
    PAIKS: 5,
    SIEGE_ENGINES: 5
  },
  DEFENSIVE_TRADITIONALIST: {
    RAJPUT_LEVIES: 40,
    PAIKS: 30,
    HORSE_ARCHERS: 15,
    HEAVY_CAVALRY: 10,
    WAR_ELEPHANTS: 5,
    SIEGE_ENGINES: 0
  },
  MERCANTILE_OPPORTUNIST: {
    PAIKS: 35,
    HORSE_ARCHERS: 30,
    HEAVY_CAVALRY: 15,
    RAJPUT_LEVIES: 10,
    WAR_ELEPHANTS: 10,
    SIEGE_ENGINES: 0
  },
  PIOUS_CRUSADER: {
    RAJPUT_LEVIES: 45,
    HEAVY_CAVALRY: 25,
    HORSE_ARCHERS: 15,
    WAR_ELEPHANTS: 10,
    PAIKS: 5,
    SIEGE_ENGINES: 0
  },
  DIPLOMATIC_PACIFIER: {
    RAJPUT_LEVIES: 30,
    PAIKS: 30,
    HORSE_ARCHERS: 20,
    HEAVY_CAVALRY: 10,
    WAR_ELEPHANTS: 10,
    SIEGE_ENGINES: 0
  },
  ERRATIC_AUTOCRAT: {
    WAR_ELEPHANTS: 30,
    HEAVY_CAVALRY: 25,
    HORSE_ARCHERS: 20,
    SIEGE_ENGINES: 15,
    RAJPUT_LEVIES: 10,
    PAIKS: 0
  }
});

export const PERSONALITY_ATTACK_CHANCES = Object.freeze({
  EXPANSIONIST_MILITANT: 0.85,
  PIOUS_CRUSADER: 0.70,
  ERRATIC_AUTOCRAT: 0.50,
  MERCANTILE_OPPORTUNIST: 0.40,
  DEFENSIVE_TRADITIONALIST: 0.20,
  DIPLOMATIC_PACIFIER: 0.15
});

export const BUILDING_LADDERS = Object.freeze({
  BARRACKS: ['barracks_t1', 'barracks_t2', 'barracks_t3'],
  WALLS: ['walls_t1', 'walls_t2', 'walls_t3'],
  IRRIGATION: ['irrigation_t1', 'irrigation_t2', 'irrigation_t3'],
  MARKET: ['market_t1', 'market_t2', 'market_t3'],
  SHRINE: ['shrine_t1', 'shrine_t2', 'shrine_t3']
});

// ============================================================================
// 2. AI Economics Subsystem
// ============================================================================

export function processAiEconomics(faction, gameState) {
  if (!faction || !gameState) return { grossRevenue: 0, totalUpkeep: 0, netIncome: 0, newTreasury: 0 };

  const heldProvinces = gameState.getFactionProvinces(faction.id);
  let grossRevenue = 0;

  for (const prov of heldProvinces) {
    // Provinces under rebel siege produce zero taxation
    if (prov.siegeStatus === true) continue;

    // Governor taxation multiplier
    let govMult = 1.0;
    if (prov.governorId && gameState.calculateGovernorTaxModifier) {
      const govStats = gameState.calculateGovernorTaxModifier(prov.governorId);
      govMult = govStats.taxMultiplier || 1.0;
    }

    // Infrastructure tax bonuses (Canals, Bazaars, Mints)
    const activeBuildings = prov.activeBuildings || prov.buildings || [];
    const bldgBonuses = calculateProvinceBuildingBonuses(activeBuildings);
    const buildingTax = bldgBonuses.taxBonus || 0;

    const provGross = Math.floor((prov.baseTax || 0) * govMult) + buildingTax;
    grossRevenue += Math.max(0, provGross);
  }

  // Calculate total military upkeep across all regiments
  const armies = gameState.getFactionArmies(faction.id);
  let totalUpkeep = 0;

  for (const army of armies) {
    for (const reg of (army.regiments || [])) {
      if ((reg.hp || 0) <= 0) continue;
      const uType = reg.unitTypeId || reg.type;
      const unitDef = UNIT_TYPES[uType];
      const regimentUpkeep = reg.upkeep || (unitDef ? unitDef.upkeep : 10);
      totalUpkeep += regimentUpkeep;
    }
  }

  const netIncome = grossRevenue - totalUpkeep;
  const currentTreasury = faction.treasury || 0;
  const newTreasury = Math.max(0, currentTreasury + netIncome);
  faction.treasury = newTreasury;

  return {
    grossRevenue,
    totalUpkeep,
    netIncome,
    newTreasury
  };
}

// ============================================================================
// 3. AI Construction Subsystem
// ============================================================================

export function processAiConstruction(faction, gameState, options = {}) {
  const constructions = [];
  if (!faction || !gameState) return constructions;

  // Preserve gold reserve: only commission building if treasury > 300g
  if ((faction.treasury || 0) <= 300) return constructions;

  const heldProvinces = gameState.getFactionProvinces(faction.id);
  if (heldProvinces.length === 0) return constructions;

  // Pool all strategic resources available across held provinces
  const availableResources = Array.from(new Set(
    heldProvinces.map(p => p.strategicResource).filter(Boolean)
  ));

  const personality = faction.aiPersonality || 'DEFENSIVE_TRADITIONALIST';
  const categoryWeights = PERSONALITY_BUILDING_WEIGHTS[personality] || PERSONALITY_BUILDING_WEIGHTS.DEFENSIVE_TRADITIONALIST;

  // Sort categories by personality weighting descending
  const sortedCategories = Object.keys(categoryWeights).sort(
    (a, b) => categoryWeights[b] - categoryWeights[a]
  );

  const maxConstructions = options.maxConstructionsPerTurn || 2;
  let executedConstructions = 0;

  for (const prov of heldProvinces) {
    if (executedConstructions >= maxConstructions) break;
    if ((faction.treasury || 0) <= 300) break;
    if (prov.siegeStatus === true) continue;

    const activeList = prov.activeBuildings || prov.buildings || [];

    for (const category of sortedCategories) {
      const ladder = BUILDING_LADDERS[category] || [];
      // Find the next tier building not yet constructed
      const candidateId = ladder.find(bId => !activeList.includes(bId));
      if (!candidateId) continue;

      const check = canConstructBuilding(candidateId, activeList, faction.treasury, availableResources);
      if (check.canBuild) {
        const bldgDef = getBuilding(candidateId);
        if (!bldgDef) continue;

        // Ensure post-construction treasury maintains minimum buffer
        if (faction.treasury - bldgDef.cost < 100) continue;

        // Deduct treasury and upgrade province slot
        faction.treasury -= bldgDef.cost;

        if (!prov.activeBuildings) prov.activeBuildings = [...(prov.buildings || [])];
        prov.activeBuildings.push(candidateId);
        if (!prov.buildings) prov.buildings = [];
        if (!prov.buildings.includes(candidateId)) prov.buildings.push(candidateId);

        // Fortifications boost province defense rating
        if (bldgDef.defenseRating > 0 || bldgDef.category === 'WALLS') {
          prov.defenseLevel = Math.max(prov.defenseLevel || 1, bldgDef.tier || 1);
        }

        const event = {
          factionId: faction.id,
          provinceId: prov.id,
          buildingId: candidateId,
          cost: bldgDef.cost
        };
        constructions.push(event);
        executedConstructions++;
        break; // Max 1 construction per province per turn
      }
    }
  }

  return constructions;
}

// ============================================================================
// 4. AI Recruitment Subsystem
// ============================================================================

export function processAiRecruitment(faction, gameState, options = {}) {
  const recruitments = [];
  if (!faction || !gameState) return recruitments;

  const heldProvinces = gameState.getFactionProvinces(faction.id);
  if (heldProvinces.length === 0) return recruitments;

  // Calculate existing force limit: maintain 1-2 regiments per province (min 4 per army/faction)
  const armies = gameState.getFactionArmies(faction.id);
  const totalRegiments = armies.reduce((sum, a) => sum + (a.regiments || []).length, 0);
  const targetCapacity = Math.max(4, heldProvinces.length * 2);

  if (totalRegiments >= targetCapacity) return recruitments;
  if ((faction.treasury || 0) <= 250) return recruitments;

  // Identify recruitment hubs: provinces with Barracks
  let barracksProvinces = heldProvinces.filter(p => {
    const b = p.activeBuildings || p.buildings || [];
    return b.some(id => typeof id === 'string' && id.startsWith('barracks'));
  });

  // Fallback: if no barracks built yet, capital province can raise emergency militia
  if (barracksProvinces.length === 0) {
    const capital = heldProvinces.find(p => p.id === faction.capitalProvinceId);
    if (capital) barracksProvinces = [capital];
    else barracksProvinces = [heldProvinces[0]];
  }

  const availableResources = Array.from(new Set(
    heldProvinces.map(p => p.strategicResource).filter(Boolean)
  ));

  const personality = faction.aiPersonality || 'DEFENSIVE_TRADITIONALIST';
  const unitWeights = PERSONALITY_UNIT_WEIGHTS[personality] || PERSONALITY_UNIT_WEIGHTS.DEFENSIVE_TRADITIONALIST;
  const maxRecruitments = options.maxRecruitmentsPerTurn || 2;
  let executedRecruitments = 0;

  for (const prov of barracksProvinces) {
    if (executedRecruitments >= maxRecruitments) break;
    if ((faction.treasury || 0) <= 250) break;

    const activeList = prov.activeBuildings || prov.buildings || [];
    let recruitable = getRecruitableUnits(activeList, availableResources);
    if (!recruitable || recruitable.length === 0) {
      recruitable = ['RAJPUT_LEVIES', 'PAIKS'];
    }

    // Filter units the AI can currently afford
    const affordableUnits = recruitable.filter(uId => {
      const def = UNIT_TYPES[uId];
      return def && def.recruitmentCost <= faction.treasury;
    });

    if (affordableUnits.length === 0) continue;

    // Pick candidate with highest personality weight
    affordableUnits.sort((a, b) => (unitWeights[b] || 0) - (unitWeights[a] || 0));
    const selectedUnitId = affordableUnits[0];
    const unitDef = UNIT_TYPES[selectedUnitId];
    if (!unitDef) continue;

    // Deduct recruitment cost
    faction.treasury -= unitDef.recruitmentCost;

    // Find existing army in province or instantiate a new host
    let army = armies.find(a => a.provinceId === prov.id && (a.regiments || []).length < 10);
    if (!army) {
      army = gameState.createArmy(faction.id, prov.id, [], null, `${faction.shortName || faction.name} Garrison`);
      armies.push(army);
    }

    const newRegiment = {
      id: `REG_${faction.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      unitTypeId: unitDef.id,
      type: unitDef.id,
      name: `${unitDef.name} (${prov.capitalCity || prov.name})`,
      hp: unitDef.maxHp,
      maxHp: unitDef.maxHp,
      morale: unitDef.baseMorale || 100,
      maxMorale: unitDef.baseMorale || 100,
      meleeAtk: unitDef.meleeAttack || unitDef.meleeAtk || 30,
      meleeDef: unitDef.meleeDefense || unitDef.meleeDef || 15,
      upkeep: unitDef.upkeep || 10
    };

    army.regiments.push(newRegiment);

    const event = {
      factionId: faction.id,
      provinceId: prov.id,
      armyId: army.id,
      unitTypeId: unitDef.id,
      cost: unitDef.recruitmentCost
    };
    recruitments.push(event);
    executedRecruitments++;
  }

  return recruitments;
}

// ============================================================================
// 5. AI Strategic Movement & Target Selection Subsystem
// ============================================================================

export function processAiMovement(faction, gameState, options = {}) {
  const movements = [];
  const pendingBattles = [];
  if (!faction || !gameState) return { movements, pendingBattles };

  const armies = gameState.getFactionArmies(faction.id);
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const personality = faction.aiPersonality || 'DEFENSIVE_TRADITIONALIST';
  const attackProbability = PERSONALITY_ATTACK_CHANCES[personality] ?? 0.40;

  for (const army of armies) {
    if ((army.regiments || []).length === 0) continue;
    if ((army.movementPoints || 100) < 50) continue;

    const currProv = gameState.getProvince(army.provinceId);
    if (!currProv) continue;

    const connectionIds = currProv.connections || [];
    if (connectionIds.length === 0) continue;

    // Evaluate adjacent candidate provinces
    const candidates = connectionIds.map(id => gameState.getProvince(id)).filter(Boolean);

    // Search for hostile targets
    const hostileTargets = [];

    for (const targetProv of candidates) {
      const controllingId = targetProv.controllingFaction;
      const relation = gameState.diplomacy?.relations?.[faction.id]?.[controllingId] ?? 0;
      const isRebel = controllingId === 'FAC_REBEL' || targetProv.siegeStatus === true;
      const isHostileFaction = controllingId !== faction.id && relation < -30;

      // Check if target contains hostile foreign armies
      const armiesInTarget = gameState.getArmiesInProvince(targetProv.id);
      const hasHostileArmy = armiesInTarget.some(a => {
        if (a.factionId === faction.id || (a.regiments || []).length === 0) return false;
        const rel = gameState.diplomacy?.relations?.[faction.id]?.[a.factionId] ?? 0;
        return a.factionId === 'FAC_REBEL' || rel < -30 || a.factionId === gameState.playerFactionId;
      });

      if (isRebel || isHostileFaction || hasHostileArmy) {
        let score = 50 - (targetProv.defenseLevel || 1) * 10;
        if (isRebel) score += 40;
        if (personality === 'EXPANSIONIST_MILITANT') {
          score += 30;
          if (targetProv.id === gameState.getFaction(controllingId)?.capitalProvinceId) score += 15;
        } else if (personality === 'MERCANTILE_OPPORTUNIST') {
          score += Math.floor((targetProv.baseTax || 0) / 10);
          if (targetProv.strategicResource) score += 15;
        } else if (personality === 'PIOUS_CRUSADER') {
          const targetFac = gameState.getFaction(controllingId);
          if (targetFac && targetFac.religion !== faction.religion) score += 35;
        }
        hostileTargets.push({ province: targetProv, score, isHostile: true });
      }
    }

    // Determine move action
    if (hostileTargets.length > 0) {
      hostileTargets.sort((a, b) => b.score - a.score);
      const chosenTarget = hostileTargets[0].province;

      const roll = rng();
      if (roll < attackProbability) {
        // Attack decision ratified
        army.movementPoints = Math.max(0, (army.movementPoints || 100) - 50);

        // Check for Player Clash
        const playerArmies = gameState.getArmiesInProvince(chosenTarget.id)
          .filter(a => a.factionId === gameState.playerFactionId && (a.regiments || []).length > 0);

        if (playerArmies.length > 0) {
          const clash = {
            attackerArmy: army,
            defenderArmy: playerArmies[0],
            province: chosenTarget
          };

          pendingBattles.push(clash);
          if (options.setPendingBattle !== false) {
            gameState.pendingBattle = clash;
          }
          if (typeof options.onEncounterClash === 'function') {
            options.onEncounterClash(clash);
          }

          movements.push({
            factionId: faction.id,
            armyId: army.id,
            fromProvinceId: currProv.id,
            toProvinceId: chosenTarget.id,
            isAttack: true,
            isPlayerClash: true,
            targetFactionId: gameState.playerFactionId
          });

          // Army remains at frontier waiting for player encounter resolution
          continue;
        }

        // Check for non-player enemy armies (AI vs AI / AI vs Rebel)
        const defendingArmies = gameState.getArmiesInProvince(chosenTarget.id)
          .filter(a => a.factionId !== faction.id && (a.regiments || []).length > 0);

        if (defendingArmies.length > 0) {
          const defArmy = defendingArmies[0];
          const battleResult = autoResolveBattle(army, defArmy, chosenTarget, gameState);
          applyBattleOutcome(gameState, battleResult);

          movements.push({
            factionId: faction.id,
            armyId: army.id,
            fromProvinceId: currProv.id,
            toProvinceId: chosenTarget.id,
            isAttack: true,
            isPlayerClash: false,
            targetFactionId: defArmy.factionId,
            battleResult
          });
        } else {
          // Undefended enemy province transit
          army.provinceId = chosenTarget.id;
          if (army.generalId) {
            const gen = gameState.getCharacter(army.generalId);
            if (gen && gen.alive) gen.locationProvinceId = chosenTarget.id;
          }

          if (chosenTarget.controllingFaction !== faction.id) {
            gameState.transferProvinceControl(chosenTarget.id, faction.id);
            chosenTarget.siegeStatus = false;
          }

          movements.push({
            factionId: faction.id,
            armyId: army.id,
            fromProvinceId: currProv.id,
            toProvinceId: chosenTarget.id,
            isAttack: true,
            isPlayerClash: false,
            targetFactionId: chosenTarget.controllingFaction,
            capturedUndefended: true
          });
        }
      }
    } else {
      // Friendly border reinforcement
      if (personality === 'DEFENSIVE_TRADITIONALIST') {
        // Defensive factions hold high-defense fortresses
        continue;
      }

      const friendlyTargets = candidates.filter(p => p.controllingFaction === faction.id);
      if (friendlyTargets.length > 0 && rng() < 0.25) {
        // Relocate to reinforce an adjacent friendly province
        const targetProv = friendlyTargets[0];
        army.movementPoints = Math.max(0, (army.movementPoints || 100) - 50);
        army.provinceId = targetProv.id;
        if (army.generalId) {
          const gen = gameState.getCharacter(army.generalId);
          if (gen && gen.alive) gen.locationProvinceId = targetProv.id;
        }

        movements.push({
          factionId: faction.id,
          armyId: army.id,
          fromProvinceId: currProv.id,
          toProvinceId: targetProv.id,
          isAttack: false,
          isPlayerClash: false,
          targetFactionId: faction.id
        });
      }
    }
  }

  return { movements, pendingBattles };
}

// ============================================================================
// 6. Master AI Turn Processing Loop
// ============================================================================

export function processAiTurn(gameState, options = {}) {
  if (!gameState || !gameState.factions) {
    throw new Error('processAiTurn requires a valid GameState instance');
  }

  const results = {
    processedFactions: [],
    economicSummary: {},
    constructions: [],
    recruitments: [],
    movements: [],
    pendingBattles: [],
    clashes: [], // Alias for pendingBattles
    summary: {
      recruitedCount: 0,
      battlesFought: 0,
      constructionsCount: 0
    }
  };

  const factions = Object.values(gameState.factions);

  for (const faction of factions) {
    // 1. Skip eliminated, player, or rebel factions
    if (faction.isAlive === false) continue;
    if (faction.id === gameState.playerFactionId) continue;
    if (faction.id === 'FAC_REBEL') continue;

    // Check if faction still holds territory or field armies
    const heldProvinces = gameState.getFactionProvinces(faction.id);
    const armies = gameState.getFactionArmies(faction.id);
    if (heldProvinces.length === 0 && armies.length === 0) {
      faction.isAlive = false;
      continue;
    }

    results.processedFactions.push(faction.id);

    // 2. AI Economics
    const econ = processAiEconomics(faction, gameState);
    results.economicSummary[faction.id] = econ;

    // 3. AI Construction
    const bldgs = processAiConstruction(faction, gameState, options);
    results.constructions.push(...bldgs);

    // 4. AI Recruitment
    const units = processAiRecruitment(faction, gameState, options);
    results.recruitments.push(...units);

    // 5. AI Strategic Movement & Target Selection
    const { movements, pendingBattles } = processAiMovement(faction, gameState, options);
    results.movements.push(...movements);
    results.pendingBattles.push(...pendingBattles);
  }

  results.clashes = results.pendingBattles;
  results.summary = {
    recruitedCount: results.recruitments.length,
    battlesFought: results.movements.filter(m => m.battleResult).length,
    constructionsCount: results.constructions.length
  };

  return results;
}
