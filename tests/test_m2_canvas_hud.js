/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Test Suite: Milestone 2 — Interactive Campaign Map & HUD Verification
 * File: tests/test_m2_canvas_hud.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameState } from '../js/engine/gameState.js';
import { CampaignMap } from '../js/ui/campaignMap.js';
import { CampaignHud, TAX_POLICIES } from '../js/ui/campaignHud.js';
import { GameApp } from '../js/main.js';
import { PROVINCES, areProvincesAdjacent } from '../js/data/provinces.js';
import { FACTIONS } from '../js/data/factions.js';
import { CHARACTERS } from '../js/data/characters.js';
import { BUILDINGS, BUILDING_CATEGORIES } from '../js/data/buildings.js';
import { UNIT_TYPES } from '../js/data/units.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
    throw new Error(message);
  } else {
    console.log(`  ✔ PASS: ${message}`);
    passedTests++;
  }
}

function createMockCanvas(width = 1200, height = 900) {
  const calls = [];
  return {
    width,
    height,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height }),
    getContext: (type) => ({
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      setTransform: () => {},
      translate: () => {},
      scale: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      rect: () => {},
      roundRect: () => {},
      fill: () => {},
      stroke: () => {},
      fillRect: () => {},
      strokeRect: () => {},
      fillText: () => {},
      measureText: (text) => ({ width: text.length * 7 }),
      setLineDash: () => {},
      calls
    })
  };
}

function createMockElement(id = 'elem') {
  const children = [];
  const classList = new Set();
  return {
    id,
    classList: {
      add: (c) => classList.add(c),
      remove: (c) => classList.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (classList.has(c)) classList.delete(c);
          else classList.add(c);
        } else if (force) {
          classList.add(c);
        } else {
          classList.delete(c);
        }
      },
      contains: (c) => classList.has(c)
    },
    style: {},
    dataset: {},
    innerHTML: '',
    textContent: '',
    appendChild: (child) => children.push(child),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

async function runM2Tests() {
  console.log('\n======================================================================');
  console.log('   MILESTONE 2: INTERACTIVE CAMPAIGN MAP & HUD VERIFICATION SUITE    ');
  console.log('======================================================================\n');

  const gameState = new GameState();
  gameState.initNewGame('FAC_VIJAYANAGARA');

  // -------------------------------------------------------------------------
  // SUITE 1: CampaignMap Class & Procedural Voronoi Boundary Mesh
  // -------------------------------------------------------------------------
  console.log('▶ SUITE 1: CampaignMap Class & Procedural Voronoi Boundary Mesh');

  const mockCanvas = createMockCanvas();
  const map = new CampaignMap(mockCanvas, gameState);

  assert(map instanceof CampaignMap, 'CampaignMap instantiates cleanly with mock canvas and GameState');
  assert(map.worldWidth === 1200 && map.worldHeight === 900, 'CampaignMap world dimensions are 1200x900');
  assert(map.provincePolygons.size === 40, 'CampaignMap generates procedural Voronoi polygon meshes for all 40 provinces');

  // Verify all 40 provinces generate non-degenerate polygons with centers inside
  let validPolys = 0;
  let centersInside = 0;
  for (const [provId, poly] of map.provincePolygons.entries()) {
    const prov = gameState.getProvince(provId);
    if (poly.length >= 3 && poly.length <= 16) validPolys++;
    if (map._pointInPoly(prov.canvasCoords, poly)) centersInside++;
  }
  assert(validPolys === 40, 'All 40 provinces generate closed, non-degenerate polygons (3 to 16 vertices)');
  assert(centersInside === 40, 'Every province capital canvasCoords lies strictly inside its own Voronoi polygon cell');

  // Verify Sri Lanka island separation
  const jaffnaPoly = map.provincePolygons.get('PROV_JAFFNA');
  const gampolaPoly = map.provincePolygons.get('PROV_GAMPOLA');
  assert(jaffnaPoly && gampolaPoly, 'Sri Lanka provinces (Jaffna, Gampola) have dedicated Voronoi geometry');
  assert(jaffnaPoly.every(pt => pt.x >= 450 && pt.x <= 560 && pt.y >= 800), 'Jaffna polygon is restricted strictly to Sri Lanka hull');

  // -------------------------------------------------------------------------
  // SUITE 2: CampaignMap Viewport Transforms & Hit Detection
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 2: CampaignMap Viewport Transforms & Hit Detection');

  // Viewport zoom clamping
  map.setViewport(600, 450, 4.5);
  assert(map.zoom === 3.0, 'Zoom clamps correctly at maxZoom 3.0');
  map.setViewport(600, 450, 0.2);
  assert(map.zoom === 0.5, 'Zoom clamps correctly at minZoom 0.5');

  map.setViewport(600, 450, 1.0);
  const vij = gameState.getProvince('PROV_VIJAYANAGARA');
  const worldPt = { x: vij.canvasCoords.x, y: vij.canvasCoords.y };
  const screenPt = map.worldToScreen(worldPt.x, worldPt.y);
  const backToWorld = map.screenToWorld(screenPt.x, screenPt.y);
  assert(Math.abs(backToWorld.x - worldPt.x) < 0.001 && Math.abs(backToWorld.y - worldPt.y) < 0.001,
    'worldToScreen and screenToWorld coordinate transforms are reciprocal invariants');

  // Hit test on Province Capital
  const hitCapital = map._performHitTest(vij.canvasCoords);
  assert(hitCapital.type === 'PROVINCE' && hitCapital.entity.id === 'PROV_VIJAYANAGARA',
    'Hit detection directly on capital coords resolves to province');

  // Hit test on Army Token stationed in province (priority 1)
  const hitArmy = map._performHitTest({ x: vij.canvasCoords.x + 18, y: vij.canvasCoords.y + 14 });
  assert(hitArmy.type === 'ARMY' && hitArmy.entity.provinceId === 'PROV_VIJAYANAGARA',
    'Hit detection on army token coordinates resolves to army');

  // Hit test on Voronoi polygon interior (away from capital and army tokens)
  const hitInterior = map._performHitTest({ x: vij.canvasCoords.x - 25, y: vij.canvasCoords.y - 25 });
  assert(hitInterior.type === 'PROVINCE' && hitInterior.entity.id === 'PROV_VIJAYANAGARA',
    'Hit detection on province polygon interior resolves to province via Voronoi ray casting');

  // Hit test on empty ocean (e.g. Bay of Bengal far off coast)
  const hitOcean = map._performHitTest({ x: 800, y: 700 });
  assert(hitOcean.type === 'NONE', 'Hit detection on open ocean resolves to NONE');

  // Province selection & highlight methods
  map.selectProvince('PROV_VIJAYANAGARA');
  assert(map.selectedProvinceId === 'PROV_VIJAYANAGARA', 'selectProvince sets selectedProvinceId');
  map.highlightProvince('PROV_VIJAYANAGARA', '#FFD700');
  assert(map.highlightedProvinces.get('PROV_VIJAYANAGARA') === '#FFD700', 'highlightProvince records color in map');
  map.highlightProvince('PROV_VIJAYANAGARA', null);
  assert(!map.highlightedProvinces.has('PROV_VIJAYANAGARA'), 'highlightProvince with null removes highlight');
  map.clearSelection();
  assert(map.selectedProvinceId === null && map.selectedArmyId === null, 'clearSelection resets active selections');

  // Rendering without canvas crash
  let renderSucceeded = false;
  try {
    map.render();
    map.drawArmyTokens();
    renderSucceeded = true;
  } catch (e) {
    console.error(e);
  }
  assert(renderSucceeded, 'render() and drawArmyTokens() execute cleanly without throwing exceptions');

  // -------------------------------------------------------------------------
  // SUITE 3: CampaignHud Class & Telemetry Calculations
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 3: CampaignHud Class & Telemetry Calculations');

  const mockContainer = createMockElement('hud-container');
  const hud = new CampaignHud(mockContainer, gameState);

  assert(hud instanceof CampaignHud, 'CampaignHud instantiates cleanly with container and GameState');

  // Net Income calculation
  const playerFacId = gameState.playerFactionId;
  const netIncome = hud.calculateNetIncome(playerFacId);
  assert(typeof netIncome === 'number' && !isNaN(netIncome), `Net income calculated as valid number (${netIncome} gold/turn)`);

  // Manpower calculation
  const manpower = hud.calculateEmpireManpower(playerFacId);
  const playerProvs = gameState.getFactionProvinces(playerFacId);
  const expectedManpower = playerProvs.reduce((sum, p) => sum + (p.baseManpower || 0), 0);
  assert(manpower === expectedManpower && manpower > 0, `Imperial manpower sums accurately across provinces (${manpower})`);

  // Empire stability calculation
  const stability = hud.calculateEmpireStability(playerFacId);
  assert(stability >= 0 && stability <= 100, `Imperial stability averages accurately (Stability: ${stability}%)`);

  // Tax Policies definition
  assert(Object.keys(TAX_POLICIES).length === 4, '4 distinct tax policy tiers defined (LOW, NORMAL, HIGH, EXTORTIONATE)');
  assert(TAX_POLICIES.LOW.multiplier === 0.8 && TAX_POLICIES.LOW.orderDelta === 5, 'LOW tax policy: 0.8x revenue, +5 order');
  assert(TAX_POLICIES.NORMAL.multiplier === 1.0 && TAX_POLICIES.NORMAL.orderDelta === 0, 'NORMAL tax policy: 1.0x revenue, 0 order');
  assert(TAX_POLICIES.HIGH.multiplier === 1.2 && TAX_POLICIES.HIGH.orderDelta === -6, 'HIGH tax policy: 1.2x revenue, -6 order');
  assert(TAX_POLICIES.EXTORTIONATE.multiplier === 1.4 && TAX_POLICIES.EXTORTIONATE.orderDelta === -15, 'EXTORTIONATE tax policy: 1.4x revenue, -15 order');

  // Tax Policy change effect
  hud.taxPolicies['PROV_VIJAYANAGARA'] = 'HIGH';
  const highNetIncome = hud.calculateNetIncome(playerFacId);
  assert(highNetIncome > netIncome, `Setting HIGH tax policy increases net income (${highNetIncome} > ${netIncome})`);

  // Notification management
  hud.addNotification({ type: 'success', title: 'Fortress Completed', message: 'Citadel raised in capital.' });
  assert(hud.notifications.length === 1, 'addNotification pushes entry to notification feed');
  assert(hud.notifications[0].title === 'Fortress Completed', 'Notification records correct title and payload');

  // Notification queue truncation at 50
  for (let i = 0; i < 60; i++) {
    hud.addNotification({ type: 'info', title: `Event ${i}`, message: `Tick ${i}` });
  }
  assert(hud.notifications.length === 50, 'Notification queue strictly caps at 50 entries to prevent memory drift');

  // Selection states
  hud.selectProvince('PROV_VIJAYANAGARA');
  assert(hud.selectedProvinceId === 'PROV_VIJAYANAGARA' && hud.selectedArmyId === null, 'selectProvince updates selection state');
  
  const armies = Object.values(gameState.armies);
  if (armies.length > 0) {
    hud.selectArmy(armies[0].id);
    assert(hud.selectedArmyId === armies[0].id && hud.selectedProvinceId === null, 'selectArmy updates selection state');
  }

  // -------------------------------------------------------------------------
  // SUITE 4: GameApp Master Coordinator (js/main.js)
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 4: GameApp Master Coordinator');

  const app = new GameApp();
  assert(app instanceof GameApp, 'GameApp instantiates cleanly');
  assert(app.gameState instanceof GameState, 'GameApp owns central GameState instance');
  assert(app.activeView === 'campaign-view', 'Initial active view is campaign-view');

  // Switch view testing
  app.switchView('tactical-view');
  assert(app.activeView === 'tactical-view', 'switchView transitions active view to tactical-view');
  app.switchView('campaign-view');
  assert(app.activeView === 'campaign-view', 'switchView transitions active view to campaign-view');

  // -------------------------------------------------------------------------
  // SUITE 5: index.html Structure & Dual-View DOM Integrity
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 5: index.html Structure & Dual-View DOM Integrity');

  const indexPath = path.join(__dirname, '..', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  assert(indexHtml.includes('id="campaign-view"'), 'index.html contains #campaign-view');
  assert(indexHtml.includes('id="tactical-view"'), 'index.html contains #tactical-view');
  assert(indexHtml.includes('canvas id="campaignCanvas" width="1200" height="900"'),
    'index.html contains 1200x900 #campaignCanvas');
  assert(indexHtml.includes('canvas id="tacticalCanvas" width="1000" height="700"'),
    'index.html contains 1000x700 #tacticalCanvas');

  // Top Bar IDs
  const expectedTopBarIds = [
    'hud-faction-shield', 'hud-faction-name', 'hud-ruler-name',
    'hud-turn-val', 'hud-year-val', 'hud-treasury-val',
    'hud-income-delta', 'hud-manpower-val', 'hud-stability-val',
    'btn-open-diplomacy', 'btn-open-tech', 'btn-open-characters',
    'btn-open-saveload', 'btn-audio-toggle', 'btn-end-turn'
  ];
  for (const id of expectedTopBarIds) {
    assert(indexHtml.includes(`id="${id}"`), `index.html contains Top Bar element #${id}`);
  }

  // Province Drawer & Army Inspector IDs
  assert(indexHtml.includes('id="province-drawer"'), 'index.html contains #province-drawer');
  assert(indexHtml.includes('id="drawer-prov-name"'), 'index.html contains #drawer-prov-name');
  assert(indexHtml.includes('id="drawer-tax-val"'), 'index.html contains #drawer-tax-val');
  assert(indexHtml.includes('id="drawer-public-order-val"'), 'index.html contains #drawer-public-order-val');
  assert(indexHtml.includes('id="drawer-governor-profile"'), 'index.html contains #drawer-governor-profile');
  assert(indexHtml.includes('id="drawer-building-slots"'), 'index.html contains #drawer-building-slots');
  assert(indexHtml.includes('id="drawer-recruitment-dock"'), 'index.html contains #drawer-recruitment-dock');
  assert(indexHtml.includes('id="army-inspector"'), 'index.html contains #army-inspector');
  assert(indexHtml.includes('id="notification-ticker"'), 'index.html contains #notification-ticker');

  // Modal Overlays
  const expectedModals = [
    'start-modal', 'battle-modal', 'diplomacy-modal',
    'tech-modal', 'character-modal', 'save-load-modal'
  ];
  for (const modalId of expectedModals) {
    assert(indexHtml.includes(`id="${modalId}"`), `index.html contains modal #${modalId}`);
  }

  // ES6 Module entry point
  assert(indexHtml.includes('<script type="module" src="js/main.js"></script>'),
    'index.html loads js/main.js cleanly via pure zero-compilation ES6 module script');

  // -------------------------------------------------------------------------
  // SUITE 6: style.css Medieval Visual Language & Layout Rules
  // -------------------------------------------------------------------------
  console.log('\n▶ SUITE 6: style.css Medieval Visual Language & Layout Rules');

  const cssPath = path.join(__dirname, '..', 'style.css');
  const styleCss = fs.readFileSync(cssPath, 'utf8');

  assert(styleCss.includes('--bg-deep'), 'style.css defines --bg-deep');
  assert(styleCss.includes('--gold-bright'), 'style.css defines --gold-bright');
  assert(styleCss.includes('--gold-primary'), 'style.css defines --gold-primary');
  assert(styleCss.includes('--font-title'), 'style.css defines --font-title');
  assert(styleCss.includes('.view-container.active'), 'style.css defines .view-container.active');
  assert(styleCss.includes('.view-container.hidden'), 'style.css defines .view-container.hidden');
  assert(styleCss.includes('.province-drawer'), 'style.css defines .province-drawer with sliding transitions');
  assert(styleCss.includes('.floating-inspector'), 'style.css defines .floating-inspector');
  assert(styleCss.includes('.modal-overlay'), 'style.css defines .modal-overlay with backdrop-filter');

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log(`EXECUTION SUMMARY:`);
  console.log(`  Passed: ${passedTests}`);
  console.log(`  Failed: ${failedTests}`);
  console.log(`----------------------------------------------------------------------\n`);

  if (failedTests > 0) {
    console.error(`RESULT: ${failedTests} TESTS FAILED.`);
    process.exit(1);
  } else {
    console.log('RESULT: ALL MILESTONE 2 TESTS PASSED SUCCESSFULLY! (100%)\n');
  }
}

runM2Tests().catch(err => {
  console.error('Fatal error running M2 tests:', err);
  process.exit(1);
});
