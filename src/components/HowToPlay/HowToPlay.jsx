import { X, Target, Beer, Flame, Snowflake, Trophy, Martini, Utensils, Coffee, TriangleAlert } from 'lucide-react'
import styles from './HowToPlay.module.css'

export default function HowToPlay({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>How to Play</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={`${styles.stepIcon} ${styles.iconSecret}`}>
              <Target size={20} />
            </div>
            <p className={styles.stepText}>
              A <strong>secret bar</strong> is hiding somewhere in your game area.
            </p>
          </div>

          <div className={styles.step}>
            <div className={`${styles.stepIcon} ${styles.iconBeer}`}>
              <Beer size={20} />
            </div>
            <p className={styles.stepText}>
              Go to any bar in the area, <strong>drink a beer</strong>, and log your visit.
            </p>
          </div>

          <div className={styles.step}>
            <div className={`${styles.stepIcon} ${styles.iconTemp}`}>
              <Flame size={20} />
            </div>
            <div className={styles.stepText}>
              Every visit tells you if you got
              <span className={styles.tempRow}>
                <span className={`${styles.tempChip} ${styles.warm}`}><Flame size={14} /> Warmer = closer</span>
                <span className={`${styles.tempChip} ${styles.cold}`}><Snowflake size={14} /> Colder = farther</span>
              </span>
              than at your last bar — and the map crosses off where the bar can't be.
            </div>
          </div>

          <div className={styles.step}>
            <div className={`${styles.stepIcon} ${styles.iconWin}`}>
              <Trophy size={20} />
            </div>
            <p className={styles.stepText}>
              Close in, bar by bar, until you <strong>find the secret bar</strong>. Cheers!
            </p>
          </div>
        </div>

        <div className={styles.cutFigure}>
          <p className={styles.subheading}>How the map gets cut</p>
          <svg
            viewBox="0 0 320 172"
            className={styles.cutSvg}
            role="img"
            aria-label="Diagram: after a warmer clue at bar 2, everything on bar 1's side of the halfway line is crossed off"
          >
            <defs>
              <clipPath id="htp-area-clip">
                <rect x="6" y="6" width="308" height="140" rx="14" />
              </clipPath>
            </defs>
            {/* game area */}
            <rect
              x="6" y="6" width="308" height="140" rx="14"
              fill="var(--c-bg)" stroke="var(--c-border)" strokeWidth="2" strokeDasharray="6 5"
            />
            {/* crossed-off half (bar 1's side of the halfway line) */}
            <g clipPath="url(#htp-area-clip)">
              <rect x="6" y="6" width="150" height="140" fill="var(--c-border)" opacity="0.14" />
            </g>
            <text x="81" y="42" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--c-text-2)">
              ✕ not here
            </text>
            {/* halfway line */}
            <line x1="156" y1="6" x2="156" y2="146" stroke="var(--c-border)" strokeWidth="2.5" />
            <text x="156" y="164" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--c-text-3)">
              halfway between bar 1 and bar 2
            </text>
            {/* path bar 1 → bar 2 */}
            <line
              x1="85" y1="100" x2="235" y2="100"
              stroke="var(--c-border)" strokeWidth="2" strokeDasharray="5 5" opacity="0.55"
            />
            {/* bar 1 (previous visit) */}
            <circle cx="85" cy="100" r="13" fill="var(--c-surface)" stroke="var(--c-border)" strokeWidth="2.5" />
            <text x="85" y="104.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--c-text)">1</text>
            {/* bar 2 (new visit, warmer) */}
            <circle cx="235" cy="100" r="13" fill="var(--c-warmer)" stroke="var(--c-border)" strokeWidth="2.5" />
            <text x="235" y="104.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--c-text)">2</text>
            {/* warmer tag above bar 2 */}
            <rect x="207" y="59" width="56" height="20" rx="10" fill="var(--c-warmer)" stroke="var(--c-border)" strokeWidth="2" />
            <text x="235" y="73" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--c-text)">Warmer</text>
            {/* the secret bar hides somewhere on bar 2's side */}
            <circle cx="277" cy="40" r="11" fill="var(--c-secondary)" stroke="var(--c-border)" strokeWidth="2" />
            <text x="277" y="44.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--c-surface)">?</text>
          </svg>
          <p className={styles.cutCaption}>
            Bar 2 came back <strong>Warmer</strong>, so the secret bar is closer to bar 2
            than to bar 1 — everything on bar 1's side of the halfway line is crossed off
            automatically. <strong>Colder</strong> would cross off bar 2's side instead.
            Every guess adds another cut, shrinking the hiding spot. (On the real map the
            line can look slightly bent — the Earth is round.)
          </p>
        </div>

        <div className={styles.divider} />

        <p className={styles.subheading}>Which places count?</p>
        <div className={styles.venueRows}>
          <div className={styles.venueRow}>
            <span className={`${styles.venueChip} ${styles.venueYes}`}><Martini size={14} /> Bars</span>
            <span className={`${styles.venueChip} ${styles.venueYes}`}><Beer size={14} /> Pubs</span>
            <span className={styles.venueVerdict}>are in the game</span>
          </div>
          <div className={styles.venueRow}>
            <span className={`${styles.venueChip} ${styles.venueNo}`}><Utensils size={14} /> Restaurants</span>
            <span className={`${styles.venueChip} ${styles.venueNo}`}><Coffee size={14} /> Cafés</span>
            <span className={styles.venueVerdict}>are not</span>
          </div>
        </div>
        <p className={styles.venueNote}>
          The secret bar is always one marked with a cocktail or beer icon on OpenStreetMap.
        </p>

        <div className={styles.caveat}>
          <TriangleAlert size={16} className={styles.caveatIcon} />
          <p>
            Bar data comes from OpenStreetMap and can be out of date — once in a while the
            secret bar may have already closed down or not opened yet. Hopefully it's still pouring!
          </p>
        </div>

        <button type="button" className={styles.gotItBtn} onClick={onClose}>
          Let's go!
        </button>
      </div>
    </div>
  )
}
