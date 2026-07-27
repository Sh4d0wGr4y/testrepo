#!/usr/bin/env python3
"""Fit HU and DE postal zones to the national border.

- Clips zone colors so they never spill into neighboring countries.
- Fills uncovered land gaps by assigning them to the nearest zone.
- Skips very large gaps (Lake Constance stays water, unpainted).
- Guards the result with a coverage assertion.

Run after clean-zone-geometries.py. IT is handled by fill-it-land-gaps.py.
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

COUNTRIES = {
    "hu_prefix1.geojson": {
        "admin": ROOT / "scripts" / "data" / "hungary_admin.geojson",
        # Hungary is landlocked; every inland gap is real land.
        "max_gap_fill_deg2": 1.0,
        "min_cover": 0.998,
    },
    "de_prefix2.geojson": {
        "admin": ROOT / "scripts" / "data" / "germany_admin.geojson",
        # Skip gaps larger than ~130 km2 (Lake Constance ~315 km2 stays water).
        "max_gap_fill_deg2": 0.016,
        "min_cover": 0.995,
    },
}


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


def main_bodies(geoms: list) -> list:
    out = []
    for g in geoms:
        parts = sorted(explode(g), key=lambda p: p.area, reverse=True) if g is not None else []
        out.append(parts[0] if parts else None)
    return out


def process(name: str, cfg: dict) -> None:
    path = DATA / name
    data = json.loads(path.read_text())
    admin = as_valid(shape(json.loads(cfg["admin"].read_text())["features"][0]["geometry"]))
    if admin is None:
        raise SystemExit(f"invalid admin outline for {name}")

    feats = data["features"]
    geoms = [as_valid(shape(f["geometry"])) for f in feats]

    before = unary_union([g for g in geoms if g is not None])
    outside_before = before.difference(admin).area
    cover_before = before.intersection(admin).area / admin.area

    # 1) Hard clip to the national border.
    geoms = [as_valid(g.intersection(admin)) if g is not None else None for g in geoms]

    # 2) Fill land gaps (skip large water bodies) to the nearest zone.
    covered = unary_union([g for g in geoms if g is not None and not g.is_empty])
    gaps = as_valid(admin.difference(covered))
    mains = main_bodies(geoms)
    cells: list[Polygon] = []
    skipped = 0
    for part in explode(gaps):
        if part.area > cfg["max_gap_fill_deg2"]:
            skipped += 1
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

    # 3) Resolve any overlaps created at cell seams (nearest main wins).
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

    geoms = [as_valid(g.intersection(admin)) if g is not None else None for g in geoms]

    after = unary_union([g for g in geoms if g is not None and not g.is_empty])
    cover_after = after.intersection(admin).area / admin.area
    outside_after = after.difference(admin).area
    print(
        f"{name}: cover {cover_before:.5f} -> {cover_after:.5f}, "
        f"outside {outside_before:.6f} -> {outside_after:.8f} deg2, "
        f"gap cells={len(cells)} big gaps skipped={skipped}"
    )
    if cover_after < cfg["min_cover"]:
        raise SystemExit(f"{name}: coverage too low after border fit: {cover_after:.5f}")
    if cover_after < cover_before - 1e-6:
        raise SystemExit(f"{name}: coverage regressed: {cover_before:.5f} -> {cover_after:.5f}")

    out_feats = []
    for f, g in zip(feats, geoms):
        if g is None or g.is_empty:
            raise SystemExit(f"{name}: zone {f['properties'].get('prefix')} vanished")
        parts = [p for p in explode(g) if p.area >= 1e-7]
        s = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        cy = s.centroid.y
        props = dict(f["properties"])
        props["area_km2"] = round(s.area * 111 * 111 * math.cos(math.radians(cy)), 2)
        out_feats.append({"type": "Feature", "properties": props, "geometry": mapping(s)})

    data["features"] = out_feats
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {path} ({path.stat().st_size} bytes, {len(out_feats)} zones)")


def main() -> None:
    for name, cfg in COUNTRIES.items():
        process(name, cfg)


if __name__ == "__main__":
    main()
