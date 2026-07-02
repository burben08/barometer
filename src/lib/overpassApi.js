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

// Mappers sometimes leave amenity=bar/pub in place after a venue closes instead of
// re-tagging it (e.g. disused:amenity=bar), so a few defensive text/tag checks catch
// the cases that slip through the Overpass query filter.
const CLOSURE_FLAG_KEYS = ['disused', 'was', 'demolished', 'razed', 'abandoned', 'removed', 'destroyed']
const CLOSURE_TEXT_RE = /permanently closed|closed down|no longer (open|exists?|in business)|out of business|shut down/i

function looksClosed(tags) {
  if (CLOSURE_FLAG_KEYS.some(key => tags[key] !== undefined)) return true
  if (tags.opening_hours && /^(closed|off)$/i.test(tags.opening_hours.trim())) return true
  const text = `${tags.note || ''} ${tags.fixme || ''} ${tags.description || ''}`
  return CLOSURE_TEXT_RE.test(text)
}

// Recently-edited nodes are more likely to have been surveyed and still be accurate,
// so they get picked as the target more often (see weighted selection in GameScreen).
function freshnessWeight(timestamp) {
  if (!timestamp) return 1
  const ageYears = (Date.now() - new Date(timestamp).getTime()) / (365.25 * 24 * 3600 * 1000)
  if (ageYears < 1) return 4
  if (ageYears < 2) return 3
  if (ageYears < 4) return 2
  return 1
}

function parseElements(elements) {
  return elements
    .filter(el => el.tags?.name && !looksClosed(el.tags))
    .map(el => ({
      name: el.tags.name,
      city: el.tags['addr:city'] || '',
      lat: el.lat,
      lng: el.lon,
      inside: true,
      weight: freshnessWeight(el.timestamp),
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
    out meta;
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
    out meta;
  `

  const data = await queryOverpass(query)
  const bars = parseElements(data.elements)

  if (bars.length === 0) {
    throw new Error('No named bars found in the selected area. Please try again.')
  }
  return bars
}
