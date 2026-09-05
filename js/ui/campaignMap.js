/**
 * 14th-Century Indian Subcontinent Grand Strategy Game
 * Module: js/ui/campaignMap.js
 * 
 * Interactive 2D Campaign Map Canvas Component.
 * Implements 1200x900 geopolitical rendering, procedural Voronoi boundary
 * meshes, terrain biomes, topographic layers, army tokens, and pan/zoom controls.
 */

import { areProvincesAdjacent } from '../data/provinces.js';

export class CampaignMap {
  /**
   * @param {HTMLCanvasElement} [canvasElement] - Canvas rendering target
   * @param {GameState} gameState - Authoritative game state reference
   * @param {Function} [onProvinceSelected] - Callback(province) on province selection
   * @param {Function} [onArmySelected] - Callback(army) on army selection
   */
  constructor(canvasElement, gameState, onProvinceSelected = null, onArmySelected = null) {
    this.canvas = canvasElement || null;
    this.ctx = (canvasElement && typeof canvasElement.getContext === 'function')
      ? canvasElement.getContext('2d')
      : null;
    this.gameState = gameState;
    this.onProvinceSelected = onProvinceSelected;
    this.onArmySelected = onArmySelected;
    this.onMoveCommand = null; // Callback(armyId, targetProvinceId)

    // World Space Constraints
    this.worldWidth = 1200;
    this.worldHeight = 900;

    // Viewport & Transform State
    this.zoom = 1.0;
    this.minZoom = 0.5;
    this.maxZoom = 3.0;
    this.offsetX = 0;
    this.offsetY = 0;

    // Selection & Highlighting
    this.selectedProvinceId = null;
    this.selectedArmyId = null;
    this.hoveredProvinceId = null;
    this.hoveredArmyId = null;
    this.hoveredResourceId = null;
    this.highlightedProvinces = new Map(); // provinceId -> hexColor

    // Interaction & Drag Tracking
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.hasDragged = false;
    this.mouseWorldPos = { x: 600, y: 450 };

    // Procedural Geometry Cache
    this.provincePolygons = new Map(); // id -> { x, y }[]
    this.provincePaths = new Map();    // id -> Path2D (if available)

    // Animation Timing & Layering
    this.pulsePhase = 0;
    this.animFrameId = null;
    this.activeLayer = 'political'; // 'political' | 'terrain' | 'resources'

    // Bound Event Handlers (for clean removal in destroy)
    this._boundOnMouseDown = this._handleMouseDown.bind(this);
    this._boundOnMouseMove = this._handleMouseMove.bind(this);
    this._boundOnMouseUp = this._handleMouseUp.bind(this);
    this._boundOnWheel = this._handleWheel.bind(this);
    this._boundOnContextMenu = this._handleContextMenu.bind(this);
    this._boundOnKeyDown = this._handleKeyDown.bind(this);

    // Bootstrap Geometry & Events
    this._initBoundaryMesh();
    if (this.canvas) {
      this._bindEvents();
      this.resetView();
    }
  }

  // =========================================================================
  // 1. Procedural Boundary Mesh Generation (Sutherland-Hodgman Voronoi)
  // =========================================================================

  _initBoundaryMesh() {
    const MAINLAND_HULL = [
      { x: 60, y: 70 }, { x: 200, y: 40 }, { x: 350, y: 50 }, { x: 500, y: 80 },
      { x: 700, y: 110 }, { x: 920, y: 200 }, { x: 1040, y: 230 }, { x: 1100, y: 380 },
      { x: 1100, y: 580 }, { x: 1000, y: 600 }, { x: 920, y: 530 }, { x: 860, y: 470 },
      { x: 740, y: 520 }, { x: 650, y: 640 }, { x: 540, y: 750 }, { x: 480, y: 860 },
      { x: 440, y: 890 }, { x: 330, y: 870 }, { x: 290, y: 740 }, { x: 220, y: 550 },
      { x: 140, y: 430 }, { x: 50, y: 320 }, { x: 50, y: 180 }
    ];

    const SRI_LANKA_HULL = [
      { x: 470, y: 835 }, { x: 530, y: 840 }, { x: 555, y: 885 },
      { x: 535, y: 925 }, { x: 495, y: 920 }, { x: 465, y: 875 }
    ];

    const provinces = this.gameState && this.gameState.provinces
      ? Object.values(this.gameState.provinces)
      : [];

    for (const prov of provinces) {
      const isSL = (prov.id === 'PROV_JAFFNA' || prov.id === 'PROV_GAMPOLA');
      let poly = isSL ? [...SRI_LANKA_HULL] : [...MAINLAND_HULL];
      const peers = provinces.filter(p => isSL
        ? (p.id === 'PROV_JAFFNA' || p.id === 'PROV_GAMPOLA')
        : (p.id !== 'PROV_JAFFNA' && p.id !== 'PROV_GAMPOLA')
      );

      for (const other of peers) {
        if (other.id === prov.id) continue;
        const bisector = this._getBisector(prov.canvasCoords, other.canvasCoords);
        poly = this._clipPolygon(poly, bisector.p1, bisector.p2);
      }

      this.provincePolygons.set(prov.id, poly);

      // Build cached Path2D if running in browser
      if (typeof Path2D !== 'undefined') {
        const path = new Path2D();
        if (poly.length > 0) {
          path.moveTo(poly[0].x, poly[0].y);
          for (let i = 1; i < poly.length; i++) {
            path.lineTo(poly[i].x, poly[i].y);
          }
          path.closePath();
        }
        this.provincePaths.set(prov.id, path);
      }
    }
  }

  _getBisector(a, b) {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return {
      p1: { x: midX, y: midY },
      p2: { x: midX - dy, y: midY + dx }
    };
  }

  _clipPolygon(polygon, p1, p2) {
    const clipped = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i];
      const b = polygon[(i + 1) % polygon.length];
      const isAInside = (p2.x - p1.x) * (a.y - p1.y) - (p2.y - p1.y) * (a.x - p1.x) >= 0;
      const isBInside = (p2.x - p1.x) * (b.y - p1.y) - (p2.y - p1.y) * (b.x - p1.x) >= 0;

      if (isAInside) clipped.push(a);
      if (isAInside !== isBInside) {
        const det = (p2.x - p1.x) * (b.y - a.y) - (p2.y - p1.y) * (b.x - a.x);
        if (Math.abs(det) > 1e-6) {
          const t = ((a.x - p1.x) * (b.y - a.y) - (a.y - p1.y) * (b.x - a.x)) / det;
          clipped.push({
            x: Math.round((p1.x + t * (p2.x - p1.x)) * 10) / 10,
            y: Math.round((p1.y + t * (p2.y - p1.y)) * 10) / 10
          });
        }
      }
    }
    return clipped;
  }

  // =========================================================================
  // 2. Viewport & Coordinate Transforms
  // =========================================================================

  setViewport(x, y, zoom) {
    if (zoom !== undefined) {
      this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }
    if (x !== undefined && y !== undefined && this.canvas) {
      this.offsetX = (this.canvas.width / 2) - (x * this.zoom);
      this.offsetY = (this.canvas.height / 2) - (y * this.zoom);
    }
    this._clampViewport();
    this.render();
  }

  resetView() {
    if (!this.canvas) return;
    const scaleX = (this.canvas.width - 40) / this.worldWidth;
    const scaleY = (this.canvas.height - 40) / this.worldHeight;
    const fitZoom = Math.max(this.minZoom, Math.min(scaleX, scaleY));
    this.setViewport(this.worldWidth / 2, this.worldHeight / 2, fitZoom);
  }

  screenToWorld(screenX, screenY) {
    if (!this.canvas) return { x: screenX, y: screenY };
    if (typeof this.canvas.getBoundingClientRect !== 'function') {
      return {
        x: (screenX - this.offsetX) / this.zoom,
        y: (screenY - this.offsetY) / this.zoom
      };
    }
    const rect = this.canvas.getBoundingClientRect();
    const cssScaleX = this.canvas.width / (rect.width || 1);
    const cssScaleY = this.canvas.height / (rect.height || 1);
    const canvasX = (screenX - rect.left) * cssScaleX;
    const canvasY = (screenY - rect.top) * cssScaleY;
    return {
      x: (canvasX - this.offsetX) / this.zoom,
      y: (canvasY - this.offsetY) / this.zoom
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.offsetX,
      y: worldY * this.zoom + this.offsetY
    };
  }

  _clampViewport() {
    if (!this.canvas) return;
    const margin = 200 * this.zoom;
    const minOffsetX = this.canvas.width - (this.worldWidth * this.zoom) - margin;
    const maxOffsetX = margin;
    const minOffsetY = this.canvas.height - (this.worldHeight * this.zoom) - margin;
    const maxOffsetY = margin;

    this.offsetX = Math.min(maxOffsetX, Math.max(minOffsetX, this.offsetX));
    this.offsetY = Math.min(maxOffsetY, Math.max(minOffsetY, this.offsetY));
  }

  // =========================================================================
  // 3. Selection & Highlighting Public API
  // =========================================================================

  highlightProvince(provinceId, color) {
    if (!color) {
      this.highlightedProvinces.delete(provinceId);
    } else {
      this.highlightedProvinces.set(provinceId, color);
    }
    this.render();
  }

  selectProvince(provinceId) {
    this.selectedProvinceId = provinceId;
    this.selectedArmyId = null;
    const prov = this.gameState ? this.gameState.getProvince(provinceId) : null;
    if (this.onProvinceSelected) this.onProvinceSelected(prov);
    this.render();
  }

  selectArmy(armyId) {
    this.selectedArmyId = armyId;
    this.selectedProvinceId = null;
    const army = this.gameState ? this.gameState.getArmy(armyId) : null;
    if (this.onArmySelected) this.onArmySelected(army);
    this.render();
  }

  clearSelection() {
    this.selectedProvinceId = null;
    this.selectedArmyId = null;
    if (this.onProvinceSelected) this.onProvinceSelected(null);
    if (this.onArmySelected) this.onArmySelected(null);
    this.render();
  }

  setMoveCommandCallback(callback) {
    this.onMoveCommand = callback;
  }

  setLayer(layerName) {
    this.activeLayer = layerName;
    this.render();
  }

  // =========================================================================
  // 4. Layered Rendering Pipeline
  // =========================================================================

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;

    this.pulsePhase = (Date.now() / 400) % (Math.PI * 2);

    // 1. Clear Screen & Draw Ocean Background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0e17'; // Deep nautical slate navy
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // 2. Apply World Space Camera Transform
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoom, this.zoom);

    // 3. Draw Nautical Portolan Rhumb Lines & Latitude Grid
    this._drawNauticalGrid(ctx);

    // 4. Render Province Base Terrains
    this._renderProvinceTerrains(ctx);

    // 5. Render Faction Political Tints & Highlighting
    this._renderFactionTints(ctx);

    // 6. Render Province Borders (Internal & International)
    this._renderProvinceBorders(ctx);

    // 7. Render Military & Trade Adjacency Roads
    this._renderRoadsAndSeaLanes(ctx);

    // 8. Render Provincial Fortresses, Cities & Resource Badges
    this._renderCapitalsAndResources(ctx);

    // 9. Render Army Tokens & Selection Rings
    this.drawArmyTokens();

    // 10. Render Hover Tooltip
    this._renderHoverTooltip(ctx);

    ctx.restore();
  }

  // =========================================================================
  // 5. Subsystem Renderers
  // =========================================================================

  _drawNauticalGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.worldWidth; x += 150) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.worldHeight; y += 150) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderProvinceTerrains(ctx) {
    const TERRAIN_BASE_COLORS = {
      MOUNTAIN_PASS: '#2B3544',
      FLOODPLAIN: '#1E381E',
      JUNGLE: '#064E3B',
      ARID_PLATEAU: '#78350F',
      COASTAL_PORT: '#0C4A6E',
      HIGHLAND_HILLS: '#573A16',
      DESERT_WASTELAND: '#854D0E',
      RIVER_DELTA: '#134E4A'
    };

    for (const [id, poly] of this.provincePolygons.entries()) {
      const prov = this.gameState.getProvince(id);
      if (!prov || poly.length < 3) continue;

      ctx.save();
      const path = this.provincePaths.get(id);

      // Base terrain fill
      ctx.fillStyle = TERRAIN_BASE_COLORS[prov.terrainType] || '#334155';
      if (path && typeof ctx.fill === 'function') {
        try { ctx.fill(path); } catch (_) { this._fillPolygon(ctx, poly); }
      } else {
        this._fillPolygon(ctx, poly);
      }

      // Distinct Terrain Glyph Vectors
      this._drawTerrainGlyphs(ctx, prov, poly);

      ctx.restore();
    }
  }

  _drawTerrainGlyphs(ctx, prov, poly) {
    const c = prov.canvasCoords;
    if (!c) return;
    ctx.save();
    switch (prov.terrainType) {
      case 'MOUNTAIN_PASS':
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.strokeStyle = '#64748B';
        ctx.lineWidth = 1.2;
        [-18, 0, 18].forEach((ox, i) => {
          const oy = (i % 2 === 0) ? -8 : 6;
          ctx.beginPath();
          ctx.moveTo(c.x + ox, c.y + oy + 10);
          ctx.lineTo(c.x + ox + 6, c.y + oy);
          ctx.lineTo(c.x + ox + 12, c.y + oy + 10);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        });
        break;

      case 'FLOODPLAIN':
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x - 25, c.y - 10);
        ctx.bezierCurveTo(c.x - 10, c.y - 18, c.x + 10, c.y - 2, c.x + 25, c.y - 12);
        ctx.stroke();
        break;

      case 'JUNGLE':
        ctx.fillStyle = 'rgba(16, 185, 129, 0.65)';
        [-14, 0, 14].forEach((ox, i) => {
          ctx.beginPath();
          ctx.arc(c.x + ox, c.y - 14 + (i % 2) * 6, 5, 0, Math.PI * 2);
          ctx.fill();
        });
        break;

      case 'HIGHLAND_HILLS':
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.6)';
        ctx.lineWidth = 1.5;
        [-16, 8].forEach(ox => {
          ctx.beginPath();
          ctx.arc(c.x + ox, c.y - 8, 8, Math.PI, 0);
          ctx.stroke();
        });
        break;

      case 'COASTAL_PORT':
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.2;
        [-15, 5].forEach((ox, i) => {
          ctx.beginPath();
          ctx.arc(c.x + ox, c.y - 14 + i * 4, 6, 0.2, Math.PI - 0.2);
          ctx.stroke();
        });
        break;

      case 'DESERT_WASTELAND':
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x - 20, c.y - 10);
        ctx.quadraticCurveTo(c.x, c.y - 18, c.x + 20, c.y - 8);
        ctx.stroke();
        break;

      case 'RIVER_DELTA':
        ctx.strokeStyle = 'rgba(45, 212, 191, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(c.x - 15, c.y - 18);
        ctx.lineTo(c.x, c.y - 10);
        ctx.lineTo(c.x - 8, c.y);
        ctx.moveTo(c.x, c.y - 10);
        ctx.lineTo(c.x + 12, c.y - 2);
        ctx.stroke();
        break;

      case 'ARID_PLATEAU':
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(c.x - 18, c.y - 14, 20, 6);
        break;
    }
    ctx.restore();
  }

  _renderFactionTints(ctx) {
    for (const [id, poly] of this.provincePolygons.entries()) {
      const prov = this.gameState.getProvince(id);
      if (!prov || poly.length < 3) continue;

      const faction = this.gameState.getFaction(prov.controllingFaction);
      const isSelected = (this.selectedProvinceId === id);
      const isHovered = (this.hoveredProvinceId === id);
      const customColor = this.highlightedProvinces.get(id);

      ctx.save();
      const path = this.provincePaths.get(id);

      // Faction Primary Color Tint
      ctx.fillStyle = customColor || (faction ? faction.primaryColor : '#475569');
      ctx.globalAlpha = isSelected ? 0.52 : (isHovered ? 0.44 : 0.32);

      if (path && typeof ctx.fill === 'function') {
        try { ctx.fill(path); } catch (_) { this._fillPolygon(ctx, poly); }
      } else {
        this._fillPolygon(ctx, poly);
      }

      ctx.restore();
    }
  }

  _renderProvinceBorders(ctx) {
    for (const [id, poly] of this.provincePolygons.entries()) {
      const prov = this.gameState.getProvince(id);
      if (!prov || poly.length < 3) continue;

      const faction = this.gameState.getFaction(prov.controllingFaction);
      const isSelected = (this.selectedProvinceId === id);
      const isHovered = (this.hoveredProvinceId === id);
      const customColor = this.highlightedProvinces.get(id);
      const path = this.provincePaths.get(id);

      ctx.save();

      if (isSelected) {
        // Selected Radiant Pulse
        const glow = 8 + Math.sin(this.pulsePhase) * 6;
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = glow;
        if (path && typeof ctx.stroke === 'function') {
          try { ctx.stroke(path); } catch (_) { this._strokePolygon(ctx, poly); }
        } else {
          this._strokePolygon(ctx, poly);
        }
      } else if (isHovered) {
        // Hover Highlight
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 6;
        if (path && typeof ctx.stroke === 'function') {
          try { ctx.stroke(path); } catch (_) { this._strokePolygon(ctx, poly); }
        } else {
          this._strokePolygon(ctx, poly);
        }
      } else if (customColor) {
        // Custom Script Highlight
        ctx.strokeStyle = customColor;
        ctx.lineWidth = 2.5;
        if (path && typeof ctx.stroke === 'function') {
          try { ctx.stroke(path); } catch (_) { this._strokePolygon(ctx, poly); }
        } else {
          this._strokePolygon(ctx, poly);
        }
      } else {
        // Standard Geopolitical Outer Border
        ctx.strokeStyle = faction ? faction.primaryColor : 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2.0;
        if (path && typeof ctx.stroke === 'function') {
          try { ctx.stroke(path); } catch (_) { this._strokePolygon(ctx, poly); }
        } else {
          this._strokePolygon(ctx, poly);
        }
      }

      ctx.restore();
    }
  }

  _renderRoadsAndSeaLanes(ctx) {
    const provinces = Object.values(this.gameState.provinces || {});
    const drawnEdges = new Set();

    ctx.save();

    for (const p of provinces) {
      const c1 = p.canvasCoords;
      if (!c1) continue;

      // 1. Overland Roads
      for (const nId of (p.connections || [])) {
        const key = [p.id, nId].sort().join('--');
        if (drawnEdges.has(key)) continue;
        drawnEdges.add(key);

        const neighbor = this.gameState.getProvince(nId);
        if (!neighbor || !neighbor.canvasCoords) continue;

        const c2 = neighbor.canvasCoords;
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
        ctx.lineWidth = 2.0;
        if (typeof ctx.setLineDash === 'function') {
          ctx.setLineDash([5, 5]);
        }

        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();
      }

      // 2. Maritime Sea Lanes
      for (const nId of (p.navalConnections || [])) {
        const key = [p.id, nId].sort().join('--naval');
        if (drawnEdges.has(key)) continue;
        drawnEdges.add(key);

        const neighbor = this.gameState.getProvince(nId);
        if (!neighbor || !neighbor.canvasCoords) continue;

        const c2 = neighbor.canvasCoords;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.70)';
        ctx.lineWidth = 2.2;
        if (typeof ctx.setLineDash === 'function') {
          ctx.setLineDash([3, 6]);
        }

        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y);
        ctx.lineTo(c2.x, c2.y);
        ctx.stroke();

        // Anchor glyph at midpoint
        const midX = (c1.x + c2.x) / 2;
        const midY = (c1.y + c2.y) / 2;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚓', midX, midY + 4);
      }
    }

    if (typeof ctx.setLineDash === 'function') {
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  _renderCapitalsAndResources(ctx) {
    const RESOURCE_ICONS = {
      HORSES: '🐎',
      IRON: '⚔️',
      TEXTILES: '🧶',
      SPICES: '🌿',
      PRECIOUS_STONES: '💎',
      WAR_ELEPHANTS: '🐘',
      TIMBER: '🌲',
      SALT: '🧂'
    };

    for (const prov of Object.values(this.gameState.provinces || {})) {
      const c = prov.canvasCoords;
      if (!c) continue;
      const faction = this.gameState.getFaction(prov.controllingFaction);

      ctx.save();

      // 1. Capital Fortress Icon (scaled by defenseLevel)
      const defLevel = prov.defenseLevel || 1;
      const fortRadius = 10 + defLevel * 3;

      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = faction ? faction.secondaryColor : '#D4AF37';
      ctx.lineWidth = 2.0;

      ctx.beginPath();
      ctx.arc(c.x, c.y, fortRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Fortress Crenellations / Emblem
      ctx.fillStyle = faction ? faction.primaryColor : '#475569';
      ctx.beginPath();
      ctx.arc(c.x, c.y, fortRadius - 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Flag / Bastion glyph
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${10 + defLevel * 2}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(defLevel >= 3 ? '🏰' : '🛡️', c.x, c.y);

      // 2. City Name Label Badge
      const cityName = prov.capitalCity || prov.name;
      ctx.font = '600 11px Outfit, sans-serif';
      const textMetrics = (typeof ctx.measureText === 'function')
        ? ctx.measureText(cityName)
        : { width: cityName.length * 6 };
      const badgeW = textMetrics.width + 12;
      const badgeH = 16;
      const badgeY = c.y + fortRadius + 4;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      this._fillRoundRect(ctx, c.x - badgeW / 2, badgeY, badgeW, badgeH, 3);
      this._strokeRoundRect(ctx, c.x - badgeW / 2, badgeY, badgeW, badgeH, 3);

      ctx.fillStyle = '#F8FAFC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cityName, c.x, badgeY + badgeH / 2);

      // 3. Strategic Resource Badge
      const resIcon = RESOURCE_ICONS[prov.strategicResource];
      if (resIcon) {
        const resX = c.x + 22;
        const resY = c.y - 14;

        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(resX, resY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(resIcon, resX, resY);
      }

      ctx.restore();
    }
  }

  // =========================================================================
  // 6. Army Token Rendering (drawArmyTokens)
  // =========================================================================

  drawArmyTokens(armiesList = null) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const armies = armiesList || Object.values(this.gameState.armies || {});

    // Group armies by province to stagger overlapping stacks
    const provinceArmyMap = new Map();
    for (const army of armies) {
      if (!provinceArmyMap.has(army.provinceId)) {
        provinceArmyMap.set(army.provinceId, []);
      }
      provinceArmyMap.get(army.provinceId).push(army);
    }

    for (const [provId, provArmies] of provinceArmyMap.entries()) {
      const prov = this.gameState.getProvince(provId);
      if (!prov || !prov.canvasCoords) continue;
      const c = prov.canvasCoords;
      const count = provArmies.length;

      provArmies.forEach((army, idx) => {
        // Calculate offset if multiple armies present
        let armyX = c.x + 18;
        let armyY = c.y + 14;

        if (count > 1) {
          const angle = (idx / count) * Math.PI * 2 - Math.PI / 2;
          armyX = c.x + Math.cos(angle) * 26;
          armyY = c.y + Math.sin(angle) * 26;
        }

        const faction = this.gameState.getFaction(army.factionId);
        const isSelected = (this.selectedArmyId === army.id);
        const isHovered = (this.hoveredArmyId === army.id);

        ctx.save();

        // 1. Selection Pulsing Ring
        if (isSelected) {
          const ringRadius = 20 + Math.sin(this.pulsePhase) * 2;
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2.5;
          if (typeof ctx.setLineDash === 'function') {
            ctx.setLineDash([4, 4]);
          }
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.arc(armyX, armyY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          if (typeof ctx.setLineDash === 'function') {
            ctx.setLineDash([]);
          }

          // Directional Reachable Destination Arrows
          this._drawMovementRangeIndicators(ctx, prov, army);
        }

        // 2. Faction Heraldic Shield
        ctx.fillStyle = faction ? faction.primaryColor : '#B91C1C';
        ctx.strokeStyle = faction ? faction.secondaryColor : '#D4AF37';
        ctx.lineWidth = 2.0;

        this._drawKiteShield(ctx, armyX, armyY, 24, 30);
        ctx.fill();
        ctx.stroke();

        // 3. Commander Crest / General Star
        if (army.generalId) {
          const general = this.gameState.getCharacter(army.generalId);
          ctx.fillStyle = '#FFD700';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⭐', armyX, armyY - 18);

          if (general && isSelected) {
            ctx.font = '600 10px Outfit, sans-serif';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(general.name, armyX, armyY - 28);
          }
        }

        // 4. Regiment Count Badge (Gold Pill at Bottom Right)
        const regCount = (army.regiments || []).length;
        ctx.fillStyle = '#0F172A';
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 1;
        this._fillRoundRect(ctx, armyX + 2, armyY + 4, 14, 12, 3);
        this._strokeRoundRect(ctx, armyX + 2, armyY + 4, 14, 12, 3);

        ctx.fillStyle = '#F8FAFC';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(regCount), armyX + 9, armyY + 10);

        // 5. Attrition / Stance Badges
        if (army.supplyState === 'OUT_OF_SUPPLY' || army.unsuppliedTurns > 0) {
          ctx.fillText('💀', armyX - 10, armyY - 8);
        }
        if (army.isBesieging) {
          ctx.fillText('🔥', armyX - 10, armyY + 12);
        }

        ctx.restore();
      });
    }
  }

  _drawKiteShield(ctx, x, y, width, height) {
    const halfW = width / 2;
    const topH = height * 0.4;
    ctx.beginPath();
    ctx.moveTo(x - halfW, y - height / 2);
    ctx.lineTo(x + halfW, y - height / 2);
    ctx.lineTo(x + halfW, y - height / 2 + topH);
    ctx.quadraticCurveTo(x + halfW, y + height / 2 - 4, x, y + height / 2);
    ctx.quadraticCurveTo(x - halfW, y + height / 2 - 4, x - halfW, y - height / 2 + topH);
    ctx.closePath();
  }

  _drawMovementRangeIndicators(ctx, currentProv, army) {
    for (const neighborId of (currentProv.connections || [])) {
      const neighbor = this.gameState.getProvince(neighborId);
      if (!neighbor || !neighbor.canvasCoords) continue;

      const nCoords = neighbor.canvasCoords;
      ctx.save();
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.75)';
      ctx.lineWidth = 2.5;
      if (typeof ctx.setLineDash === 'function') {
        ctx.setLineDash([4, 4]);
      }

      ctx.beginPath();
      ctx.moveTo(currentProv.canvasCoords.x, currentProv.canvasCoords.y);
      ctx.lineTo(nCoords.x, nCoords.y);
      ctx.stroke();

      // Waypoint Circle on target
      ctx.fillStyle = 'rgba(34, 197, 94, 0.3)';
      ctx.beginPath();
      ctx.arc(nCoords.x, nCoords.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  _renderHoverTooltip(ctx) {
    if (!this.hoveredProvinceId && !this.hoveredArmyId) return;

    let title = '';
    let sub = '';
    let stats = [];

    if (this.hoveredArmyId) {
      const army = this.gameState.getArmy(this.hoveredArmyId);
      if (army) {
        title = army.name;
        const faction = this.gameState.getFaction(army.factionId);
        sub = faction ? faction.name : army.factionId;
        const gen = army.generalId ? this.gameState.getCharacter(army.generalId) : null;
        stats.push(`Commander: ${gen ? gen.name : 'Garrison Captain'}`);
        stats.push(`Regiments: ${(army.regiments || []).length}`);
        stats.push(`Movement: ${army.movementPoints}/${army.maxMovementPoints}`);
      }
    } else if (this.hoveredProvinceId) {
      const prov = this.gameState.getProvince(this.hoveredProvinceId);
      if (prov) {
        title = prov.name;
        const faction = this.gameState.getFaction(prov.controllingFaction);
        sub = `${prov.capitalCity} (${faction ? faction.name : 'Independent'})`;
        stats.push(`Terrain: ${(prov.terrainType || '').replace('_', ' ')}`);
        stats.push(`Resource: ${prov.strategicResource || 'None'}`);
        stats.push(`Tax: +${prov.baseTax} gold | Public Order: ${prov.publicOrder}/100`);
      }
    }

    if (!title) return;

    // Draw Tooltip Card at Mouse World Position
    const tx = this.mouseWorldPos.x + 14;
    const ty = this.mouseWorldPos.y + 14;
    const boxW = 220;
    const boxH = 26 + stats.length * 16;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;

    this._fillRoundRect(ctx, tx, ty, boxW, boxH, 6);
    this._strokeRoundRect(ctx, tx, ty, boxW, boxH, 6);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(title, tx + 10, ty + 16);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText(sub, tx + 10, ty + 28);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px sans-serif';
    stats.forEach((line, i) => {
      ctx.fillText(line, tx + 10, ty + 44 + i * 16);
    });

    ctx.restore();
  }

  // =========================================================================
  // 7. Hit Detection & Event Handlers
  // =========================================================================

  _bindEvents() {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousedown', this._boundOnMouseDown);
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this._boundOnMouseMove);
      window.addEventListener('mouseup', this._boundOnMouseUp);
      window.addEventListener('keydown', this._boundOnKeyDown);
    }
    this.canvas.addEventListener('wheel', this._boundOnWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this._boundOnContextMenu);
  }

  destroy() {
    if (this.canvas) {
      this.canvas.removeEventListener('mousedown', this._boundOnMouseDown);
      this.canvas.removeEventListener('wheel', this._boundOnWheel);
      this.canvas.removeEventListener('contextmenu', this._boundOnContextMenu);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', this._boundOnMouseMove);
      window.removeEventListener('mouseup', this._boundOnMouseUp);
      window.removeEventListener('keydown', this._boundOnKeyDown);
    }
    if (this.animFrameId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  _handleMouseDown(e) {
    if (e.button === 0 || e.button === 1) {
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
    }
  }

  _handleMouseMove(e) {
    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    this.mouseWorldPos = worldPos;

    if (this.isDragging) {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      if (Math.hypot(dx, dy) > 4) {
        this.hasDragged = true;
        this.offsetX += dx;
        this.offsetY += dy;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this._clampViewport();
        this.render();
      }
      return;
    }

    // Hover Hit Test
    const hit = this._performHitTest(worldPos);
    let dirty = false;

    const newHoverArmy = (hit.type === 'ARMY') ? hit.entity.id : null;
    const newHoverProv = (hit.type === 'PROVINCE') ? hit.entity.id : null;

    if (newHoverArmy !== this.hoveredArmyId || newHoverProv !== this.hoveredProvinceId) {
      this.hoveredArmyId = newHoverArmy;
      this.hoveredProvinceId = newHoverProv;
      dirty = true;
      if (this.canvas && this.canvas.style) {
        this.canvas.style.cursor = (hit.type !== 'NONE') ? 'pointer' : 'default';
      }
    }

    if (dirty) this.render();
  }

  _handleMouseUp(e) {
    if (e.button !== 0 && e.button !== 1) return;
    const wasDragging = this.hasDragged;
    this.isDragging = false;
    this.hasDragged = false;

    if (wasDragging) return; // Ignore click if drag occurred

    // Clean Left Click
    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    const hit = this._performHitTest(worldPos);

    if (hit.type === 'ARMY') {
      this.selectArmy(hit.entity.id);
    } else if (hit.type === 'PROVINCE') {
      this.selectProvince(hit.entity.id);
    } else {
      this.clearSelection();
    }
  }

  _handleContextMenu(e) {
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!this.selectedArmyId) return;

    const worldPos = this.screenToWorld(e.clientX, e.clientY);
    const hit = this._performHitTest(worldPos);

    if (hit.type === 'PROVINCE') {
      const targetProv = hit.entity;
      const army = this.gameState.getArmy(this.selectedArmyId);

      if (army && areProvincesAdjacent(army.provinceId, targetProv.id)) {
        if (this.onMoveCommand) {
          this.onMoveCommand(army.id, targetProv.id);
        } else {
          // Default movement dispatch in GameState if method available
          if (typeof this.gameState.moveArmy === 'function') {
            this.gameState.moveArmy(army.id, targetProv.id);
          } else {
            // Direct state update fallback
            army.provinceId = targetProv.id;
            army.movementPoints = Math.max(0, (army.movementPoints || 100) - 50);
          }
        }
        this.render();
      }
    }
  }

  _handleWheel(e) {
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!this.canvas) return;

    let mouseX = this.canvas.width / 2;
    let mouseY = this.canvas.height / 2;
    if (typeof this.canvas.getBoundingClientRect === 'function') {
      const rect = this.canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    }

    const zoomFactor = (e.deltaY < 0) ? 1.15 : (1 / 1.15);
    const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * zoomFactor));

    if (newZoom !== this.zoom) {
      this.offsetX = mouseX - (mouseX - this.offsetX) * (newZoom / this.zoom);
      this.offsetY = mouseY - (mouseY - this.offsetY) * (newZoom / this.zoom);
      this.zoom = newZoom;
      this._clampViewport();
      this.render();
    }
  }

  _handleKeyDown(e) {
    let moved = false;
    const panStep = 50 / this.zoom;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.offsetX += panStep;
        moved = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.offsetX -= panStep;
        moved = true;
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.offsetY += panStep;
        moved = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.offsetY -= panStep;
        moved = true;
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.setViewport(undefined, undefined, this.zoom * 1.2);
        return;
      case 'Minus':
      case 'NumpadSubtract':
        this.setViewport(undefined, undefined, this.zoom / 1.2);
        return;
      case 'Home':
      case 'KeyR':
        this.resetView();
        return;
    }

    if (moved) {
      this._clampViewport();
      this.render();
    }
  }

  _performHitTest(worldPos) {
    // 1. Check Army Tokens (Threshold 20px)
    const armies = Object.values(this.gameState ? (this.gameState.armies || {}) : {});
    for (const army of armies) {
      const prov = this.gameState.getProvince(army.provinceId);
      if (!prov || !prov.canvasCoords) continue;
      const d = Math.hypot(worldPos.x - (prov.canvasCoords.x + 18), worldPos.y - (prov.canvasCoords.y + 14));
      if (d <= 20) {
        return { type: 'ARMY', entity: army };
      }
    }

    // 2. Check Province Capitals (Threshold 16px)
    for (const prov of Object.values(this.gameState ? (this.gameState.provinces || {}) : {})) {
      if (!prov.canvasCoords) continue;
      const d = Math.hypot(worldPos.x - prov.canvasCoords.x, worldPos.y - prov.canvasCoords.y);
      if (d <= 16) {
        return { type: 'PROVINCE', entity: prov };
      }
    }

    // 3. Check Province Voronoi Polygon Cells
    for (const [provId, poly] of this.provincePolygons.entries()) {
      if (this._pointInPoly(worldPos, poly)) {
        return { type: 'PROVINCE', entity: this.gameState.getProvince(provId) };
      }
    }

    return { type: 'NONE' };
  }

  _pointInPoly(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > p.y) !== (yj > p.y)) &&
        (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // =========================================================================
  // 8. Geometry Helper Utilities
  // =========================================================================

  _fillPolygon(ctx, poly) {
    if (poly.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.fill();
  }

  _strokePolygon(ctx, poly) {
    if (poly.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.stroke();
  }

  _fillRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.fill();
  }

  _strokeRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
    ctx.stroke();
  }
}
