# Buttons

Every clickable element gets the tactile press pattern (`composes: tactile`
or `tactileSm` from `primitives.module.css` — see CLAUDE.md) plus a hard
offset shadow that disappears on press. There is no plain-text "link
button" anywhere in this system — if something is clickable, it looks
clickable: a bordered, shadowed shape. Use an icon from `lucide-react`
next to the label wherever one clarifies the action (see CLAUDE.md's icon
section) — never an emoji.

## Primary CTA

Full-width, the loudest action on the screen ("Continue", "Start Game",
"Confirm"). At most one per screen.

```css
.primaryBtn {
  composes: tactile from '../../styles/primitives.module.css';
  width: 100%;
  height: 52px; /* 56px for a hero CTA at the very bottom of a form */
  background: var(--c-primary);
  color: var(--c-text); /* ink text on coral, not white */
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-control);
  box-shadow: var(--c-shadow-md);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
.primaryBtn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
```

## Secondary / ghost

Anything that isn't the primary action but still needs to look pressable
— "Back", "Cancel", switching modes. Same shape as primary, surface
background instead of a color:

```css
.ghostBtn {
  composes: tactile from '../../styles/primitives.module.css'; /* tactileSm for a smaller instance */
  display: flex;
  align-items: center;
  gap: 6px; /* if it carries an icon */
  height: 52px;
  padding: 0 20px;
  background: var(--c-surface);
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-control);
  box-shadow: var(--c-shadow-md);
  font-size: 15px;
  font-weight: 600;
  color: var(--c-text);
  cursor: pointer;
  font-family: inherit;
}
```

## Full-width nav/mode-switch button

Replaces what would otherwise be a plain text link ("Use a country
boundary instead", "Enter a location manually instead") — a secondary
action that changes what the screen shows, not a navigation/ghost action
in a button row:

```jsx
<button type="button" className={styles.navBtn} onClick={...}>
  <Globe size={16} />
  Use a country boundary instead
</button>
```
```css
.navBtn {
  composes: tactileSm from '../../styles/primitives.module.css';
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 48px;
  margin-bottom: 16px;
  background: var(--c-surface);
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-control);
  box-shadow: var(--c-shadow-sm);
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text);
  cursor: pointer;
  font-family: inherit;
}
```

## Solid semantic (success / danger)

For a confirm/destructive action that needs its own color rather than the
neutral ghost treatment — these get white text (unlike primary's ink
text), matching the "pop, saturated" pastel-vs-solid distinction in
tokens.css:

```css
.successBtn { background: var(--c-success); color: white; /* + same border/radius/shadow/tactile as primaryBtn */ }
.dangerBtn  { background: var(--c-danger);  color: white; }
```

## Icon-only / chip button

Small circular or chip-radius button for a single icon action (delete,
close) — smaller footprint, `tactileSm` + `shadow-sm`:

```css
.iconBtn {
  composes: tactileSm from '../../styles/primitives.module.css';
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-surface);
  border: var(--c-border-w-thin) solid var(--c-border);
  border-radius: var(--c-radius-chip);
  box-shadow: var(--c-shadow-sm);
  color: var(--c-text-2);
  cursor: pointer;
}
.iconBtn:hover { background: var(--c-primary-pastel); color: var(--c-text); }
```

## Floating pill (over a map or other full-bleed content)

```css
.floatBtn {
  composes: tactileSm from '../../styles/primitives.module.css';
  height: 36px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 5px;
  border-radius: 999px;
  background: var(--c-surface);
  border: var(--c-border-w-regular) solid var(--c-border);
  box-shadow: var(--c-shadow-sm);
  font-size: 13px;
  font-weight: 600;
  color: var(--c-text);
  cursor: pointer;
}
```
Group related floating buttons together and right- or left-align the
whole group — don't spread individual floating buttons to opposite
corners of the screen, since Leaflet's default zoom control always
occupies the top-left corner and will collide with anything placed there.

## Selected/active state (for a grid or list of choice buttons)

```css
.choiceBtn.selected {
  background: var(--c-secondary-pastel); /* pastel, not full-saturation — matches BottomNav's active-item treatment */
}
```

## What NOT to do

- Don't use a blurred `box-shadow` — always one of the `--c-shadow-*` hard
  offsets.
- Don't add a `:hover` opacity fade as the primary feedback — the tactile
  `:active` press *is* the feedback. A `:hover` border-color bump is fine
  as a bonus for mouse users, but never the only affordance.
- Don't leave a clickable action as unstyled text. If it's a button,
  render a `<button>` with a border and a shadow.
