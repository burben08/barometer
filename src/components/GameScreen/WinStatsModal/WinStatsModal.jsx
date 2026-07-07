import { PartyPopper, Route, Beer, Clock, MapPin, Bot } from 'lucide-react'
import { formatDistanceKm, formatDuration } from '../../../lib/gameStats'
import styles from './WinStatsModal.module.css'

// extra = visits - optimal; the copy celebrates every outcome.
function optimalCopy({ optimal, visits, barCount, isExtreme }) {
  const extra = visits - optimal
  if (isExtreme) {
    return (
      <>
        Extreme rules: the clues lied to you, so "optimal" goes out the window.
        A truth-only robot would've needed ~<strong>{optimal}</strong> visits to
        pick from {barCount} bars — every extra beer was lie insurance.
      </>
    )
  }
  if (extra > 0) {
    return (
      <>
        A perfectly sober robot with a map would've needed ~<strong>{optimal}</strong> visits
        to pick from {barCount} bars. You took <strong>{visits}</strong> — that's{' '}
        <strong>{extra} bonus beer{extra !== 1 ? 's' : ''}</strong>. We call that value for money.
      </>
    )
  }
  if (extra === 0) {
    return (
      <>
        You matched perfect play — ~<strong>{optimal}</strong> visits for {barCount} bars.
        Suspiciously efficient for someone drinking on the job.
      </>
    )
  }
  return (
    <>
      You beat the theoretical optimum of ~<strong>{optimal}</strong> visits for{' '}
      {barCount} bars. Pure beer-fueled intuition.
    </>
  )
}

export default function WinStatsModal({
  targetBar,
  distanceKm,
  beers,
  visits,
  playTimeMs,
  barCount,
  optimal,
  isExtreme,
  onClose,
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <PartyPopper size={26} strokeWidth={2.25} />
          </div>
          <h2 className={styles.title}>Found it!</h2>
          <p className={styles.subtitle}>
            The secret bar was <strong>{targetBar}</strong>
          </p>
        </div>

        <div className={styles.tiles}>
          <div className={`${styles.tile} ${styles.tileDistance}`}>
            <Route size={18} className={styles.tileIcon} />
            <span className={styles.tileValue}>{formatDistanceKm(distanceKm)}</span>
            <span className={styles.tileLabel}>wandered</span>
          </div>
          <div className={`${styles.tile} ${styles.tileBeers}`}>
            <Beer size={18} className={styles.tileIcon} />
            <span className={styles.tileValue}>{beers}</span>
            <span className={styles.tileLabel}>beer{beers !== 1 ? 's' : ''} drunk</span>
          </div>
          {playTimeMs != null && (
            <div className={`${styles.tile} ${styles.tileTime}`}>
              <Clock size={18} className={styles.tileIcon} />
              <span className={styles.tileValue}>{formatDuration(playTimeMs)}</span>
              <span className={styles.tileLabel}>on the hunt</span>
            </div>
          )}
          <div className={`${styles.tile} ${styles.tileVisits}`}>
            <MapPin size={18} className={styles.tileIcon} />
            <span className={styles.tileValue}>{visits}</span>
            <span className={styles.tileLabel}>bar{visits !== 1 ? 's' : ''} logged</span>
          </div>
        </div>

        {optimal != null && (
          <div className={styles.optimalCard}>
            <Bot size={18} className={styles.optimalIcon} />
            <p className={styles.optimalText}>
              {optimalCopy({ optimal, visits, barCount, isExtreme })}
            </p>
          </div>
        )}

        <button type="button" className={styles.cheersBtn} onClick={onClose}>
          Cheers!
        </button>
      </div>
    </div>
  )
}
