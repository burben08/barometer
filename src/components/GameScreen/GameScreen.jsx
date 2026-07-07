import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { ArrowLeft, WalletCards, Scissors, Gauge, Trophy, CircleQuestionMark } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import seedrandom from 'seedrandom'
import { booleanPointInPolygon } from '@turf/turf'
import {
  buildPolygon,
  getLineCoordsBetween,
  getIntersections,
  sphericalDistance,
  lonLatToCartesian,
} from '../../lib/sphericalPolygon'
import { isPointInPolygon } from '../../lib/planarPolygon'
import { mergeZones, zonesToLatLngs, normalizeZones } from '../../lib/mergePolygons'
import { drawRandomBarFromDensityGrid } from '../../lib/globalBarSelection'
import { fetchBarsInBounds } from '../../lib/overpassApi'
import { geocodeLocation } from '../../lib/geocoding'
import { createSave, updateSave } from '../../lib/savedGames'
import { loadCountryBoundary, hasCountryPolygon } from '../../lib/countryBoundaries'
import { buildShareCode } from '../../lib/shareGame'
import { rollLie, rollJokerType, effectiveIsWarmer, recomputeMergedZoneCoords } from '../../lib/extremeMode'
import { computeDifficulty, optimalVisits } from '../../lib/difficulty'
import { travelledDistanceKm, MAX_ACTION_GAP_MS } from '../../lib/gameStats'
import DifficultyModal from './DifficultyModal/DifficultyModal'
import WinStatsModal from './WinStatsModal/WinStatsModal'
import HowToPlay from '../HowToPlay/HowToPlay'
import VisitedBarsList from './extreme/VisitedBarsList'
import PackReveal from './extreme/PackReveal'
import JokerInventory from './extreme/JokerInventory'
import { THEME } from '../../lib/theme'
import styles from './GameScreen.module.css'

// Above this compressed-code length, the resulting URL is too dense for a
// QR code to scan reliably — only the copyable link is shown instead.
const QR_SAFE_CODE_LENGTH = 1800

// Favors bars with a higher freshness `weight` (see overpassApi.js) so the secret bar
// is less likely to be a stale/permanently-closed OSM entry.
function pickWeightedBar(bars, rng) {
  const total = bars.reduce((sum, bar) => sum + (bar.weight || 1), 0)
  let r = rng() * total
  for (const bar of bars) {
    r -= bar.weight || 1
    if (r < 0) return bar
  }
  return bars[bars.length - 1]
}

// ── Leaflet icons ──────────────────────────────────────────────────────────
// `flagged`/`confirmed`/`isFreeCut`/`flip` are Barometer Extreme only.
// `flagged` shows a small circular-arrow badge (manually marked as a
// lied-about clue); `confirmed` shows a lock badge instead (a Confirmation
// Joker locked in the real answer, taking precedence over a manual flag,
// and — unlike a flag — can't be undone). `isFreeCut` appends a `*` to the
// number. `flip` plays a one-shot "flip reveal" animation on this marker,
// used exactly when its warmer/colder color is changing. All default
// falsy, so omitting them reproduces the base game's icon exactly.
// Lucide's actual RotateCcw/Lock path data (same technique used for
// public/favicon.svg's Binoculars icon) — a monochrome SVG instead of an
// emoji, so this badge is pixel-consistent with VisitedBarsList's Lucide
// icons rather than clashing with an emoji's own baked-in color (the
// 🔄 emoji reads as blue on most platforms, fighting the intended gold fill).
const ROTATE_CCW_SVG_PATHS = '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'
const LOCK_SVG_PATHS = '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
const badgeIconSvg = (paths, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`

const makeVisitedIcon = (number, isWarmer, { flagged = false, confirmed = false, isFreeCut = false, flip = false } = {}) => {
  const label = `${number}${isFreeCut ? '*' : ''}`
  const badge = confirmed
    ? `<div style="position:absolute;bottom:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:${THEME.secondary};border:2px solid ${THEME.border};display:flex;align-items:center;justify-content:center;box-shadow:${THEME.shadow.sm};">${badgeIconSvg(LOCK_SVG_PATHS, 'white')}</div>`
    : flagged
      ? `<div style="position:absolute;bottom:-4px;right:-4px;width:16px;height:16px;border-radius:50%;background:${THEME.warning};border:2px solid ${THEME.border};display:flex;align-items:center;justify-content:center;box-shadow:${THEME.shadow.sm};">${badgeIconSvg(ROTATE_CCW_SVG_PATHS, THEME.text)}</div>`
      : ''
  return L.divIcon({
    html: `<div style="position:relative;width:34px;height:34px;perspective:400px;">
      <div style="background:${isWarmer ? THEME.warmer : THEME.colder};color:${THEME.text};width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:${THEME.fontDisplay};font-weight:800;font-size:14px;border:${THEME.borderW.regular}px solid ${THEME.border};box-shadow:${THEME.shadow.sm};backface-visibility:hidden;${flip ? 'animation:flip-in 380ms ease-out;' : ''}">${label}</div>
      ${badge}
    </div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  })
}

// One-shot bounce (no `infinite`) instead of the old looping pulse — the
// design system reserves infinite loops for the current-location pulse only.
const WIN_ICON = L.divIcon({
  html: `<div style="background:${THEME.success};color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;border:${THEME.borderW.regular}px solid ${THEME.border};box-shadow:${THEME.shadow.md};animation:bounce-once 500ms ease-out;">✓</div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
})

const START_ICON = L.divIcon({
  html: `<div style="background:${THEME.surface};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:${THEME.borderW.regular}px solid ${THEME.border};box-shadow:${THEME.shadow.sm};"><div style="width:8px;height:8px;background:${THEME.border};border-radius:50%;"></div></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
})

const PREVIEW_ICON = L.divIcon({
  html: `<div style="background:${THEME.secondary};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;border:${THEME.borderW.regular}px solid ${THEME.border};box-shadow:${THEME.shadow.sm};">?</div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// ── Component ──────────────────────────────────────────────────────────────
export default function GameScreen({ config, onReset }) {
  const { startLocation, gameBounds, selectedMode, selectedSize, restaurantsConsidered, seed, isExtreme } = config
  const savedState = config.savedState || null

  // Leaflet refs
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const pathLineRef = useRef(null)
  const previewLineRef = useRef(null)
  const previewMarkerRef = useRef(null)
  const mergedZoneCoords = useRef(null)
  const mergedZoneLayer = useRef(null)
  // The real country outline, once loaded, for region mode's guess-verification
  // and boundary drawing — see countryBoundaries.js. Null for non-country modes.
  const countryGeometryRef = useRef(null)

  // Game data refs
  const allBarsRef = useRef([])
  const gsRef = useRef({ targetBar: null, targetLocation: null, visitedBars: [], gameWon: false })
  const previewedBar = useRef(null)

  // Save tracking
  const currentSaveRef = useRef({ id: config.saveId || null, savedAt: config.saveDate || null })

  // Banner auto-dismiss timer
  const bannerTimerRef = useRef(null)

  // React UI state
  const [panelOpen, setPanelOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(!savedState)
  const [loadingStatus, setLoadingStatus] = useState('Searching for bars...')
  const [visitCount, setVisitCount] = useState(savedState ? savedState.visitCount : 0)
  const [gameWon, setGameWon] = useState(savedState ? savedState.gameState.gameWon : false)
  const [targetDisplay, setTargetDisplay] = useState(
    savedState?.gameState.gameWon ? savedState.gameState.targetBar : null
  )
  const [inputValue, setInputValue] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [feedback, setFeedback] = useState(null) // { text, type: 'warmer'|'colder' }
  const [banner, setBanner] = useState(null)     // { text, type: 'error'|'success'|'info' }
  const [remainingBars, setRemainingBars] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sharePanelOpen, setSharePanelOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  // Barometer Extreme only — visitedBars lives in gsRef (not React state), so
  // this counter is bumped to force VisitedBarsList to re-read it after a
  // guess or a lie-flag toggle.
  const [visitRev, setVisitRev] = useState(0)
  // Barometer Extreme only — Jokers. jokerCounts mirrors gsRef.current.jokers
  // for rendering; pack/packRevealed drive the "you earned a Joker!" reveal
  // modal; inventoryOpen drives the held-jokers list modal.
  const [jokerCounts, setJokerCounts] = useState(
    savedState?.gameState.jokers ?? { confirm: 0, freeCut: 0 }
  )
  const [pack, setPack] = useState(null) // { type } | null
  const [packRevealed, setPackRevealed] = useState(false)
  const [inventoryOpen, setInventoryOpen] = useState(false)
  // Barometer Extreme only — bar-history hide scrubber. Index from which
  // bars are hidden (length = nothing hidden). Purely a view aid: never
  // written to gsRef, autosave, or share codes, and always resets to
  // "nothing hidden" on a fresh mount/reload.
  const [hiddenFrom, setHiddenFrom] = useState(savedState ? savedState.visitCount : 0)
  // Difficulty rating for the game area — custom-boundary games only (region
  // games only fetch one density-grid cell, so their bar count would lie).
  const [difficulty, setDifficulty] = useState(null)
  const [difficultyOpen, setDifficultyOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [howToOpen, setHowToOpen] = useState(false)
  // Session start anchor for the play clock — resets on every mount, so time
  // between saving and resuming a game is never counted as playing.
  const playAnchorRef = useRef(Date.now())

  // ── Helpers ──────────────────────────────────────────────────────────────
  function showFeedback(text, type) {
    setFeedback({ text, type })
  }

  function showBanner(text, type = 'info', duration = 3500) {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    setBanner({ text, type })
    if (duration > 0) {
      bannerTimerRef.current = setTimeout(() => setBanner(null), duration)
    }
  }

  // `cut` truncates the dashed path to the first `cut` bars — used so the
  // Barometer Extreme hide-scrubber can preview an earlier point in the
  // game. Pass the full length for "nothing hidden."
  function updatePathVisible(cut) {
    const m = mapRef.current
    if (!m) return
    if (pathLineRef.current) m.removeLayer(pathLineRef.current)
    const bars = gsRef.current.visitedBars.slice(0, cut)
    if (bars.length > 0) {
      const points = [[startLocation.lat, startLocation.lng], ...bars.map(b => [b.lat, b.lng])]
      pathLineRef.current = L.polyline(points, {
        color: THEME.border, weight: 3, opacity: 0.6, dashArray: '8, 8',
      }).addTo(m)
    }
  }

  // Barometer Extreme hide-scrubber: fades markers at/after `cut`, leaves
  // everything before it at full opacity.
  function applyMarkerOpacity(cut) {
    markersRef.current.forEach((marker, i) => {
      if (marker) marker.setOpacity(i >= cut ? 0.35 : 1)
    })
  }

  // Recomputes+redraws the merged elimination zone from only the first
  // `cut` bars. Guarded because an empty prefix (hide-everything) is the
  // first case that can make recomputeMergedZoneCoords return null —
  // zonesToLatLngs(null) would throw, so only build a layer when there's
  // an actual zone to draw.
  function redrawZoneForCut(cut) {
    const m = mapRef.current
    if (!m) return
    const coords = recomputeMergedZoneCoords(gameBounds, startLocation, gsRef.current.visitedBars.slice(0, cut))
    mergedZoneCoords.current = coords
    if (mergedZoneLayer.current) { m.removeLayer(mergedZoneLayer.current); mergedZoneLayer.current = null }
    if (coords && coords.length > 0) {
      mergedZoneLayer.current = L.polygon(
        zonesToLatLngs(coords),
        { color: THEME.border, weight: 2, fillColor: THEME.border, fillOpacity: 0.12 }
      ).addTo(m)
    }
  }

  // The one function that fully reflects a given hide-scrubber cut point:
  // zone, marker fade, and path all at once. Used for the drag interaction
  // itself; commitVisit/handleToggleLie/handleUseConfirmJoker call the
  // pieces they individually need (see those functions for why).
  function applyHiddenFrom(cut) {
    redrawZoneForCut(cut)
    applyMarkerOpacity(cut)
    updatePathVisible(cut)
  }

  // Barometer Extreme: wired to the bar-history's drag scrubber. Only
  // called when the dragged gap actually snaps to a new value.
  function handleHiddenFromChange(newHiddenFrom) {
    setHiddenFrom(newHiddenFrom)
    applyHiddenFrom(newHiddenFrom)
  }

  function clearPreview() {
    const m = mapRef.current
    if (!m) return
    if (previewLineRef.current) { m.removeLayer(previewLineRef.current); previewLineRef.current = null }
    if (previewMarkerRef.current) { m.removeLayer(previewMarkerRef.current); previewMarkerRef.current = null }
    previewedBar.current = null
    setIsPreviewing(false)
    setInputValue('')
  }

  // Single source of truth for a logged-bar popup's HTML — used when a guess
  // is first committed, on restore-from-save, and whenever a bar's lie-flag
  // or confirmed state changes. Barometer Extreme's "*" free-cut marker,
  // "(confirmed)" label, and "Use Confirmation Joker" button all live here.
  function buildBarPopupHtml(bar, index, isWin) {
    const number = index + 1
    const warmer = effectiveIsWarmer(bar)
    const star = bar.isFreeCut ? '*' : ''
    const label = isWin
      ? 'Found it!'
      : bar.confirmed
        ? `${warmer ? 'Warmer' : 'Colder'} (confirmed)`
        : (warmer ? 'Warmer' : 'Colder')
    const showJokerBtn = isExtreme && !isWin && !bar.confirmed
    const btn = showJokerBtn
      ? `<button type="button" class="js-use-confirm-joker bar-popup-btn" data-index="${index}">Use Confirmation Joker</button>`
      : ''
    return `<div class="bar-popup">
      <h3>${bar.name}</h3>
      <p>${label} · Visit ${number}${star}</p>
      ${btn}
    </div>`
  }

  // Accrues play time between actions. Autosave fires on every meaningful
  // action, so hooking here gives "session start → last action" semantics;
  // capping a single gap keeps an idle open tab from counting as playing.
  // null playTimeMs = game predates the clock (old save / joined share) —
  // such games never start counting.
  function bumpPlayTime() {
    const gs = gsRef.current
    if (gs.playTimeMs == null) return
    const now = Date.now()
    gs.playTimeMs += Math.min(now - playAnchorRef.current, MAX_ACTION_GAP_MS)
    playAnchorRef.current = now
  }

  // Silently creates a save on game start, then keeps overwriting that same
  // save on every guess — no manual save button, no overwrite prompt.
  function autosave(count) {
    bumpPlayTime()
    const gs = gsRef.current
    const result = currentSaveRef.current.id
      ? updateSave(currentSaveRef.current.id, config, gs, allBarsRef.current, mergedZoneCoords.current, count)
      : createSave(config, gs, allBarsRef.current, mergedZoneCoords.current, count)
    currentSaveRef.current = result
  }

  // Invalidate Leaflet size after panel transitions
  useEffect(() => {
    const timer = setTimeout(() => mapRef.current?.invalidateSize(), 310)
    return () => clearTimeout(timer)
  }, [panelOpen])

  // ── Map init + game start ─────────────────────────────────────────────────
  useEffect(() => {
    const m = L.map(mapContainerRef.current).setView([startLocation.lat, startLocation.lng], 14)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(m)
    mapRef.current = m

    // Barometer Extreme only — first interactive Leaflet popup in this
    // codebase. Popups are otherwise static HTML, so a "Use Confirmation
    // Joker" button (rendered by buildBarPopupHtml) is wired up via a single
    // delegated popupopen listener rather than per-marker event binding.
    if (isExtreme) {
      m.on('popupopen', (e) => {
        const btn = e.popup.getElement()?.querySelector('.js-use-confirm-joker')
        if (!btn) return
        const idx = Number(btn.getAttribute('data-index'))
        btn.addEventListener('click', () => {
          handleUseConfirmJoker(idx)
          e.popup.close()
        }, { once: true })
      })
    }

    let gameArea = L.rectangle(
      [[gameBounds.south, gameBounds.west], [gameBounds.north, gameBounds.east]],
      { color: THEME.border, weight: 2, fillOpacity: 0.05, dashArray: '6, 5' }
    ).addTo(m)
    m.fitBounds(gameArea.getBounds(), { padding: [10, 10], animate: false })

    // Swap the loose backing rectangle for the real country outline once it
    // loads (region mode on one of the 6 real countries only — see
    // sphericalPolygon.js for why the elimination-zone math itself still
    // uses the rectangle).
    if (hasCountryPolygon(selectedMode, selectedSize)) {
      loadCountryBoundary(selectedSize).then(geometry => {
        if (!geometry || !mapRef.current) return
        countryGeometryRef.current = geometry
        gameArea.remove()
        L.geoJSON(geometry, {
          style: { color: THEME.border, weight: 2, fillOpacity: 0.05, dashArray: '6, 5' },
        }).addTo(mapRef.current)
      }).catch(() => {})
    }

    L.marker([startLocation.lat, startLocation.lng], { icon: START_ICON })
      .addTo(m)
      .bindPopup(`<div class="bar-popup"><h3>Start</h3><p>${startLocation.name}</p></div>`)
      .addTo(m)

    if (savedState) {
      // ── Restore from save ──────────────────────────────────────────────
      allBarsRef.current = savedState.allBars.map(b => ({ ...b }))
      // Joined share games carry no allBars → computeDifficulty returns null
      // and the chip simply doesn't render.
      if (selectedMode === 'custom') {
        setDifficulty(computeDifficulty(allBarsRef.current, gameBounds))
      }
      gsRef.current = {
        targetBar: savedState.gameState.targetBar,
        targetLocation: { ...savedState.gameState.targetLocation },
        visitedBars: savedState.gameState.visitedBars.map(b => ({ ...b })),
        gameWon: savedState.gameState.gameWon,
        playTimeMs: savedState.gameState.playTimeMs ?? null,
        ...(isExtreme && {
          jokers: savedState.gameState.jokers ? { ...savedState.gameState.jokers } : { confirm: 0, freeCut: 0 },
        }),
      }

      if (seed === 'Hacker') {
        allBarsRef.current.forEach(bar => {
          const icon = L.divIcon({
            html: `<div style="background:${THEME.danger};width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
            className: '',
          })
          L.marker([bar.lat, bar.lng], { icon })
            .addTo(m)
            .bindPopup(`<div class="bar-popup"><h3>${bar.name}</h3></div>`)
        })
        const rem = allBarsRef.current.filter(b => b.inside).length
        setRemainingBars(`${rem}/${allBarsRef.current.length}`)
      }

      gsRef.current.visitedBars.forEach((bar, i) => {
        const isWin = gsRef.current.gameWon && i === gsRef.current.visitedBars.length - 1
        const warmer = effectiveIsWarmer(bar)
        const icon = isWin
          ? WIN_ICON
          : makeVisitedIcon(i + 1, warmer, { flagged: !!bar.markedLie, confirmed: !!bar.confirmed, isFreeCut: !!bar.isFreeCut })
        const marker = L.marker([bar.lat, bar.lng], { icon })
          .addTo(m)
          .bindPopup(buildBarPopupHtml(bar, i, isWin))
        markersRef.current.push(marker)
      })

      if (savedState.mergedZoneCoords?.length > 0) {
        mergedZoneCoords.current = normalizeZones(savedState.mergedZoneCoords)
        mergedZoneLayer.current = L.polygon(
          zonesToLatLngs(mergedZoneCoords.current),
          { color: THEME.border, weight: 2, fillColor: THEME.border, fillOpacity: 0.12 }
        ).addTo(m)
      }

      updatePathVisible(gsRef.current.visitedBars.length)

      if (gsRef.current.gameWon) {
        showBanner('Revisiting a finished game.', 'info', 4000)
      } else {
        showBanner('Game restored. Keep guessing!', 'success', 3000)
      }
    } else {
      // ── New game: fetch bars ───────────────────────────────────────────
      ;(async () => {
        setLoadingStatus('Searching for bars in the area...')
        try {
          const bars =
            selectedMode === 'region'
              ? await drawRandomBarFromDensityGrid(gameBounds, seed, hasCountryPolygon(selectedMode, selectedSize) ? selectedSize : null)
              : await fetchBarsInBounds(gameBounds, restaurantsConsidered)

          allBarsRef.current = bars
          if (selectedMode === 'custom') {
            setDifficulty(computeDifficulty(bars, gameBounds))
          }

          if (seed === 'Hacker') {
            bars.forEach(bar => {
              const icon = L.divIcon({
                html: `<div style="background:${THEME.danger};width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
                className: '',
              })
              const marker = L.marker([bar.lat, bar.lng], { icon }).addTo(m)
                .bindPopup(`<div class="bar-popup"><h3>${bar.name}</h3></div>`)
              markersRef.current.push(marker)
            })
            setRemainingBars(`${bars.length}/${bars.length}`)
          }

          const rng = seedrandom(seed)
          const target = pickWeightedBar(bars, rng)
          console.log('Target:', target.name, '| Seed:', seed)

          gsRef.current = {
            targetBar: target.name,
            targetLocation: { lat: target.lat, lng: target.lng },
            visitedBars: [],
            gameWon: false,
            playTimeMs: 0,
            ...(isExtreme && { jokers: { confirm: 0, freeCut: 0 } }),
          }
          autosave(0)

          setIsLoading(false)
          showBanner(`${bars.length} bars loaded. Find the hidden one!`, 'success', 3000)
        } catch (err) {
          setIsLoading(false)
          showBanner(err.message, 'error', 5000)
          setTimeout(onReset, 5000)
        }
      })()
    }

    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
      m.remove()
      mapRef.current = null
      markersRef.current = []
      pathLineRef.current = null
      mergedZoneCoords.current = null
      mergedZoneLayer.current = null
      previewLineRef.current = null
      previewMarkerRef.current = null
      previewedBar.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Preview ───────────────────────────────────────────────────────────────
  async function handlePreview() {
    const query = inputValue.trim()
    if (!query) { showBanner('Enter a bar name first.', 'error'); return }
    const m = mapRef.current
    const gs = gsRef.current
    if (!m || gs.gameWon) return

    setPreviewLoading(true)
    try {
      const mapBounds = m.getBounds()
      const currentBounds = {
        north: mapBounds.getNorth(), south: mapBounds.getSouth(),
        east: mapBounds.getEast(), west: mapBounds.getWest(),
      }

      let bar = await geocodeLocation(query, currentBounds)
      if (!bar) bar = await geocodeLocation(query, null)
      if (!bar) { showBanner(`Could not find "${query}". Try a different name.`, 'error'); return }

      const { location } = bar
      const isInside = countryGeometryRef.current
        ? booleanPointInPolygon([location.lng, location.lat], countryGeometryRef.current)
        : (
          location.lat >= gameBounds.south && location.lat <= gameBounds.north &&
          location.lng >= gameBounds.west && location.lng <= gameBounds.east
        )
      if (!isInside) {
        showBanner(`"${query}" is outside the game area.`, 'error')
        return
      }

      previewedBar.current = bar

      const prev = gs.visitedBars.length > 0 ? gs.visitedBars[gs.visitedBars.length - 1] : startLocation
      const p1LonLat = [prev.lng, prev.lat]
      const p2LonLat = [location.lng, location.lat]

      const intersections = getIntersections(p1LonLat, p2LonLat, gameBounds)
      if (intersections.length < 2) {
        showBanner(`Could not plot direction for "${query}". Try another guess.`, 'error')
        return
      }

      const linePoints = getLineCoordsBetween(intersections[0], intersections[1])
      const leafletCoords = linePoints.map(c => [c[1], c[0]])

      if (previewLineRef.current) m.removeLayer(previewLineRef.current)
      if (previewMarkerRef.current) m.removeLayer(previewMarkerRef.current)

      previewMarkerRef.current = L.marker([location.lat, location.lng], { icon: PREVIEW_ICON }).addTo(m)
      previewLineRef.current = L.polyline(leafletCoords, {
        color: THEME.secondary, weight: 3, opacity: 0.7, dashArray: '8, 6',
      }).addTo(m)

      m.fitBounds(
        L.latLngBounds([prev.lat, prev.lng], [location.lat, location.lng]),
        { padding: [100, 100], maxZoom: 14 }
      )
      setIsPreviewing(true)
    } catch (err) {
      showBanner(err.message, 'error')
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── Confirm guess ─────────────────────────────────────────────────────────
  // Shared guts of committing a guess — used both by the real Confirm-Guess
  // button and (Barometer Extreme only) by the Free-Cut Joker, which logs a
  // bar without the player actually needing to have traveled there. Every
  // other mechanic (lie roll, marker, popup, zone merge, path, autosave,
  // feedback) is identical either way — only `isFreeCut` differs.
  function commitVisit(bar, userEnteredName, { isFreeCut }) {
    const m = mapRef.current
    const gs = gsRef.current
    if (!m) return

    const location = bar.location

    const prev = gs.visitedBars.length > 0 ? gs.visitedBars[gs.visitedBars.length - 1] : startLocation
    const p1_xy = lonLatToCartesian(prev.lng, prev.lat)
    const p2_xy = lonLatToCartesian(location.lng, location.lat)
    const target_xy = lonLatToCartesian(gs.targetLocation.lng, gs.targetLocation.lat)

    const trueIsWarmer = sphericalDistance(p2_xy, target_xy) < sphericalDistance(p1_xy, target_xy)
    // Barometer Extreme: the clue shown to the player has a 1/3 chance of
    // being a lie, deterministically derived from the seed + this guess's
    // index — see src/lib/extremeMode.js for why that avoids needing to
    // replay an RNG stream on restore. A free-cut guess can be a lie too.
    const lie = isExtreme && rollLie(seed, gs.visitedBars.length)
    const isWarmer = lie ? !trueIsWarmer : trueIsWarmer
    const newCount = gs.visitedBars.length + 1
    const entry = {
      name: userEnteredName,
      lat: location.lat,
      lng: location.lng,
      isWarmer,
      ...(isExtreme && { trueIsWarmer, markedLie: false }),
      ...(isExtreme && isFreeCut && { isFreeCut: true }),
    }
    gs.visitedBars.push(entry)
    setVisitCount(newCount)
    setVisitRev(v => v + 1)

    const isWin = bar.name.toLowerCase() === gs.targetBar.toLowerCase()
    const icon = isWin ? WIN_ICON : makeVisitedIcon(newCount, isWarmer, { isFreeCut: !!entry.isFreeCut })

    const marker = L.marker([location.lat, location.lng], { icon })
      .addTo(m)
      .bindPopup(buildBarPopupHtml(entry, newCount - 1, isWin))
      .openPopup()
    markersRef.current.push(marker)

    const p1LonLat = [prev.lng, prev.lat]
    const p2LonLat = [location.lng, location.lat]
    const newZone = buildPolygon(gameBounds, [p1LonLat, p2LonLat], isWarmer)

    mergedZoneCoords.current = mergeZones(mergedZoneCoords.current, newZone)
    if (mergedZoneLayer.current) m.removeLayer(mergedZoneLayer.current)

    mergedZoneLayer.current = L.polygon(
      zonesToLatLngs(mergedZoneCoords.current),
      { color: THEME.border, weight: 2, fillColor: THEME.border, fillOpacity: 0.12 }
    ).addTo(m)

    if (seed === 'Hacker') {
      allBarsRef.current.forEach(b => {
        if (b.inside && isPointInPolygon({ lng: b.lng, lat: b.lat }, newZone)) b.inside = false
      })
      const rem = allBarsRef.current.filter(b => b.inside).length
      setRemainingBars(`${rem}/${allBarsRef.current.length}`)
    }

    // Barometer Extreme: a new bar always resets the hide-scrubber to
    // "nothing hidden" — also un-fades any markers left dimmed from a
    // previous drag, since they're now all back in view.
    setHiddenFrom(newCount)
    applyMarkerOpacity(newCount)
    updatePathVisible(newCount)
    m.flyTo([location.lat, location.lng], Math.max(m.getZoom(), 14), { duration: 1 })

    // gs.gameWon must be set before autosave() so the save it writes is
    // correctly flagged as finished (and the winning marker is drawn green
    // on restore) — see the restore-path isWin check further up.
    if (isWin) gs.gameWon = true

    // Barometer Extreme: a genuine (non-free-cut), non-winning guess earns a
    // Joker pack. Free-cut guesses earn nothing (per design); a winning
    // guess ends the game, so there's nothing left to spend one on.
    if (isExtreme && !isFreeCut && !isWin) {
      const type = rollJokerType(seed, newCount - 1)
      setPack({ type })
      setPackRevealed(false)
    }

    autosave(newCount)

    if (isWin) {
      setGameWon(true)
      setTargetDisplay(gs.targetBar)
      setPanelOpen(true) // lock panel open on win
      setFeedback(null)
      setStatsOpen(true) // celebrate: auto-open the stats modal once
    } else {
      showFeedback(isWarmer ? 'Warmer' : 'Colder', isWarmer ? 'warmer' : 'colder')
    }
  }

  function handleConfirm() {
    const gs = gsRef.current
    if (!mapRef.current || gs.gameWon || !previewedBar.current) return
    const bar = previewedBar.current
    const userEnteredName = inputValue.trim()
    clearPreview()
    commitVisit(bar, userEnteredName, { isFreeCut: false })
  }

  // Barometer Extreme only — spends a Free-Cut Joker to log the currently
  // previewed bar without the player needing to have actually traveled there.
  function handleFreeCut() {
    const gs = gsRef.current
    if (!isExtreme || !mapRef.current || gs.gameWon || !previewedBar.current) return
    if (!gs.jokers || gs.jokers.freeCut < 1) return

    const bar = previewedBar.current
    const userEnteredName = inputValue.trim()
    clearPreview()

    gs.jokers.freeCut -= 1
    setJokerCounts({ ...gs.jokers })
    commitVisit(bar, userEnteredName, { isFreeCut: true })
  }

  // ── Barometer Extreme: visited-bars list interactions ─────────────────────
  function handleSelectBar(index) {
    const m = mapRef.current
    const bar = gsRef.current.visitedBars[index]
    const marker = markersRef.current[index]
    if (!m || !bar || !marker) return
    m.flyTo([bar.lat, bar.lng], Math.max(m.getZoom(), 14), { duration: 1 })
    marker.openPopup()
  }

  // Flips this guess's assumed warmer/colder, restyles its marker/popup, and
  // rebuilds the whole elimination zone from scratch (mergeZones only
  // unions, it can't retract a prior guess's contribution).
  function handleToggleLie(index) {
    const m = mapRef.current
    const gs = gsRef.current
    const bar = gs.visitedBars[index]
    if (!m || !bar || bar.confirmed) return

    bar.markedLie = !bar.markedLie
    const warmer = effectiveIsWarmer(bar)
    const isWin = gs.gameWon && index === gs.visitedBars.length - 1

    const marker = markersRef.current[index]
    if (marker && !isWin) {
      marker.setIcon(makeVisitedIcon(index + 1, warmer, { flagged: bar.markedLie, isFreeCut: !!bar.isFreeCut, flip: true }))
      marker.setPopupContent(buildBarPopupHtml(bar, index, false))
    }

    // Respects whatever the hide-scrubber currently excludes — a toggled
    // bar that's hidden still shouldn't contribute to the visible zone.
    redrawZoneForCut(hiddenFrom)
    applyMarkerOpacity(hiddenFrom)

    autosave(gs.visitedBars.length)
    setVisitRev(v => v + 1)
  }

  // Barometer Extreme: spends a Confirmation Joker to permanently reveal the
  // real answer for one logged bar — takes precedence over any manual
  // lie-flag (see effectiveIsWarmer in extremeMode.js).
  function handleUseConfirmJoker(index) {
    const m = mapRef.current
    const gs = gsRef.current
    const bar = gs.visitedBars[index]
    const isWin = gs.gameWon && index === gs.visitedBars.length - 1
    if (!isExtreme || !m || !bar || bar.confirmed || isWin) return
    if (!gs.jokers || gs.jokers.confirm < 1) {
      showBanner('No confirmation jokers left.', 'error')
      return
    }

    bar.confirmed = true
    gs.jokers.confirm -= 1
    setJokerCounts({ ...gs.jokers })

    const warmer = effectiveIsWarmer(bar) // now === bar.trueIsWarmer
    const wasLie = bar.trueIsWarmer !== bar.isWarmer
    const marker = markersRef.current[index]
    if (marker) {
      // Only flip the marker if confirming actually changes what's shown —
      // i.e. the clue turns out to have been a lie.
      marker.setIcon(makeVisitedIcon(index + 1, warmer, { confirmed: true, isFreeCut: !!bar.isFreeCut, flip: wasLie }))
      marker.setPopupContent(buildBarPopupHtml(bar, index, false))
    }

    // Respects whatever the hide-scrubber currently excludes.
    redrawZoneForCut(hiddenFrom)
    applyMarkerOpacity(hiddenFrom)

    autosave(gs.visitedBars.length)
    setVisitRev(v => v + 1)
    showBanner(
      wasLie ? 'Confirmed: that clue was a LIE — the zone has been corrected.' : 'Confirmed: that clue was the truth.',
      wasLie ? 'info' : 'success'
    )
  }

  // Barometer Extreme: reveal step of the pack-opening modal. The joker is
  // only added to the inventory (and autosaved) once revealed — an
  // un-opened pack is forfeit if the page reloads first.
  function handlePackReveal() {
    if (!pack) return
    setPackRevealed(true)
    if (pack.type !== 'dud') {
      const gs = gsRef.current
      gs.jokers[pack.type] += 1
      setJokerCounts({ ...gs.jokers })
      autosave(gs.visitedBars.length)
    }
  }

  function handlePackClaim() {
    setPack(null)
    setPackRevealed(false)
  }

  // ── Share ─────────────────────────────────────────────────────────────────
  function openSharePanel() {
    const code = buildShareCode(config, gsRef.current)
    const url = `${window.location.origin}${window.location.pathname}?g=${code}`
    setShareCode(code)
    setShareUrl(url)
    setLinkCopied(false)
    setSharePanelOpen(true)
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {})
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const visitLabel = isLoading
    ? 'Searching...'
    : visitCount === 0
    ? 'Ready'
    : `${visitCount} visit${visitCount !== 1 ? 's' : ''}`

  const bannerClass = banner
    ? `${styles.banner} ${
        banner.type === 'error' ? styles.bannerError :
        banner.type === 'success' ? styles.bannerSuccess :
        styles.bannerInfo
      }`
    : ''

  return (
    <div className={styles.screen}>

      {/* ── Map wrapper ── */}
      <div className={styles.mapWrapper}>
        <div ref={mapContainerRef} className={styles.map} />

        <div className={styles.floatingBtns}>
          <div className={styles.floatBtnsRight}>
            {!isExtreme && (
              <button
                className={`${styles.floatBtn} ${styles.floatBtnIcon}`}
                onClick={() => setHowToOpen(true)}
                title="How to Play"
                aria-label="How to Play"
              >
                <CircleQuestionMark size={16} strokeWidth={2.5} />
              </button>
            )}
            <button className={styles.floatBtn} onClick={onReset} title="Exit game">
              <ArrowLeft size={14} strokeWidth={2.5} />
              Exit
            </button>
            <button className={styles.floatBtn} onClick={openSharePanel}>Share</button>
          </div>
        </div>
      </div>

      {/* ── Bottom panel ── */}
      <div className={styles.bottomPanel}>

        {/* Handle — tap to collapse/expand search */}
        <div
          className={styles.handleBar}
          onClick={() => { if (!gameWon && !isLoading) setPanelOpen(v => !v) }}
        >
          <div className={styles.handle} />
        </div>

        {/* Status row — always visible */}
        <div className={styles.statusRow}>
          <span className={styles.visitCount}>{visitLabel}</span>
          <div className={styles.statusRight}>
            {!isLoading && feedback && !gameWon && (
              <span className={`${styles.feedback} ${styles[feedback.type]}`}>{feedback.text}</span>
            )}
            {difficulty && (
              <button
                type="button"
                className={`${styles.difficultyChip} ${styles['tier' + difficulty.tierIndex]}`}
                onClick={() => setDifficultyOpen(true)}
                title={`Difficulty: ${difficulty.tierLabel}`}
              >
                <Gauge size={14} strokeWidth={2.25} />
                {difficulty.score.toFixed(1)}
              </button>
            )}
            {remainingBars && (
              <span className={styles.hackerBadge}>{remainingBars}</span>
            )}
            {isExtreme && (
              <button
                type="button"
                className={styles.jokerBadge}
                onClick={() => setInventoryOpen(true)}
                title="Your Jokers"
              >
                <WalletCards size={14} strokeWidth={2.25} />
                {jokerCounts.confirm + jokerCounts.freeCut}
              </button>
            )}
          </div>
        </div>

        {/* Barometer Extreme only — visited-bars log with lie-flagging.
            Deliberately no `key` here: remounting on every change (the old
            approach) reset the row's horizontal scroll position. Bumping
            visitRev (elsewhere) already forces this component to re-render
            because gsRef mutations don't on their own — a fresh array copy
            is all that's needed for it to re-render in place, scroll intact. */}
        {isExtreme && visitCount > 0 && (
          <VisitedBarsList
            visitedBars={[...gsRef.current.visitedBars]}
            gameWon={gameWon}
            hiddenFrom={Math.min(hiddenFrom, gsRef.current.visitedBars.length)}
            onHiddenFromChange={handleHiddenFromChange}
            onSelectBar={handleSelectBar}
            onToggleLie={handleToggleLie}
          />
        )}

        {/* Search section — collapsible */}
        <div className={`${styles.searchSection} ${panelOpen ? styles.open : styles.closed}`}>
          <div className={styles.searchInner}>
            {isLoading ? (
              <div className={styles.loadingRow}>
                <div className={styles.spinner} />
                <span>{loadingStatus}</span>
              </div>
            ) : gameWon ? (
              <div className={styles.winSection}>
                <div className={styles.winTarget}>
                  Found: {targetDisplay}
                </div>
                <button className={styles.statsBtn} onClick={() => setStatsOpen(true)}>
                  <Trophy size={16} strokeWidth={2.25} />
                  See Game Stats
                </button>
                <button className={styles.newGameBtn} onClick={onReset}>New Game</button>
              </div>
            ) : (
              <>
                {banner && <div className={bannerClass}>{banner.text}</div>}
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Enter a bar name..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !isPreviewing) handlePreview() }}
                  disabled={isPreviewing}
                  autoComplete="off"
                  autoCorrect="off"
                />
                {!isPreviewing ? (
                  <button
                    className={styles.actionBtn}
                    onClick={handlePreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? 'Searching...' : 'Preview on Map'}
                  </button>
                ) : (
                  <>
                    <div className={styles.confirmRow}>
                      <button className={styles.confirmBtn} onClick={handleConfirm}>Confirm Guess</button>
                      <button className={styles.cancelBtn} onClick={clearPreview}>Cancel</button>
                    </div>
                    {isExtreme && jokerCounts.freeCut > 0 && (
                      <button className={styles.freeCutBtn} onClick={handleFreeCut}>
                        <Scissors size={14} strokeWidth={2.25} />
                        Log with Shortcut Joker ({jokerCounts.freeCut})
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Share modal ── */}
      {sharePanelOpen && (
        <div className={styles.overlay} onClick={() => setSharePanelOpen(false)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <div className={styles.dialogTitle}>Share this game</div>
            {shareCode.length <= QR_SAFE_CODE_LENGTH ? (
              <div className={styles.qrWrap}>
                <QRCodeSVG value={shareUrl} size={200} level="M" />
              </div>
            ) : (
              <div className={styles.qrTooLong}>
                This game's link is a bit long for a QR code after this many guesses — copy the link instead.
              </div>
            )}
            <div className={styles.shareLink}>{shareUrl}</div>
            <div className={styles.dialogBtns}>
              <button className={styles.copyBtn} onClick={copyShareLink}>
                {linkCopied ? 'Copied!' : 'Copy Link'}
              </button>
              <button className={styles.closeBtn} onClick={() => setSharePanelOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── How to Play modal ── */}
      {howToOpen && <HowToPlay onClose={() => setHowToOpen(false)} />}

      {/* ── Difficulty breakdown modal ── */}
      {difficultyOpen && difficulty && (
        <DifficultyModal difficulty={difficulty} onClose={() => setDifficultyOpen(false)} />
      )}

      {/* ── Win stats modal ── */}
      {statsOpen && gameWon && (
        <WinStatsModal
          targetBar={targetDisplay}
          distanceKm={travelledDistanceKm(startLocation, gsRef.current.visitedBars)}
          beers={gsRef.current.visitedBars.filter(b => !b.isFreeCut).length}
          visits={gsRef.current.visitedBars.length}
          playTimeMs={gsRef.current.playTimeMs}
          barCount={allBarsRef.current.length}
          optimal={allBarsRef.current.length > 0 ? optimalVisits(allBarsRef.current.length) : null}
          isExtreme={isExtreme}
          onClose={() => setStatsOpen(false)}
        />
      )}

      {/* ── Barometer Extreme: Joker pack reveal + inventory ── */}
      {isExtreme && pack && (
        <PackReveal
          type={pack.type}
          revealed={packRevealed}
          onReveal={handlePackReveal}
          onClaim={handlePackClaim}
        />
      )}
      {isExtreme && inventoryOpen && (
        <JokerInventory counts={jokerCounts} onClose={() => setInventoryOpen(false)} />
      )}
    </div>
  )
}
