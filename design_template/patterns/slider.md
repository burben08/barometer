# Slider (range input)

Not a native browser look — the track gets the border/radius language of a
chip, the thumb gets the hard-shadow + border treatment of everything else.

```jsx
<input
  type="range"
  min="0" max="1" step="0.001"
  value={sliderValue}
  onChange={e => handleSlider(parseFloat(e.target.value))}
  className={styles.slider}
/>
```

```css
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 12px;
  border-radius: var(--c-radius-chip);
  background: var(--c-surface);
  border: var(--c-border-w-regular) solid var(--c-border);
  outline: none;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--c-secondary);
  border: var(--c-border-w-regular) solid var(--c-border);
  box-shadow: var(--c-shadow-sm);
  cursor: grab;
}

.slider::-moz-range-thumb {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--c-secondary);
  border: var(--c-border-w-regular) solid var(--c-border);
  box-shadow: var(--c-shadow-sm);
  cursor: grab;
}
```

## Wide-range values: drive it in log space

For a value that spans a huge range (Barometer's boundary-size slider
runs 500m–100km) where most users want fine control at the small end,
keep the `<input>` itself linear (`min="0" max="1"`) and convert to/from
your real value in JS:

```js
const MIN = 0.5, MAX = 100 // whatever units make sense
const sliderToValue = t => MIN * Math.pow(MAX / MIN, t)
const valueToSlider = v => Math.log(v / MIN) / Math.log(MAX / MIN)
```

This gives roughly equal *perceptual* steps across the whole range instead
of the top end (where nobody needs precision) eating most of the slider's
travel.

## Gotcha: keep it in sync if something else can also change the value

If the same value can be changed another way too (Barometer's boundary
size can also change by dragging map handles — see
`patterns/map-integration.md`), update the slider's backing state from
*that* interaction's end event too, so the thumb doesn't silently drift
out of sync with what's actually on screen. And if a subsequent slider
move should *scale* the current state rather than reset it to a fresh
default, compute a relative factor (`newValue / currentValue`) instead of
recomputing from scratch.
