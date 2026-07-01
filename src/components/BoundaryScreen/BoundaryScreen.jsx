import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import { STEP_SIZES } from '../../constants'
import styles from './BoundaryScreen.module.css'

const DIRECTIONS = ['north', 'south', 'east', 'west']

export default function BoundaryScreen({ config, onStart, onBack }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const rectangleRef = useRef(null)

  const [gameBounds, setGameBounds] = useState(config.gameBounds)
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
    const m = mapRef.current
    if (!m) return
    if (rectangleRef.current) rectangleRef.current.remove()
    const bounds = [[gameBounds.south, gameBounds.west], [gameBounds.north, gameBounds.east]]
    rectangleRef.current = L.rectangle(bounds, {
      color: '#0f0f0f',
      weight: 2,
      fillOpacity: 0.05,
    }).addTo(m)
    m.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [gameBounds])

  function adjustBoundary(direction, sign) {
    const step = STEP_SIZES[config.selectedSize] ?? 0.001
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
    onStart({ ...config, gameBounds })
  }

  return (
    <div className={styles.screen}>
      <div ref={mapContainerRef} className={styles.map} />

      <div className={styles.controls}>
        <h2>Adjust Game Area</h2>
        <p>Move the boundaries to fine-tune where bars will be searched.</p>

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
