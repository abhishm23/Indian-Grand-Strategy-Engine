// tests/test_public_order_and_tech.js
// Milestone 4 Automated Test Suite: Public Order, Rebellions, Governor Attributes & Technology Accumulation

import { describe, test, assertEqual, assertTrue, assertFalse } from './testRunner.js';
import { GameState } from '../js/engine/gameState.js';
import { TECH_TREE } from '../js/data/techTree.js';

describe('Milestone 4 — Public Order Drift & Tax Policies (R4 AC)', () => {
  test('Setting tax to EXTORTIONATE decreases public order by at least 8 per turn', () => {
    const state = new GameState();
    state.initNewGame('FAC_VIJAYANAGARA');

    const prov = state.getProvince('PROV_VIJAYANAGARA');
    prov.publicOrder = 80;
    prov.governorId = null;

    // Simulate turn with EXTORTIONATE tax policy
    const policies = { [prov.id]: 'EXTORTIONATE' };
    const prevOrder = prov.publicOrder;
    state.processPublicOrderTurn(policies);

    const delta = prevOrder - prov.publicOrder;
    assertTrue(delta >= 8, `Expected public order drop >= 8, actual drop: ${delta}`);
  }, { tier: 2 });

  test('Setting tax to LOW increases public order by at least 2 per turn', () => {
    const state = new GameState();
    state.initNewGame('FAC_VIJAYANAGARA');

    const prov = state.getProvince('PROV_VIJAYANAGARA');
    prov.publicOrder = 50;
    prov.governorId = null;

    const policies = { [prov.id]: 'LOW' };
    const prevOrder = prov.publicOrder;
    state.processPublicOrderTurn(policies);

    const delta = prov.publicOrder - prevOrder;
    assertTrue(delta >= 2, `Expected public order increase >= 2, actual increase: ${delta}`);
  }, { tier: 2 });

  test('Province reaching 0 public order spawns an armed rebel army in that province', () => {
    const state = new GameState();
    state.initNewGame('FAC_VIJAYANAGARA');

    const prov = state.getProvince('PROV_KONKAN');
    prov.publicOrder = 5;
    prov.governorId = null;

    // Apply EXTORTIONATE tax to force public order to 0
    state.processPublicOrderTurn({ [prov.id]: 'EXTORTIONATE' });
    assertEqual(prov.publicOrder, 0, 'Public order reached 0');

    // Verify rebellion record created
    assertTrue(state.activeRebellions.length >= 1, 'Active rebellions recorded');
    const rebellion = state.activeRebellions.find(r => r.provinceId === 'PROV_KONKAN');
    assertTrue(rebellion !== undefined, 'Rebellion recorded for PROV_KONKAN');

    // Verify rebel army created in the province
    const rebelArmy = state.getArmy(rebellion.rebelArmyId);
    assertTrue(rebelArmy !== null, 'Rebel army exists in armies collection');
    assertEqual(rebelArmy.provinceId, 'PROV_KONKAN', 'Rebel army located in PROV_KONKAN');
    assertEqual(rebelArmy.factionId, 'FAC_REBEL', 'Rebel army faction is FAC_REBEL');
    assertTrue(rebelArmy.regiments.length >= 2, 'Rebel army has combat regiments');
  }, { tier: 2 });
});

describe('Milestone 4 — Governor Stat Multipliers on Tax & Public Order (R4 AC)', () => {
  test('High Governance governor produces measurably higher tax and public order than ungoverned province', () => {
    const state = new GameState();
    state.initNewGame('FAC_DELHI');

    // CHAR_MALIK_MAQBUL has Governance: 10
    const maqbulTax = state.calculateGovernorTaxModifier('CHAR_MALIK_MAQBUL');
    const maqbulOrder = state.calculateGovernorPublicOrderModifier('CHAR_MALIK_MAQBUL');

    // Ungoverned baseline
    const nullTax = state.calculateGovernorTaxModifier(null);
    const nullOrder = state.calculateGovernorPublicOrderModifier(null);

    assertTrue(maqbulTax.taxMultiplier > nullTax.taxMultiplier, 'High Governance yields higher tax multiplier');
    assertTrue(maqbulOrder.totalOrderModifier > nullOrder.totalOrderModifier, 'High Governance yields higher public order modifier');
    assertTrue(maqbulOrder.totalOrderModifier >= 6, 'Governance 10 yields at least +6 order bonus');
  }, { tier: 2 });
});

describe('Milestone 4 — Technology Research Accumulation & Unlocks (R4 AC)', () => {
  test('Researching a technology accumulates progress and unlocks empire-wide upon completion', () => {
    const state = new GameState();
    state.initNewGame('FAC_VIJAYANAGARA');

    const factionId = 'FAC_VIJAYANAGARA';
    // Choose Tier 1 military technology: TECH_COMBINED_ARMS (researchCost: 100)
    const success = state.setResearch(factionId, 'TECH_COMBINED_ARMS');
    assertTrue(success, 'Successfully set active research to TECH_COMBINED_ARMS');

    const progress = state.techProgress[factionId];
    assertEqual(progress.activeTechId, 'TECH_COMBINED_ARMS', 'Active tech ID recorded');
    assertEqual(progress.remainingCost, 100, 'Initial remaining cost is 100');

    // Advance 1 turn (pointsPerTurn = 40)
    state.advanceTurn();
    assertEqual(progress.remainingCost, 60, 'Cost reduced by 40 RP (60 remaining)');
    assertFalse(progress.unlockedTechs.includes('TECH_COMBINED_ARMS'), 'Tech not yet unlocked after 1 turn');

    // Advance turn 2 (40 more RP, 20 remaining)
    state.advanceTurn();
    assertEqual(progress.remainingCost, 20, 'Cost reduced to 20 remaining');

    // Advance turn 3 (20 remaining fully paid)
    state.advanceTurn();
    assertTrue(progress.unlockedTechs.includes('TECH_COMBINED_ARMS'), 'TECH_COMBINED_ARMS unlocked upon completion');
    assertEqual(progress.activeTechId, null, 'Active research cleared after completion');
    assertTrue(state.technologies[factionId].unlocked.includes('TECH_COMBINED_ARMS'), 'Unlocked tech recorded in technologies container');

    // Verify a new technology can now be selected
    const nextSuccess = state.setResearch(factionId, 'TECH_ELEPHANT_ARMOR');
    assertTrue(nextSuccess, 'Able to select next technology for research');
    assertEqual(state.techProgress[factionId].activeTechId, 'TECH_ELEPHANT_ARMOR', 'Next tech successfully active');
  }, { tier: 2 });
});
