import seedrandom from 'seedrandom'
import { bboxClip, area as turfArea, booleanPointInPolygon, feature as turfFeature } from '@turf/turf'
import { fetchBarsInCell } from './overpassApi'
import { loadCountryBoundary } from './countryBoundaries'

const GRID_STEP = 2.0
const MAX_ATTEMPTS = 5

// NB: public/bar_density_grid_1x1.json (a finer 1°×1° grid) exists but is
// NOT usable — it turns out to be an incomplete refinement run that only
// covers roughly the southern hemisphere (lat -90..-31), nowhere near
// Europe. Stick with the full-coverage 2° grid until/unless that finer
// grid is regenerated to completion.
async function loadDensityGrid() {
  const response = await fetch('/bar_density_grid.json')
  if (!response.ok) throw new Error('Failed to load bar density grid')
  return response.json()
}

// Fraction of a cell's area that falls inside a bounding-box rectangle.
// Used when there's no real country polygon to check against (Europe/other
// non-country region modes).
function calculateOverlapRatio(cellBounds, gameBounds) {
  const iS = Math.max(cellBounds.south, gameBounds.south)
  const iW = Math.max(cellBounds.west, gameBounds.west)
  const iN = Math.min(cellBounds.north, gameBounds.north)
  const iE = Math.min(cellBounds.east, gameBounds.east)
  if (iN <= iS || iE <= iW) return 0
  const iArea = (iN - iS) * (iE - iW)
  const cArea = (cellBounds.north - cellBounds.south) * (cellBounds.east - cellBounds.west)
  return cArea > 0 ? iArea / cArea : 0
}

// Fraction of a cell's area that falls inside the real country polygon —
// so a cell that only clips the country at its edge (mostly foreign
// territory) gets correctly near-zero weight instead of the naive
// rectangle-overlap ratio above, which doesn't know the country's real shape.
function calculatePolygonOverlapRatio(cellBounds, countryGeometry) {
  const cArea = (cellBounds.north - cellBounds.south) * (cellBounds.east - cellBounds.west)
  if (cArea <= 0) return 0
  const clipped = bboxClip(
    turfFeature(countryGeometry),
    [cellBounds.west, cellBounds.south, cellBounds.east, cellBounds.north]
  )
  if (!clipped.geometry.coordinates.length) return 0
  // turf.area is in m² regardless of input units; only the ratio matters here.
  const clippedArea = turfArea(clipped)
  const cellAreaM2 = turfArea(turfFeature({
    type: 'Polygon',
    coordinates: [[
      [cellBounds.west, cellBounds.south], [cellBounds.east, cellBounds.south],
      [cellBounds.east, cellBounds.north], [cellBounds.west, cellBounds.north],
      [cellBounds.west, cellBounds.south],
    ]],
  }))
  return cellAreaM2 > 0 ? clippedArea / cellAreaM2 : 0
}

function getWeightedCells(grid, gameBounds, countryGeometry = null) {
  const cells = []
  let total = 0
  for (const key in grid) {
    const count = grid[key]
    if (count === 0) continue
    const [lat_s, lon_w] = key.split('_').map(Number)
    const cellBounds = { south: lat_s, west: lon_w, north: lat_s + GRID_STEP, east: lon_w + GRID_STEP }
    const overlap = countryGeometry
      ? calculatePolygonOverlapRatio(cellBounds, countryGeometry)
      : calculateOverlapRatio(cellBounds, gameBounds)
    if (overlap > 0) {
      const weight = count * overlap
      cells.push({ key, bounds: cellBounds, weight })
      total += weight
    }
  }
  return { cells, total: parseFloat(total.toFixed(5)) }
}

// `rng` is a single seedrandom instance owned by the caller (not re-seeded
// here) so repeated calls during a retry loop keep drawing new values
// instead of deterministically re-picking the same cell every time.
function pickRandomCell(cells, total, rng) {
  if (cells.length === 0 || total <= 0) throw new Error('No weighted cells found in this area.')
  let r = rng() * total
  for (const cell of cells) {
    if (r < cell.weight) return cell
    r -= cell.weight
  }
  return cells[cells.length - 1]
}

export async function drawRandomBarFromDensityGrid(gameBounds, seed, countryName = null) {
  const grid = await loadDensityGrid()
  const countryGeometry = countryName ? await loadCountryBoundary(countryName) : null
  const { cells } = getWeightedCells(grid, gameBounds, countryGeometry)
  if (cells.length === 0) throw new Error('No bars found in any grid cell in this area.')

  const rng = seedrandom(seed)
  const excluded = new Set()
  let lastErr = new Error('Could not find any bars in this area after several attempts. Please try again.')

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const remaining = cells.filter(c => !excluded.has(c.key))
    if (remaining.length === 0) break
    const remainingTotal = remaining.reduce((sum, c) => sum + c.weight, 0)
    const chosen = pickRandomCell(remaining, remainingTotal, rng)
    excluded.add(chosen.key)

    const queryBounds = {
      south: Math.max(chosen.bounds.south, gameBounds.south),
      west: Math.max(chosen.bounds.west, gameBounds.west),
      north: Math.min(chosen.bounds.north, gameBounds.north),
      east: Math.min(chosen.bounds.east, gameBounds.east),
    }

    try {
      const bars = await fetchBarsInCell(queryBounds)
      // Filter the whole candidate list (not just the eventual target) so
      // every tracked bar — including Hacker-mode's debug dots — is
      // guaranteed to be truly inside the country, regardless of how good
      // the cell-weighting heuristic was.
      const filtered = countryGeometry
        ? bars.filter(b => booleanPointInPolygon([b.lng, b.lat], countryGeometry))
        : bars
      if (filtered.length > 0) return filtered
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr
}
