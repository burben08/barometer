import seedrandom from 'seedrandom'
import { fetchBarsInCell } from './overpassApi'

const GRID_STEP = 2.0

async function loadDensityGrid() {
  const response = await fetch('/bar_density_grid.json')
  if (!response.ok) throw new Error('Failed to load bar density grid')
  return response.json()
}

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

function getWeightedCells(grid, gameBounds) {
  const cells = []
  let total = 0
  for (const key in grid) {
    const count = grid[key]
    if (count === 0) continue
    const [lat_s, lon_w] = key.split('_').map(Number)
    const cellBounds = { south: lat_s, west: lon_w, north: lat_s + GRID_STEP, east: lon_w + GRID_STEP }
    const overlap = calculateOverlapRatio(cellBounds, gameBounds)
    if (overlap > 0) {
      const weight = count * overlap
      cells.push({ key, bounds: cellBounds, weight })
      total += weight
    }
  }
  return { cells, total: parseFloat(total.toFixed(5)) }
}

function pickRandomCell(cells, total, seed) {
  if (cells.length === 0 || total <= 0) throw new Error('No weighted cells found in this area.')
  const rng = seedrandom(seed)
  let r = rng() * total
  for (const cell of cells) {
    if (r < cell.weight) return cell
    r -= cell.weight
  }
  return cells[cells.length - 1]
}


export async function drawRandomBarFromDensityGrid(gameBounds, seed) {
  const grid = await loadDensityGrid()
  const { cells, total } = getWeightedCells(grid, gameBounds)
  if (cells.length === 0) throw new Error('No bars found in any grid cell in this area.')

  const chosen = pickRandomCell(cells, total, seed)
  const queryBounds = {
    south: Math.max(chosen.bounds.south, gameBounds.south),
    west: Math.max(chosen.bounds.west, gameBounds.west),
    north: Math.min(chosen.bounds.north, gameBounds.north),
    east: Math.min(chosen.bounds.east, gameBounds.east),
  }
  return fetchBarsInCell(queryBounds)
}
