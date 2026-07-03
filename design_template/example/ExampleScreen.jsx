// A minimal demo screen composing the patterns documented in ../patterns/
// (card, badge, input, primary/ghost buttons, inline banner) into one
// working example. Plain JSX + CSS Modules, no TypeScript, no Tailwind —
// copy the shape of this file (colocated .jsx + .module.css) for every new
// screen. See ../CLAUDE.md for the full set of conventions this follows.
import { useState } from 'react'
import { Rocket } from 'lucide-react'
import styles from './ExampleScreen.module.css'

export default function ExampleScreen() {
  const [name, setName] = useState('')
  const [banner, setBanner] = useState(null)

  function handleSubmit() {
    if (!name.trim()) {
      setBanner({ text: 'Enter a name first.', type: 'error' })
      return
    }
    setBanner({ text: `Nice to meet you, ${name}!`, type: 'success' })
  }

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Example Screen</h1>
      <p className={styles.subtitle}>A small reference composing the core patterns</p>

      <div className={styles.card}>
        <span className={`${styles.badge} ${styles.badgeInfo}`}>Demo</span>

        <input
          type="text"
          className={styles.input}
          placeholder="Your name..."
          value={name}
          onChange={e => setName(e.target.value)}
        />

        {banner && (
          <div className={`${styles.banner} ${banner.type === 'error' ? styles.bannerError : styles.bannerSuccess}`}>
            {banner.text}
          </div>
        )}

        <button className={styles.primaryBtn} onClick={handleSubmit}>
          <Rocket size={16} />
          Submit
        </button>
        <button className={styles.ghostBtn} onClick={() => { setName(''); setBanner(null) }}>
          Reset
        </button>
      </div>
    </div>
  )
}
