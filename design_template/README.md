# Design & implementation template — Playful Neo-Brutalism

A portable reference for building Ben's web apps consistently: bold
colors, thick borders, hard offset shadows, and a satisfying "physical
button press" on everything tappable — plus the actual tech stack and
folder conventions used to build them, proven in Barometer (a Leaflet-map
based geolocation game).

This folder is meant to be **copied wholesale into each new app's repo**.
Once it's there, Claude Code in that repo reads `CLAUDE.md` and applies
both the visual system and the implementation conventions automatically.

## What's in here

```
CLAUDE.md                    ← the spec Claude Code reads automatically — read this first
README.md                    ← this file (for humans)
tokens.css                   ← design tokens: colors, type, radius, shadow, motion keyframes
primitives.module.css        ← the shared tactile-press CSS Modules classes
theme.js                     ← JS mirror of the palette, for Leaflet/Canvas code that can't read CSS vars
patterns/                    ← CSS + JSX recipes for recurring UI, one file per pattern
  buttons.md
  cards-badges-inputs.md
  accordion.md
  slider.md
  modal-toast-banner.md
  map-integration.md          ← vanilla Leaflet: the React↔map pattern, map framing, markers, draggable handles
example/
  ExampleScreen.jsx            ← a small working screen composing several patterns together
  ExampleScreen.module.css
legacy-tailwind/              ← an earlier, unused Tailwind+TypeScript exploration — secondary, see its own README
```

## Why this stack

Vite + React (plain JSX, **no TypeScript**) + CSS Modules (colocated
`Component.jsx` + `Component.module.css`) + vanilla `leaflet` (never
`react-leaflet`) + `lucide-react` for icons + plain `useState`/`useRef` for
state + Firebase Hosting for deployment. No Tailwind, no component
library, no state-management library. This is a deliberate choice for
apps at this scale — see `CLAUDE.md`'s "Tech stack" section for the full
reasoning and the exact dependency list.

## Installing into a new app

1. Copy this entire folder into the new project's repo root as
   `design_template/`.
2. `npm install leaflet lucide-react` (+ `npm install --save-dev
   firebase-tools`, + any app-specific logic dependencies).
3. Fold `tokens.css` into the app's `src/styles/global.css` (or `@import`
   it from there), and copy `primitives.module.css` + `theme.js` into
   `src/styles/` and `src/lib/` respectively.
4. Set `vite.config.js`'s `base: '/'` and set up Firebase Hosting
   (`firebase.json` + `.firebaserc` — see `CLAUDE.md`'s "Deployment"
   section for the exact config).
5. Add this line near the top of the new project's root `CLAUDE.md`:
   ```
   There is a UI design template with instructions in the design_template
   folder. Follow it for all UI/implementation work.
   ```

Full step-by-step detail (including the exact `main.jsx` import order and
folder structure to follow) is in `CLAUDE.md`'s "New project setup"
section — that file is the actual source of truth; keep this README as
the quick human-facing summary.

## Seeing it in action

`example/ExampleScreen.jsx` is a small working screen (title, card, badge,
input, inline banner, primary/ghost buttons) built entirely from the
patterns in `patterns/`. For a full real app built this way end to end,
Barometer itself (the repo this template lives in) is the reference —
its `src/components/*/*.jsx` + `*.module.css` pairs are the canonical
worked examples for every pattern documented here, including the map
integration.

## Evolving the system

This is a living template — as new apps get built against it, patterns
that prove themselves should get folded back into `patterns/` (or
`tokens.css`, if it's a genuinely new token) so the next app starts from a
stronger baseline. If you catch yourself writing a raw hex code or an
arbitrary shadow value in an app, that value belongs in `tokens.css`
instead.
