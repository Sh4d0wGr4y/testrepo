#!/usr/bin/env python3
"""Fill interior gaps between zones WITHOUT touching the outer border.

The outer edge of the zone union comes from the source data (OSM / GISCO
LAU) and matches the basemap borders precisely — external clipping would
only make it worse. This script closes the white seams and holes that sit
fully inside the country by assigning them to the nearest zone.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from shapely.geometry import MultiPolygon, Polygon, box, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "processed"

FILES = ("hu_prefix1.geojson", "de_prefix2.geojson")


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


def fill_union_holes(union):
    """Return the union with interior rings removed (outer edge unchanged)."""
    parts = [Polygon(p.exterior.coords) for p in explode(union)]
    if not parts:
        return None
    return as_valid(unary_union(parts))


def main_bodies(geoms: list) -> list:
    out = []
    for g in geoms:
        parts = sorted(explode(g), key=lambda p: p.area, reverse=True) if g is not None else []
        out.append(parts[0] if parts else None)
    return out


def process(name: str) -> None:
    path = DATA / name
    data = json.loads(path.read_text())
    feats = data["features"]
    geoms = [as_valid(shape(f["geometry"])) for f in feats]

    union = as_valid(unary_union([g for g in geoms if g is not None]))
    outer = fill_union_holes(union)
    holes = as_valid(outer.difference(union))
    hole_area = 0 if holes is None else holes.area
    print(f"{name}: interior hole area={hole_area:.6f} deg2")

    cells: list[Polygon] = []
    for part in explode(holes):
        if part.area < 1e-9:
            continue
        cells.extend(subdivide(part, 0.004))
    for cell in cells:
        pt = cell.representative_point()
        best = None
        best_d = 1e9
        for i, g in enumerate(geoms):
            if g is None or g.is_empty:
                continue
            d = g.distance(pt)
            if d < best_d:
                best_d = d
                best = i
        if best is not None:
            geoms[best] = as_valid(unary_union([geoms[best], cell]))

    # Seam overlaps from cell edges: nearest main body wins.
    mains = main_bodies(geoms)
    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            a, b = geoms[i], geoms[j]
            if a is None or b is None or a.is_empty or b.is_empty:
                continue
            inter = as_valid(a.intersection(b))
            if inter is None or inter.is_empty or inter.area < 1e-12:
                continue
            for part in explode(inter):
                pt = part.representative_point()
                di = mains[i].distance(pt) if mains[i] is not None else 1e9
                dj = mains[j].distance(pt) if mains[j] is not None else 1e9
                if di <= dj:
                    geoms[j] = as_valid(geoms[j].difference(part))
                else:
                    geoms[i] = as_valid(geoms[i].difference(part))

    new_union = as_valid(unary_union([g for g in geoms if g is not None and not g.is_empty]))
    # The outer edge must stay identical to the source data.
    drift = new_union.symmetric_difference(outer).area
    print(f"{name}: filled cells={len(cells)} outer-edge drift={drift:.8f} deg2")
    if drift > 1e-4:
        raise SystemExit(f"{name}: outer border changed too much ({drift:.6f})")

    out_feats = []
    for f, g in zip(feats, geoms):
        if g is None or g.is_empty:
            raise SystemExit(f"{name}: zone {f['properties'].get('prefix')} vanished")
        parts = [p for p in explode(g) if p.area >= 1e-9]
        s = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        cy = s.centroid.y
        props = dict(f["properties"])
        props["area_km2"] = round(s.area * 111 * 111 * math.cos(math.radians(cy)), 2)
        out_feats.append({"type": "Feature", "properties": props, "geometry": mapping(s)})

    data["features"] = out_feats
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {path} ({path.stat().st_size} bytes, {len(out_feats)} zones)")


def main() -> None:
    for name in FILES:
        process(name)


if __name__ == "__main__":
    main()
