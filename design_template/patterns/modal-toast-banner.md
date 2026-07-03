# Modal, toast, and inline banner

Three different levels of "tell the user something," from most to least
intrusive.

## Modal — blocking, centered dialog

Reserve for moments that truly need to block interaction: a confirmation
before an irreversible action, a celebratory unlock. Don't use it for
routine status messages — that's what the banner/toast below are for.

```jsx
{showDialog && (
  <div className={styles.overlay}>
    <div className={styles.dialog}>
      <p>Overwrite the existing save?</p>
      <div className={styles.dialogBtns}>
        <button className={styles.dialogDanger} onClick={onOverwrite}>Overwrite</button>
        <button className={styles.dialogGhost} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  </div>
)}
```
```css
.overlay {
  position: fixed;
  inset: 0;
  background: var(--c-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}
.dialog {
  background: var(--c-surface);
  border: var(--c-border-w-thick) solid var(--c-border);
  border-radius: var(--c-radius-sheet);
  box-shadow: var(--c-shadow-lg);
  animation: pop-in 220ms cubic-bezier(.34, 1.56, .64, 1) both;
  padding: 28px 24px 20px;
  max-width: 300px;
  width: 90%;
  text-align: center;
}
.dialogBtns { display: flex; flex-direction: column; gap: 8px; }
.dialogBtns button {
  width: 100%;
  padding: 12px;
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-control);
  box-shadow: var(--c-shadow-sm);
  font-weight: 600;
  transition: transform 150ms ease-out, box-shadow 150ms ease-out;
}
.dialogBtns button:active { transform: translate(2px, 2px); box-shadow: none !important; }
```
(The last two rules duplicate `primitives.module.css`'s `tactileSm` by
hand rather than `composes`, because CSS Modules' `composes` only works
on a single class selector, not a descendant selector like
`.dialogBtns button` — compose on the individual button classes instead
if you give each one its own class.)

## Inline banner — non-blocking status inside a panel

For "3 items loaded", "Could not find that", "Game saved" — appears
inline within whatever panel is relevant, auto-dismisses:

```css
.banner {
  padding: 8px 12px;
  border: var(--c-border-w-thin) solid var(--c-border);
  border-radius: var(--c-radius-chip);
  font-size: 13px;
  font-weight: 500;
  animation: slide-up 220ms ease-out;
}
.bannerError   { background: var(--c-primary-pastel); color: var(--c-text); }
.bannerSuccess { background: var(--c-success-pastel); color: var(--c-text); }
.bannerInfo    { background: var(--c-surface); color: var(--c-text-2); }
```
```jsx
const [banner, setBanner] = useState(null) // { text, type: 'error'|'success'|'info' }
const timerRef = useRef(null)

function showBanner(text, type = 'info', duration = 3500) {
  if (timerRef.current) clearTimeout(timerRef.current)
  setBanner({ text, type })
  if (duration > 0) timerRef.current = setTimeout(() => setBanner(null), duration)
}
```

## Feedback text — a single changing value, no chrome at all

For something like "Warmer"/"Colder" that updates in place in a status
row — just the `slide-up` animation and a semantic color, no card:

```css
.feedback { font-weight: 700; animation: slide-up 220ms ease-out; }
.feedbackWarm { color: var(--c-primary); }
.feedbackCold { color: var(--c-tertiary-pastel); }
```

## Choosing between them

| Use case | Component |
|---|---|
| Confirm a destructive/overwrite action | Modal |
| "N items loaded" / a fetch error / a save confirmation | Inline banner |
| A value that changes in response to user action | Feedback text |
| A truly global notification, unrelated to the current panel | A fixed-position toast stack (top of screen, `slide-up` in, auto-dismiss ~2800ms) — build the same way as the inline banner but positioned `fixed` at the top of the viewport instead of inline in a panel |
