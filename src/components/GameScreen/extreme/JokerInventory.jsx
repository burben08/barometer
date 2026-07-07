import { JOKER_META, JokerIcon } from './jokerMeta'
import styles from './jokerModal.module.css'

const KEPT_TYPES = ['confirm', 'freeCut']

// Barometer Extreme only — lists the player's currently-held Jokers (the
// Dud is never kept, so it's excluded here).
export default function JokerInventory({ counts, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogTitle}>Your Jokers</div>
        <div className={styles.list}>
          {KEPT_TYPES.map(type => {
            const count = counts[type] || 0
            const meta = JOKER_META[type]
            return (
              <div key={type} className={`${styles.row} ${count === 0 ? styles.rowEmpty : ''}`}>
                <div className={styles.rowIcon}>
                  <JokerIcon type={type} size={24} />
                </div>
                <div className={styles.rowText}>
                  <div className={styles.rowName}>{meta.name}</div>
                  <div className={styles.rowDesc}>{meta.desc}</div>
                </div>
                <div className={styles.rowCount}>× {count}</div>
              </div>
            )
          })}
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
