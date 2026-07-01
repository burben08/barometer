// Multiple public Overpass API endpoints — tried in order until one succeeds
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const CLIENT_TIMEOUT_MS = 25_000

/**
 * Sends an Overpass QL query, trying each endpoint in turn.
 * Throws only if every endpoint fails or times out.
 */
export async function queryOverpass(query) {
  let lastError
  for (const endpoint of ENDPOINTS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: query,
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      const reason = err.name === 'AbortError' ? 'timed out' : err.message
      console.warn(`Overpass [${endpoint}] ${reason}`)
    }
  }
  throw new Error('Could not reach OpenStreetMap data. Check your connection and try again.')
}

function parseElements(elements) {
  return elements
    .filter(el => el.tags?.name)
    .map(el => ({
      name: el.tags.name,
      city: el.tags['addr:city'] || '',
      lat: el.lat,
      lng: el.lon,
      inside: true,
    }))
}

export async function fetchBarsInBounds(bounds, includeRestaurants = false) {
  const types = ['bar', 'pub']
  if (includeRestaurants) types.push('restaurant')

  const b = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const query = `
    [out:json][timeout:60];
    (
      ${types.map(t => `node["amenity"="${t}"](${b});`).join('\n      ')}
    );
    out body;
  `

  const data = await queryOverpass(query)
  const bars = parseElements(data.elements)

  if (bars.length < 2) {
    throw new Error('Fewer than 2 bars found in this area. Try a larger or different location.')
  }
  return bars
}

export async function fetchBarsInCell(bounds) {
  const b = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`
  const query = `
    [out:json][timeout:60];
    (
      node["amenity"="bar"](${b});
      node["amenity"="pub"](${b});
    );
    out body;
  `

  const data = await queryOverpass(query)
  const bars = parseElements(data.elements)

  if (bars.length === 0) {
    throw new Error('No named bars found in the selected area. Please try again.')
  }
  return bars
}
