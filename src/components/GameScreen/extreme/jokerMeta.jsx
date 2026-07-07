import { ShieldCheck, Scissors } from 'lucide-react'
import { THEME } from '../../../lib/theme'

// Icon/copy/color per Joker type. Kept out of extremeMode.js (pure logic,
// no React/icons by convention) and instead alongside the presentational
// pieces that render it.
export const JOKER_META = {
  dud: {
    emoji: '💩',
    name: 'The Dud',
    desc: 'A steaming pile of nothing. Does absolutely nothing, then vanishes.',
    accent: null,
  },
  confirm: {
    icon: ShieldCheck,
    name: 'Truth Serum',
    desc: "Reveal the real Warmer/Colder answer for any bar you've logged — no more guessing whether it was a lie.",
    accent: THEME.secondary,
  },
  freeCut: {
    icon: Scissors,
    name: 'Shortcut',
    desc: 'Log a bar without actually traveling there. Still a real guess — still fair game for a lie — but earns you no new Joker.',
    accent: THEME.success,
  },
}

export function JokerIcon({ type, size = 24 }) {
  const meta = JOKER_META[type]
  if (meta.emoji) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{meta.emoji}</span>
  }
  const Icon = meta.icon
  return <Icon size={size} color={meta.accent} strokeWidth={2} />
}
