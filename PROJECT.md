# Project: 14th-Century Indian Subcontinent Grand Strategy Game

## Architecture
Dual-layer grand strategy architecture:
1. **Campaign Layer**:
   - `GameState`: Central state container holding provinces, factions, historical characters, armies, diplomacy matrix, technologies, and turn pipeline.
   - `CampaignMap`: HTML5 Canvas (1200x900) rendering historical provinces, borders, terrain features, and army tokens.
   - `CampaignHud`: Dom panels for province management, recruitment, building construction, economics, and diplomacy.
   - `CampaignAI`: Turn-based decision routines for non-player factions (economy, recruitment, building upgrades, strategic army movement).
   - `DiplomacyAI`: Treaty evaluation (Trade, Non-Aggression, Peace, Alliance, Vassalage) based on relations, military strength, and personalities.
2. **Combat Layer**:
   - `CombatResolver`: Fast, calculated auto-resolve applying sigmoid win probability, terrain modifiers, general command bonuses, and proportional casualty distribution.
   - `TacticalEngine`: Instanced 2D turn-based tactical battlefield on `#tacticalCanvas` (1000x700, 20x14 tile grid). Manages regiments, directional facing (Front, Flank, Rear), terrain elevation and cover, morale degradation, rout behavior, and general leadership aura.
   - `TacticalView`: Canvas rendering and HUD synchronization for tactical battles, reporting outcomes (casualties, regiment survival, province conquest) back to `GameState`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---|---|---|---|
| 1 | Auto-Resolve Win Probability | Dynamic calculation of attacker/defender power ratio via sigmoid curve displayed in encounter modal | M1 | R2 |
| 2 | Auto-Resolve State Mutation | Proportional casualty application to both armies, dead regiment cleanup, and province ownership transfer | M1 | R2 |
| 3 | Encounter Modal Integration | Connect battle modal to combatResolver and tactical view triggers | M1 | R2 |
| 4 | Tactical Grid & Deployment | 20x14 square tile grid (50px tiles) on 1000x700 canvas with West/East deployment zones | M2 | R1 |
| 5 | Tactical Unit Movement & Attacks | Turn-based action points, movement ranges, and attack commands for all 6 unit classes | M2 | R1 |
| 6 | Rock-Paper-Scissors Counters | Counter-matrix from units.js (Elephants, Cavalry, Horse Archers, Rajput Levies, Paiks, Siege Engines) | M2 | R1 |
| 7 | Terrain & Elevation Modifiers | High ground downhill (+25% damage), forest cover (+25% to 50% defense), river chokepoints | M2 | R1 |
| 8 | Directional Flanking & Rear | Flank attacks (>=40% bonus damage, morale shock), rear charges (100% bonus damage, armor bypass) | M2 | R1 |
| 9 | Morale & Rout System | Morale loss from casualties and flanking; units rout when morale <= 20% | M2 | R1 |
| 10 | General Leadership Aura | Command-based aura radius granting morale boosts and panic resistance | M2 | R1 |
| 11 | Battle Results Campaign Feedback | Casualties, regiment destruction, and province control transferred back to campaign layer | M2 | R1 |
| 12 | AI Strategic Army Movement | AI armies marching toward strategic targets based on personality (e.g. EXPANSIONIST vs DEFENSIVE) | M3 | R3 |
| 13 | AI Recruitment & Construction | AI provinces building upgrades and recruiting regiments based on personality weights and treasury | M3 | R3 |
| 14 | AI Diplomatic Treaties | Proposing and evaluating >=4 treaty types (Peace, Non-Aggression, Trade, Alliance) based on relations | M3 | R3 |
| 15 | Public Order Drift | Dynamic order change from tax rates (EXTORTIONATE -8 to -10, LOW +2 to +3), garrisons, and religion | M4 | R4 |
| 16 | Governor Governance Bonuses | Higher tax income and public order stability applied when high-Governance characters are assigned | M4 | R4 |
| 17 | Armed Rebellion Spawning | Province reaching 0 public order spawns armed rebel faction and halts provincial tax income | M4 | R4 |
| 18 | Technology Accumulation & Buffs | Turn-based research points accumulation toward active tech, unlocking permanent empire-wide buffs | M4 | R4 |
| 19 | Headless Regression Testing | 152+ existing tests pass without regression | M5 | AC |
| 20 | New Mechanics Automated Tests | Dedicated test suites for tactical math, auto-resolve distribution, AI turn, public order, and tech | M5 | AC |
| 21 | Full Browser E2E Sequence | Complete browser gameplay sequence without unhandled runtime exceptions | M5 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Auto-Resolve Combat Integration | Wire combatResolver.js to encounter modal, dynamic odds, proportional casualties, army/province state mutation | none | DONE |
| M2 | Tactical Battlefield Engine & Renderer | Instanced 2D tactical battlefield on #tacticalCanvas (1000x700), grid, movement/attack, terrain, flanking, morale/rout, general aura, campaign feedback | M1 | DONE |
| M3 | AI Faction Turn Processing & Diplomacy | Campaign AI module for army movement, recruitment, construction, and 4-treaty diplomacy evaluation | none | PLANNED |
| M4 | Public Order, Rebellions, Governor & Tech | Full advanceTurn() pipeline: tax drift (EXTORTIONATE -8, LOW +2), governor bonuses, 0 order armed rebellion, tech accumulation & buffs | none | PLANNED |
| M5 | E2E Testing & Final Hardening | Run 152+ baseline tests, new test suites, browser automated gameplay sequence, adversarial hardening, and forensic audit | M1, M2, M3, M4 | PLANNED |

## Interface Contracts

### CombatResolver ↔ Main / Encounter Modal
- `calculateWinProbability(attackerArmy, defenderArmy, province, attackerGeneral, defenderGeneral)`
  - Returns `{ attackerWinProb: number, defenderWinProb: number, ratio: number, attackerPower: number, defenderPower: number }`
- `autoResolveBattle(attackerArmy, defenderArmy, province, attackerGeneral, defenderGeneral)`
  - Mutates or returns `{ winner: 'attacker'|'defender', attackerLosses: {...}, defenderLosses: {...}, casualties: {...}, conquered: boolean }`

### TacticalEngine ↔ GameState & Main
- Constructor/Init: `TacticalBattlefield(config)`
  - `config`: `{ canvas: HTMLCanvasElement, attackerArmy, defenderArmy, province, attackerGeneral, defenderGeneral, onBattleEnd: (result) => void }`
- `result`: `{ winner: 'attacker'|'defender', attackerSurvivingRegiments: Regiment[], defenderSurvivingRegiments: Regiment[], casualties: {...}, provinceConquered: boolean }`
- Directional Combat Math:
  - Front (0°–45°): 1.0x damage
  - Flank (46°–135°): 1.4x damage (+40%), -20 morale shock
  - Rear (136°–180°): 2.0x damage (+100%), -40 morale shock, 100% armor bypass
- Terrain Modifiers:
  - Elevation: +25% attack per elevation level downhill, +1 missile range
  - Forest Cover: 50% missile protection, eliminates cavalry charge bonus
  - River Chokepoints: 50% movement penalty, defense penalty
- Morale:
  - Base morale from unit class + general bonus
  - Losses reduce morale proportionally
  - Morale <= 20% triggers ROUT (unit uncontrollable, flees toward edge)
- General Aura:
  - Radius: `Math.max(2, Math.floor(command / 2) + 1)`
  - Units within aura gain +morale and chain panic immunity

### CampaignAI ↔ GameState
- `processAiTurn(gameState)`:
  - Iterates over all non-player, non-rebel factions
  - Manages treasury, collects taxes, pays upkeep
  - Upgrades buildings according to personality weights
  - Recruits units in provinces with barracks up to force limit
  - Evaluates border threats and moves armies toward target provinces or defends borders

### DiplomacyAI ↔ GameState
- `evaluateTreatyOffer(gameState, fromFactionId, toFactionId, treatyType, goldSweetener)`:
  - Supports: `'PEACE_TREATY'`, `'NON_AGGRESSION_PACT'`, `'TRADE_AGREEMENT'`, `'MILITARY_ALLIANCE'`, `'VASSALAGE'`
  - Calculates acceptance score based on bilateral relation (-100 to +100), military strength ratio, personality biases, and gold sweetener (+0.05 per gold)
  - Score >= 50: ACCEPT, Score < 50: REJECT

### TurnPipeline (GameState.advanceTurn)
- Input: none (operates on `this`)
- Steps:
  1. Increment `currentTurn`, update `year`
  2. Building construction progress (`remainingTurns -= 1`, activate completed)
  3. Technology research progress (accumulate RP toward `activeTechId`, unlock tech, apply empire buffs)
  4. Public order drift calculation per province:
     - Tax rate: `EXTORTIONATE` (-10), `HIGH` (-4), `NORMAL` (0), `LOW` (+3)
     - Garrison: +2 per regiment (up to +8)
     - Governor bonus: `calculateGovernorPublicOrderModifier(governorId)`
     - Religious tolerance modifier
  5. Check rebellions: if `province.publicOrder === 0` and no existing rebel siege, spawn `FAC_REBEL` army, set `province.siegeStatus = true`
  6. Tax collection: unbesieged provinces generate income factoring governor tax modifier and buildings
  7. AI turn execution: invoke `CampaignAI`
  8. Reset army movement points
- Returns `currentTurn`

## Code Layout
- `js/data/`: Static historical configuration (`provinces.js`, `factions.js`, `characters.js`, `units.js`, `buildings.js`, `techTree.js`, `religions.js`)
- `js/engine/`:
  - `gameState.js`: Central campaign state container and turn pipeline
  - `combatResolver.js`: Auto-resolve combat calculations
  - `tacticalEngine.js`: Tactical grid, movement, directional combat, morale, AI regiments
  - `campaignAi.js`: AI faction turn logic (recruitment, construction, strategic movement)
  - `diplomacyAi.js`: Treaty proposal and evaluation logic
- `js/ui/`:
  - `campaignMap.js`: Campaign map canvas renderer
  - `campaignHud.js`: Campaign UI panels and modal wiring
  - `tacticalView.js`: Tactical canvas renderer (grid, units, auras, combat animations, inspector)
- `js/main.js`: GameApp master coordinator integrating all views and state transitions
- `tests/`: Headless test suites (`testRunner.js`, `test_combat_math.js`, `test_ai_turn.js`, `test_public_order.js`, `test_tech_research.js`, `test_tactical_engine.js`, `test_e2e_suite.js`)
