# Cards, badges, and inputs

## Card

The base bordered surface — used directly for content grouping, and as
the foundation the accordion/modal patterns build on:

```css
.card {
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-card);
  background: var(--c-surface);
  box-shadow: var(--c-shadow-md); /* shadow-sm for a denser list of many small cards */
  padding: 16px;
}
```
A card only needs `composes: tactile` if it's itself clickable (e.g. a
saved-item row that opens something) — a purely informational card stays
static, no press feedback.

## Badge / status chip

Small pill for a status label, category tag, or count:

```css
.badge {
  display: inline-block;
  padding: 2px 8px;
  border: var(--c-border-w-thin) solid var(--c-border);
  border-radius: var(--c-radius-chip);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--c-text);
}
/* Variants — pastel backgrounds, always ink text: */
.badgeNeutral  { background: var(--c-surface); }
.badgeInfo     { background: var(--c-tertiary-pastel); }
.badgeSuccess  { background: var(--c-success-pastel); }
.badgeWarning  { background: var(--c-warning); }
.badgeDanger   { background: var(--c-primary-pastel); }
```

## Text input

The "carved slot" look — bordered, subtle shadow, generous padding:

```css
.input {
  width: 100%;
  padding: 13px 14px;
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-control);
  box-shadow: var(--c-shadow-sm);
  font-size: 16px; /* 16px minimum — smaller sizes trigger iOS Safari zoom-on-focus */
  font-family: inherit;
  outline: none;
  color: var(--c-text);
  background: var(--c-surface);
  transition: border-color 0.2s;
  -webkit-appearance: none;
}
.input:focus { border-color: var(--c-secondary); }
.input:disabled { background: var(--c-bg); color: var(--c-text-3); }
```
For a validation error: `border-color: var(--c-danger)` plus
`animation: shake 400ms ease-in-out;` (see tokens.css) and a small red
helper line below, `color: var(--c-error); font-weight: 600;`.

## Checkbox

Leave native checkboxes native (don't build a custom SVG toggle for a
simple boolean) — just recolor the accent and keep the border language
consistent for the (rare) case it's rendered unchecked and empty:

```css
.checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  border: var(--c-border-w-thin) solid var(--c-border);
  border-radius: 4px; /* deliberately smaller than --c-radius-chip — that radius looks bulbous at 18px */
  accent-color: var(--c-secondary);
}
```

## List row (e.g. a saved-item / history entry)

A card per row, not a flat divided list — "nothing is flat or timid":

```css
.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: var(--c-border-w-thin) solid var(--c-border);
  border-radius: var(--c-radius-control);
  background: var(--c-surface);
  box-shadow: var(--c-shadow-sm);
  margin-bottom: 10px;
}
.row:last-child { margin-bottom: 0; }
```
