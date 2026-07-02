import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import seedrandom from 'seedrandom'
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
import styles from './GameScreen.module.css'

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

function formatSaveDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

// ── Leaflet icons ──────────────────────────────────────────────────────────
const makeVisitedIcon = (number, isWarmer) =>
  L.divIcon({
    html: `<div style="background:${isWarmer ? '#c0392b' : '#1f6fbf'};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${number}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })

const WIN_ICON = L.divIcon({
  html: '<div style="background:#1e7e44;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);animation:pulse 1s infinite;">✓</div>',
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
})

const START_ICON = L.divIcon({
  html: '<div style="background:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #0f0f0f;box-shadow:0 2px 8px rgba(0,0,0,0.2);"><div style="width:8px;height:8px;background:#0f0f0f;border-radius:50%;"></div></div>',
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
})

const PREVIEW_ICON = L.divIcon({
  html: '<div style="background:#0f0f0f;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">?</div>',
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

// ── Component ──────────────────────────────────────────────────────────────
export default function GameScreen({ config, onReset }) {
  const { startLocation, gameBounds, selectedMode, restaurantsConsidered, seed } = config
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
  const [saveConfirmState, setSaveConfirmState] = useState(false)

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

  function updatePath() {
    const m = mapRef.current
    if (!m) return
    if (pathLineRef.current) m.removeLayer(pathLineRef.current)
    const bars = gsRef.current.visitedBars
    if (bars.length > 0) {
      const points = [[startLocation.lat, startLocation.lng], ...bars.map(b => [b.lat, b.lng])]
      pathLineRef.current = L.polyline(points, {
        color: '#0f0f0f', weight: 2, opacity: 0.5, dashArray: '8, 8',
      }).addTo(m)
    }
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

    const gameArea = L.rectangle(
      [[gameBounds.south, gameBounds.west], [gameBounds.north, gameBounds.east]],
      { color: '#0f0f0f', weight: 1.5, fillOpacity: 0.03, dashArray: '6, 5' }
    ).addTo(m)
    m.fitBounds(gameArea.getBounds(), { padding: [10, 10] })

    L.marker([startLocation.lat, startLocation.lng], { icon: START_ICON })
      .addTo(m)
      .bindPopup(`<div class="bar-popup"><h3>Start</h3><p>${startLocation.name}</p></div>`)
      .addTo(m)

    if (savedState) {
      // ── Restore from save ──────────────────────────────────────────────
      allBarsRef.current = savedState.allBars.map(b => ({ ...b }))
      gsRef.current = {
        targetBar: savedState.gameState.targetBar,
        targetLocation: { ...savedState.gameState.targetLocation },
        visitedBars: savedState.gameState.visitedBars.map(b => ({ ...b })),
        gameWon: savedState.gameState.gameWon,
      }

      if (seed === 'Hacker') {
        allBarsRef.current.forEach(bar => {
          const icon = L.divIcon({
            html: '<div style="background:#c0392b;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
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
        const number = i + 1
        const isWin = gsRef.current.gameWon && i === gsRef.current.visitedBars.length - 1
        const icon = isWin ? WIN_ICON : makeVisitedIcon(number, bar.isWarmer)
        L.marker([bar.lat, bar.lng], { icon })
          .addTo(m)
          .bindPopup(
            `<div class="bar-popup">
              <h3>${bar.name}</h3>
              <p>${isWin ? 'Found it!' : bar.isWarmer ? 'Warmer' : 'Colder'} · Visit ${number}</p>
            </div>`
          )
        markersRef.current.push(
          L.marker([bar.lat, bar.lng], { icon }).addTo(m)
        )
      })

      if (savedState.mergedZoneCoords?.length > 0) {
        mergedZoneCoords.current = normalizeZones(savedState.mergedZoneCoords)
        mergedZoneLayer.current = L.polygon(
          zonesToLatLngs(mergedZoneCoords.current),
          { color: '#0f0f0f', weight: 1, fillColor: '#0f0f0f', fillOpacity: 0.07 }
        ).addTo(m)
      }

      updatePath()

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
              ? await drawRandomBarFromDensityGrid(gameBounds, seed)
              : await fetchBarsInBounds(gameBounds, restaurantsConsidered)

          allBarsRef.current = bars

          if (seed === 'Hacker') {
            bars.forEach(bar => {
              const icon = L.divIcon({
                html: '<div style="background:#c0392b;width:10px;height:10px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>',
                className: '',
              })
              L.marker([bar.lat, bar.lng], { icon }).addTo(m)
                .bindPopup(`<div class="bar-popup"><h3>${bar.name}</h3></div>`)
              markersRef.current.push(L.marker([bar.lat, bar.lng], { icon }).addTo(m))
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
          }

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
      if (
        location.lat < gameBounds.south || location.lat > gameBounds.north ||
        location.lng < gameBounds.west || location.lng > gameBounds.east
      ) {
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
        color: '#0f0f0f', weight: 2, opacity: 0.6, dashArray: '8, 6',
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
  function handleConfirm() {
    const m = mapRef.current
    const gs = gsRef.current
    if (!m || gs.gameWon || !previewedBar.current) return

    const bar = previewedBar.current
    const location = bar.location
    const userEnteredName = inputValue.trim()

    clearPreview()

    const prev = gs.visitedBars.length > 0 ? gs.visitedBars[gs.visitedBars.length - 1] : startLocation
    const p1_xy = lonLatToCartesian(prev.lng, prev.lat)
    const p2_xy = lonLatToCartesian(location.lng, location.lat)
    const target_xy = lonLatToCartesian(gs.targetLocation.lng, gs.targetLocation.lat)

    const isWarmer = sphericalDistance(p2_xy, target_xy) < sphericalDistance(p1_xy, target_xy)
    const newCount = gs.visitedBars.length + 1
    gs.visitedBars.push({ name: userEnteredName, lat: location.lat, lng: location.lng, isWarmer })
    setVisitCount(newCount)

    const isWin = bar.name.toLowerCase() === gs.targetBar.toLowerCase()
    const icon = isWin ? WIN_ICON : makeVisitedIcon(newCount, isWarmer)

    const marker = L.marker([location.lat, location.lng], { icon })
      .addTo(m)
      .bindPopup(
        `<div class="bar-popup">
          <h3>${userEnteredName}</h3>
          <p>${isWin ? 'Found it!' : isWarmer ? 'Warmer' : 'Colder'} · Visit ${newCount}</p>
        </div>`
      )
      .openPopup()
    markersRef.current.push(marker)

    const p1LonLat = [prev.lng, prev.lat]
    const p2LonLat = [location.lng, location.lat]
    const newZone = buildPolygon(gameBounds, [p1LonLat, p2LonLat], isWarmer)

    mergedZoneCoords.current = mergeZones(mergedZoneCoords.current, newZone)
    if (mergedZoneLayer.current) m.removeLayer(mergedZoneLayer.current)

    mergedZoneLayer.current = L.polygon(
      zonesToLatLngs(mergedZoneCoords.current),
      { color: '#0f0f0f', weight: 1, fillColor: '#0f0f0f', fillOpacity: 0.07 }
    ).addTo(m)

    if (seed === 'Hacker') {
      allBarsRef.current.forEach(b => {
        if (b.inside && isPointInPolygon({ lng: b.lng, lat: b.lat }, newZone)) b.inside = false
      })
      const rem = allBarsRef.current.filter(b => b.inside).length
      setRemainingBars(`${rem}/${allBarsRef.current.length}`)
    }

    updatePath()
    m.flyTo([location.lat, location.lng], Math.max(m.getZoom(), 14), { duration: 1 })

    if (isWin) {
      gs.gameWon = true
      setGameWon(true)
      setTargetDisplay(gs.targetBar)
      setPanelOpen(true) // lock panel open on win
      setFeedback(null)
      const result = currentSaveRef.current.id
        ? updateSave(currentSaveRef.current.id, config, gs, allBarsRef.current, mergedZoneCoords.current, newCount)
        : createSave(config, gs, allBarsRef.current, mergedZoneCoords.current, newCount)
      currentSaveRef.current = result
    } else {
      showFeedback(isWarmer ? 'Warmer' : 'Colder', isWarmer ? 'warmer' : 'colder')
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function showSeedInfo() {
    showBanner(`Seed: ${seed} — share for the same game!`, 'info', 5000)
    navigator.clipboard.writeText(seed).catch(() => {})
  }

  function handleSave() {
    if (!gsRef.current.targetBar) return
    if (currentSaveRef.current.id) {
      setSaveConfirmState(true)
    } else {
      doSave(null)
    }
  }

  function doSave(overwriteId) {
    const gs = gsRef.current
    const result = overwriteId
      ? updateSave(overwriteId, config, gs, allBarsRef.current, mergedZoneCoords.current, visitCount)
      : createSave(config, gs, allBarsRef.current, mergedZoneCoords.current, visitCount)
    currentSaveRef.current = result
    setSaveConfirmState(false)
    showBanner('Game saved.', 'success', 2500)
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

      {/* ── Save overwrite dialog ── */}
      {saveConfirmState && (
        <div className={styles.saveOverlay}>
          <div className={styles.saveDialog}>
            <p>
              {currentSaveRef.current.savedAt
                ? <>Overwrite save from <strong>{formatSaveDate(currentSaveRef.current.savedAt)}</strong>?</>
                : 'Overwrite existing save?'
              }
            </p>
            <div className={styles.saveDialogBtns}>
              <button className={styles.dialogOverwrite} onClick={() => doSave(currentSaveRef.current.id)}>
                Overwrite
              </button>
              <button className={styles.dialogSaveNew} onClick={() => doSave(null)}>
                Save as New
              </button>
              <button className={styles.dialogCancel} onClick={() => setSaveConfirmState(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Map wrapper ── */}
      <div className={styles.mapWrapper}>
        <div ref={mapContainerRef} className={styles.map} />

        <div className={styles.floatingBtns}>
          <button className={styles.floatBtn} onClick={onReset} title="Exit game">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Exit
          </button>
          <div className={styles.floatBtnsRight}>
            {!isLoading && !gameWon && (
              <button className={styles.floatBtn} onClick={handleSave}>Save</button>
            )}
            <button className={styles.floatBtn} onClick={showSeedInfo}>Share</button>
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
            {remainingBars && (
              <span className={styles.hackerBadge}>{remainingBars}</span>
            )}
          </div>
        </div>

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
                  <div className={styles.confirmRow}>
                    <button className={styles.confirmBtn} onClick={handleConfirm}>Confirm Guess</button>
                    <button className={styles.cancelBtn} onClick={clearPreview}>Cancel</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
