import { lonLatToCartesian, sphericalDistance } from './sphericalPolygon'
import { boundsDimensionsKm } from './gameBounds'

const EARTH_R_KM = 6371

// Difficulty = information cost + travel cost.
//
// Information: optimal play halves the remaining candidates with every visit
// (binary search), so N bars cost log2(N) perfect visits — doubling the bars
// adds exactly one visit, hence W_INFO per doubling, never 2x.
//
// Travel: what matters is not the boundary size but how far apart the bars
// actually are — spreadKm is the RMS great-circle distance of the bars from
// their centroid, so a huge area whose bars all huddle in the center scores
// like a small one. log2(1 + spreadKm) keeps giant rural areas from blowing
// past the scale.
//
// Calibration (RMS spread of a uniform box ≈ 0.41 x side):
//   village, 8 bars / 0.3 km spread        → 1.8  Apéro
//   M-preset city, 150 bars / 0.8 km       → 4.3  Bar Marathon
//   big city, 800 bars / 3 km              → 6.4  Bender
//   huge scattered, 2000 bars / 18 km      → 8.9  Odyssey
//   same 2000 bars packed into 1.5 km      → 6.5  Bender (clustered = easier)
const W_INFO = 0.5
const W_SPREAD = 0.8

export const TIERS = [
  { min: 0, label: 'Apéro' },
  { min: 2, label: 'Pub Crawl' },
  { min: 4, label: 'Bar Marathon' },
  { min: 6, label: 'Bender' },
  { min: 8, label: 'Odyssey' },
]

export function tierFor(score) {
  let index = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (score >= TIERS[i].min) index = i
  }
  return { index, label: TIERS[index].label }
}

// Visits a perfect halving strategy needs to isolate the target among n bars.
export function optimalVisits(n) {
  return Math.max(1, Math.ceil(Math.log2(Math.max(1, n))))
}

export function computeDifficulty(bars, gameBounds) {
  if (!bars || bars.length === 0) return null

  // Centroid as normalized mean of the unit vectors — correct on the sphere,
  // unlike averaging raw lat/lng across the antimeridian.
  const vecs = bars.map(b => lonLatToCartesian(b.lng, b.lat))
  const sum = vecs.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0])
  const mag = Math.hypot(sum[0], sum[1], sum[2])
  let spreadKm = 0
  if (mag > 1e-12) {
    const centroid = [sum[0] / mag, sum[1] / mag, sum[2] / mag]
    const meanSq = vecs.reduce((acc, v) => {
      const d = sphericalDistance(centroid, v) * EARTH_R_KM
      return acc + d * d
    }, 0) / vecs.length
    spreadKm = Math.sqrt(meanSq)
  }

  const raw = W_INFO * Math.log2(bars.length) + W_SPREAD * Math.log2(1 + spreadKm)
  const score = Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10
  const { index: tierIndex, label: tierLabel } = tierFor(score)
  const { widthKm, heightKm } = boundsDimensionsKm(gameBounds)

  return {
    score,
    tierIndex,
    tierLabel,
    barCount: bars.length,
    optimalVisits: optimalVisits(bars.length),
    spreadKm,
    widthKm,
    heightKm,
  }
}
