"""
Generates public/country_boundaries.json — simplified real country outline
polygons for Barometer's "country mode" (used to verify selected/candidate
bars and player guesses are actually inside the chosen country, and to draw
the real boundary on the map, instead of the old hand-picked bounding
rectangles in src/lib/gameBounds.js).

Source: Natural Earth's 1:50m Admin-0 Countries dataset (public domain),
fetched as GeoJSON from a GitHub mirror of the official Natural Earth data
(https://github.com/nvkelso/natural-earth-vector). Chosen over assembling
OSM administrative-boundary relations directly: Natural Earth ships one
clean ring set per country already, so there's no way-stitching to do, and
its precision (roughly comparable to the app's own 1-2 degree density-grid
resolution) is more than enough for a hot/cold game.

Dependencies (ad hoc — not part of any requirements file in this repo,
same as the other scripts in this folder):
    pip install shapely requests

Usage:
    py tools/FetchCountryBoundaries.py
"""
import json
import os
import requests
from shapely.geometry import shape, mapping
from shapely.ops import transform

NE_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'
CACHE_PATH = os.path.join(os.path.dirname(__file__), '_ne_countries_cache.geojson')
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'country_boundaries.json')

COUNTRIES = ['Switzerland', 'Germany', 'France', 'Italy', 'Austria', 'Spain']

# Keep only sub-polygons (islands, mainland) whose centroid falls in this
# box, so overseas territories (French Guiana, Canary Islands' outliers,
# etc.) don't balloon the shape or its bounding box. Generous enough to
# keep Corsica, Sardinia, Sicily, the Balearics, Rügen, etc.
EUROPE_BBOX = {'south': 34.0, 'north': 72.0, 'west': -15.0, 'east': 35.0}

# Per-country simplification tolerance (degrees, ~1 unit = ~111km at the
# equator) — tuned so each country lands roughly in the 150-400 vertex
# range. Bigger/more convoluted coastlines need a coarser tolerance to
# avoid an overly large file; compact/simple ones can stay finer.
SIMPLIFY_TOLERANCE = {
    'Switzerland': 0.006,
    'Austria': 0.006,
    'Germany': 0.01,
    'France': 0.012,
    'Italy': 0.01,
    'Spain': 0.012,
}


def fetch_natural_earth():
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, encoding='utf-8') as f:
            return json.load(f)
    print('Downloading Natural Earth admin-0 countries...')
    r = requests.get(NE_URL, timeout=60)
    r.raise_for_status()
    data = r.json()
    with open(CACHE_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    return data


def in_europe_bbox(poly):
    c = poly.centroid
    return (EUROPE_BBOX['south'] <= c.y <= EUROPE_BBOX['north']
            and EUROPE_BBOX['west'] <= c.x <= EUROPE_BBOX['east'])


def filter_to_europe(geom):
    """Drop overseas sub-polygons from a (Multi)Polygon, keeping mainland +
    nearby islands only."""
    if geom.geom_type == 'Polygon':
        return geom if in_europe_bbox(geom) else None
    kept = [p for p in geom.geoms if in_europe_bbox(p)]
    if not kept:
        return None
    if len(kept) == 1:
        return kept[0]
    from shapely.geometry import MultiPolygon
    return MultiPolygon(kept)


def vertex_count(geom):
    if geom.geom_type == 'Polygon':
        return len(geom.exterior.coords) + sum(len(r.coords) for r in geom.interiors)
    return sum(vertex_count(p) for p in geom.geoms)


def main():
    data = fetch_natural_earth()
    by_name = {}
    for feat in data['features']:
        name = feat['properties'].get('NAME')
        if name in COUNTRIES:
            by_name[name] = shape(feat['geometry'])

    missing = [c for c in COUNTRIES if c not in by_name]
    if missing:
        raise SystemExit(f'Could not find in Natural Earth data: {missing}')

    result = {}
    for name in COUNTRIES:
        geom = filter_to_europe(by_name[name])
        if geom is None:
            raise SystemExit(f'{name}: no rings survived the Europe bbox filter')

        tolerance = SIMPLIFY_TOLERANCE.get(name, 0.01)
        simplified = geom.simplify(tolerance, preserve_topology=True)

        vcount = vertex_count(simplified)
        bounds = simplified.bounds  # (minx, miny, maxx, maxy) = (west, south, east, north)

        print(f'{name}: {simplified.geom_type}, {vcount} vertices, '
              f'bbox south={bounds[1]:.3f} north={bounds[3]:.3f} '
              f'west={bounds[0]:.3f} east={bounds[2]:.3f}')

        result[name] = mapping(simplified)  # {'type': ..., 'coordinates': ...}

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(result, f, separators=(',', ':'))

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f'\nWrote {OUTPUT_PATH} ({size_kb:.1f} KB)')


if __name__ == '__main__':
    main()
