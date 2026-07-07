import { X, Beer, Scaling, Waypoints, Milestone, Martini, Footprints, Flame, Compass } from 'lucide-react'
import styles from './DifficultyModal.module.css'

// One icon per tier, easy → hard (labels come from lib/difficulty.js TIERS).
const TIER_ICONS = [Martini, Beer, Footprints, Flame, Compass]

function formatKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export default function DifficultyModal({ difficulty, onClose }) {
  const { score, tierIndex, tierLabel, barCount, optimalVisits, spreadKm, widthKm, heightKm } = difficulty
  const TierIcon = TIER_ICONS[tierIndex]

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Difficulty</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.hero}>
          <div className={styles.scoreWrap}>
            <span className={styles.score}>{score.toFixed(1)}</span>
            <span className={styles.scoreMax}>/ 10</span>
          </div>
          <span className={`${styles.tierChip} ${styles['tier' + tierIndex]}`}>
            <TierIcon size={15} strokeWidth={2.25} />
            {tierLabel}
          </span>
        </div>

        <div className={styles.meter}>
          <div className={styles.meterTrack}>
            <div className={`${styles.meterSeg} ${styles.tier0}`} />
            <div className={`${styles.meterSeg} ${styles.tier1}`} />
            <div className={`${styles.meterSeg} ${styles.tier2}`} />
            <div className={`${styles.meterSeg} ${styles.tier3}`} />
            <div className={`${styles.meterSeg} ${styles.tier4}`} />
          </div>
          <div className={styles.meterMarker} style={{ left: `${Math.min(100, score * 10)}%` }} />
        </div>

        <div className={styles.rows}>
          <div className={styles.row}>
            <Beer size={18} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Bars in the area</span>
            <span className={styles.rowValue}>{barCount}</span>
          </div>
          <div className={styles.row}>
            <Scaling size={18} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Game area</span>
            <span className={styles.rowValue}>{formatKm(widthKm)} × {formatKm(heightKm)}</span>
          </div>
          <div className={styles.row}>
            <Waypoints size={18} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Bar spread</span>
            <span className={styles.rowValue}>{formatKm(spreadKm)} from center</span>
          </div>
          <div className={styles.row}>
            <Milestone size={18} className={styles.rowIcon} />
            <span className={styles.rowLabel}>Perfect play</span>
            <span className={styles.rowValue}>~{optimalVisits} visit{optimalVisits !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <p className={styles.explainer}>
          Each visit can rule out half the map, so {barCount} bars only take
          ~{optimalVisits} perfect guesses — but the farther apart the bars are,
          the more shoe leather (and beer) each guess costs.
        </p>
      </div>
    </div>
  )
}
