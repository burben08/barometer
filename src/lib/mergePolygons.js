import { union, polygon as turfPolygon, multiPolygon as turfMultiPolygon } from '@turf/turf'

function closeRing(ring) {
  const first = ring[0], last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) return [...ring, first]
  return ring
}

// Normalizes a GeoJSON Polygon/MultiPolygon geometry into a flat
// "array of polygons, each an array of rings (exterior + holes)" shape —
// the same nesting Leaflet expects for L.polygon(), and stable regardless
// of whether turf.union returns a single polygon or a multi-polygon.
function normalizeGeometry(geometry) {
  if (!geometry) return null
  if (geometry.type === 'Polygon') return [geometry.coordinates]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates
  return null
}

// existingZones: normalized zone shape as returned by this function (or null for the first zone)
// newRing: a flat elimination-zone ring, e.g. from buildPolygon()
export function mergeZones(existingZones, newRing) {
  const closedNewRing = closeRing(newRing)
  if (!existingZones) return [[closedNewRing]]

  const existingFeature = turfMultiPolygon(existingZones.map(polygon => polygon.map(closeRing)))
  const newFeature = turfPolygon([closedNewRing])

  try {
    const result = union(existingFeature, newFeature)
    return normalizeGeometry(result?.geometry) ?? existingZones
  } catch (e) {
    console.error('Polygon union failed:', e)
    return existingZones
  }
}

// Converts a normalized zone shape (lon/lat) into Leaflet's [lat, lng] nesting.
export function zonesToLatLngs(zones) {
  return zones.map(polygon => polygon.map(ring => ring.map(([lon, lat]) => [lat, lon])))
}

// Saved games created before hole support stored a single flat ring
// ([lon, lat], [lon, lat], ...) instead of the current nested shape.
// Wrap those up so old saves keep loading correctly.
export function normalizeZones(raw) {
  if (!raw || raw.length === 0) return null
  return typeof raw[0][0] === 'number' ? [[closeRing(raw)]] : raw
}
