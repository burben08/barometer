import seedrandom from 'seedrandom'
import { buildPolygon } from './sphericalPolygon'
import { mergeZones } from './mergePolygons'

// Barometer Extreme — hidden spin-off logic, kept isolated from the base
// game so the whole mode can be removed later by deleting this file plus
// the `extreme/` component folder and reverting the `isExtreme` guards
// left in App.jsx / SetupScreen.jsx / GameScreen.jsx / savedGames.js / shareGame.js.

export const LIE_PROBABILITY = 1 / 3

// Deterministic per-guess-index roll instead of a shared mutable RNG stream,
// so restoring a save or opening a share link never has to "replay" earlier
// rolls to reach the right stream position — every past guess's lie/no-lie
// outcome is already baked into its stored visitedBars entry.
export function rollLie(seed, visitIndex) {
  return seedrandom(`${seed}:lie:${visitIndex}`)() < LIE_PROBABILITY
}

export const JOKER_TYPES = ['dud', 'confirm', 'freeCut']

// Same deterministic-per-index approach as rollLie: which Joker a guess
// earns is fixed the moment that guess is made, so restoring a save or
// opening a share link never needs to replay a shared RNG stream. Only
// called for genuine (non-free-cut), non-winning confirms.
export function rollJokerType(seed, visitIndex) {
  const r = seedrandom(`${seed}:joker:${visitIndex}`)()
  return JOKER_TYPES[Math.floor(r * JOKER_TYPES.length)]
}

// `isWarmer` on a visitedBars entry is the clue as shown to the player;
// markedLie is the player's own "I think this was a lie" override; confirmed
// means a Confirmation Joker locked in the real answer, which takes
// precedence over any manual lie-flag. All absent on base-game entries, so
// this is a no-op there.
export function effectiveIsWarmer(bar) {
  if (bar.confirmed) return bar.trueIsWarmer
  return bar.markedLie ? !bar.isWarmer : bar.isWarmer
}

// Turf's union (mergeZones) only grows a region, it can't retract a prior
// guess's contribution — so after editing any past clue's assumed side, the
// merged elimination zone must be rebuilt from scratch over the full guess
// history rather than patched incrementally.
export function recomputeMergedZoneCoords(gameBounds, startLocation, visitedBars) {
  let merged = null
  for (let i = 0; i < visitedBars.length; i++) {
    const prev = i === 0 ? startLocation : visitedBars[i - 1]
    const bar = visitedBars[i]
    const zone = buildPolygon(
      gameBounds,
      [[prev.lng, prev.lat], [bar.lng, bar.lat]],
      effectiveIsWarmer(bar)
    )
    merged = mergeZones(merged, zone)
  }
  return merged
}
