import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { SIZE_PRESETS, STEP_SIZES, SIZES, REGIONS, REGION_FLAGS } from '../../constants'
import {
  GAME_BOUNDS_Regions,
  calculateBoundsFromCenter,
  calculateBoundsFromDiameterKm,
  boundsDimensionsKm,
} from '../../lib/gameBounds'
import styles from './BoundaryScreen.module.css'

const DIRECTIONS = ['north', 'south', 'east', 'west']

// Manual +/- fine-tuning is superseded by drag-to-resize in custom mode, but
// kept around (hidden) in case it's useful again.
const SHOW_MANUAL_ADJUST = false

const MIN_KM = SIZE_PRESETS.XS
const MAX_KM = SIZE_PRESETS.HUGE
const MIN_GAP_DEG = 0.002 // ~220m — prevents the box collapsing/inverting while dragging a corner

// Logarithmic mapping so the slider gives much finer control at the small
// end (S/M/L, what most games use) than at the huge end.
const sliderToKm = t => MIN_KM * Math.pow(MAX_KM / MIN_KM, t)
const kmToSlider = km => Math.log(km / MIN_KM) / Math.log(MAX_KM / MIN_KM)

function formatSize(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Math.round(km * 10) / 10} km`
}

// Which two edges of the bounding box each corner handle controls.
const CORNERS = {
  NW: { latSide: 'north', lngSide: 'west' },
  NE: { latSide: 'north', lngSide: 'east' },
  SE: { latSide: 'south', lngSide: 'east' },
  SW: { latSide: 'south', lngSide: 'west' },
}

const CORNER_ICON = L.divIcon({
  html: '<div style="width:26px;height:26px;background:white;border:3px solid #0f0f0f;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35);cursor:grab;"></div>',
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

function cornerLatLng(name, bounds) {
  const { latSide, lngSide } = CORNERS[name]
  return [bounds[latSide], bounds[lngSide]]
}

function boundsForCornerDrag(corner, base, lat, lng) {
  const { latSide, lngSide } = CORNERS[corner]
  const next = { ...base }
  if (latSide === 'north') next.north = Math.max(lat, base.south + MIN_GAP_DEG)
  else next.south = Math.min(lat, base.north - MIN_GAP_DEG)
  if (lngSide === 'east') next.east = Math.max(lng, base.west + MIN_GAP_DEG)
  else next.west = Math.min(lng, base.east - MIN_GAP_DEG)
  return next
}

export default function BoundaryScreen({ config, onStart, onBack }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const rectangleRef = useRef(null)
  const cornerMarkersRef = useRef({})
  const dragStartBoundsRef = useRef(null)
  const liveBoundsRef = useRef(null)
  const skipFitRef = useRef(false)
  const gameBoundsRef = useRef(null)

  const [selectedSize, setSelectedSize] = useState('M')
  const [selectedMode, setSelectedMode] = useState('custom')
  const [gameBounds, setGameBounds] = useState(() =>
    calculateBoundsFromCenter(config.startLocation, 'M')
  )
  const [customKm, setCustomKm] = useState(SIZE_PRESETS.M)
  const [panelMode, setPanelMode] = useState('sizes') // 'sizes' | 'country' | 'custom'
  // Mirrors gameBounds during an active corner drag, purely so the summary text can
  // update live without re-running the map-drawing effects on every drag tick.
  const [liveDragBounds, setLiveDragBounds] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const { startLocation } = config
    const m = L.map(mapContainerRef.current).setView([startLocation.lat, startLocation.lng], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(m)
    mapRef.current = m
    return () => {
      m.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    gameBoundsRef.current = gameBounds
  }, [gameBounds])

  useEffect(() => {
    const m = mapRef.current
    if (!m) return
    if (rectangleRef.current) rectangleRef.current.remove()
    const bounds = [[gameBounds.south, gameBounds.west], [gameBounds.north, gameBounds.east]]
    rectangleRef.current = L.rectangle(bounds, {
      color: '#0f0f0f',
      weight: 2,
      fillOpacity: 0.05,
    }).addTo(m)

    Object.entries(cornerMarkersRef.current).forEach(([name, marker]) => {
      marker.setLatLng(cornerLatLng(name, gameBounds))
    })

    if (!skipFitRef.current) {
      m.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
    }
    skipFitRef.current = false
  }, [gameBounds])

  // Add/remove the draggable corner handles as custom drawing mode is toggled.
  useEffect(() => {
    const m = mapRef.current
    if (!m || panelMode !== 'custom') return

    const markers = {}
    Object.keys(CORNERS).forEach(name => {
      const marker = L.marker(cornerLatLng(name, gameBounds), {
        draggable: true,
        icon: CORNER_ICON,
      }).addTo(m)

      marker.on('dragstart', () => {
        dragStartBoundsRef.current = gameBoundsRef.current
      })
      marker.on('drag', e => {
        const { lat, lng } = e.target.getLatLng()
        const next = boundsForCornerDrag(name, dragStartBoundsRef.current, lat, lng)
        liveBoundsRef.current = next
        rectangleRef.current?.setBounds([[next.south, next.west], [next.north, next.east]])
        Object.entries(markers).forEach(([otherName, otherMarker]) => {
          if (otherName !== name) otherMarker.setLatLng(cornerLatLng(otherName, next))
        })
        setLiveDragBounds(next)
      })
      marker.on('dragend', () => {
        setSelectedSize('Custom')
        setSelectedMode('custom')
        skipFitRef.current = true
        setLiveDragBounds(null)
        setGameBounds(liveBoundsRef.current)
      })

      markers[name] = marker
    })
    cornerMarkersRef.current = markers

    return () => {
      Object.values(markers).forEach(marker => marker.remove())
      cornerMarkersRef.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelMode])

  function selectSize(size) {
    setSelectedSize(size)
    setSelectedMode('custom')
    setGameBounds(calculateBoundsFromCenter(config.startLocation, size))
  }

  function selectRegion(region) {
    setSelectedSize(region)
    setSelectedMode('region')
    setGameBounds(GAME_BOUNDS_Regions[region])
  }

  function enterCustomMode() {
    const startKm = SIZE_PRESETS[selectedSize] ?? customKm
    setCustomKm(startKm)
    setSelectedSize('Custom')
    setSelectedMode('custom')
    setGameBounds(calculateBoundsFromDiameterKm(config.startLocation, startKm))
    setPanelMode('custom')
  }

  function handleSlider(t) {
    const km = sliderToKm(t)
    setCustomKm(km)
    setSelectedSize('Custom')
    setSelectedMode('custom')
    setGameBounds(calculateBoundsFromDiameterKm(config.startLocation, km))
  }

  function adjustBoundary(direction, sign) {
    const step = STEP_SIZES[selectedSize] ?? 0.001
    setGameBounds(prev => {
      const next = { ...prev, [direction]: prev[direction] + sign * step }
      if (next.north <= next.south + 0.0001 || next.east <= next.west + 0.0001) return prev
      return next
    })
  }

  function handleStart() {
    setError('')
    if (gameBounds.north <= gameBounds.south || gameBounds.east <= gameBounds.west) {
      setError('Invalid boundaries.')
      return
    }
    setLoading(true)
    onStart({ ...config, selectedSize, selectedMode, gameBounds })
  }

  const { widthKm, heightKm } = boundsDimensionsKm(liveDragBounds ?? gameBounds)

  return (
    <div className={styles.screen}>
      <div ref={mapContainerRef} className={styles.map} />

      <div className={styles.controls}>
        <h2>Game Area</h2>
        <div className={styles.summary}>
          {selectedMode === 'region'
            ? `${REGION_FLAGS[selectedSize]} ${selectedSize} · country boundary`
            : selectedSize === 'Custom'
              ? `Custom · ${formatSize(widthKm)} × ${formatSize(heightKm)}`
              : `${selectedSize} · ${formatSize(SIZE_PRESETS[selectedSize])} across`}
        </div>

        {panelMode === 'sizes' && (
          <>
            <div className={styles.sizeGrid}>
              {SIZES.map(size => (
                <button
                  key={size}
                  className={`${styles.sizeBtn} ${selectedMode === 'custom' && selectedSize === size ? styles.selected : ''}`}
                  onClick={() => selectSize(size)}
                >
                  <span className={styles.sizeLabel}>{size}</span>
                  <span className={styles.sizeSub}>{formatSize(SIZE_PRESETS[size])}</span>
                </button>
              ))}
            </div>

            <button type="button" className={styles.link} onClick={() => setPanelMode('country')}>
              🌍 Use a country boundary instead
            </button>
            <button type="button" className={styles.link} onClick={enterCustomMode}>
              ✏️ Draw a custom boundary instead
            </button>
          </>
        )}

        {panelMode === 'country' && (
          <>
            <div className={styles.regionGrid}>
              {REGIONS.map(region => (
                <button
                  key={region}
                  className={`${styles.regionBtn} ${selectedMode === 'region' && selectedSize === region ? styles.selected : ''}`}
                  onClick={() => selectRegion(region)}
                >
                  {REGION_FLAGS[region]} {region}
                </button>
              ))}
            </div>

            <button type="button" className={styles.link} onClick={() => setPanelMode('sizes')}>
              ↩ Back to size selection
            </button>
          </>
        )}

        {panelMode === 'custom' && (
          <>
            <p>Drag the corner handles on the map to reshape the area.</p>
            <div className={styles.sliderRow}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={kmToSlider(customKm)}
                onChange={e => handleSlider(parseFloat(e.target.value))}
                className={styles.slider}
              />
              <span className={styles.sliderValue}>{formatSize(customKm)}</span>
            </div>
            <div className={styles.sliderScale}>
              <span>XS</span>
              <span>S</span>
              <span>M</span>
              <span>L</span>
              <span>XL</span>
              <span>XXL</span>
              <span>XXXL</span>
              <span>HUGE</span>
            </div>

            <button type="button" className={styles.link} onClick={() => setPanelMode('sizes')}>
              ↩ Back to size selection
            </button>
          </>
        )}

        {SHOW_MANUAL_ADJUST && (
          <div className={styles.adjustGrid}>
            {DIRECTIONS.map(dir => (
              <div key={dir} className={styles.row}>
                <label>{dir.charAt(0).toUpperCase() + dir.slice(1)}</label>
                <button className={styles.adjustBtn} onClick={() => adjustBoundary(dir, -1)}>−</button>
                <span className={styles.value}>{gameBounds[dir].toFixed(4)}</span>
                <button className={styles.adjustBtn} onClick={() => adjustBoundary(dir, 1)}>+</button>
              </div>
            ))}
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.btnRow}>
          <button className={styles.backBtn} onClick={onBack}>← Back</button>
          <button className={styles.startBtn} onClick={handleStart} disabled={loading}>
            {loading ? 'Loading...' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  )
}
