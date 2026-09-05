/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/engine/diplomacyAi.js
 * 
 * Comprehensive Diplomacy AI, Historical Treaties Framework,
 * Deterministic Acceptance Calculus, and Execution Pipeline.
 */

import { calculateDiplomaticReligiousModifier } from '../data/religions.js';
import { AI_PERSONALITIES } from '../data/factions.js';

// ============================================================================
// 1. CONSTANTS & ENUMS
// ============================================================================

export const TREATY_TYPES = Object.freeze({
  TRADE_AGREEMENT: 'TRADE_AGREEMENT',
  NON_AGGRESSION_PACT: 'NON_AGGRESSION_PACT',
  PEACE_TREATY: 'PEACE_TREATY',
  MILITARY_ALLIANCE: 'MILITARY_ALLIANCE',
  VASSALAGE: 'VASSALAGE'
});

export const TREATY_THRESHOLDS = Object.freeze({
  TRADE_AGREEMENT: 40,
  NON_AGGRESSION_PACT: 50,
  PEACE_TREATY: 60,
  MILITARY_ALLIANCE: 75,
  VASSALAGE: 90
});

export const TREATY_BASE_SCORES = Object.freeze({
  TRADE_AGREEMENT: 20,
  NON_AGGRESSION_PACT: 15,
  PEACE_TREATY: 10,
  MILITARY_ALLIANCE: 10,
  VASSALAGE: -30
});

export const TREATY_DURATIONS = Object.freeze({
  TRADE_AGREEMENT: null,
  NON_AGGRESSION_PACT: 12,
  PEACE_TREATY: 10,
  MILITARY_ALLIANCE: null,
  VASSALAGE: null
});

const TREATY_ALIAS_MAP = Object.freeze({
  PEACE: TREATY_TYPES.PEACE_TREATY,
  PEACE_TREATY: TREATY_TYPES.PEACE_TREATY,
  NON_AGGRESSION: TREATY_TYPES.NON_AGGRESSION_PACT,
  NON_AGGRESSION_PACT: TREATY_TYPES.NON_AGGRESSION_PACT,
  TRADE: TREATY_TYPES.TRADE_AGREEMENT,
  TRADE_AGREEMENT: TREATY_TYPES.TRADE_AGREEMENT,
  ALLIANCE: TREATY_TYPES.MILITARY_ALLIANCE,
  MILITARY_ALLIANCE: TREATY_TYPES.MILITARY_ALLIANCE,
  VASSALAGE: TREATY_TYPES.VASSALAGE
});

/**
 * Normalizes input string into a standard canonical TREATY_TYPES key.
 * @param {string} rawType
 * @returns {string|null}
 */
export function normalizeTreatyType(rawType) {
  if (!rawType || typeof rawType !== 'string') return null;
  const upper = rawType.trim().toUpperCase();
  return TREATY_ALIAS_MAP[upper] || (TREATY_TYPES[upper] ? upper : null);
}

// ============================================================================
// 2. MILITARY POWER CALCULATIONS
// ============================================================================

/**
 * Computes the total aggregate military strength of a faction from active armies and garrisons.
 * @param {object} gameState
 * @param {string} factionId
 * @returns {number}
 */
export function calculateFactionMilitaryPower(gameState, factionId) {
  if (!gameState) return 100;
  const armies = gameState.getFactionArmies ? gameState.getFactionArmies(factionId) :
    Object.values(gameState.armies || {}).filter(a => a.factionId === factionId);

  let totalPower = 0;

  for (const army of armies) {
    let armyRaw = 0;
    const regiments = army.regiments || [];
    for (const reg of regiments) {
      if ((reg.hp || 0) <= 0) continue;
      const basePower = reg.basePower || ((reg.meleeAtk || reg.meleeAttack || 30) * 2 + (reg.meleeDef || reg.meleeDefense || 15));
      const maxHp = reg.maxHp || 100;
      const hpRatio = maxHp > 0 ? Math.max(0, reg.hp / maxHp) : 0;
      const maxMorale = reg.maxMorale || 100;
      const moraleRatio = maxMorale > 0 ? Math.max(0, reg.morale / maxMorale) : 0.8;
      const moraleFactor = 0.5 + 0.5 * moraleRatio;
      armyRaw += basePower * hpRatio * moraleFactor;
    }

    let generalModifier = 1.0;
    if (army.generalId && gameState.calculateGeneralCombatBonus) {
      const genBonus = gameState.calculateGeneralCombatBonus(army.generalId);
      generalModifier = genBonus.autoResolveModifier || 1.0;
    } else if (army.generalId && gameState.getCharacter) {
      const char = gameState.getCharacter(army.generalId);
      if (char && char.attributes) {
        generalModifier = 1.0 + ((char.attributes.command || 5) * 0.04);
      }
    }

    totalPower += armyRaw * generalModifier;
  }

  // If faction has no field armies, compute garrison baseline from held provinces
  if (totalPower <= 0) {
    const provinces = gameState.getFactionProvinces ? gameState.getFactionProvinces(factionId) :
      Object.values(gameState.provinces || {}).filter(p => p.controllingFaction === factionId);
    totalPower = Math.max(50, provinces.length * 60);
  }

  return Math.max(10, Math.round(totalPower));
}

/**
 * Calculates the military balance of power ratio between two realms (proposer / target).
 * @param {object} gameState
 * @param {string} proposerId
 * @param {string} targetId
 * @returns {number}
 */
export function calculateMilitaryPowerRatio(gameState, proposerId, targetId) {
  if (!gameState) return 1.0;
  const proposerPower = calculateFactionMilitaryPower(gameState, proposerId);
  const targetPower = calculateFactionMilitaryPower(gameState, targetId);
  return Number((proposerPower / Math.max(1, targetPower)).toFixed(2));
}

// ============================================================================
// 3. DETERMINISTIC ACCEPTANCE CALCULUS
// ============================================================================

/**
 * Evaluates the acceptance likelihood of a diplomatic treaty offer.
 * Deterministic formula based on base score, relations, diplomat skill,
 * sweetener gold, religious affinity, AI personality biases, and military balance.
 * 
 * @param {object} params
 * @returns {object} { score, threshold, accepted, margin, likelihood, breakdown, reason }
 */
export function evaluateTreatyProposal({
  gameState = null,
  treatyType,
  proposingFactionId,
  targetFactionId,
  proposingFaction = null,
  targetFaction = null,
  diplomatCharacter = null,
  diplomatCharacterId = null,
  sweetenerGold = 0,
  tributeSweetener = 0,
  currentRelation = null,
  militaryPowerRatio = null,
  isAtWar = null,
  warDuration = 0,
  commonBorder = false,
  sharedThreat = 0,
  warWeariness = 0
}) {
  const normType = normalizeTreatyType(treatyType);
  if (!normType) {
    throw new Error(`Invalid treaty type provided to evaluateTreatyProposal: ${treatyType}`);
  }

  // Resolve Proposing & Target Factions
  const pFac = proposingFaction || (gameState && proposingFactionId ? gameState.getFaction(proposingFactionId) : null) || {
    id: proposingFactionId || 'FAC_PROPOSER',
    name: proposingFactionId || 'Proposer',
    religion: 'ISLAM_SUNNI',
    tolerancePolicy: 'STATE_PATRONAGE',
    aiPersonality: 'DEFENSIVE_TRADITIONALIST'
  };

  const tFac = targetFaction || (gameState && targetFactionId ? gameState.getFaction(targetFactionId) : null) || {
    id: targetFactionId || 'FAC_TARGET',
    name: targetFactionId || 'Target',
    religion: 'ISLAM_SUNNI',
    tolerancePolicy: 'STATE_PATRONAGE',
    aiPersonality: 'DEFENSIVE_TRADITIONALIST'
  };

  // Resolve Diplomatic Relations
  let relation = currentRelation;
  if (relation === null && gameState && gameState.diplomacy && gameState.diplomacy.relations) {
    relation = gameState.diplomacy.relations[pFac.id]?.[tFac.id] ?? 0;
  }
  if (relation === null || relation === undefined) relation = 0;

  // Resolve War Status
  let atWar = isAtWar;
  if (atWar === null || atWar === undefined) {
    atWar = relation <= -50;
  }

  // Resolve Diplomat
  let diplomat = diplomatCharacter;
  if (!diplomat && diplomatCharacterId && gameState) {
    diplomat = gameState.getCharacter(diplomatCharacterId);
  }

  // Resolve Military Balance
  let powerRatio = militaryPowerRatio;
  if (powerRatio === null && gameState && pFac.id && tFac.id) {
    powerRatio = calculateMilitaryPowerRatio(gameState, pFac.id, tFac.id);
  }
  if (powerRatio === null || powerRatio === undefined) powerRatio = 1.0;

  // Sweetener Gold consolidation
  const goldOffered = Math.max(0, sweetenerGold || tributeSweetener || 0);

  // --------------------------------------------------------------------------
  // Component 1: Base Score
  // --------------------------------------------------------------------------
  let baseScore = TREATY_BASE_SCORES[normType] ?? 0;
  if (normType === TREATY_TYPES.PEACE_TREATY) {
    baseScore = atWar ? (10 + Math.min(20, warDuration * 2)) : -10;
  }

  // --------------------------------------------------------------------------
  // Component 2: Bilateral Relation Modifier (Math.round(currentRelation * 0.5))
  // --------------------------------------------------------------------------
  const relationModifier = Math.round(relation * 0.5);

  // --------------------------------------------------------------------------
  // Component 3: Diplomat Skill Modifier (DIP * 4.5)
  // --------------------------------------------------------------------------
  let diplomatModifier = 0;
  if (diplomat && diplomat.attributes) {
    const dipStat = diplomat.attributes.diplomacy ?? 0;
    diplomatModifier = Math.round(dipStat * 4.5);
  }

  // --------------------------------------------------------------------------
  // Component 4: Gold Sweetener (+0.05 per gold)
  // --------------------------------------------------------------------------
  const sweetenerModifier = Math.round(goldOffered * 0.05);

  // --------------------------------------------------------------------------
  // Component 5: Religious Affinity & Tolerance Policy
  // --------------------------------------------------------------------------
  let religiousModifier = 0;
  try {
    religiousModifier = calculateDiplomaticReligiousModifier(
      pFac.religion,
      pFac.tolerancePolicy || 'STATE_PATRONAGE',
      tFac.religion,
      tFac.tolerancePolicy || 'STATE_PATRONAGE'
    );
  } catch (_) {
    religiousModifier = (pFac.religion && tFac.religion && pFac.religion === tFac.religion) ? 15 : 0;
  }

  // --------------------------------------------------------------------------
  // Component 6: Target AI Personality Biases
  // --------------------------------------------------------------------------
  let personalityBias = 0;
  const personality = tFac.aiPersonality;

  switch (personality) {
    case AI_PERSONALITIES.MERCANTILE_OPPORTUNIST:
    case 'MERCANTILE_OPPORTUNIST':
      if (normType === TREATY_TYPES.TRADE_AGREEMENT) personalityBias += 40;
      if (goldOffered >= 300) personalityBias += 15;
      if (normType === TREATY_TYPES.PEACE_TREATY) personalityBias += 10;
      if (normType === TREATY_TYPES.VASSALAGE) personalityBias -= 30;
      break;

    case AI_PERSONALITIES.DEFENSIVE_TRADITIONALIST:
    case 'DEFENSIVE_TRADITIONALIST':
      if (normType === TREATY_TYPES.NON_AGGRESSION_PACT) personalityBias += 15;
      if (normType === TREATY_TYPES.MILITARY_ALLIANCE) personalityBias += 10;
      if (normType === TREATY_TYPES.VASSALAGE) personalityBias -= 50;
      break;

    case AI_PERSONALITIES.PIOUS_CRUSADER:
    case 'PIOUS_CRUSADER':
      if (normType === TREATY_TYPES.VASSALAGE) personalityBias -= 60;
      if (pFac.religion === tFac.religion) {
        personalityBias += 20;
      } else {
        personalityBias -= 25;
      }
      break;

    case AI_PERSONALITIES.EXPANSIONIST_MILITANT:
    case 'EXPANSIONIST_MILITANT':
      // Resists peace when target is winning or equal (proposer powerRatio <= 1.0)
      if (normType === TREATY_TYPES.PEACE_TREATY && powerRatio <= 1.0) {
        personalityBias -= 30;
      }
      if (normType === TREATY_TYPES.VASSALAGE) personalityBias -= 50;
      if (normType === TREATY_TYPES.MILITARY_ALLIANCE) personalityBias -= 15;
      if (normType === TREATY_TYPES.NON_AGGRESSION_PACT) personalityBias -= 10;
      break;

    case AI_PERSONALITIES.DIPLOMATIC_PACIFIER:
    case 'DIPLOMATIC_PACIFIER':
      if (normType === TREATY_TYPES.PEACE_TREATY) personalityBias += 20;
      if (normType === TREATY_TYPES.NON_AGGRESSION_PACT) personalityBias += 15;
      if (normType === TREATY_TYPES.TRADE_AGREEMENT) personalityBias += 10;
      if (normType === TREATY_TYPES.MILITARY_ALLIANCE) personalityBias += 10;
      if (normType === TREATY_TYPES.VASSALAGE) personalityBias -= 20;
      break;

    case AI_PERSONALITIES.ERRATIC_AUTOCRAT:
    case 'ERRATIC_AUTOCRAT':
      if (normType === TREATY_TYPES.TRADE_AGREEMENT) personalityBias += 10;
      if (normType === TREATY_TYPES.PEACE_TREATY && atWar) personalityBias -= 10;
      if (normType === TREATY_TYPES.VASSALAGE) personalityBias -= 45;
      break;

    default:
      break;
  }

  // --------------------------------------------------------------------------
  // Component 7: Balance of Military Power
  // --------------------------------------------------------------------------
  let militaryRatioModifier = 0;
  if (powerRatio > 1.8) {
    // Proposer is overwhelmingly stronger
    if (normType === TREATY_TYPES.VASSALAGE) militaryRatioModifier += 25;
    if (normType === TREATY_TYPES.PEACE_TREATY) militaryRatioModifier += 25;
    if (normType === TREATY_TYPES.NON_AGGRESSION_PACT) militaryRatioModifier += 10;
  } else if (powerRatio > 1.2) {
    if (normType === TREATY_TYPES.PEACE_TREATY) militaryRatioModifier += 15;
    if (normType === TREATY_TYPES.VASSALAGE) militaryRatioModifier += 10;
  } else if (powerRatio < 0.3) {
    if (normType === TREATY_TYPES.VASSALAGE) militaryRatioModifier -= 70;
    if (normType === TREATY_TYPES.PEACE_TREATY) militaryRatioModifier -= 25;
  } else if (powerRatio < 0.6) {
    // Proposer is significantly weaker than target
    if (normType === TREATY_TYPES.VASSALAGE) militaryRatioModifier -= 40;
    if (normType === TREATY_TYPES.PEACE_TREATY) militaryRatioModifier -= 15;
  }

  // --------------------------------------------------------------------------
  // Component 8: Situational Modifiers
  // --------------------------------------------------------------------------
  let situationalModifier = 0;
  if (commonBorder && normType === TREATY_TYPES.NON_AGGRESSION_PACT) {
    situationalModifier += 10;
  }
  if (sharedThreat > 0 && normType === TREATY_TYPES.MILITARY_ALLIANCE) {
    situationalModifier += sharedThreat;
  }
  if (warWeariness > 0 && normType === TREATY_TYPES.PEACE_TREATY) {
    situationalModifier += warWeariness;
  }

  // --------------------------------------------------------------------------
  // Aggregation & Verdict
  // --------------------------------------------------------------------------
  const totalScore = baseScore +
    relationModifier +
    diplomatModifier +
    sweetenerModifier +
    religiousModifier +
    personalityBias +
    militaryRatioModifier +
    situationalModifier;

  const threshold = TREATY_THRESHOLDS[normType] || 50;
  const accepted = totalScore >= threshold;
  const margin = totalScore - threshold;

  // Acceptance Likelihood Classification
  let likelihood = 'Impossible';
  if (margin >= 25) {
    likelihood = 'Definite';
  } else if (margin >= 0) {
    likelihood = 'Likely';
  } else if (margin >= -15) {
    likelihood = 'Uncertain';
  } else if (margin >= -35) {
    likelihood = 'Doubtful';
  } else {
    likelihood = 'Impossible';
  }

  // Explanatory Rationale
  const reason = accepted
    ? `${tFac.name} accepts the ${normType.replace(/_/g, ' ')} proposal.`
    : `${tFac.name} rejects the ${normType.replace(/_/g, ' ')} proposal (Requires Score: ${threshold}, Got: ${totalScore}).`;

  return {
    score: totalScore,
    threshold,
    accepted,
    margin,
    likelihood,
    breakdown: {
      baseScore,
      relationModifier,
      diplomatModifier,
      sweetenerModifier,
      religiousModifier,
      personalityBias,
      militaryRatioModifier,
      situationalModifier
    },
    reason
  };
}

// ============================================================================
// 4. TREATY EXECUTION & STATE MUTATION
// ============================================================================

/**
 * Executes an accepted diplomatic treaty, transferring sweetener gold,
 * updating bilateral relations, and registering the active treaty in GameState.
 * 
 * @param {object} gameState - Central GameState container
 * @param {string} rawTreatyType - Type of treaty being enacted
 * @param {string} f1Id - Proposing faction ID
 * @param {string} f2Id - Target faction ID
 * @param {number} sweetenerGold - Gold sweetener transferred
 * @returns {object} Execution summary { success, treaty, newRelation, message }
 */
export function executeTreaty(gameState, rawTreatyType, f1Id, f2Id, sweetenerGold = 0) {
  if (!gameState) {
    throw new Error('executeTreaty requires a valid gameState instance');
  }

  const normType = normalizeTreatyType(rawTreatyType);
  if (!normType) {
    throw new Error(`Invalid treaty type provided to executeTreaty: ${rawTreatyType}`);
  }

  const f1 = gameState.getFaction ? gameState.getFaction(f1Id) : gameState.factions[f1Id];
  const f2 = gameState.getFaction ? gameState.getFaction(f2Id) : gameState.factions[f2Id];
  if (!f1 || !f2) {
    throw new Error(`Factions not found for treaty execution: ${f1Id}, ${f2Id}`);
  }

  // Check for duplicate active treaty of same type between these two factions
  if (!gameState.diplomacy) gameState.diplomacy = { treaties: [], relations: {} };
  if (!gameState.diplomacy.treaties) gameState.diplomacy.treaties = [];

  const existingActive = gameState.diplomacy.treaties.find(t =>
    t.isActive &&
    !t.broken &&
    t.type === normType &&
    ((t.proposerId === f1.id && t.targetId === f2.id) ||
     (t.proposerId === f2.id && t.targetId === f1.id) ||
     (t.signatories && t.signatories.includes(f1.id) && t.signatories.includes(f2.id)))
  );

  if (existingActive) {
    return {
      success: false,
      treaty: existingActive,
      message: `Treaty ${normType} is already active between ${f1.name} and ${f2.name}.`
    };
  }

  const gold = Math.max(0, Math.floor(sweetenerGold || 0));

  // 1. Deduct Sweetener Gold from Proposer and Add to Target
  if (gold > 0) {
    if ((f1.treasury || 0) < gold) {
      throw new Error(`Proposer ${f1.name} has insufficient treasury (${f1.treasury}) for sweetener ${gold}`);
    }
    f1.treasury -= gold;
    f2.treasury = (f2.treasury || 0) + gold;
  }

  // 2. Adjust Bilateral Relations
  if (!gameState.diplomacy.relations) gameState.diplomacy.relations = {};
  if (!gameState.diplomacy.relations[f1.id]) gameState.diplomacy.relations[f1.id] = {};
  if (!gameState.diplomacy.relations[f2.id]) gameState.diplomacy.relations[f2.id] = {};

  let currentRel = gameState.diplomacy.relations[f1.id][f2.id] ?? 0;
  let deltaRelation = 0;

  switch (normType) {
    case TREATY_TYPES.TRADE_AGREEMENT:
      deltaRelation = 15;
      break;
    case TREATY_TYPES.NON_AGGRESSION_PACT:
      deltaRelation = 15;
      break;
    case TREATY_TYPES.PEACE_TREATY:
      // Reset negative hostility toward peace
      if (currentRel < 0) {
        currentRel = Math.min(20, currentRel + 40);
        deltaRelation = 10;
      } else {
        deltaRelation = 15;
      }
      break;
    case TREATY_TYPES.MILITARY_ALLIANCE:
      deltaRelation = 30;
      break;
    case TREATY_TYPES.VASSALAGE:
      deltaRelation = 10;
      break;
    default:
      deltaRelation = 10;
  }

  const newRelation = Math.max(-100, Math.min(100, currentRel + deltaRelation));
  gameState.diplomacy.relations[f1.id][f2.id] = newRelation;
  gameState.diplomacy.relations[f2.id][f1.id] = newRelation;

  // 3. Instantiate Treaty Record
  const treatyId = `TREATY_${normType}_${f1.id}_${f2.id}_${gameState.currentTurn || 1}`;
  const duration = TREATY_DURATIONS[normType];

  const treaty = {
    id: treatyId,
    type: normType,
    signatories: [f1.id, f2.id],
    proposerId: f1.id,
    targetId: f2.id,
    faction1Id: f1.id,
    faction2Id: f2.id,
    startTurn: gameState.currentTurn || 1,
    turnSigned: gameState.currentTurn || 1,
    startYear: gameState.year || 1345,
    durationRemaining: duration,
    sweetenerPaid: gold,
    isActive: true,
    broken: false,
    brokenBy: null,
    effects: {
      tradeTariffBonus: normType === TREATY_TYPES.TRADE_AGREEMENT ? 0.15 : 0,
      nonAggressionDuration: (normType === TREATY_TYPES.NON_AGGRESSION_PACT || normType === TREATY_TYPES.PEACE_TREATY)
        ? (duration || 10) : 0,
      mutualDefense: normType === TREATY_TYPES.MILITARY_ALLIANCE,
      vassalTributeRate: normType === TREATY_TYPES.VASSALAGE ? 0.20 : 0,
      overlordId: normType === TREATY_TYPES.VASSALAGE ? f1.id : null,
      vassalId: normType === TREATY_TYPES.VASSALAGE ? f2.id : null
    }
  };

  gameState.diplomacy.treaties.push(treaty);

  return {
    success: true,
    treaty,
    newRelation,
    message: `${normType.replace(/_/g, ' ')} ratified between ${f1.name} and ${f2.name}.`
  };
}

// ============================================================================
// 5. TREATY LIFECYCLE & VIOLATION PENALTIES
// ============================================================================

/**
 * Breaches a formal treaty, inflicting the Oathbreaker trait and severe global relation penalties.
 * @param {object} gameState
 * @param {string} treatyId
 * @param {string} [breakerFactionId]
 * @returns {object}
 */
export function breakTreaty(gameState, treatyId, breakerFactionId = null) {
  if (!gameState || !gameState.diplomacy || !gameState.diplomacy.treaties) {
    return { success: false, message: 'Invalid diplomacy state' };
  }

  const treaty = gameState.diplomacy.treaties.find(t => t.id === treatyId && t.isActive);
  if (!treaty) {
    return { success: false, message: 'Active treaty not found' };
  }

  const breakerId = breakerFactionId || treaty.proposerId || treaty.signatories?.[0] || gameState.playerFactionId;

  treaty.isActive = false;
  treaty.broken = true;
  treaty.brokenBy = breakerId;

  // Inflict Oathbreaker trait on ruler
  const breakerFaction = gameState.getFaction ? gameState.getFaction(breakerId) : gameState.factions[breakerId];
  if (breakerFaction && breakerFaction.rulerId && gameState.getCharacter) {
    const ruler = gameState.getCharacter(breakerFaction.rulerId);
    if (ruler && ruler.traits && !ruler.traits.includes('Oathbreaker')) {
      ruler.traits.push('Oathbreaker');
    }
  }

  // Global Diplomatic Penalty (-50 relation with all known factions)
  const penalty = -50;
  if (gameState.diplomacy.relations && gameState.diplomacy.relations[breakerId]) {
    for (const otherId of Object.keys(gameState.diplomacy.relations[breakerId])) {
      if (otherId !== breakerId) {
        const cur = gameState.diplomacy.relations[breakerId][otherId] || 0;
        const penalized = Math.max(-100, Math.min(100, cur + penalty));
        gameState.diplomacy.relations[breakerId][otherId] = penalized;
        if (gameState.diplomacy.relations[otherId]) {
          gameState.diplomacy.relations[otherId][breakerId] = penalized;
        }
      }
    }
  }

  return {
    success: true,
    treaty,
    message: `${breakerFaction ? breakerFaction.name : breakerId} has dishonored the pact! Marked as Oathbreaker with global -50 relation penalty.`
  };
}

/**
 * Ticks diplomacy progression each turn: decrements durations, cleans up expired pacts,
 * and processes vassal tribute payments.
 * @param {object} gameState
 */
export function tickDiplomacyTurn(gameState) {
  if (!gameState || !gameState.diplomacy || !gameState.diplomacy.treaties) return;

  for (const treaty of gameState.diplomacy.treaties) {
    if (!treaty.isActive) continue;

    // 1. Decrement Duration
    if (treaty.durationRemaining !== null && treaty.durationRemaining !== undefined) {
      treaty.durationRemaining -= 1;
      if (treaty.durationRemaining <= 0) {
        treaty.isActive = false;
        treaty.expired = true;
      }
    }

    // 2. Process Vassalage Tithes (20% gross tax revenue transferred to overlord)
    if (treaty.type === TREATY_TYPES.VASSALAGE && treaty.isActive) {
      const overlordId = treaty.effects?.overlordId || treaty.proposerId;
      const vassalId = treaty.effects?.vassalId || treaty.targetId;
      const overlord = gameState.getFaction ? gameState.getFaction(overlordId) : gameState.factions[overlordId];
      const vassal = gameState.getFaction ? gameState.getFaction(vassalId) : gameState.factions[vassalId];

      if (overlord && vassal) {
        const vassalProvinces = gameState.getFactionProvinces ? gameState.getFactionProvinces(vassalId) :
          Object.values(gameState.provinces || {}).filter(p => p.controllingFaction === vassalId);

        let grossTax = 0;
        for (const p of vassalProvinces) {
          if (!p.siegeStatus) {
            grossTax += p.baseTax || 200;
          }
        }

        const tribute = Math.round(grossTax * 0.20);
        if (tribute > 0) {
          vassal.treasury = Math.max(0, (vassal.treasury || 0) - tribute);
          overlord.treasury = (overlord.treasury || 0) + tribute;
        }
      }
    }
  }
}

// ============================================================================
// 6. AI DIPLOMATIC OPPORTUNITY GENERATOR
// ============================================================================

/**
 * Evaluates diplomatic opportunities for an AI faction during its turn.
 * Produces proposals for trade, non-aggression, peace, or alliance.
 * 
 * @param {object} gameState
 * @param {string} factionId
 * @returns {Array<object>} List of evaluated viable proposals
 */
export function generateAiDiplomaticOffers(gameState, factionId) {
  if (!gameState) return [];
  const faction = gameState.getFaction ? gameState.getFaction(factionId) : gameState.factions[factionId];
  if (!faction || faction.isAlive === false) return [];

  const proposals = [];
  const allFactions = Object.values(gameState.factions || {}).filter(f => f.id !== factionId && f.isAlive !== false);

  for (const target of allFactions) {
    const rel = gameState.diplomacy?.relations?.[factionId]?.[target.id] ?? 0;
    const activeTreaties = (gameState.diplomacy?.treaties || [])
      .filter(t => t.isActive && t.signatories && t.signatories.includes(factionId) && t.signatories.includes(target.id));

    const hasTrade = activeTreaties.some(t => t.type === TREATY_TYPES.TRADE_AGREEMENT);
    const hasNAP = activeTreaties.some(t => t.type === TREATY_TYPES.NON_AGGRESSION_PACT || t.type === TREATY_TYPES.MILITARY_ALLIANCE);

    // 1. Mercantile: Prioritize Trade Agreements
    if (faction.aiPersonality === AI_PERSONALITIES.MERCANTILE_OPPORTUNIST && !hasTrade && rel >= -10) {
      const evalResult = evaluateTreatyProposal({
        gameState,
        treatyType: TREATY_TYPES.TRADE_AGREEMENT,
        proposingFactionId: factionId,
        targetFactionId: target.id,
        currentRelation: rel
      });
      if (evalResult.accepted) {
        proposals.push({
          treatyType: TREATY_TYPES.TRADE_AGREEMENT,
          proposerId: factionId,
          targetId: target.id,
          sweetenerGold: 0,
          evaluation: evalResult
        });
      }
    }

    // 2. Losing War: Propose Peace with Sweetener
    if (rel <= -50) {
      const ratio = calculateMilitaryPowerRatio(gameState, factionId, target.id);
      if (ratio < 0.6 && (faction.treasury || 0) > 300) {
        const sweetener = Math.min(300, Math.floor((faction.treasury || 0) * 0.25));
        const evalResult = evaluateTreatyProposal({
          gameState,
          treatyType: TREATY_TYPES.PEACE_TREATY,
          proposingFactionId: factionId,
          targetFactionId: target.id,
          sweetenerGold: sweetener,
          isAtWar: true
        });
        if (evalResult.accepted) {
          proposals.push({
            treatyType: TREATY_TYPES.PEACE_TREATY,
            proposerId: factionId,
            targetId: target.id,
            sweetenerGold: sweetener,
            evaluation: evalResult
          });
        }
      }
    }

    // 3. Defensive / Pacifier: Propose Non-Aggression Pact
    if ((faction.aiPersonality === AI_PERSONALITIES.DEFENSIVE_TRADITIONALIST ||
         faction.aiPersonality === AI_PERSONALITIES.DIPLOMATIC_PACIFIER) && !hasNAP && rel >= 10) {
      const evalResult = evaluateTreatyProposal({
        gameState,
        treatyType: TREATY_TYPES.NON_AGGRESSION_PACT,
        proposingFactionId: factionId,
        targetFactionId: target.id,
        currentRelation: rel
      });
      if (evalResult.accepted) {
        proposals.push({
          treatyType: TREATY_TYPES.NON_AGGRESSION_PACT,
          proposerId: factionId,
          targetId: target.id,
          sweetenerGold: 0,
          evaluation: evalResult
        });
      }
    }
  }

  return proposals;
}
