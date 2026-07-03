# Legacy: Tailwind + TypeScript components

**This folder is secondary reference material, not the default.** The
main `design_template/` (CLAUDE.md, README.md, `tokens.css`,
`primitives.module.css`, `theme.js`, `patterns/`) documents the approach
actually built and proven in a real app — Vite + React (plain JSX, no
TypeScript) + CSS Modules + vanilla `leaflet`. **Use that for new
projects, including any new geolocation/map app**, so all of the user's
web apps share one consistent stack, not two.

This folder holds an earlier, Tailwind-CSS + TypeScript flavor of the same
design tokens and component catalog (`Button`, `Card`, `Input`, `Select`,
`Toggle`, `Badge`, `Avatar`, `ProgressBar`, `BottomNav`, `BottomSheet`,
`Modal`, `Toast`, `MapView`, plus a `useHaptic` hook and a full example
screen). It was never actually integrated into a shipped app — kept here
only in case a *specific* future project both wants this exact visual
system *and* is independently already committed to Tailwind + TypeScript
(e.g. joining an existing codebase built that way). Reach for it only in
that situation, and prefer porting the *values* (colors, radii, shadows,
motion — identical to the main `tokens.css`) into that project's own
Tailwind config rather than copying these `.tsx` files verbatim, since
they haven't been exercised in production the way the vanilla approach
has.

If you do use this folder: `tokens/tokens.css` + `tokens/tailwind.tokens.js`
are the token layer (RGB-triplet CSS custom properties consumed via
Tailwind's `rgb(var(--x) / <alpha>)` convention), `components/*.tsx` are
copy-paste primitives, `hooks/useHaptic.ts` wraps the Vibration API, and
`example/App.example.tsx` is a full demo screen. Setup steps (Tailwind
config merge, `ToastProvider` wrapping, etc.) are documented at the top of
each relevant file's original comments.
