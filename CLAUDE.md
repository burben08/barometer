# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

No test runner or linter is configured yet.

## Architecture Overview

**Bar Hunt** is a browser-based "hot and cold" bar-finding game built with React + Vite. Players pick a starting location and game area, then guess bars by name. Each guess reveals warmer (closer) or colder (farther from the target), and an elimination zone polygon is drawn on the map to narrow the search.

## UI
The web app will be played mostly on phones. Consider this in the design of the UI. Make pages scrollable with longer text, so nothing is cutoff.

### Project structure

```
src/
  main.jsx                    ← React entry point; imports Leaflet CSS + global CSS
  App.jsx                     ← screen router: 'setup' | 'boundary' | 'game'
  constants.js                ← SIZE_PRESETS, STEP_SIZES, SIZES, REGIONS, REGION_FLAGS
  components/
    SetupScreen/              ← pure React form; no Leaflet
    BoundaryScreen/           ← React controls + Leaflet map via useRef
    GameScreen/               ← React header + Leaflet map via useRef; all game logic
  lib/
    sphericalPolygon.js       ← great-circle geometry, bisection, elimination polygon
    planarPolygon.js          ← flat polygon clipping; isPointInPolygon (winding number)
    mergePolygons.js          ← Turf.js union wrapper
    globalBarSelection.js     ← region mode: density-grid weighted cell selection
    overpassApi.js            ← custom mode: fetch bars/pubs from Overpass API
    geocoding.js              ← Photon/Komoot geocoding
    gameBounds.js             ← GAME_BOUNDS_Regions, calculateBoundsFromCenter
    encoder.js                ← Base64 encode/decode (unused; reserved for seed sharing)
  styles/
    global.css                ← reset, Leaflet popup overrides, shared keyframes
public/
  bar_density_grid.json       ← 2°×2° global bar-density grid (region mode)
  bar_density_grid_1x1.json   ← 1°×1° alternate grid (not yet wired up)
  favicon.ico
tools/                        ← data-generation scripts (not part of the app)
  CreateGlobalBarDistribution.py
  RefineGrid.py
  GeodesicInterpolation.ipynb
  VisualizeBarDensityMap.ipynb
```

### Screen routing

`App.jsx` holds `screen` state (`'setup' | 'boundary' | 'game'`) and a `gameConfig` object. Region mode skips the boundary screen and jumps directly to game. Config shape:

```js
{
  startLocation: { name, lat, lng },
  selectedSize: 'M',           // or region name like 'Switzerland'
  selectedMode: 'custom',      // 'custom' | 'region'
  restaurantsConsidered: false,
  seed: 'abc123',
  gameBounds: { north, south, east, west },
}
```

### React ↔ Leaflet pattern

Both `BoundaryScreen` and `GameScreen` use a `<div ref={mapContainerRef}>` for the map container. Leaflet is initialized inside `useEffect` on mount and cleaned up (`map.remove()`) on unmount. **Do not use react-leaflet** — vanilla Leaflet with refs keeps the imperative map operations close to the original logic.

Leaflet objects (markers, polygons, polylines) are stored in `useRef`s, not React state, because they don't need to trigger re-renders. React state is only used for UI values shown in the header (visit count, message text, etc.).

### Two bar-selection modes

- **Custom**: `overpassApi.fetchBarsInBounds()` queries all named `bar`/`pub` (optionally `restaurant`) nodes inside the bounding box via Overpass API.
- **Region**: `globalBarSelection.drawRandomBarFromDensityGrid()` uses `public/bar_density_grid.json` (2°×2° cells weighted by bar count) to pick a cell, then queries Overpass for bars only in that cell.

### Coordinate conventions

- Leaflet: `[lat, lng]` (Y, X)
- All `src/lib/` modules: `[lon, lat]` (X, Y)
- Convert when drawing on the map: `[lon, lat]` → `[c[1], c[0]]`

### Special debug mode

Seed `"Hacker"` renders all bars as red dots on the map and shows a remaining-bar counter that decrements as elimination zones cover bars.

### External APIs (require internet)

- **Photon/Komoot** — geocoding (`lib/geocoding.js`)
- **Overpass API** — OSM bar/pub data (`lib/overpassApi.js`, `lib/globalBarSelection.js`)
- **OpenStreetMap tiles** — base map layer (Leaflet)
