import { lonLatToCartesian, sphericalDistance } from './sphericalPolygon'

const EARTH_R_KM = 6371

// Longest single gap between two actions that still counts as playing —
// keeps a tab left open overnight from inflating the play clock.
export const MAX_ACTION_GAP_MS = 45 * 60 * 1000

// Great-circle distance of the player's path: start location, then each
// visited bar in guess order. Extreme-mode free-cut guesses are skipped —
// the player never physically walked to those bars.
export function travelledDistanceKm(startLocation, visitedBars) {
  const points = [startLocation, ...(visitedBars || []).filter(b => !b.isFreeCut)]
  let km = 0
  for (let i = 1; i < points.length; i++) {
    const a = lonLatToCartesian(points[i - 1].lng, points[i - 1].lat)
    const b = lonLatToCartesian(points[i].lng, points[i].lat)
    km += sphericalDistance(a, b) * EARTH_R_KM
  }
  return km
}

export function formatDistanceKm(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

export function formatDuration(ms) {
  const totalMin = Math.round(ms / 60000)
  if (totalMin < 1) return 'under a minute'
  if (totalMin < 60) return `${totalMin} min`
  const h = Math.floor(totalMin / 60)
  const min = totalMin % 60
  return min === 0 ? `${h} h` : `${h} h ${min} min`
}
