import { useState, useEffect } from 'react'
import { MapPin, Keyboard, LocateFixed, Link2, CircleQuestionMark } from 'lucide-react'
import { geocodeLocation, reverseGeocode } from '../../lib/geocoding'
import { getSaves, deleteSave } from '../../lib/savedGames'
import HowToPlay from '../HowToPlay/HowToPlay'
import styles from './SetupScreen.module.css'

const HOWTO_SEEN_KEY = 'barHuntHowToSeen'

// Advanced panel (seed / restaurants) is hidden for this prototype to keep
// the setup flow simple. The functionality is kept intact so it can be
// re-enabled by flipping this flag.
const SHOW_ADVANCED = false

function formatSaveDate(iso) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

function getSaveLabel(save) {
  const { config } = save
  if (config.selectedMode === 'region') return config.selectedSize
  return `${config.selectedSize} · ${config.startLocation.name}`
}

export default function SetupScreen({ onContinue, onLoadSave, onJoinCode, joinError, extremeMode, onSetExtreme }) {
  const [activeSection, setActiveSection] = useState('location')

  // 'current' = use the device's geolocation (default), 'manual' = typed address
  const [locationMode, setLocationMode] = useState('current')
  const [manualLocation, setManualLocation] = useState('')
  const [geoStatus, setGeoStatus] = useState('idle') // idle | loading | success | error
  const [geoResult, setGeoResult] = useState(null) // { name, lat, lng }
  const [geoError, setGeoError] = useState('')

  const [seed, setSeed] = useState('')
  const [restaurants, setRestaurants] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [saves, setSaves] = useState(() => getSaves())
  const visibleSaves = saves.filter(s => !!s.config.isExtreme === extremeMode)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const [joinCode, setJoinCode] = useState('')

  // Auto-open the rules the first time the app is opened on this device.
  const [showHowTo, setShowHowTo] = useState(() => {
    try {
      return !localStorage.getItem(HOWTO_SEEN_KEY)
    } catch {
      return false
    }
  })

  function closeHowTo() {
    setShowHowTo(false)
    try {
      localStorage.setItem(HOWTO_SEEN_KEY, '1')
    } catch {
      // storage unavailable — the rules will simply auto-open again next time
    }
  }

  useEffect(() => {
    detectCurrentLocation()
  }, [])

  function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoStatus('error')
      setGeoError('Location services are not available on this device.')
      setLocationMode('manual')
      return
    }

    setGeoStatus('loading')
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      async position => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        try {
          const place = await reverseGeocode(lat, lng)
          if (place?.name) name = place.name
        } catch {
          // reverse geocoding failed — fall back to raw coordinates
        }
        setGeoResult({ name, lat, lng })
        setGeoStatus('success')
      },
      err => {
        setGeoStatus('error')
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access was denied. Enter a location manually instead.'
            : 'Could not determine your location. Enter a location manually instead.'
        )
        setLocationMode('manual')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function toggleSection(section) {
    setActiveSection(s => (s === section ? null : section))
  }

  function handleDelete(id) {
    deleteSave(id)
    setSaves(getSaves())
    setConfirmDeleteId(null)
  }

  function handleJoin() {
    const trimmed = joinCode.trim()
    if (!trimmed) return
    let code = trimmed
    try {
      const asUrl = new URL(trimmed)
      code = asUrl.searchParams.get('g') || trimmed
    } catch {
      // not a URL — treat the pasted text as the bare code
    }
    onJoinCode(code)
  }

  async function handleContinue() {
    setError('')

    setLoading(true)
    try {
      let startLocation
      if (locationMode === 'current') {
        if (geoStatus === 'loading') {
          setError('Still detecting your location — please wait a moment.')
          return
        }
        if (geoStatus !== 'success' || !geoResult) {
          setError('Could not detect your location. Enter it manually instead.')
          setLocationMode('manual')
          return
        }
        startLocation = { name: geoResult.name, lat: geoResult.lat, lng: geoResult.lng }
      } else {
        if (!manualLocation.trim()) {
          setError('Please enter a starting location.')
          return
        }
        const result = await geocodeLocation(manualLocation.trim())
        if (!result) throw new Error(`Could not find "${manualLocation}". Try a different name.`)
        startLocation = { name: manualLocation.trim(), ...result.location }
      }

      const finalSeed = seed.trim() || Math.random().toString(36).substring(2, 10)

      onContinue({
        startLocation,
        restaurantsConsidered: restaurants,
        seed: finalSeed,
        isExtreme: extremeMode,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.pageContent}>

        {/* Title */}
        <h1 className={styles.title}>{extremeMode ? 'Barometer Extreme' : 'Barometer'}</h1>
        {extremeMode ? (
          <p className={styles.subtitle}>
            Some clues are lies.{' '}
            <button type="button" className={styles.backToNormal} onClick={() => onSetExtreme(false)}>
              Back to regular Barometer
            </button>
          </p>
        ) : (
          <p className={styles.subtitle}>
            Find the{' '}
            <span className={styles.secretTrigger} onClick={() => onSetExtreme(true)}>secret</span>
            {' '}bar
          </p>
        )}

        {!extremeMode && (
          <button type="button" className={styles.howToBtn} onClick={() => setShowHowTo(true)}>
            <CircleQuestionMark size={16} />
            How to Play
          </button>
        )}

        {/* Starting Location — the only visible section, so it's a plain
            static card rather than a collapsible accordion. */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderStatic}>
            <span className={styles.sectionTitle}>Starting Location</span>
          </div>
          <div className={styles.sectionInner}>
            {locationMode === 'current' ? (
              <div className={styles.locationCard}>
                <div className={styles.locationCardRow}>
                  <MapPin size={20} className={styles.locationPin} />
                  <div className={styles.locationCardText}>
                    {geoStatus === 'loading' && <span className={styles.locationStatus}>Detecting your location…</span>}
                    {geoStatus === 'success' && (
                      <>
                        <span className={styles.locationLabel}>Using your current location</span>
                        <span className={styles.locationName}>{geoResult.name}</span>
                      </>
                    )}
                    {geoStatus === 'error' && <span className={styles.locationStatus}>{geoError}</span>}
                    {geoStatus === 'idle' && <span className={styles.locationStatus}>Waiting for location…</span>}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => setLocationMode('manual')}
                >
                  <Keyboard size={16} />
                  Enter a location manually instead
                </button>
              </div>
            ) : (
              <div className={styles.locationCard}>
                <input
                  type="text"
                  className={styles.input}
                  value={manualLocation}
                  onChange={e => setManualLocation(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
                  placeholder="Enter a city or address..."
                  autoFocus
                />
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => {
                    setLocationMode('current')
                    if (geoStatus !== 'success') detectCurrentLocation()
                  }}
                >
                  <LocateFixed size={16} />
                  Use my current location instead
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Advanced — hidden for now to keep the prototype simple; functionality kept intact */}
        {SHOW_ADVANCED && (
          <AccordionSection
            label="Advanced"
            active={activeSection === 'advanced'}
            onToggle={() => toggleSection('advanced')}
          >
            <div className={styles.sectionInner}>
              <p className={styles.subTitle}>Game Seed</p>
              <input
                type="text"
                className={styles.input}
                value={seed}
                onChange={e => setSeed(e.target.value)}
                placeholder="Leave empty for a random seed"
              />
              <div className={styles.seedHelper}>Same seed = same hidden bar</div>
              <p className={styles.subTitle}>Include</p>
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={restaurants}
                  onChange={e => setRestaurants(e.target.checked)}
                />
                Restaurants
              </label>
            </div>
          </AccordionSection>
        )}

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.continueBtn} onClick={handleContinue} disabled={loading}>
          {loading ? 'Loading...' : 'Continue'}
        </button>

        {/* Join a shared game — paste a link or code from another player */}
        <div className={styles.section}>
          <div className={styles.sectionHeaderStatic}>
            <span className={styles.sectionTitle}>Join a Shared Game</span>
          </div>
          <div className={styles.sectionInner}>
            <div className={styles.locationCard}>
              <input
                type="text"
                className={styles.input}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
                placeholder="Paste a share link or code..."
                autoComplete="off"
              />
              {joinError && <div className={styles.error}>{joinError}</div>}
              <button type="button" className={styles.navBtn} onClick={handleJoin}>
                <Link2 size={16} />
                Join Game
              </button>
            </div>
          </div>
        </div>

        {/* Saved games */}
        {visibleSaves.length > 0 && (
          <div className={styles.savesSection}>
            <p className={styles.savesTitle}>Saved Games</p>
            {visibleSaves.map(save => (
              <div key={save.id} className={styles.saveItem}>
                <div className={styles.saveLeft}>
                  <span className={`${styles.saveStatus} ${save.isFinished ? styles.statusFinished : styles.statusProgress}`}>
                    {save.isFinished ? 'Finished' : 'In Progress'}
                  </span>
                  <span className={styles.saveLabel}>{getSaveLabel(save)}</span>
                  <span className={styles.saveDate}>{formatSaveDate(save.savedAt)}</span>
                  <span className={styles.saveVisits}>
                    {save.gameState.visitedBars.length} visit{save.gameState.visitedBars.length !== 1 ? 's' : ''}
                    {save.isFinished && ` · ${save.gameState.targetBar}`}
                  </span>
                </div>
                <div className={styles.saveRight}>
                  <button
                    className={`${styles.saveLoadBtn} ${save.isFinished ? styles.saveRevisitBtn : ''}`}
                    onClick={() => onLoadSave(save)}
                  >
                    {save.isFinished ? 'Revisit' : 'Continue'}
                  </button>
                  {confirmDeleteId === save.id ? (
                    <div className={styles.deleteConfirm}>
                      <button className={styles.deleteYes} onClick={() => handleDelete(save.id)}>Delete</button>
                      <button className={styles.deleteNo} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button
                      className={styles.deleteBtn}
                      onClick={() => setConfirmDeleteId(save.id)}
                      title="Delete save"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {showHowTo && !extremeMode && <HowToPlay onClose={closeHowTo} />}
    </div>
  )
}

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
