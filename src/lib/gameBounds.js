import { SIZE_PRESETS } from '../constants'

export const GAME_BOUNDS_Regions = {
  Switzerland: { south: 45.817, north: 47.808, west: 5.955, east: 10.492 },
  Germany: { south: 47.270111, north: 55.058347, west: 5.866342, east: 15.041896 },
  France: { south: 41.33, north: 51.09, west: -5.14, east: 9.56 },
  Italy: { south: 36.65, north: 47.09, west: 6.62, east: 18.98 },
  Austria: { south: 46.37, north: 49.02, west: 9.53, east: 17.16 },
  Spain: { south: 36.0, north: 43.8, west: -9.3, east: 3.3 },
  Europe: { south: 34.5, north: 71.2, west: -25.0, east: 40.0 },
}

export function calculateBoundsFromCenter(center, size) {
  const offset = SIZE_PRESETS[size] / 2
  const deltaLat = (offset / 6371) * (180 / Math.PI)
  const deltaLon = deltaLat / Math.cos((center.lat * Math.PI) / 180)
  return {
    north: center.lat + deltaLat,
    south: center.lat - deltaLat,
    east: center.lng + deltaLon,
    west: center.lng - deltaLon,
  }
}
