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
FILES = ("hu_prefix1.geojson", "de_prefix2.geojson", "it_prefix2.geojson")


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
    """Keep significant parts near the main mass; drop tiny distant scraps."""
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
        # Nagy, de a fő tömegtől távoli darab = tipikus névütközéses hibás hozzárendelés (pl. Kömlő→Komló).
        if gap > 1.2:
            continue
        if part.area >= main.area * min_keep_ratio:
            kept.append(part)
            continue
        if gap <= max_gap_deg:
            kept.append(part)
            continue
    if len(kept) == 1:
        return kept[0]
    return unary_union(kept)


def drop_parts_inside_other_mains(features: list[dict]) -> list[dict]:
    """Remove or reassign polygon scraps that belong inside another zone's main body."""
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
    # Collect reassignments: scrap → host prefix
    extras: dict[str, list] = {p: [] for p in cleaned_parts}
    kept_parts: dict[str, list] = {p: [] for p in cleaned_parts}

    for prefix, parts in cleaned_parts.items():
        own_main = parts[0]
        for idx, part in enumerate(parts):
            if idx == 0:
                kept_parts[prefix].append(part)
                continue

            pt = part.representative_point()
            host = None
            host_overlap = 0.0
            for other_prefix, other_main in other_mains:
                if other_prefix == prefix:
                    continue
                try:
                    if other_main.contains(pt) or other_main.covers(pt) or other_main.intersects(part):
                        try:
                            overlap = other_main.intersection(part).area
                        except Exception:
                            overlap = part.area if other_main.contains(pt) else 0.0
                        # Prefer host that covers most of the scrap, and only if scrap is smaller.
                        if part.area < other_main.area * 0.35 and overlap >= host_overlap:
                            if overlap > part.area * 0.2 or other_main.contains(pt) or other_main.covers(pt):
                                host = other_prefix
                                host_overlap = overlap
                except Exception:
                    continue

            far_from_own = False
            try:
                far_from_own = own_main.distance(part) > 1.2
            except Exception:
                far_from_own = False

            if host and (host_overlap > 0 or far_from_own):
                # Reassign mis-attached scrap (e.g. Kömlő stuck on Komló/zone 7) to the host zone.
                extras.setdefault(host, []).append(part)
                continue

            if far_from_own and part.area < own_main.area * 0.08:
                # Distant tiny scrap with no clear host — drop.
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
    for name in FILES:
        process_file(name)


if __name__ == "__main__":
    main()
