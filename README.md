# 14th-Century Indian Subcontinent Grand Strategy Game ⚔️👑

> **A deep, historical grand strategy and tactical combat simulation engine modeling the geopolitical fractures and rise of empires in 14th-century India.**

---

## 🌟 Overview

Set during the pivotal 14th-century transformation of the Indian subcontinent (the twilight of the Delhi Sultanate expeditions into the Deccan, the fragmentation of regional dynasties, and the founding of the Vijayanagara Empire), this project implements a **dual-layer grand strategy architecture**:
1. A **Strategic Campaign Layer** handling territorial governance, diplomatic matrices, macro-economics, and AI decision-making.
2. A **Tactical Combat Layer** simulating turn-based regiment battlefields with directional facing, morale degradation, and terrain elevation.

```
+------------------------------------------------------------------------------------+
|                         GRAND STRATEGY DUAL-LAYER ENGINE                           |
+------------------------------------------------------------------------------------+
|                                                                                    |
|   [ CAMPAIGN LAYER ] (HTML5 Canvas 1200x900)                                       |
|    ├── GameState (Provinces, historical characters, treasury, technology)         |
|    ├── CampaignHud (Province building upgrades, tax rates, levy mobilization)      |
|    ├── DiplomacyAI (Trade treaties, non-aggression pacts, vassalage, coalitions)   |
|    └── CampaignAI (Turn-based strategic expansion and economic allocation)         |
|                                     │                                              |
|                           Engage Enemy Armies                                      |
|                                     ▼                                              |
|   [ TACTICAL COMBAT LAYER ] (Instanced Canvas 1000x700 / 20x14 Grid)               |
|    ├── TacticalEngine (Regiment collision, directional flank/rear penalties)       |
|    ├── Morale & Rout Resolver (Shock damage, general aura, cascade routing)        |
|    ├── Terrain Modifiers (Elevation bonuses, forest cover, river crossing debuffs) |
|    └── Auto-Resolve Engine (Fast sigmoid win-probability calculator)               |
|                                     │                                              |
|                           Battle Outcome Synced                                    |
|                                     ▼                                              |
|   [ Province Sovereignty, Captives, & Casualty Losses Applied to GameState ]       |
|                                                                                    |
+------------------------------------------------------------------------------------+
```

---

## ✨ Key Mechanics

### 1. The Strategic Campaign Map
- **Historical Provinces**: Detailed map covering North India, Gujarat, the Deccan plateau, and the Deep South.
- **Dynamic Diplomacy**: Comprehensive bilateral treaty matrix evaluated by `DiplomacyAI` considering relationship scores, relative military power, border friction, and ruler personalities.
- **Deep Economic Modeling**: Invest treasury reserves into agricultural irrigation, fortresses, merchant bazaars, and trade guilds to boost tax yield and manpower regeneration.

### 2. Tactical Battlefield Engine
- **Directional Facing**: Regiments maintain Front, Flank, and Rear orientations. Attacking from the flank or rear inflicts catastrophic shock damage and bypasses shield defense.
- **Morale & Cascading Routs**: Units do not fight to the last man. Sustained losses, leader casualties, or being surrounded causes panic, triggering routs that can demoralize neighboring allies.
- **Terrain Tactics**: Hilltops offer elevation firing bonuses to archers; heavy cavalry suffers severe penalties when charging into marshlands or crossing rivers.

---

## 🚀 Quickstart

### 1. Prerequisites
- Node.js 16+ (or any modern web browser)

### 2. Running the Game
Double-click `start_game.bat` or run:
```bash
node server.js
```
Open your browser to `http://localhost:3000` to begin your campaign.

---

## 🛠️ Open Source Credits & Acknowledgements

- **[HTML5 Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)** — High-performance 2D procedural rendering.
- **[Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)** — Local development server and asset hosting.

---

## 👥 Authors & Contributors

- **Author:** [Abhishek Mishra](https://github.com/abhishm23) — *Senior Analytics & GenAI Engineer*
- **Co-Developer / AI Pair Programmer:** [Google Antigravity](https://antigravity.google/)
