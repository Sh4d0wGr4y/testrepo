#!/usr/bin/env python3
"""Fill uncolored land gaps in Italian postal-zone polygons.

Uses a cached Italy land outline (Nominatim/OSM) and assigns uncovered land
to the nearest zone. Slight coastal padding covers OSM tile coastline mismatch
without painting open sea far from shore.

Do not re-run clean-zone-geometries.py on IT afterward without this script —
aggressive cleaning can reopen coastal/inland holes.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

from shapely.geometry import MultiPolygon, Point, Polygon, box, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "processed" / "it_prefix2.geojson"
LAND = ROOT / "scripts" / "data" / "italy_land.geojson"
DEFAULT_BASE_REF = "bffdd06:public/data/processed/it_prefix2.geojson"


def as_valid(geom):
    if geom is None or geom.is_empty:
        return None
    g = make_valid(geom)
    if g.is_empty:
        return None
    if g.geom_type == "GeometryCollection":
        polys = [p for p in g.geoms if p.geom_type in ("Polygon", "MultiPolygon") and not p.is_empty]
        if not polys:
            return None
        g = unary_union(polys)
    if g.geom_type not in ("Polygon", "MultiPolygon"):
        return None
    return g


def explode(geom):
    g = as_valid(geom)
    if g is None:
        return []
    if g.geom_type == "Polygon":
        return [g]
    return [p for p in g.geoms if not p.is_empty]


def subdivide(poly: Polygon, max_area: float) -> list[Polygon]:
    if poly.area <= max_area:
        return [poly]
    minx, miny, maxx, maxy = poly.bounds
    cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
    quads = [
        box(minx, miny, cx, cy),
        box(cx, miny, maxx, cy),
        box(minx, cy, cx, maxy),
        box(cx, cy, maxx, maxy),
    ]
    out: list[Polygon] = []
    for q in quads:
        inter = as_valid(poly.intersection(q))
        for part in explode(inter):
            if part.area > 1e-10:
                out.extend(subdivide(part, max_area))
    return out


def load_base(base: str) -> dict:
    if base == "current":
        return json.loads(OUT.read_text())
    if ":" in base and not Path(base).exists():
        raw = subprocess.check_output(["git", "show", base], cwd=ROOT)
        return json.loads(raw)
    return json.loads(Path(base).read_text())


def resolve_overlaps(geoms: list):
    order = sorted(range(len(geoms)), key=lambda i: geoms[i].area if geoms[i] is not None else 0, reverse=True)
    claimed = None
    for i in order:
        g = geoms[i]
        if g is None or g.is_empty:
            continue
        if claimed is not None:
            inter = as_valid(g.intersection(claimed))
            if inter is not None and not inter.is_empty and inter.area > 1e-12:
                g = as_valid(g.difference(claimed))
                geoms[i] = g
        if g is not None and not g.is_empty:
            claimed = g if claimed is None else as_valid(unary_union([claimed, g]))


def clean_poly(p: Polygon) -> Polygon:
    holes = [r for r in p.interiors if abs(Polygon(r).area) > 1e-5]
    try:
        return Polygon(p.exterior, holes)
    except Exception:
        return p


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=DEFAULT_BASE_REF, help="GeoJSON path, git ref:path, or 'current'")
    parser.add_argument("--simplify", type=float, default=0.0010)
    parser.add_argument("--coast-buffer", type=float, default=0.012)
    parser.add_argument("--cell-area", type=float, default=0.008)
    args = parser.parse_args()

    land = as_valid(shape(json.loads(LAND.read_text())["features"][0]["geometry"]))
    if land is None:
        raise SystemExit(f"invalid land outline: {LAND}")
    land_pad = land.buffer(args.coast_buffer)

    data = load_base(args.base)
    feats = data["features"]
    geoms = []
    for f in feats:
        g = as_valid(shape(f["geometry"]))
        if g is None:
            raise SystemExit(f"empty geometry for {f.get('properties')}")
        clipped = as_valid(g.intersection(land_pad))
        geoms.append(clipped if clipped is not None else g)

    allu = unary_union([g for g in geoms if g is not None])
    gaps = as_valid(land.difference(allu))
    print(f"initial cover={allu.intersection(land).area / land.area:.6f} gap_area={0 if gaps is None else gaps.area:.6f}")

    cells: list[Polygon] = []
    for part in explode(gaps):
        cells.extend(subdivide(part, args.cell_area))
    print(f"gap cells={len(cells)}")

    centroids = [g.centroid if g is not None and not g.is_empty else Point(0, 0) for g in geoms]
    for cell in cells:
        pt = cell.representative_point()
        nearby = sorted(range(len(geoms)), key=lambda i: centroids[i].distance(pt))[:12]
        best_i, best_d = None, 1e9
        for i in nearby:
            if geoms[i] is None:
                continue
            d = geoms[i].distance(pt)
            if d < best_d:
                best_d = d
                best_i = i
        if best_i is None:
            continue
        geoms[best_i] = as_valid(unary_union([geoms[best_i], cell]))
        centroids[best_i] = geoms[best_i].centroid

    for i, g in enumerate(geoms):
        if g is None:
            continue
        g2 = as_valid(g.buffer(args.coast_buffer).intersection(land_pad))
        geoms[i] = g2 if g2 is not None else g

    resolve_overlaps(geoms)

    out_feats = []
    for f, g in zip(feats, geoms):
        if g is None or g.is_empty:
            continue
        s = as_valid(g.simplify(args.simplify, preserve_topology=True)) or g
        if s.geom_type == "Polygon":
            s = clean_poly(s)
        elif s.geom_type == "MultiPolygon":
            s = MultiPolygon([clean_poly(p) for p in s.geoms if not p.is_empty])
        s = as_valid(s) or g
        props = dict(f["properties"])
        cy = s.centroid.y if not s.is_empty else 42
        props["area_km2"] = round(s.area * 111 * 111 * math.cos(math.radians(cy)), 2)
        out_feats.append({"type": "Feature", "properties": props, "geometry": mapping(s)})

    final = unary_union([shape(f["geometry"]) for f in out_feats])
    cover = final.intersection(land).area / land.area
    print(f"final cover={cover:.6f} features={len(out_feats)} bounds={final.bounds}")

    OUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": out_feats}, ensure_ascii=False, separators=(",", ":"))
    )
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
