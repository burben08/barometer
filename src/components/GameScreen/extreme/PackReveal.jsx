import { Gift } from 'lucide-react'
import { JOKER_META, JokerIcon } from './jokerMeta'
import styles from './jokerModal.module.css'

// Barometer Extreme only — a Pokémon-pack-style "you earned a Joker!"
// reveal. Closed state must be tapped to reveal; the backdrop only closes
// (and claims) once revealed, so a pack can't be dismissed unseen by accident.
export default function PackReveal({ type, revealed, onReveal, onClaim }) {
  const meta = JOKER_META[type]

  return (
    <div className={styles.overlay} onClick={() => { if (revealed) onClaim() }}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        {!revealed ? (
          <>
            <div className={styles.dialogTitle}>You earned a Joker!</div>
            <div className={styles.packIconWrap}>
              <button type="button" className={styles.packCircle} onClick={onReveal} title="Tap to open">
                <Gift size={40} strokeWidth={1.75} />
              </button>
            </div>
            <div className={styles.desc}>Tap the pack to see what's inside.</div>
          </>
        ) : (
          <>
            <div className={styles.revealIconWrap}>
              <JokerIcon type={type} size={48} />
            </div>
            <div className={styles.revealName}>{meta.name}</div>
            <div className={styles.desc}>{meta.desc}</div>
            <button type="button" className={styles.claimBtn} onClick={onClaim}>Nice!</button>
          </>
        )}
      </div>
    </div>
  )
}
