// Utilities for encoding/decoding game settings into a shareable string.
// Not yet wired into the main game flow — reserved for future seed-sharing feature.

export function encodeGameSettings(config) {
  try {
    const safeString = unescape(encodeURIComponent(JSON.stringify(config)))
    return btoa(safeString)
  } catch (error) {
    console.error(`Error encoding seed: ${error.message}`)
    return ''
  }
}

export function decodeGameSettings(seedString) {
  if (!seedString) return null
  try {
    return JSON.parse(decodeURIComponent(escape(atob(seedString))))
  } catch (error) {
    console.error(`Error decoding seed: ${error.message}`)
    return null
  }
}
