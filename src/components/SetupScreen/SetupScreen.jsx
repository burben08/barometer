import { useState } from 'react'
import { geocodeLocation } from '../../lib/geocoding'
import { GAME_BOUNDS_Regions, calculateBoundsFromCenter } from '../../lib/gameBounds'
import { SIZES, REGIONS, REGION_FLAGS } from '../../constants'
import { getSaves, deleteSave } from '../../lib/savedGames'
import styles from './SetupScreen.module.css'

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

export default function SetupScreen({ onContinue, onLoadSave }) {
  const [activeSection, setActiveSection] = useState('location')
  const [activeTab, setActiveTab] = useState('custom')
  const [startLocation, setStartLocation] = useState('Paradeplatz, Zurich')
  const [selectedSize, setSelectedSize] = useState('M')
  const [seed, setSeed] = useState('')
  const [restaurants, setRestaurants] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [saves, setSaves] = useState(() => getSaves())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function toggleSection(section) {
    setActiveSection(s => (s === section ? null : section))
  }

  function handleDelete(id) {
    deleteSave(id)
    setSaves(getSaves())
    setConfirmDeleteId(null)
  }

  async function handleContinue() {
    setError('')
    if (!startLocation.trim()) {
      setError('Please enter a starting location.')
      return
    }
    if (activeTab === 'region' && !GAME_BOUNDS_Regions[selectedSize]) {
      setError('Please select a region.')
      return
    }

    setLoading(true)
    try {
      const result = await geocodeLocation(startLocation.trim())
      if (!result) throw new Error(`Could not find "${startLocation}". Try a different name.`)

      const finalSeed = seed.trim() || Math.random().toString(36).substring(2, 10)
      const gameBounds =
        activeTab === 'region'
          ? GAME_BOUNDS_Regions[selectedSize]
          : calculateBoundsFromCenter(result.location, selectedSize)

      onContinue({
        startLocation: { name: startLocation.trim(), ...result.location },
        selectedSize,
        selectedMode: activeTab,
        restaurantsConsidered: restaurants,
        seed: finalSeed,
        gameBounds,
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
        <h1 className={styles.title}>Barometer</h1>
        <p className={styles.subtitle}>Find the secret bar</p>

        {/* Location */}
        <AccordionSection
          label="Location"
          active={activeSection === 'location'}
          onToggle={() => toggleSection('location')}
        >
          <div className={styles.sectionInner}>
            <input
              type="text"
              className={styles.input}
              value={startLocation}
              onChange={e => setStartLocation(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleContinue() }}
              placeholder="Enter a city or address..."
            />
          </div>
        </AccordionSection>

        {/* Game Area */}
        <AccordionSection
          label="Game Area"
          active={activeSection === 'boundary'}
          onToggle={() => toggleSection('boundary')}
        >
          <div className={styles.sectionInner}>
            <div className={styles.tabNav}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'custom' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                Custom Size
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'region' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('region')}
              >
                Region
              </button>
            </div>

            {activeTab === 'custom' && (
              <div className={styles.sizeGrid}>
                {SIZES.map(size => (
                  <button
                    key={size}
                    className={`${styles.sizeBtn} ${selectedSize === size ? styles.selected : ''}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'region' && (
              <div className={styles.regionGrid}>
                {REGIONS.map(region => (
                  <button
                    key={region}
                    className={`${styles.regionBtn} ${selectedSize === region ? styles.selected : ''}`}
                    onClick={() => setSelectedSize(region)}
                  >
                    {REGION_FLAGS[region]} {region}
                  </button>
                ))}
              </div>
            )}
          </div>
        </AccordionSection>

        {/* Advanced */}
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

        {error && <div className={styles.error}>{error}</div>}

        <button className={styles.continueBtn} onClick={handleContinue} disabled={loading}>
          {loading ? 'Loading...' : 'Start Game'}
        </button>

        {/* Saved games */}
        {saves.length > 0 && (
          <div className={styles.savesSection}>
            <p className={styles.savesTitle}>Saved Games</p>
            {saves.map(save => (
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
