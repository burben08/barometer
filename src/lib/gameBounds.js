import { SIZE_PRESETS } from '../constants'

// These are just the backing rectangles used for Overpass query-scoping and
// the (rectangle-based, see sphericalPolygon.js) elimination-zone splitting
// math — never shown to the player directly for the 6 real countries, which
// draw their actual boundary from public/country_boundaries.json instead
// (see src/lib/countryBoundaries.js). Values below are each country's real
// polygon bounding box (from tools/FetchCountryBoundaries.py) plus a small
// 0.1° safety margin. Europe has no bundled polygon and is currently hidden
// from the region picker (see BoundaryScreen.jsx's SHOW_CONTINENTS).
export const GAME_BOUNDS_Regions = {
  Switzerland: { south: 45.730, north: 47.876, west: 5.870, east: 10.555 },
  Germany: { south: 47.179, north: 55.159, west: 5.758, east: 15.117 },
  France: { south: 41.285, north: 51.197, west: -4.863, east: 9.651 },
  Italy: { south: 36.588, north: 47.182, west: 6.528, east: 18.586 },
  Austria: { south: 46.300, north: 49.101, west: 9.424, east: 17.247 },
  Spain: { south: 35.926, north: 43.865, west: -9.336, east: 4.422 },
  Europe: { south: 34.5, north: 71.2, west: -25.0, east: 40.0 },
}

export function calculateBoundsFromDiameterKm(center, diameterKm) {
  const offset = diameterKm / 2
  const deltaLat = (offset / 6371) * (180 / Math.PI)
  const deltaLon = deltaLat / Math.cos((center.lat * Math.PI) / 180)
  return {
    north: center.lat + deltaLat,
    south: center.lat - deltaLat,
    east: center.lng + deltaLon,
    west: center.lng - deltaLon,
  }
}

export function calculateBoundsFromCenter(center, size) {
  return calculateBoundsFromDiameterKm(center, SIZE_PRESETS[size])
}

// Actual east-west / north-south extent of a bounding box, in km.
export function boundsDimensionsKm(bounds) {
  const R = 6371
  const heightKm = ((bounds.north - bounds.south) * Math.PI / 180) * R
  const midLatRad = ((bounds.north + bounds.south) / 2) * Math.PI / 180
  const widthKm = ((bounds.east - bounds.west) * Math.PI / 180) * R * Math.cos(midLatRad)
  return { widthKm, heightKm }
}
