# Accordion / expand-collapse section

A stack of bordered cards, each with a tappable header and a
max-height-transitioned body. Toggle a single `activeSection` piece of
state in the parent, comparing it against each section's id.

```jsx
// SetupScreen.jsx (abridged)
const [activeSection, setActiveSection] = useState('location')
function toggleSection(id) {
  setActiveSection(s => (s === id ? null : id))
}

<AccordionSection
  label="Advanced"
  active={activeSection === 'advanced'}
  onToggle={() => toggleSection('advanced')}
>
  <div className={styles.sectionInner}>...</div>
</AccordionSection>

function AccordionSection({ label, active, onToggle, children }) {
  return (
    <div className={`${styles.section} ${active ? styles.active : ''}`}>
      <div className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionTitle}>{label}</span>
        <span className={styles.sectionArrow}>▼</span>
      </div>
      <div className={styles.sectionContent}>{children}</div>
    </div>
  )
}
```

```css
.section {
  border: var(--c-border-w-regular) solid var(--c-border);
  border-radius: var(--c-radius-card);
  background: var(--c-surface);
  box-shadow: var(--c-shadow-sm);
  margin-bottom: 12px;
  overflow: hidden;
}

.sectionHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  cursor: pointer;
  user-select: none;
}

.sectionTitle {
  font-family: var(--c-font-display);
  font-weight: 700;
}

.sectionArrow {
  font-size: 11px;
  color: var(--c-text-3);
  transition: transform 0.25s;
}

.section.active .sectionArrow {
  transform: rotate(180deg);
}

/* The max-height value is a hard cap, not a real "auto" height — pick a
   number comfortably larger than the tallest expected content. */
.sectionContent {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.section.active .sectionContent {
  max-height: 600px;
}

.sectionInner {
  padding: 0 18px 20px;
}
```

## If there's only one section

Don't make a lone section collapsible — a dropdown that's the only option
is a wasted tap and a pointless chevron. Barometer's Setup screen had only
one non-hidden section ("Starting Location"), so it dropped the toggle
entirely and just renders a static header + always-visible body:

```jsx
<div className={styles.section}>
  <div className={styles.sectionHeaderStatic}>
    <span className={styles.sectionTitle}>Starting Location</span>
  </div>
  <div className={styles.sectionInner}>...</div>
</div>
```
```css
.sectionHeaderStatic {
  display: flex;
  align-items: center;
  padding: 16px 18px; /* same as .sectionHeader, minus cursor: pointer and the arrow */
}
```

## Gotcha: coupling to other effects

If a collapsible section sits above something that needs to know its
rendered size (most commonly a map that needs `invalidateSize()` after
the layout shifts), the timeout driving that call must match the
`transition` duration on `.sectionContent`/`.searchSection` — see
`GameScreen.jsx`'s `310ms setTimeout` paired with its `0.3s` CSS
transition. If you change one, change the other.
