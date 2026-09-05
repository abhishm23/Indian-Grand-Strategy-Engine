# E2E Test Infra: 14th-Century Indian Subcontinent Grand Strategy Game

## Test Philosophy
- Requirement-driven, opaque-box and headless automated testing.
- Self-contained execution without external runtime dependencies (pure Node.js ESM).
- Multi-tier validation: Unit & Math (Tier 1), Boundaries & Extreme states (Tier 2), Cross-Feature Combinations (Tier 3), Real-World Campaign Workloads (Tier 4), Adversarial Stress (Tier 5).

## Feature Inventory Mapping
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | Auto-Resolve Win Probability & Odds | R2 / AC | 5 | 5 | ✓ | ✓ |
| 2 | Auto-Resolve Proportional Casualties | R2 / AC | 5 | 5 | ✓ | ✓ |
| 3 | Encounter Modal Integration | R2 / AC | 5 | 5 | ✓ | ✓ |
| 4 | Tactical Grid & Deployment Zones | R1 / AC | 5 | 5 | ✓ | ✓ |
| 5 | Tactical Unit Movement & Action Points | R1 / AC | 5 | 5 | ✓ | ✓ |
| 6 | Rock-Paper-Scissors Unit Counters | R1 / AC | 5 | 5 | ✓ | ✓ |
| 7 | Terrain Elevation & Forest Modifiers | R1 / AC | 5 | 5 | ✓ | ✓ |
| 8 | Directional Flanking & Rear Attacks | R1 / AC | 5 | 5 | ✓ | ✓ |
| 9 | Morale Degradation & Rout Behavior | R1 / AC | 5 | 5 | ✓ | ✓ |
| 10 | General Leadership Aura | R1 / AC | 5 | 5 | ✓ | ✓ |
| 11 | Battle End & Campaign State Feedback | R1 / AC | 5 | 5 | ✓ | ✓ |
| 12 | AI Strategic Army Movement | R3 / AC | 5 | 5 | ✓ | ✓ |
| 13 | AI Recruitment & Building Construction | R3 / AC | 5 | 5 | ✓ | ✓ |
| 14 | AI Treaty Evaluation (4+ Treaties) | R3 / AC | 5 | 5 | ✓ | ✓ |
| 15 | Public Order Drift (Taxes, Garrisons) | R4 / AC | 5 | 5 | ✓ | ✓ |
| 16 | Governor Governance Bonuses | R4 / AC | 5 | 5 | ✓ | ✓ |
| 17 | Armed Rebellion Spawning at 0 Order | R4 / AC | 5 | 5 | ✓ | ✓ |
| 18 | Technology Accumulation & Buffs | R4 / AC | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test Runner: `node tests/testRunner.js` (aliased to `npm test`)
- Headless Environment: Mock DOM / Canvas context where necessary for UI integration tests
- Test Suites:
  - `tests/test_data_models.js`: Provinces, factions, characters, units, buildings, tech, religions.
  - `tests/test_character_stats.js`: General combat bonuses, governor tax/order modifiers, minister diplomacy.
  - `tests/test_turn_engine.js`: Turn advancement, economic revenue, building queues.
  - `tests/test_combat_math.js`: Tactical directional combat, terrain modifiers, morale degradation.
  - `tests/test_diplomacy_ai.js`: Bilateral relations, treaty acceptance formula.
  - `tests/test_serialization.js`: Save/load deterministic round-trip.
  - `tests/test_e2e_suite.js`: Full multi-turn campaign lifecycle.
  - `tests/test_m1_modules.js` & `tests/test_m2_canvas_hud.js`: DOM & canvas validation.
  - `tests/test_autoresolve_integration.js`: Statistical probability distribution and state mutation tests.
  - `tests/test_tactical_engine.js`: 2D battlefield mechanics, routing, auras, and state feedback.
  - `tests/test_ai_turn.js`: AI movement, construction, and recruitment behavior across personalities.
  - `tests/test_public_order_tech.js`: Tax order drift, rebellions, and technology unlocking.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|---|---|---|
| 1 | Full Auto-Resolve Border Conflict | Auto-resolve, casualties, province transfer | Attacking army conquers hostile province; casualties applied to both armies |
| 2 | Tactical Battle with Flank & Rout | Grid tactical engine, flanking, morale, rout | Flank attack breaks enemy morale, enemy routs, battle victory transfers |
| 3 | Extortionate Tax Rebellion | Taxes, public order drift, rebel spawn | Province reaches 0 order after extortionate taxation, rebel army spawns |
| 4 | Diplomatic Treaty Negotiation | Diplomacy AI, treaty evaluation, relations | High relations + gold sweetener accepts Non-Aggression pact |
| 5 | Multi-Turn Tech Research & Empire Buff | Turn pipeline, tech points, empire multipliers | Technology completes over turns, applying empire-wide buffs |

## Coverage Thresholds
- Tier 1 (Feature Coverage): >=5 tests per feature (>=90 tests)
- Tier 2 (Boundaries & Corners): >=5 tests per feature (>=90 tests)
- Tier 3 (Cross-Feature Combinations): >=18 combination tests
- Tier 4 (Real-World Scenarios): >=5 comprehensive scenario suites
- Total target test count: >=200 tests, 100% passing
