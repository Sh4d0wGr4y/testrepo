#!/usr/bin/env python3
"""Fill Italian postal-zone polygons to the national border — not beyond.

Uses Natural Earth admin-0 Italy as a hard political clip (no France / CH /
AT / SI spill) and NE land for coastline. Gap cells are assigned to the
nearest original zone MAIN body. Interior holes are stripped. Detached
scraps that sit inside / nearer another zone are reassigned so wrong-color
enclaves do not appear on the map.

Do not re-run clean-zone-geometries.py on IT afterward without this script.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
from pathlib import Path

from shapely.geometry import LinearRing, MultiPolygon, Point, Polygon, box, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "processed" / "it_prefix2.geojson"
LAND = ROOT / "scripts" / "data" / "italy_land.geojson"
ADMIN = ROOT / "scripts" / "data" / "italy_admin.geojson"
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


def reassign_nested_scraps(geoms: list) -> list:
    """Move detached scraps to the nearest other zone when they are enclaves.

    Catches:
    - pieces fully inside / heavily overlapping another zone
    - pieces much closer to another zone's main body than to their own
      (incl. near-misses that simplify later turns into nested paint)
    True coastal islands (nearest main is still own, or far from all others
    over water) stay put unless tiny noise.
    """
    parts_list: list[list] = []
    mains: list = []
    for g in geoms:
        g = as_valid(g)
        if g is None or g.is_empty:
            parts_list.append([])
            mains.append(None)
            continue
        parts = sorted(explode(g), key=lambda p: p.area, reverse=True)
        parts_list.append(parts)
        mains.append(parts[0] if parts else None)

    kept: list[list] = [[] for _ in geoms]
    extras: list[list] = [[] for _ in geoms]
    moved = 0
    dropped = 0

    for i, parts in enumerate(parts_list):
        if not parts:
            continue
        own_main = parts[0]
        kept[i].append(own_main)
        for part in parts[1:]:
            pt = part.representative_point()
            try:
                d_own = own_main.distance(pt)
            except Exception:
                d_own = 999.0

            best_j = None
            best_dist = 999.0
            best_overlap = 0.0
            best_contains = False

            for j, host_main in enumerate(mains):
                if j == i or host_main is None:
                    continue
                if part.area >= host_main.area * 0.45:
                    continue
                host_full = as_valid(geoms[j]) or host_main
                try:
                    contains = host_full.contains(pt) or host_full.covers(pt)
                    dist = host_main.distance(pt)
                    overlap = 0.0
                    if host_full.intersects(part):
                        inter = as_valid(host_full.intersection(part))
                        overlap = 0.0 if inter is None else inter.area
                except Exception:
                    continue

                score_better = False
                if contains or overlap > best_overlap:
                    score_better = True
                elif best_overlap <= 0 and not best_contains and dist < best_dist:
                    score_better = True
                if score_better:
                    best_j = j
                    best_dist = dist
                    best_overlap = max(overlap, best_overlap)
                    best_contains = contains or best_contains

            ov_ratio = (best_overlap / part.area) if part.area and best_overlap else 0.0
            nested = best_contains or ov_ratio >= 0.35
            # Nearer to another main (with margin), or sitting on its doorstep while
            # far from own main — classic wrong-color inland "hole".
            closer_to_other = (
                best_j is not None
                and best_dist + 0.08 < d_own
                and (d_own >= 0.18 or best_dist <= 0.12)
            )
            doorstep = best_j is not None and best_dist <= 0.12 and d_own >= 0.35

            if best_j is not None and (nested or closer_to_other or doorstep):
                extras[best_j].append(part)
                moved += 1
                continue

            # Far orphan not claimed by a neighbor → drop visual noise.
            if d_own > 0.85 and part.area < own_main.area * 0.15 and best_j is None:
                dropped += 1
                continue
            if d_own > 0.85 and part.area < own_main.area * 0.15 and best_dist > 0.35:
                dropped += 1
                continue
            kept[i].append(part)

    out = []
    for i in range(len(geoms)):
        pieces = list(kept[i]) + list(extras[i])
        if not pieces:
            out.append(None)
            continue
        g = as_valid(pieces[0] if len(pieces) == 1 else unary_union(pieces))
        out.append(g)
    print(f"nested scraps reassigned={moved} dropped={dropped}")
    return out


def resolve_overlaps_by_mains(geoms: list, mains: list) -> list:
    """Carve overlaps using distance to each zone's main body (ignore scraps)."""
    geoms = list(geoms)
    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            a, b = geoms[i], geoms[j]
            if a is None or b is None or a.is_empty or b.is_empty:
                continue
            mi, mj = mains[i], mains[j]
            if mi is None or mj is None:
                continue
            inter = as_valid(a.intersection(b))
            if inter is None or inter.is_empty or inter.area < 1e-12:
                continue
            for part in explode(inter):
                pt = part.representative_point()
                if mi.distance(pt) <= mj.distance(pt):
                    geoms[j] = as_valid(geoms[j].difference(part))
                else:
                    geoms[i] = as_valid(geoms[i].difference(part))
    return geoms


def main_bodies(geoms: list) -> list:
    out = []
    for g in geoms:
        parts = sorted(explode(g), key=lambda p: p.area, reverse=True) if g is not None else []
        out.append(parts[0] if parts else None)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default=DEFAULT_BASE_REF)
    parser.add_argument("--simplify", type=float, default=0.0007)
    parser.add_argument(
        "--coast-buffer",
        type=float,
        default=0.004,
        help="Tiny pad on land inside admin only (OSM fringe)",
    )
    parser.add_argument("--cell-area", type=float, default=0.004)
    args = parser.parse_args()

    land = as_valid(shape(json.loads(LAND.read_text())["features"][0]["geometry"]))
    admin = as_valid(shape(json.loads(ADMIN.read_text())["features"][0]["geometry"]))
    if land is None or admin is None:
        raise SystemExit("invalid italy_land / italy_admin outline")

    # Fill target stays inside the political border.
    target = as_valid(land.buffer(args.coast_buffer).intersection(admin))
    if target is None:
        raise SystemExit("empty fill target")

    data = load_base(args.base)
    feats = data["features"]
    orig = []
    for f in feats:
        g = as_valid(shape(f["geometry"]))
        if g is None:
            raise SystemExit(f"empty geometry for {f.get('properties')}")
        near = as_valid(g.intersection(admin.buffer(0.05)))
        orig.append(near if near is not None and not near.is_empty else g)
    orig_mains = main_bodies(orig)

    geoms = []
    for g in orig:
        clipped = as_valid(g.intersection(target))
        geoms.append(clipped if clipped is not None and not clipped.is_empty else as_valid(g.intersection(admin)))

    allu = unary_union([g for g in geoms if g is not None and not g.is_empty])
    gaps = as_valid(target.difference(allu))
    print(
        f"initial admin cover={allu.intersection(admin).area / admin.area:.6f} "
        f"gap_area={0 if gaps is None else gaps.area:.6f}"
    )

    cells: list[Polygon] = []
    for part in explode(gaps):
        cells.extend(subdivide(part, args.cell_area))
    print(f"gap cells={len(cells)}")

    # Assign gaps to nearest MAIN body — ignore distant mis-scraps in orig.
    for cell in cells:
        pt = cell.representative_point()
        best = min(
            range(len(orig_mains)),
            key=lambda i: orig_mains[i].distance(pt) if orig_mains[i] is not None else 1e9,
        )
        geoms[best] = as_valid(unary_union([geoms[best], cell]))

    geoms = resolve_overlaps_by_mains(geoms, main_bodies(geoms))

    # Hard political clip — never paint neighboring countries.
    geoms = [as_valid(g.intersection(admin)) for g in geoms]

    # Remove tiny detached SEA scraps (visual dots). Never drop land: any part
    # mostly on the land target stays painted (ownership is fixed by the
    # reassign step), otherwise the dot heuristics from V3.3.32 apply.
    cleaned_geoms = []
    dropped_dots = 0
    for g in geoms:
        g = as_valid(g)
        if g is None or g.is_empty:
            cleaned_geoms.append(g)
            continue
        parts = explode(g)
        if len(parts) <= 1:
            cleaned_geoms.append(g)
            continue
        parts = sorted(parts, key=lambda p: p.area, reverse=True)
        main = parts[0]
        keep = [main]
        for part in parts[1:]:
            try:
                land_ratio = part.intersection(target).area / part.area if part.area else 0.0
            except Exception:
                land_ratio = 0.0
            if land_ratio >= 0.3:
                keep.append(part)
                continue
            area = part.area
            dist = main.distance(part)
            significant = area >= 0.02
            close = dist <= 0.22
            medium = area >= 0.004 and dist <= 0.55
            if significant or close or medium:
                keep.append(part)
            else:
                dropped_dots += 1
        cleaned_geoms.append(keep[0] if len(keep) == 1 else MultiPolygon(keep))
    geoms = [as_valid(g) for g in cleaned_geoms]
    print(f"sea dots dropped={dropped_dots}")

    geoms = reassign_nested_scraps(geoms)
    geoms = resolve_overlaps_by_mains(geoms, main_bodies(geoms))
    geoms = [as_valid(g.intersection(admin)) if g is not None else None for g in geoms]

    # Simplify first, then reassign again — simplify can pull a neighbor over a
    # near-miss scrap and create a wrong-color nested hole.
    simplified = []
    for g in geoms:
        g = strip_holes(g)
        if g is None:
            simplified.append(None)
            continue
        s = as_valid(g.simplify(args.simplify, preserve_topology=True)) or g
        s = strip_holes(s) or g
        s = as_valid(s.intersection(admin))
        s = strip_holes(s)
        parts = [p for p in explode(s) if p.area >= 1e-5]
        if not parts:
            simplified.append(None)
            continue
        s = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        s = strip_holes(as_valid(s.intersection(admin)))
        simplified.append(s)

    geoms = reassign_nested_scraps(simplified)
    geoms = resolve_overlaps_by_mains(geoms, main_bodies(geoms))
    geoms = [as_valid(g.intersection(admin)) if g is not None else None for g in geoms]

    # Final residual gap fill: whatever the pipeline carved away (simplify
    # shrink, overlap carving) is re-assigned to the nearest zone main so no
    # white holes remain on land.
    final_mains = main_bodies(geoms)
    residual = as_valid(target.difference(unary_union([g for g in geoms if g is not None and not g.is_empty])))
    residual_cells: list[Polygon] = []
    for part in explode(residual):
        if part.area < 5e-7:
            continue
        residual_cells.extend(subdivide(part, args.cell_area))
    print(f"residual gap cells={len(residual_cells)}")
    for cell in residual_cells:
        pt = cell.representative_point()
        best = None
        best_d = 1e9
        for i, m in enumerate(final_mains):
            if m is None:
                continue
            d = geoms[i].distance(pt) if geoms[i] is not None else m.distance(pt)
            if d < best_d:
                best_d = d
                best = i
        if best is not None:
            geoms[best] = as_valid(unary_union([geoms[best], cell]))
    geoms = resolve_overlaps_by_mains(geoms, main_bodies(geoms))
    geoms = [as_valid(g.intersection(admin)) if g is not None else None for g in geoms]

    covered = unary_union([g for g in geoms if g is not None and not g.is_empty])
    cover_ratio = covered.intersection(admin).area / admin.area
    if cover_ratio < 0.999:
        raise SystemExit(f"land coverage too low after fill: {cover_ratio:.5f}")

    out_feats = []
    for f, g in zip(feats, geoms):
        g = strip_holes(g)
        if g is None or g.is_empty:
            continue
        parts = [p for p in explode(g) if p.area >= 1e-5]
        if not parts:
            continue
        s = parts[0] if len(parts) == 1 else MultiPolygon(parts)
        s = strip_holes(as_valid(s.intersection(admin)))
        if s is None or s.is_empty:
            continue
        cy = s.centroid.y if not s.is_empty else 42
        props = dict(f["properties"])
        props["area_km2"] = round(s.area * 111 * 111 * math.cos(math.radians(cy)), 2)
        out_feats.append({"type": "Feature", "properties": props, "geometry": mapping(s)})

    final = unary_union([shape(f["geometry"]) for f in out_feats])
    outside = final.difference(admin)
    print(
        f"final admin cover={final.intersection(admin).area / admin.area:.6f} "
        f"outside_admin={0 if outside.is_empty else outside.area:.8f} "
        f"features={len(out_feats)}"
    )
    OUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": out_feats}, ensure_ascii=False, separators=(",", ":"))
    )
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
