export async function geocodeLocation(query, bounds = null) {
  let url
  if (bounds) {
    const centerLat = (bounds.north + bounds.south) / 2
    const centerLng = (bounds.east + bounds.west) / 2
    url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${centerLat}&lon=${centerLng}&bbox=${bounds.west},${bounds.south},${bounds.east},${bounds.north}&limit=1`
  } else {
    url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`
  }

  const response = await fetch(url)
  if (!response.ok) throw new Error('Network error contacting geocoding service')
  const data = await response.json()
  if (!data.features || data.features.length === 0) return null

  const name = data.features[0].properties.name
  const { coordinates } = data.features[0].geometry
  return {
    location: { lat: coordinates[1], lng: coordinates[0] },
    name,
  }
}
