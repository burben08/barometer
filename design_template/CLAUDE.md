# Design & implementation system — "Playful Neo-Brutalism"

This folder is a portable design system **and** implementation reference
for Ben's web apps (starting with Barometer, a geolocation "hot and cold"
game). It documents not just how things should *look*, but how they
should be *built*, so every new app shares one consistent stack instead
of reinventing conventions each time.

**If you are Claude Code working anywhere in this repository: treat this
file as binding guidance** for both visual design and implementation
approach. Reuse the tokens and patterns below before inventing new
colors, spacing, shadows, or component structures. If a needed pattern
doesn't exist yet, build it using the same tokens/conventions, and add it
back to `patterns/` (see "Evolving the system" at the bottom).

If this file was pulled in via an `@import` from the project's root
`CLAUDE.md`, all paths below are relative to this folder's location in
that repo.

## Design philosophy

- **Playful neo-brutalism.** Thick black-ish borders, solid offset
  drop-shadows (no blur), bold saturated colors, chunky rounded corners.
  Nothing is flat or timid — every surface looks like it could be picked
  up.
- **Tactile, not decorative.** Motion and shape exist to make actions feel
  physical and satisfying (a button that "presses down," a marker that
  pops in, a value that bounces once when it changes) — not to show off.
  When in doubt, cut the animation rather than add a new one.
- **Map-first**, for apps with a map. The map is a first-class screen, not
  an afterthought — it gets the same bordered "frame" treatment as every
  card, and floating UI over it stays legible and thumb-reachable.
- **Fun and legible outdoors.** High contrast, big bold numbers for
  stats/values, a warm cream background instead of clinical white — this
  should feel like a game or a tool with personality, not a spreadsheet.

## Tech stack

This is the stack to use for a new app, in order of how load-bearing each
choice is:

| Layer | Choice | Not this |
|---|---|---|
| Build tool | **Vite** | Create React App, Next.js (unless SSR is actually needed) |
| UI library | **React 18**, function components + hooks | — |
| Language | **Plain JavaScript (JSX)** | TypeScript — adds a build-config layer and type-authoring overhead this app size doesn't need |
| Styling | **CSS Modules**, one `Component.module.css` per `Component.jsx`, colocated | Tailwind, styled-components, CSS-in-JS |
| Design tokens | **Plain CSS custom properties** (`tokens.css`, imported once globally) | Tailwind's `theme.extend`, a JS theme object as the source of truth |
| State management | **`useState`/`useRef`/`useEffect` only**, lifted to the nearest common ancestor | Redux, Zustand, Context for things that don't need it |
| Icons | **`lucide-react`** exclusively | Emoji in UI copy, mixed icon sets, hand-drawn SVGs |
| Maps | **Vanilla `leaflet`**, via `useRef`/`useEffect` | `react-leaflet` |
| Deployment | **Firebase Hosting** (`firebase-tools`, `firebase.json`, `npm run deploy`) | GitHub Pages (flaky propagation, awkward for a SPA), Vercel/Netlify (fine, but not the established convention here) |

Why plain JSX over TypeScript, and CSS Modules over Tailwind: these are
small, single-developer apps where the bigger risk is build-tooling
complexity and migration friction, not type safety or utility-class
sprawl. If a specific project's requirements genuinely call for
TypeScript or Tailwind, that's a deliberate per-project decision to raise
with the user first — don't default into it.

## New project setup

```bash
npm create vite@latest my-app -- --template react
cd my-app
npm install leaflet lucide-react          # + any app-specific deps (e.g. @turf/turf for geometry)
npm install --save-dev firebase-tools
```

1. Copy this whole folder into the new repo (e.g. as `design_template/` at
   the repo root, same as here).
2. In `src/main.jsx`, import the tokens once, globally, before any
   component CSS:
   ```jsx
   import 'leaflet/dist/leaflet.css'   // only if the app uses maps
   import '../design_template/tokens.css'
   import './styles/global.css'         // the app's own resets/overrides — see below
   ```
   Or fold `tokens.css`'s contents directly into the app's own
   `src/styles/global.css` (this is what Barometer does — see that file
   for a worked example of tokens + resets + global unscoped classes like
   Leaflet popup overrides, all in one file).
3. Copy `primitives.module.css` and `theme.js` into the app's `src/`
   (e.g. `src/styles/primitives.module.css` and `src/lib/theme.js`) —
   these need to live inside `src/` so relative `composes`/`import`
   paths from component files resolve.
4. Set `vite.config.js`'s `base` appropriately for the deploy target —
   `'/'` for Firebase Hosting (its own domain root), not a GitHub-Pages-
   style subpath.
5. Set up Firebase Hosting (see "Deployment" below).
6. In the new project's root `CLAUDE.md`, add near the top:
   ```
   There is a UI design template with instructions in the design_template
   folder. Follow it for all UI/implementation work.
   ```
   so future Claude Code sessions in that repo load this spec.

## Folder structure

```
src/
  main.jsx              ← entry point: renders <App/>, imports leaflet.css (if used) + global.css
  App.jsx               ← screen router — see "App structure" below
  constants.js           ← app-wide constant values/lookup tables (optional)
  components/
    ScreenName/
      ScreenName.jsx           ← one screen or major reusable component
      ScreenName.module.css    ← its styles, colocated
  lib/                   ← pure logic modules — no React, no JSX. Geometry,
                            API clients, data transforms, save/load, etc.
                            Anything here should be independently testable.
    theme.js              ← JS mirror of tokens.css's colors (see patterns/map-integration.md)
  styles/
    global.css            ← :root tokens (or @import tokens.css) + resets +
                            global unscoped classes (e.g. Leaflet popups,
                            which live outside React's DOM and can't use
                            CSS Modules' scoped class names) + shared keyframes
    primitives.module.css  ← the tactile-press composable classes
public/                  ← static assets served as-is (favicon, data files)
```

Every screen/component is a **folder with a matching `.jsx` + `.module.css`
pair** — never a bare `Component.jsx` with no folder once it has its own
styles, and never global/shared CSS classes for something screen-specific
(only `styles/global.css` holds anything unscoped, and only because it
has to be — see above).

## Tokens — the only source of visual values

`tokens.css` is the complete, copy-pasteable token set: colors, type,
radius scale, border-width scale, hard-offset shadows, and the 5 motion
keyframes. Read that file directly rather than duplicating its contents
here — it's short and it's the actual source of truth.

**Never hardcode a hex color, an arbitrary shadow value, or a one-off
border-radius in component CSS.** Always reference a `var(--c-*)` token.
If you catch yourself writing a raw hex code or `box-shadow: 0 2px 4px
rgba(...)`, that's a bug — replace it with a token, or add a new token to
`tokens.css` if the value is genuinely missing and will recur.

The one place tokens genuinely can't reach is code that runs outside the
CSS cascade — Leaflet marker HTML strings, Canvas/SVG drawing, vector
layer style objects. For that, mirror the palette in `theme.js` and
import `THEME.*` there instead of a raw hex literal (see
`patterns/map-integration.md`).

## The tactile interaction pattern

Every interactive element (buttons, chips, cards) uses ONE press effect:
translate down-right by the shadow's offset while the shadow disappears,
reading as "pushed flat against the surface." This is
`primitives.module.css`'s `.tactile` (pairs with `--c-shadow-md`, 3px
offset) and `.tactileSm` (pairs with `--c-shadow-sm`, 2px offset), applied
via CSS Modules' `composes`:

```css
.myButton {
  composes: tactile from '../../styles/primitives.module.css';
  background: var(--c-primary);
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-control);
  box-shadow: var(--c-shadow-md);
}
```

`composes` only works when the target is a single class selector (not a
descendant selector like `.parent button`) — if you need the pattern on
several elements matched by a descendant selector, either give each its
own class, or copy the two-line `transition`/`:active` rule by hand (see
`patterns/modal-toast-banner.md` for a worked example of when that's
necessary).

There is no `:hover` fade as the primary feedback anywhere in this
system — these are mobile-first, touch-first apps. A subtle `:hover`
border-color bump is fine as a bonus for mouse users, never the only
affordance.

## Motion

Only these keyframes exist (all in `tokens.css`) — reach for one of these
before writing a new animation. Keep everything under ~500ms. Nothing
should loop except `pulse-ring` (and `spin`, for loading spinners, a
pragmatic addition beyond the original 5):

- `pop-in` — modals, new map pins appearing, achievement-style reveals
- `bounce-once` — a value that just changed, a "found it" marker
- `shake` — invalid input, failed action
- `slide-up` — banners/toasts entering
- `pulse-ring` (wrapper needs `position: relative`) — a "you are here" map dot
- `spin` — loading spinners

## Icons

**`lucide-react` exclusively** — never emoji, never a mixed icon set,
never hand-rolled SVGs unless Lucide genuinely lacks the icon. Default
stroke width 2 (the library default); bump to `strokeWidth={2.5}` for an
emphasized/active state. Inline icons 14–18px, feature icons 20–28px.

```jsx
import { ArrowLeft, Globe, Pencil } from 'lucide-react'
<button className={styles.navBtn}><Globe size={16} />Use a country boundary instead</button>
```

Country/region flags are the one exception — use the flag emoji directly
(`🇨🇭`), since Lucide has no flag icons and there's no meaningful
"redraw" alternative.

`lucide-react` is a plain React component package — it does **not**
require Tailwind or TypeScript, so it's used the same way in this stack
as it would be anywhere else.

## Component patterns

There's no prebuilt component *library* (no `<Button>`/`<Card>` you
import) — instead, `patterns/` documents the CSS recipe + JSX shape for
each recurring pattern, which you compose directly into each screen's own
`.module.css`. This keeps every screen's styling self-contained and
avoids a shared-component abstraction layer that would need its own
prop-API design:

| Pattern | File |
|---|---|
| Buttons (primary, ghost, nav/mode-switch, solid semantic, icon-only, floating pill, selected state) | `patterns/buttons.md` |
| Cards, badges, text inputs, checkboxes, list rows | `patterns/cards-badges-inputs.md` |
| Accordion / expand-collapse section | `patterns/accordion.md` |
| Range slider (incl. log-scale for wide-range values) | `patterns/slider.md` |
| Modal, inline banner, toast, feedback text | `patterns/modal-toast-banner.md` |
| Maps: vanilla Leaflet integration, map frame, markers, draggable handles, vector overlays | `patterns/map-integration.md` |

`example/ExampleScreen.jsx` + `.module.css` shows several of these
composed into one small working screen — copy its file shape (colocated
`.jsx`/`.module.css`, plain functions, `useState` for local UI state) for
every new screen.

## App structure conventions

**Screen routing**: a single top-level `App.jsx` holds a `screen` string
state (e.g. `'setup' | 'boundary' | 'game'`) and renders exactly one
screen component based on it — no router library needed for an app with
a handful of linear/branching screens. Pass a single config object down
through `on*` callback props as the user progresses, accumulating fields
at each step:

```jsx
const [screen, setScreen] = useState('setup')
const [config, setConfig] = useState(null)

{screen === 'setup' && <SetupScreen onContinue={c => { setConfig(c); setScreen('next') }} />}
{screen === 'next'  && <NextScreen config={config} onBack={() => setScreen('setup')} />}
```

**Hidden feature flags**: to ship a screen with a feature that's built but
not ready to expose, gate it behind a `const SHOW_X = false` at the top of
the file, wrapping only the JSX (never delete the underlying state/logic).
This keeps the code fully working and re-enablable with a one-line flip:

```jsx
const SHOW_ADVANCED = false
// ...
{SHOW_ADVANCED && <AccordionSection label="Advanced">...</AccordionSection>}
```

**Don't build a dropdown/accordion for a single option.** If a section is
the only thing in its group, render it as a static, always-expanded card
instead of a collapsible one with a chevron nobody needs to tap (see
`patterns/accordion.md`'s "If there's only one section").

## Deployment (Firebase Hosting)

```json
// firebase.json
{
  "hosting": {
    "site": "your-site-id",
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [{ "source": "/assets/**", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] }]
  }
}
```
```json
// .firebaserc
{ "projects": { "default": "your-firebase-project-id" } }
```
```json
// package.json
{ "scripts": { "deploy": "npm run build && firebase deploy --only hosting" } }
```

`firebase login` is a one-time, per-machine, interactive step (opens a
browser for Google OAuth) — never scripted, always run by the human
directly. Everything after that (`firebase projects:create`,
`firebase hosting:sites:create`, `firebase deploy`) can run
non-interactively once logged in. Google Cloud caps total projects per
account (and deleted projects still count against that cap for a ~30-day
grace period) — if project creation fails on quota, the fastest fix is
usually adding a new Hosting **site** to an existing project
(`firebase hosting:sites:create <new-site-id> --project <existing-project>`)
rather than provisioning a whole new project.

## Evolving the system

This is a living reference — as new apps get built against it, patterns
that prove themselves should get folded back into `patterns/` (or
`tokens.css`, if it's a genuinely new token) so the *next* app starts
from a stronger baseline. If you build something reusable that isn't
covered here, add a doc for it before moving on.

## Legacy: Tailwind + TypeScript

`legacy-tailwind/` holds an earlier, unused exploration of this same
design system built for Tailwind CSS + TypeScript. It is **not** the
default — see `legacy-tailwind/README.md` for when (rarely) it's actually
relevant.
