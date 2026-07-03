# Map integration (vanilla Leaflet)

If the app has a map, use **vanilla `leaflet`** — never `react-leaflet`.
Vanilla Leaflet with refs keeps imperative map operations (adding/removing
markers and layers, panning, fitting bounds) close to Leaflet's own API and
avoids fighting React's render cycle for something that's inherently
imperative and high-frequency (drags, live redraws).

```bash
npm install leaflet
```
```js
// main.jsx — import once, globally
import 'leaflet/dist/leaflet.css'
```

## The core pattern

```jsx
import { useRef, useEffect } from 'react'
import L from 'leaflet'
import styles from './MyMapScreen.module.css'

export default function MyMapScreen({ center }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])   // any Leaflet layers you add, for cleanup

  useEffect(() => {
    const m = L.map(mapContainerRef.current).setView([center.lat, center.lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(m)
    mapRef.current = m

    return () => {
      m.remove()
      mapRef.current = null
      markersRef.current = []
    }
  }, []) // mount/unmount only — see "Live updates" below for handling prop/state changes

  return <div ref={mapContainerRef} className={styles.map} />
}
```

Rules that keep this pattern from fighting React:
- **Markers, polygons, polylines, and rectangles live in `useRef`s, never React state.** They don't need to trigger re-renders — React state is only for UI values actually rendered in JSX (a visit counter, a status message).
- **Every `useEffect` that adds Leaflet layers must remove them in its cleanup function**, and the mount effect must call `map.remove()` on unmount.
- **For live/continuous interactions (drag, live resize), update Leaflet layers imperatively inside the event handler** (`marker.on('drag', ...)`) rather than routing every tick through `setState` — only commit to React state once, on the interaction's end event (`dragend`). This avoids re-running "redraw everything" effects on every pixel of movement. See `BoundaryScreen.jsx` in the reference implementation for draggable corner-handles built this way.
- **When a value the map depends on changes (e.g. bounds), use a separate `useEffect` keyed on that value** to redraw just the affected layer(s), rather than tearing down and recreating the whole map.

## The map is a card, not a hole in the page

Per the design philosophy, the map always sits inside the same bordered,
rounded, hard-shadowed frame as every other surface — never edge-to-edge:

```css
.map {
  border: var(--c-border-w-thick) solid var(--c-border);
  border-radius: var(--c-radius-sheet);
  box-shadow: var(--c-shadow-md);
  overflow: hidden; /* clips Leaflet's tile pane to the rounded corner */
}
```

If the map fills its flex/grid cell directly, that's all you need. If it
needs a gap from the screen edge (a "floating card" look rather than
flush), either give it a margin (and reduce its `width`/`height` to
match with `calc()`), or make it `position: absolute; inset: 10px;`
inside a `position: relative` wrapper that fills the available space —
see `GameScreen.module.css`/`BoundaryScreen.module.css` in the reference
implementation for both variants.

Floating controls over the map (buttons, badges) are opaque bordered
elements, positioned absolutely over the map, inside a wrapper with
`pointer-events: none` so empty space stays pannable — each individual
button then opts back in with `pointer-events: all`:

```css
.floatingBtns {
  position: absolute;
  top: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: flex-end; /* keep clear of Leaflet's default top-left zoom control */
  padding: 0 20px;
  pointer-events: none;
  z-index: 1000;
}
.floatBtn {
  background: var(--c-surface);
  border: var(--c-border-w-regular) solid var(--c-border);
  box-shadow: var(--c-shadow-sm);
  border-radius: 999px;
  pointer-events: all;
}
```

## Colors: why `THEME.js`, not `var(--c-...)`

Leaflet builds markers from raw HTML strings (`L.divIcon({ html: '...' })`)
and vector layers from plain JS style objects (`L.polygon(coords, { color:
'...' })`). Both are evaluated outside the DOM/CSS cascade, so CSS custom
properties aren't reachable from them. Import the `THEME` object
(`../theme.js`) wherever a marker or vector style needs a color, instead
of hardcoding hex values inline:

```jsx
import { THEME } from '../../theme'

const START_ICON = L.divIcon({
  html: `<div style="background:${THEME.surface};width:28px;height:28px;border-radius:50%;border:${THEME.borderW.regular}px solid ${THEME.border};box-shadow:${THEME.shadow.sm};"></div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
})
```

`className: ''` matters — without it Leaflet applies its own default
marker-icon class/styles, which will visually conflict with your custom
HTML.

## Numbered / labeled pin

```js
const makeNumberedIcon = (number, kind) => L.divIcon({
  html: `<div style="background:${kind === 'a' ? THEME.primary : THEME.secondary};color:${THEME.text};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:${THEME.fontDisplay};font-weight:800;font-size:14px;border:${THEME.borderW.regular}px solid ${THEME.border};box-shadow:${THEME.shadow.sm};">${number}</div>`,
  className: '', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -17],
})
```
(Barometer's real version uses `THEME.warmer`/`THEME.colder` here instead of `primary`/`secondary` — app-specific aliases added to its own copy of `theme.js`, as suggested in that file's header comment.)

## Draggable handles (e.g. a resizable/reshapeable area)

A circular handle, same bordered/hard-shadow look as everything else,
sized generously (28px+) for touch:

```js
const HANDLE_ICON = L.divIcon({
  html: `<div style="width:28px;height:28px;background:${THEME.surface};border:${THEME.borderW.regular}px solid ${THEME.border};border-radius:50%;box-shadow:3px 3px 0px ${THEME.border};cursor:grab;"></div>`,
  className: '', iconSize: [28, 28], iconAnchor: [14, 14],
})
```

Interaction pattern (see `BoundaryScreen.jsx`): on `dragstart`, snapshot
the pre-drag state into a ref. On every `drag` tick, compute the new
shape from that snapshot + the marker's live position, update the
Leaflet layer(s) directly via `.setLatLng()`/`.setBounds()`, and update
sibling markers' positions the same way — all without touching React
state. Only on `dragend` do you call `setState` once with the final
value. This keeps the drag buttery-smooth regardless of how much other
work the component does elsewhere.

## Rectangle / polygon / polyline styling

Weight bumped up from Leaflet's thin 1px default so strokes read as a
"thick ink line" consistent with the border scale, rather than a
default-Leaflet hairline:

```js
// A drawn boundary / bounding-box rectangle
{ color: THEME.border, weight: 2, fillOpacity: 0.05, dashArray: '6,5' }

// A filled region (e.g. an elimination/exclusion/coverage zone) — if it
// needs holes, Leaflet/GeoJSON supports that via nested ring arrays; only
// the style object below changes, never the ring data shape
{ color: THEME.border, weight: 2, fillColor: THEME.border, fillOpacity: 0.12 }

// A traveled path
{ color: THEME.border, weight: 3, opacity: 0.6, dashArray: '8,8' }

// A "still deciding" live preview line — use the secondary/accent color to
// visually distinguish from committed, ink-colored elements
{ color: THEME.secondary, weight: 3, opacity: 0.7, dashArray: '8,6' }
```

## Popups

Leaflet popups render outside React's DOM tree as raw HTML, so their
styling can't use CSS Modules' scoped class names — it must live in your
global stylesheet as plain, unscoped classes:

```css
/* global.css */
.leaflet-popup-content-wrapper {
  border-radius: var(--c-radius-card);
  border: var(--c-border-w-regular) solid var(--c-border);
  box-shadow: var(--c-shadow-md);
  background: var(--c-surface);
}
.leaflet-popup-tip { background: var(--c-surface); box-shadow: none; }
.leaflet-popup-content { margin: 12px 14px; font-size: 14px; }
.my-popup h3 { font-family: var(--c-font-display); font-weight: 700; }
```

```js
marker.bindPopup(`<div class="my-popup"><h3>${name}</h3></div>`)
```
