#!/usr/bin/env python3
"""Clean postal-zone GeoJSON: drop misassigned nested scraps, resolve overlaps."""

from __future__ import annotations

import json
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "public" / "data" / "processed"
# IT land gaps are filled by scripts/fill-it-land-gaps.py — skip IT by default
# so aggressive scrap/overlap cleaning does not reopen coastal holes.
FILES = ("hu_prefix1.geojson", "de_prefix2.geojson")
ALL_FILES = ("hu_prefix1.geojson", "de_prefix2.geojson", "it_prefix2.geojson")


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


def polygon_parts(geom):
    g = as_valid(geom)
    if g is None:
        return []
    if g.geom_type == "Polygon":
        return [g]
    return [p for p in g.geoms if not p.is_empty and p.area > 0]


def clean_feature_parts(geom, min_keep_ratio: float = 0.04, max_gap_deg: float = 2.5):
    """Keep parts for later reassignment; only drop absurdly distant noise."""
    parts = polygon_parts(geom)
    if not parts:
        return None
    parts = sorted(parts, key=lambda p: p.area, reverse=True)
    main = parts[0]
    kept = [main]
    for part in parts[1:]:
        try:
            gap = main.distance(part)
        except Exception:
            gap = 999.0
        # Csak a teljesen abszurd távoli zajt dobjuk el itt; a többit a reassign lépés kezeli.
        if gap > 3.5 and part.area < main.area * 0.02:
            continue
        if part.area >= main.area * min_keep_ratio or gap <= max_gap_deg:
            kept.append(part)
            continue
        if gap <= 3.5:
            kept.append(part)
    if len(kept) == 1:
        return kept[0]
    return unary_union(kept)


def drop_parts_inside_other_mains(features: list[dict]) -> list[dict]:
    """Reassign or drop scraps that belong with another zone (Kömlő/IT-style errors)."""
    mains: dict[str, object] = {}
    cleaned_parts: dict[str, list] = {}
    props_by: dict[str, dict] = {}

    for feature in features:
        prefix = str(feature["properties"]["prefix"])
        props_by[prefix] = dict(feature["properties"])
        geom = clean_feature_parts(shape(feature["geometry"]))
        parts = polygon_parts(geom) if geom is not None else []
        if not parts:
            continue
        parts = sorted(parts, key=lambda p: p.area, reverse=True)
        mains[prefix] = parts[0]
        cleaned_parts[prefix] = parts

    other_mains = list(mains.items())
    extras: dict[str, list] = {p: [] for p in cleaned_parts}
    kept_parts: dict[str, list] = {p: [] for p in cleaned_parts}
    reassigned = 0
    dropped = 0

    for prefix, parts in cleaned_parts.items():
        own_main = parts[0]
        for idx, part in enumerate(parts):
            if idx == 0:
                kept_parts[prefix].append(part)
                continue

            pt = part.representative_point()
            try:
                d_own = own_main.distance(pt)
            except Exception:
                d_own = 999.0

            best_host = None
            best_overlap = 0.0
            best_dist = 999.0
            best_contains = False

            for other_prefix, other_main in other_mains:
                if other_prefix == prefix:
                    continue
                try:
                    contains = other_main.contains(pt) or other_main.covers(pt)
                    dist = other_main.distance(pt)
                    overlap = 0.0
                    if other_main.intersects(part):
                        try:
                            overlap = other_main.intersection(part).area
                        except Exception:
                            overlap = part.area if contains else 0.0
                except Exception:
                    continue

                # Prefer containing / high-overlap hosts; else nearest main.
                if contains or overlap > best_overlap:
                    if part.area < other_main.area * 0.4:
                        best_host = other_prefix
                        best_overlap = max(overlap, best_overlap)
                        best_dist = dist
                        best_contains = contains or best_contains
                elif best_host is None or (not best_contains and best_overlap <= 0 and dist < best_dist):
                    if part.area < other_main.area * 0.4:
                        best_host = other_prefix
                        best_dist = dist

            ov_ratio = (best_overlap / part.area) if part.area and best_overlap else 0.0
            # Közelebb van egy másik zónához, mint a saját fő tömegéhez → átsorolás.
            closer_to_other = best_host is not None and best_dist + 0.12 < d_own and d_own >= 0.22
            nested = best_contains or ov_ratio >= 0.25
            far_orphan = d_own > 0.85 and part.area < own_main.area * 0.12

            if best_host and (nested or closer_to_other):
                extras.setdefault(best_host, []).append(part)
                reassigned += 1
                continue

            if far_orphan and (best_host is None or best_dist > 0.35):
                dropped += 1
                continue

            if far_orphan and best_host is not None and best_dist <= 0.35:
                extras.setdefault(best_host, []).append(part)
                reassigned += 1
                continue

            kept_parts[prefix].append(part)

    result = []
    all_prefixes = sorted(set(kept_parts) | set(extras), key=lambda p: (len(p), p))
    for prefix in all_prefixes:
        pieces = list(kept_parts.get(prefix) or [])
        pieces.extend(extras.get(prefix) or [])
        if not pieces:
            continue
        geom = pieces[0] if len(pieces) == 1 else unary_union(pieces)
        geom = as_valid(geom)
        if geom is None:
            continue
        props = props_by.get(prefix) or {"prefix": prefix}
        result.append(
            {
                "type": "Feature",
                "properties": dict(props),
                "geometry": mapping(geom),
            }
        )
    print(f"  reassigned={reassigned} dropped={dropped}")
    return result


def resolve_overlaps(features: list[dict]) -> list[dict]:
    """Subtract overlaps from larger zones so smaller zones stay visible on top."""
    items = []
    for feature in features:
        prefix = str(feature["properties"]["prefix"])
        geom = as_valid(shape(feature["geometry"]))
        if geom is None:
            continue
        items.append([prefix, feature["properties"], geom, geom.area])

    # Process from large to small: carve smaller zones out of larger ones.
    items.sort(key=lambda x: x[3], reverse=True)
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            large_geom = items[i][2]
            small_geom = items[j][2]
            if large_geom is None or small_geom is None:
                continue
            if not large_geom.intersects(small_geom):
                continue
            try:
                diff = as_valid(large_geom.difference(small_geom))
            except Exception:
                continue
            if diff is None or diff.is_empty or diff.area < large_geom.area * 0.15:
                # Avoid destroying a zone; skip aggressive carve.
                continue
            items[i][2] = diff
            items[i][3] = diff.area

    out = []
    for prefix, props, geom, _area in items:
        if geom is None or geom.is_empty:
            continue
        out.append({"type": "Feature", "properties": dict(props), "geometry": mapping(geom)})
    # Keep stable prefix order
    out.sort(key=lambda f: str(f["properties"].get("prefix", "")))
    return out


def process_file(name: str) -> None:
    path = DATA / name
    data = json.loads(path.read_text())
    before = len(data["features"])
    features = drop_parts_inside_other_mains(data["features"])
    features = resolve_overlaps(features)
    # Ensure unique prefixes
    seen = set()
    unique = []
    for feature in features:
        prefix = str(feature["properties"].get("prefix", ""))
        if not prefix or prefix in seen:
            continue
        seen.add(prefix)
        unique.append(feature)
    data["features"] = unique
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"{name}: {before} → {len(unique)} features")


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--include-it",
        action="store_true",
        help="Also clean it_prefix2.geojson (may reopen land gaps; re-run fill-it-land-gaps.py after).",
    )
    args = parser.parse_args()
    files = ALL_FILES if args.include_it else FILES
    for name in files:
        process_file(name)


if __name__ == "__main__":
    main()
