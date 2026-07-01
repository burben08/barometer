import { union, polygon as turfPolygon } from '@turf/turf'

export function getMergedPolygon(polygonList) {
  if (!polygonList || polygonList.length === 0) return null

  const features = polygonList.map(ring => {
    const closed = [...ring]
    const first = closed[0], last = closed[closed.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) closed.push(first)
    return turfPolygon([closed])
  }).filter(Boolean)

  if (features.length === 0) return null

  try {
    const result = union(...features)
    return result?.geometry?.coordinates ?? null
  } catch (e) {
    console.error('Polygon union failed:', e)
    return null
  }
}
