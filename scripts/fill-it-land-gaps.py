#!/usr/bin/env python3
"""Fill uncolored Italian land on postal-zone polygons.

Partitions Italy land (+ a tiny coastal pad for OSM tile mismatch) to the
nearest *original* zone so Calabria stays 88/89 and Sicily stays 90–98.
Clips hard to land so open sea is not painted. Strips interior holes.

Do not re-run clean-zone-geometries.py on IT afterward without this script.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

from shapely.geometry import LinearRing, MultiPolygon, Polygon, box, mapping, shape
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


def strip_holes(geom):
    """Choropleth zones should be solid — large interior rings read as white gaps."""
    g = as_valid(geom)
    if g is None:
        return None

    def one(p: Polygon) -> Polygon:
        ext = LinearRing(p.exterior.coords)
        if not ext.is_ccw:
            ext = LinearRing(list(ext.coords)[::-1])
        return Polygon(ext)

    if g.geom_type == "Polygon":
        return one(g)
    parts = [one(p) for p in g.geoms if not p.is_empty and p.area > 1e-10]
    if not parts:
        return None
    return parts[0] if len(parts) == 1 else MultiPolygon(parts)


def load_base(base: str) -> dict:
    if base == "current":
        return json.loads(OUT.read_text())
    if ":" in base and not Path(base).exists():
        raw = subprocess.check_output(["git", "show", base], cwd=ROOT)
        return json.loads(raw)
    return json.loads(Path(base).read_text())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=DEFAULT_BASE_REF)
    parser.add_argument("--simplify", type=float, default=0.0009)
    parser.add_argument(
        "--coast-buffer",
        type=float,
        default=0.006,
        help="Tiny pad beyond Italy land for OSM fringe only (~2km; keep sea unpainted)",
    )
    parser.add_argument("--cell-area", type=float, default=0.005)
    args = parser.parse_args()

    land = as_valid(shape(json.loads(LAND.read_text())["features"][0]["geometry"]))
    if land is None:
        raise SystemExit(f"invalid land outline: {LAND}")
    target = land.buffer(args.coast_buffer)

    data = load_base(args.base)
    feats = data["features"]
    orig = []
    for f in feats:
        g = as_valid(shape(f["geometry"]))
        if g is None:
            raise SystemExit(f"empty geometry for {f.get('properties')}")
        near = as_valid(g.intersection(land.buffer(0.2)))
        orig.append(near if near is not None and not near.is_empty else g)

    geoms = [as_valid(g.intersection(target)) or g for g in orig]
    allu = unary_union(geoms)
    gaps = as_valid(target.difference(allu))
    print(
        f"initial land cover={allu.intersection(land).area / land.area:.6f} "
        f"gap_area={0 if gaps is None else gaps.area:.6f}"
    )

    cells: list[Polygon] = []
    for part in explode(gaps):
        cells.extend(subdivide(part, args.cell_area))
    print(f"gap cells={len(cells)}")

    for cell in cells:
        pt = cell.representative_point()
        best = min(range(len(orig)), key=lambda i: orig[i].distance(pt))
        geoms[best] = as_valid(unary_union([geoms[best], cell]))

    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            a, b = geoms[i], geoms[j]
            if a is None or b is None:
                continue
            inter = as_valid(a.intersection(b))
            if inter is None or inter.is_empty or inter.area < 1e-12:
                continue
            for part in explode(inter):
                pt = part.representative_point()
                if orig[i].distance(pt) <= orig[j].distance(pt):
                    geoms[j] = as_valid(geoms[j].difference(part))
                else:
                    geoms[i] = as_valid(geoms[i].difference(part))

    # Hard clip so open sea stays unpainted.
    geoms = [as_valid(g.intersection(target)) for g in geoms]

    out_feats = []
    for f, g in zip(feats, geoms):
        g = strip_holes(g)
        if g is None:
            continue
        s = as_valid(g.simplify(args.simplify, preserve_topology=True)) or g
        s = strip_holes(s) or g
        s = as_valid(s.intersection(target)) or s
        s = strip_holes(s)
        parts = [p for p in explode(s) if p.area >= 1e-5]
        if not parts:
            continue
        s = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        s = strip_holes(s)
        cy = s.centroid.y if not s.is_empty else 42
        props = dict(f["properties"])
        props["area_km2"] = round(s.area * 111 * 111 * math.cos(math.radians(cy)), 2)
        out_feats.append({"type": "Feature", "properties": props, "geometry": mapping(s)})

    final = unary_union([shape(f["geometry"]) for f in out_feats])
    sea = final.difference(land)
    print(
        f"final land cover={final.intersection(land).area / land.area:.6f} "
        f"sea_overpaint={0 if sea is None else sea.area:.6f} features={len(out_feats)}"
    )
    OUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": out_feats}, ensure_ascii=False, separators=(",", ":"))
    )
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
