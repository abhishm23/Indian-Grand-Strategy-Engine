#!/usr/bin/env python3
"""
Build the geographic dataset for the 14th-Century Subcontinent campaign map.

Downloads Natural Earth vector data and terrarium elevation tiles, projects
everything into the 1200x900 game world, and emits:

  assets/relief-hillshade.png     shaded relief (RGBA, multiply-friendly)
  assets/relief-hypsometric.png   elevation tint (RGBA)
  js/data/geography.js            projected coastline, rivers, lakes, ranges
  js/data/province-polygons.js    province polygons clipped to the real coastline
  js/data/geo-anchors.js          authoritative province longitude / latitude

It also rewrites canvasCoords in js/data/provinces.js and
tests/fixtures/spec_oracle.js so the game and its tests share one projection.

Usage:  python tools/build_geodata.py
"""

import json
import math
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw
from shapely.geometry import (
    MultiPoint, Polygon, MultiPolygon, LineString, MultiLineString, Point, box, shape,
)
from shapely.ops import voronoi_diagram, unary_union, transform

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CACHE = os.path.join(HERE, "cache")
ASSETS = os.path.join(ROOT, "assets")
DATA = os.path.join(ROOT, "js", "data")
FIXTURES = os.path.join(ROOT, "tests", "fixtures")

NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson"
TILE_BASE = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium"

# ---------------------------------------------------------------------------
# Projection: equirectangular with standard parallel 21N, fitted to 1200x900
# ---------------------------------------------------------------------------

WORLD_W, WORLD_H = 1200.0, 900.0
LON_MIN, LON_MAX = 58.5, 103.6
LAT_MIN, LAT_MAX = 5.2, 36.8
LAT_REF = 21.0
COS_REF = math.cos(math.radians(LAT_REF))

S = WORLD_H / (LAT_MAX - LAT_MIN)                 # pixels per degree of latitude
SPAN_W = (LON_MAX - LON_MIN) * COS_REF * S        # land span in pixels
OFF_X = (WORLD_W - SPAN_W) / 2.0
OFF_Y = 0.0

# Ground size of one output pixel, in metres (square by construction)
M_PER_PX = (1.0 / S) * 111320.0

Z = 6                    # elevation tile zoom
TILE = 256


def project(lon, lat):
    """lon/lat -> game world pixel coordinates."""
    x = OFF_X + (lon - LON_MIN) * COS_REF * S
    y = OFF_Y + (LAT_MAX - lat) * S
    return (x, y)


def unproject(x, y):
    """game world pixel coordinates -> lon/lat."""
    lon = LON_MIN + (x - OFF_X) / (COS_REF * S)
    lat = LAT_MAX - (y - OFF_Y) / S
    return (lon, lat)


def in_bbox(lon, lat, pad=0.0):
    return (LON_MIN - pad) <= lon <= (LON_MAX + pad) and (LAT_MIN - pad) <= lat <= (LAT_MAX + pad)


# ---------------------------------------------------------------------------
# Authoritative province anchors (real longitude / latitude)
# ---------------------------------------------------------------------------

PROVINCE_ANCHORS = {
    "PROV_KABUL":          (69.2, 34.6),
    "PROV_KHYBER":         (71.8, 34.0),
    "PROV_GHAZNI":         (68.4, 32.3),
    "PROV_KANDAHAR":       (65.7, 31.6),
    "PROV_KASHMIR":        (74.8, 34.1),
    "PROV_LADAKH":         (77.6, 34.2),
    "PROV_GUGE":           (80.5, 32.5),
    "PROV_LHASA":          (91.1, 29.7),
    "PROV_PUNJAB":         (74.3, 31.5),
    "PROV_MULTAN":         (71.5, 30.2),
    "PROV_SINDH":          (68.8, 25.4),
    "PROV_DELHI":          (77.2, 28.6),
    "PROV_AWADH":          (80.9, 26.8),
    "PROV_JAUNPUR":        (82.9, 25.4),
    "PROV_BIHAR":          (85.3, 25.6),
    "PROV_BENGAL_NORTH":   (88.2, 24.9),
    "PROV_BENGAL_SOUTH":   (90.4, 23.6),
    "PROV_KAMRUPA":        (91.7, 26.2),
    "PROV_AHOM":           (94.5, 26.9),
    "PROV_ARAKAN":         (93.2, 20.6),
    "PROV_UPPER_BURMA":    (96.1, 21.9),
    "PROV_LOWER_BURMA":    (96.5, 17.3),
    "PROV_RAJPUTANA":      (73.7, 24.6),
    "PROV_GUJARAT":        (72.6, 22.3),
    "PROV_MALWA":          (76.0, 23.2),
    "PROV_BUNDELKHAND":    (79.2, 25.0),
    "PROV_KHANDESH":       (75.6, 21.0),
    "PROV_DAULATABAD":     (75.3, 19.9),
    "PROV_GULBARGA":       (76.8, 17.3),
    "PROV_WARANGAL":       (79.6, 18.0),
    "PROV_ORISSA":         (85.0, 20.3),
    "PROV_KONKAN":         (73.9, 15.5),
    "PROV_VIJAYANAGARA":   (76.5, 15.3),
    "PROV_ANDHRA":         (81.0, 16.5),
    "PROV_MYSORE":         (76.6, 12.9),
    "PROV_TONDAI":         (79.7, 12.5),
    "PROV_MALABAR":        (75.8, 10.5),
    "PROV_MADURAI":        (78.1, 9.5),
    "PROV_JAFFNA":         (80.0, 9.7),
    "PROV_GAMPOLA":        (80.6, 7.2),
}

# Filled in by build_provinces() when a coastal anchor lands just outside its
# clipped polygon; the anchor is nudged to a point guaranteed to be on land.
ADJUSTED_ANCHORS = {}

# Named physiographic regions we want to label on the map
RANGE_KEYWORDS = [
    "himalaya", "karakoram", "hindu kush", "western ghats", "eastern ghats",
    "vindhya", "aravalli", "satpura", "deccan", "thar", "nilgiri",
    "chota nagpur", "indo-gangetic", "tibetan plateau", "pamir",
    "baluchistan", "shan plateau", "chin hills", "arakan yoma", "sulaiman",
    "salt range", "kirthar", "malwa", "bengal", "assam",
]


# ---------------------------------------------------------------------------
# Download helpers
# ---------------------------------------------------------------------------

def fetch(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    print(f"  fetching {os.path.basename(dest)} ...")
    req = urllib.request.Request(url, headers={"User-Agent": "subcontinent-map-build/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as fh:
        fh.write(resp.read())
    return dest


def load_geojson(name):
    path = fetch(f"{NE_BASE}/{name}.geojson", os.path.join(CACHE, f"{name}.geojson"))
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def iter_polygons(geom):
    if isinstance(geom, Polygon):
        yield geom
    elif isinstance(geom, MultiPolygon):
        yield from geom.geoms


def iter_lines(geom):
    if isinstance(geom, LineString):
        yield geom
    elif isinstance(geom, MultiLineString):
        yield from geom.geoms


def largest_polygon(geom):
    polys = list(iter_polygons(geom))
    if not polys:
        return None
    return max(polys, key=lambda p: p.area)


def project_geom(geom):
    """Reproject a lon/lat geometry into game world pixel space."""
    return transform(lambda x, y, z=None: project(x, y), geom)


def geom_to_rings(geom, tolerance=0.9):
    """Simplify a geometry ALREADY in game space into a list of [x, y] rings."""
    out = []
    for poly in iter_polygons(geom):
        simplified = poly.simplify(tolerance, preserve_topology=True)
        for ring in [simplified.exterior] + list(simplified.interiors):
            coords = list(ring.coords)
            if len(coords) < 4:
                continue
            pts = [(round(px, 1), round(py, 1)) for px, py in coords]
            if pts[0] == pts[-1]:
                pts = pts[:-1]          # renderer closes paths itself
            if len(pts) >= 3:
                out.append(pts)
    return out


def rings_to_points(geom, tolerance=0.9):
    """Project a lon/lat geometry to game space and simplify into rings."""
    return geom_to_rings(project_geom(geom), tolerance)


def lines_to_points(geom, tolerance=0.9):
    out = []
    for line in iter_lines(geom):
        simplified = line.simplify(tolerance, preserve_topology=False)
        coords = list(simplified.coords)
        if len(coords) < 2:
            continue
        pts = [project(lon, lat) for lon, lat in coords]
        out.append([[round(px, 1), round(py, 1)] for px, py in pts])
    return out


def geom_touches_bbox(geom, pad=0.0):
    minx, miny, maxx, maxy = geom.bounds
    return not (maxx < LON_MIN - pad or minx > LON_MAX + pad or
                maxy < LAT_MIN - pad or miny > LAT_MAX + pad)


# ---------------------------------------------------------------------------
# Step 1: vector geography
# ---------------------------------------------------------------------------

def build_land():
    gj = load_geojson("ne_50m_land")
    polys = []
    for feat in gj["features"]:
        geom = shape(feat["geometry"])
        if not geom_touches_bbox(geom, pad=2.0):
            continue
        polys.append(geom)
    land = unary_union(polys)
    # keep only the parts inside our window, plus a generous margin
    window = box(LON_MIN - 3, LAT_MIN - 3, LON_MAX + 3, LAT_MAX + 3)
    return land.intersection(window)


def build_rivers():
    gj = load_geojson("ne_50m_rivers_lake_centerlines")
    out = []
    for feat in gj["features"]:
        geom = shape(feat["geometry"])
        if not geom_touches_bbox(geom):
            continue
        props = feat.get("properties", {}) or {}
        name = props.get("name")
        rank = props.get("scalerank")
        out.append({"name": name, "rank": rank if rank is not None else 9, "geom": geom})
    return out


def build_lakes():
    gj = load_geojson("ne_50m_lakes")
    out = []
    for feat in gj["features"]:
        geom = shape(feat["geometry"])
        if not geom_touches_bbox(geom):
            continue
        polys = list(iter_polygons(geom))
        if not polys:
            continue
        biggest = largest_polygon(geom)
        if biggest.area < 0.12:      # skip specks, in square degrees
            continue
        out.append(biggest)
    return out


def build_ranges():
    gj = load_geojson("ne_50m_geography_regions_polys")
    out = []
    for feat in gj["features"]:
        props = feat.get("properties", {}) or {}
        name = (props.get("NAME") or props.get("LABEL") or "").strip()
        if not name:
            continue
        name = name.title()
        low = name.lower()
        if not any(k in low for k in RANGE_KEYWORDS):
            continue
        geom = shape(feat["geometry"])
        if not geom_touches_bbox(geom):
            continue
        rep = geom.representative_point()
        x, y = project(rep.x, rep.y)
        if not (20 <= x <= WORLD_W - 20 and 20 <= y <= WORLD_H - 20):
            continue
        out.append({"name": name, "x": round(x, 1), "y": round(y, 1)})
    # de-duplicate by name
    seen, uniq = set(), []
    for r in out:
        if r["name"].lower() in seen:
            continue
        seen.add(r["name"].lower())
        uniq.append(r)
    return uniq


# ---------------------------------------------------------------------------
# Step 2: province polygons, Voronoi cells clipped to the real coastline
# ---------------------------------------------------------------------------

def build_provinces(land_geoms):
    # land_geoms arrive in lon/lat, but the Voronoi mesh is built in game pixels,
    # so everything must be reprojected before any intersection happens.
    land = unary_union([project_geom(g) for g in land_geoms])
    pts = {pid: project(lon, lat) for pid, (lon, lat) in PROVINCE_ANCHORS.items()}
    mp = MultiPoint(list(pts.values()))
    envelope = box(-800, -800, WORLD_W + 800, WORLD_H + 800)
    cells = voronoi_diagram(mp, envelope=envelope)

    cell_list = [c for c in cells.geoms if isinstance(c, Polygon)]
    result, failures = {}, []

    for pid, (px, py) in pts.items():
        pt = Point(px, py)
        home = None
        for c in cell_list:
            if c.contains(pt) or c.covers(pt):
                home = c
                break
        if home is None:
            home = min(cell_list, key=lambda c: c.distance(pt))
        clipped = home.intersection(land)
        big = largest_polygon(clipped)
        if big is None or big.area < 4.0:
            failures.append(pid)
            continue
        # A coastal capital can sit a hair offshore once the cell is clipped to
        # the real coastline. Nudge it to a point guaranteed to be on land, so it
        # never renders in the sea and always hit-tests to its own province.
        if not big.contains(pt):
            rep = big.representative_point()
            ADJUSTED_ANCHORS[pid] = (rep.x, rep.y)
        result[pid] = big
    return result, failures


# ---------------------------------------------------------------------------
# Step 3: bake relief rasters
# ---------------------------------------------------------------------------

def merc_y(lat_deg):
    lat = np.clip(lat_deg, -85.05, 85.05)
    rad = np.radians(lat)
    return (1.0 - np.log(np.tan(rad) + 1.0 / np.cos(rad)) / np.pi) / 2.0


def fetch_elevation_mosaic():
    n = 2 ** Z
    def tile_x(lon):
        return int(math.floor((lon + 180.0) / 360.0 * n))
    def tile_y(lat):
        return int(math.floor(merc_y(np.array([lat]))[0] * n))

    x0, x1 = tile_x(LON_MIN), tile_x(LON_MAX)
    y0, y1 = tile_y(LAT_MAX), tile_y(LAT_MIN)
    nx, ny = x1 - x0 + 1, y1 - y0 + 1
    print(f"  elevation tiles: zoom {Z}, {nx}x{ny} = {nx * ny} tiles")

    mosaic = np.zeros((ny * TILE, nx * TILE), dtype=np.float64)
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            dest = os.path.join(CACHE, "tiles", str(Z), str(tx), f"{ty}.png")
            fetch(f"{TILE_BASE}/{Z}/{tx}/{ty}.png", dest)
            img = Image.open(dest).convert("RGB")
            arr = np.asarray(img, dtype=np.float64)
            elev = arr[:, :, 0] * 256.0 + arr[:, :, 1] + arr[:, :, 2] / 256.0 - 32768.0
            oy, ox = (ty - y0) * TILE, (tx - x0) * TILE
            mosaic[oy:oy + TILE, ox:ox + TILE] = elev
    return mosaic, x0 * TILE, y0 * TILE


def sample_mosaic(mosaic, origin_x, origin_y, out_w, out_h, scale=1.0):
    # out_w/out_h are raster pixels; scale maps them back to world units
    xs = np.arange(out_w, dtype=np.float64) / scale
    ys = np.arange(out_h, dtype=np.float64) / scale
    lon = LON_MIN + (xs - OFF_X) / (COS_REF * S)
    lat = LAT_MAX - (ys - OFF_Y) / S

    n = 2 ** Z
    mx = (lon + 180.0) / 360.0 * n * TILE - origin_x
    my = merc_y(lat) * n * TILE - origin_y

    MX, MY = np.meshgrid(mx, my)

    x0 = np.clip(np.floor(MX).astype(int), 0, mosaic.shape[1] - 2)
    y0 = np.clip(np.floor(MY).astype(int), 0, mosaic.shape[0] - 2)
    fx = np.clip(MX - x0, 0, 1)
    fy = np.clip(MY - y0, 0, 1)

    a = mosaic[y0, x0]
    b = mosaic[y0, x0 + 1]
    c = mosaic[y0 + 1, x0]
    d = mosaic[y0 + 1, x0 + 1]
    top = a * (1 - fx) + b * fx
    bot = c * (1 - fx) + d * fx
    return top * (1 - fy) + bot * fy


def hillshade(elev, dx=M_PER_PX, dy=M_PER_PX, azimuth=315.0, altitude=45.0):
    pad = np.pad(elev, 1, mode="edge")
    dzdx = (pad[1:-1, 2:] - pad[1:-1, :-2]) / (2.0 * dx)
    dzdy = (pad[2:, 1:-1] - pad[:-2, 1:-1]) / (2.0 * dy)

    slope = np.pi / 2.0 - np.arctan(np.sqrt(dzdx ** 2 + dzdy ** 2))
    aspect = np.arctan2(dzdy, -dzdx)

    az_math = math.radians(360.0 - azimuth + 90.0)
    alt = math.radians(altitude)
    hs = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az_math - aspect)
    return np.clip(hs, 0.0, 1.0)


HYPSO_BANDS = [
    (0,    120,   (150, 176, 118)),
    (120,  450,   (178, 194, 130)),
    (450,  900,   (200, 196, 134)),
    (900,  1600,  (196, 172, 124)),
    (1600, 2600,  (178, 144, 106)),
    (2600, 3800,  (162, 134, 116)),
    (3800, 5000,  (190, 178, 170)),
    (5000, 9000,  (242, 242, 244)),
]


def bake_relief():
    print("  baking relief rasters ...")
    relief_scale = 2.0                                   # 2x for zoom headroom
    out_w, out_h = int(WORLD_W * relief_scale), int(WORLD_H * relief_scale)
    mosaic, ox, oy = fetch_elevation_mosaic()
    elev = sample_mosaic(mosaic, ox, oy, out_w, out_h, scale=relief_scale)

    # smooth slightly to suppress tile seams and pixel noise
    k = np.array([1, 2, 3, 2, 1], dtype=np.float64)
    k /= k.sum()
    elev = np.apply_along_axis(lambda r: np.convolve(r, k, mode="same"), 0, elev)
    elev = np.apply_along_axis(lambda r: np.convolve(r, k, mode="same"), 1, elev)

    hs = hillshade(elev)
    is_land = elev > 1.0

    # --- hillshade layer: neutral grey, multiply-friendly, transparent over sea
    shade = 0.34 + 0.66 * (hs ** 0.85)
    grey = np.clip(shade * 255.0, 0, 255).astype(np.uint8)
    alpha = np.where(is_land, 255, 0).astype(np.uint8)
    hs_img = np.dstack([grey, grey, grey, alpha])
    Image.fromarray(hs_img, "RGBA").save(os.path.join(ASSETS, "relief-hillshade.png"))

    # --- hypsometric layer: elevation bands modulated by the same shading
    rgb = np.zeros((out_h, out_w, 3), dtype=np.float64)
    for lo, hi, col in HYPSO_BANDS:
        m = (elev >= lo) & (elev < hi)
        rgb[m] = col
    rgb[elev >= HYPSO_BANDS[-1][1]] = HYPSO_BANDS[-1][2]
    rgb *= (0.62 + 0.38 * hs)[:, :, None]
    hypo = np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha])
    Image.fromarray(hypo, "RGBA").save(os.path.join(ASSETS, "relief-hypsometric.png"))

    land_frac = float(is_land.mean())
    print(f"  elevation range: {elev.min():.0f} m .. {elev.max():.0f} m, land {land_frac * 100:.1f}%")
    return elev, hs


# ---------------------------------------------------------------------------
# Step 4: emit data files
# ---------------------------------------------------------------------------

def js_num(v):
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return f"{v:g}"


def write_geography(coast_rings, river_lines, lake_rings, ranges):
    lines = [
        "// GENERATED by tools/build_geodata.py - do not edit by hand.",
        "// Projected Natural Earth coastline, rivers and lakes for the campaign map.",
        "",
        "export const GEO_PROJECTION = Object.freeze({",
        f"  worldWidth: {js_num(WORLD_W)},",
        f"  worldHeight: {js_num(WORLD_H)},",
        f"  lonMin: {js_num(LON_MIN)}, lonMax: {js_num(LON_MAX)},",
        f"  latMin: {js_num(LAT_MIN)}, latMax: {js_num(LAT_MAX)},",
        f"  latRef: {js_num(LAT_REF)},",
        f"  scale: {S:.5f},",
        f"  offsetX: {OFF_X:.3f},",
        f"  offsetY: {OFF_Y:.3f}",
        "});",
        "",
    ]

    lines.append("export const COASTLINE = [")
    for ring in coast_rings:
        pts = ",".join(f"[{js_num(x)},{js_num(y)}]" for x, y in ring)
        lines.append(f"  [{pts}],")
    lines.append("];")
    lines.append("")

    lines.append("export const RIVERS = [")
    for r in river_lines:
        pts = ",".join(f"[{js_num(x)},{js_num(y)}]" for x, y in r["pts"])
        nm = json.dumps(r["name"]) if r["name"] else "null"
        lines.append(f'  {{ name: {nm}, rank: {r["rank"]}, points: [{pts}] }},')
    lines.append("];")
    lines.append("")

    lines.append("export const LAKES = [")
    for ring in lake_rings:
        pts = ",".join(f"[{js_num(x)},{js_num(y)}]" for x, y in ring)
        lines.append(f"  [{pts}],")
    lines.append("];")
    lines.append("")

    lines.append("export const RANGES = [")
    for r in ranges:
        lines.append(f'  {{ name: {json.dumps(r["name"])}, x: {js_num(r["x"])}, y: {js_num(r["y"])} }},')
    lines.append("];")
    lines.append("")

    with open(os.path.join(DATA, "geography.js"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


def write_province_polygons(polys):
    lines = [
        "// GENERATED by tools/build_geodata.py - do not edit by hand.",
        "// Province polygons: Voronoi cells around real province anchors, clipped",
        "// to the Natural Earth coastline so every border follows real geography.",
        "",
        "export const PROVINCE_POLYGONS = Object.freeze({",
    ]
    for pid in sorted(polys.keys()):
        rings = geom_to_rings(polys[pid], tolerance=1.0)
        if not rings:
            continue
        outer = rings[0]
        pts = ",".join(f"[{js_num(x)},{js_num(y)}]" for x, y in outer)
        lines.append(f'  "{pid}": [{pts}],')
    lines.append("});")
    lines.append("")
    with open(os.path.join(DATA, "province-polygons.js"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


def write_anchors():
    lines = [
        "// GENERATED by tools/build_geodata.py - do not edit by hand.",
        "// Authoritative real-world longitude / latitude for each province capital.",
        "",
        "export const PROVINCE_ANCHORS = Object.freeze({",
    ]
    for pid in sorted(PROVINCE_ANCHORS.keys()):
        lon, lat = PROVINCE_ANCHORS[pid]
        lines.append(f'  "{pid}": {{ lon: {js_num(lon)}, lat: {js_num(lat)} }},')
    lines.append("});")
    lines.append("")
    with open(os.path.join(DATA, "geo-anchors.js"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))


def patch_canvas_coords():
    """Rewrite canvasCoords in provinces.js and the test oracle from the projection."""
    import re
    targets = [
        os.path.join(DATA, "provinces.js"),
        os.path.join(FIXTURES, "spec_oracle.js"),
    ]
    updated = {}
    for pid, (lon, lat) in PROVINCE_ANCHORS.items():
        if pid in ADJUSTED_ANCHORS:
            x, y = ADJUSTED_ANCHORS[pid]
        else:
            x, y = project(lon, lat)
        updated[pid] = (round(x, 1), round(y, 1))

    for path in targets:
        if not os.path.exists(path):
            print(f"  ! missing {path}")
            continue
        with open(path, "r", encoding="utf-8") as fh:
            text = fh.read()
        count = 0
        for pid, (x, y) in updated.items():
            # Anchor on the province's own `id: "PROV_X"` declaration. A bare id
            # search also matches the ids listed in OTHER provinces' connections
            # arrays, which would patch the wrong entry.
            decl = re.compile(r"""id:\s*["']""" + re.escape(pid) + r"""["']""").search(text)
            if not decl:
                continue
            m = re.compile(r"canvasCoords:\s*\{\s*x:\s*-?[\d.]+,\s*y:\s*-?[\d.]+\s*\}").search(text, decl.end())
            if not m:
                continue
            text = text[:m.start()] + f"canvasCoords: {{ x: {js_num(x)}, y: {js_num(y)} }}" + text[m.end():]
            count += 1
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"  patched {count} canvasCoords in {os.path.relpath(path, ROOT)}")


# ---------------------------------------------------------------------------
# Step 5: preview render for visual verification
# ---------------------------------------------------------------------------

PARCHMENT = (243, 235, 216)
SEA_INK = (150, 168, 176)
COAST_INK = (108, 84, 48)
RIVER_INK = (86, 132, 168)
BORDER_INK = (140, 116, 78)


def render_preview(polys, coast_rings, river_lines, lake_rings):
    print("  rendering preview ...")
    W, H = 1200, 900
    img = Image.new("RGB", (W, H), PARCHMENT)
    draw = ImageDraw.Draw(img, "RGBA")

    hypo = Image.open(os.path.join(ASSETS, "relief-hypsometric.png")).convert("RGBA").resize((W, H), Image.LANCZOS)
    img.paste(hypo, (0, 0), hypo)
    draw = ImageDraw.Draw(img, "RGBA")

    # parchment veil so province colours stay readable over the relief
    draw.rectangle([0, 0, W, H], fill=(243, 235, 216, 96))

    # province fills
    palette = [
        (214, 176, 108), (186, 150, 108), (200, 168, 132), (176, 160, 120),
        (208, 184, 140), (192, 158, 118), (220, 196, 152), (170, 148, 110),
    ]
    for i, pid in enumerate(sorted(polys.keys())):
        rings = geom_to_rings(polys[pid], tolerance=1.0)
        if not rings:
            continue
        col = palette[i % len(palette)]
        draw.polygon([tuple(p) for p in rings[0]], fill=col + (150,))

    # province borders
    for pid in sorted(polys.keys()):
        rings = geom_to_rings(polys[pid], tolerance=1.0)
        if not rings:
            continue
        pts = [tuple(p) for p in rings[0]] + [tuple(rings[0][0])]
        draw.line(pts, fill=BORDER_INK + (170,), width=1)

    # lakes
    for ring in lake_rings:
        draw.polygon([tuple(p) for p in ring], fill=RIVER_INK + (150,))

    # rivers
    for r in river_lines:
        draw.line([tuple(p) for p in r["pts"]], fill=RIVER_INK + (190,), width=2, joint="curve")

    # coastline
    for ring in coast_rings:
        pts = [tuple(p) for p in ring] + [tuple(ring[0])]
        draw.line(pts, fill=COAST_INK + (230,), width=2)

    # capitals
    for pid, (lon, lat) in PROVINCE_ANCHORS.items():
        x, y = project(lon, lat)
        draw.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(120, 40, 40), outline=(255, 255, 255))

    img.save(os.path.join(CACHE, "preview.png"))
    print(f"  wrote {os.path.relpath(os.path.join(CACHE, 'preview.png'), ROOT)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    os.makedirs(ASSETS, exist_ok=True)
    os.makedirs(DATA, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)

    print("1/5  coastline and land polygons ...")
    land = build_land()
    coast_rings = []
    for poly in iter_polygons(land):
        for ring in rings_to_points(poly, tolerance=0.9):
            if len(ring) >= 3:
                coast_rings.append(ring)
    coast_rings.sort(key=len, reverse=True)
    print(f"     {len(coast_rings)} coastline rings, {sum(len(r) for r in coast_rings)} points")

    print("2/5  rivers, lakes, named regions ...")
    rivers = build_rivers()
    river_lines = []
    for r in rivers:
        for pts in lines_to_points(r["geom"], tolerance=1.0):
            river_lines.append({"name": r["name"], "rank": r["rank"], "pts": pts})
    river_lines.sort(key=lambda r: len(r["pts"]), reverse=True)
    lake_rings = []
    for lake in build_lakes():
        for ring in rings_to_points(lake, tolerance=0.9):
            lake_rings.append(ring)
    ranges = build_ranges()
    print(f"     {len(river_lines)} river lines, {len(lake_rings)} lake rings, {len(ranges)} named regions")

    print("3/5  province polygons clipped to coastline ...")
    polys, failures = build_provinces([land])
    print(f"     {len(polys)}/40 provinces built")
    if failures:
        print(f"     ! no land intersection for: {', '.join(failures)}")

    print("4/5  baking relief rasters ...")
    bake_relief()

    print("5/5  writing data files ...")
    write_geography(coast_rings, river_lines, lake_rings, ranges)
    write_province_polygons(polys)
    write_anchors()
    patch_canvas_coords()

    render_preview(polys, coast_rings, river_lines, lake_rings)

    print("\ndone.")


if __name__ == "__main__":
    main()
