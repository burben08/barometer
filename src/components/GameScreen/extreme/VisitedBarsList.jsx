import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { RotateCcw, Lock } from 'lucide-react'
import { effectiveIsWarmer } from '../../../lib/extremeMode'
import styles from './VisitedBarsList.module.css'

// A circle plays the flip-in animation exactly when its displayed
// warmer/colder value changes (never on first mount) — covers both a
// manual lie-flag toggle and a Confirmation Joker revealing a different
// truth. Split out so only this one button replays the animation/loses its
// place, not the whole scrollable row.
function VisitedBarCircle({ isWin, warmer, label, name, onClick }) {
  const [flipping, setFlipping] = useState(false)
  const prevWarmer = useRef(warmer)

  useEffect(() => {
    if (isWin || prevWarmer.current === warmer) return
    prevWarmer.current = warmer
    setFlipping(true)
    const t = setTimeout(() => setFlipping(false), 380)
    return () => clearTimeout(t)
  }, [warmer, isWin])

  return (
    <button
      type="button"
      className={`${styles.circle} ${isWin ? styles.win : warmer ? styles.warmer : styles.colder} ${flipping ? styles.flipping : ''}`}
      onClick={onClick}
      title={name}
    >
      {isWin ? '✓' : label}
    </button>
  )
}

// Barometer Extreme only — a numbered-circle log of every guess so far
// ("bar history"), mirroring the map markers, with a per-guess "mark as a
// lie" control and a drag-to-hide scrubber for reviewing an earlier point
// in the game. Purely presentational: all game-state mutation happens in
// GameScreen; hiddenFrom is a controlled view-only prop, not game state.
export default function VisitedBarsList({ visitedBars, gameWon, hiddenFrom, onHiddenFromChange, onSelectBar, onToggleLie }) {
  const listRef = useRef(null)
  const entryRefs = useRef([])
  const lastEmittedRef = useRef(hiddenFrom)

  const [dragIndex, setDragIndex] = useState(null)
  const [dividerLeft, setDividerLeft] = useState(0)

  const count = visitedBars.length
  const activeIndex = dragIndex ?? hiddenFrom

  // Auto-scroll to the newest bar whenever the row actually grows — keyed
  // on length only so toggling a lie or confirming a bar (which mutate an
  // existing entry, not the array length) never yanks the scroll position.
  // A second pass on the next frame catches a late web-font swap reflowing
  // the numerals and growing scrollWidth just after the first scroll.
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
    const raf = requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth })
    return () => cancelAnimationFrame(raf)
  }, [count])

  // Reposition the divider whenever the active gap or the set of circles
  // changes. useLayoutEffect so the measurement happens before paint — no
  // flash at a stale position. The divider is a child of `.list` itself (the
  // scrolling element), positioned relative to its *content* rather than the
  // viewport — left = <element's viewport position within the row> +
  // <current scroll offset> — so once set, it scrolls together with the
  // circles instead of staying fixed on screen while they slide underneath.
  useLayoutEffect(() => {
    const listEl = listRef.current
    if (!listEl) return
    const rects = entryRefs.current.slice(0, count).map(el => el?.getBoundingClientRect()).filter(Boolean)
    if (rects.length === 0) return
    const listRect = listEl.getBoundingClientRect()
    const toContentX = viewportX => viewportX - listRect.left + listEl.scrollLeft
    let left
    if (activeIndex <= 0) left = toContentX(rects[0].left) - 8
    else if (activeIndex >= rects.length) left = toContentX(rects[rects.length - 1].right) + 8
    else left = toContentX((rects[activeIndex - 1].right + rects[activeIndex].left) / 2)
    setDividerLeft(left)
  }, [activeIndex, count])

  function snapIndexFromClientX(clientX) {
    const centers = entryRefs.current
      .slice(0, count)
      .map(el => {
        const r = el?.getBoundingClientRect()
        return r ? r.left + r.width / 2 : null
      })
      .filter(v => v !== null)
    return centers.filter(cx => cx < clientX).length
  }

  function handlePointerDown(e) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    lastEmittedRef.current = hiddenFrom
    setDragIndex(hiddenFrom)
  }

  function handlePointerMove(e) {
    if (dragIndex === null) return
    const snapped = snapIndexFromClientX(e.clientX)
    setDragIndex(snapped)
    if (snapped !== lastEmittedRef.current) {
      lastEmittedRef.current = snapped
      onHiddenFromChange(snapped)
    }
  }

  function handlePointerUp(e) {
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragIndex(null)
  }

  if (!visitedBars || visitedBars.length === 0) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.list} ref={listRef}>
        {visitedBars.map((bar, i) => {
          const isWin = gameWon && i === visitedBars.length - 1
          const warmer = effectiveIsWarmer(bar)
          const flagged = !!bar.markedLie
          const confirmed = !!bar.confirmed
          const label = `${i + 1}${bar.isFreeCut ? '*' : ''}`
          const dimmed = i >= hiddenFrom

          return (
            <div key={i} className={styles.item}>
              {i > 0 && <span className={styles.arrow}>→</span>}
              <div
                className={`${styles.entry} ${dimmed ? styles.dimmed : ''}`}
                ref={el => { entryRefs.current[i] = el }}
              >
                <VisitedBarCircle isWin={isWin} warmer={warmer} label={label} name={bar.name} onClick={() => onSelectBar(i)} />
                {!isWin && (
                  confirmed ? (
                    <div className={styles.lockBadge} title="Confirmed — locked in, can't be marked as a lie">
                      <Lock size={12} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${flagged ? styles.toggleBtnActive : ''}`}
                      onClick={() => onToggleLie(i)}
                      title={flagged ? 'Marked as a lie — click to flip back' : 'Mark this clue as a lie'}
                    >
                      {flagged ? <RotateCcw size={13} strokeWidth={2.5} /> : null}
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}

        {/* Drag-to-hide scrubber — a scrolling child of .list itself (not a
            sibling outside it), so it moves together with the row instead of
            staying fixed on screen while the circles scroll underneath it.
            Snaps to one of visitedBars.length + 1 gap positions; bars
            at/after the gap are dimmed and excluded from the map's
            elimination zone/path (see GameScreen.jsx). */}
        <div
          className={styles.divider}
          style={{ left: dividerLeft }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="Drag to hide recent bars"
        >
          <div className={styles.dividerHandle} />
        </div>
      </div>

      <div className={styles.caption}>
        Mark bars as a lie to switch them <RotateCcw size={12} strokeWidth={2.5} />
      </div>
    </div>
  )
}
