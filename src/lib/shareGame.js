import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import { recomputeMergedZoneCoords } from './extremeMode'

// A shared-game code carries only what can't be reliably re-derived on
// another device: config + the target bar/location + the guess history.
// allBars (Hacker-mode debug data) and mergedZoneCoords (fully derivable
// from gameBounds + visitedBars) are deliberately omitted to keep the
// code short enough for a QR code.
export function buildShareCode(config, gs) {
  const payload = {
    startLocation: config.startLocation,
    gameBounds: config.gameBounds,
    selectedMode: config.selectedMode,
    selectedSize: config.selectedSize,
    restaurantsConsidered: config.restaurantsConsidered,
    seed: config.seed,
    isExtreme: !!config.isExtreme,
    targetBar: gs.targetBar,
    targetLocation: gs.targetLocation,
    visitedBars: gs.visitedBars,
    jokers: gs.jokers,
  }
  return compressToEncodedURIComponent(JSON.stringify(payload))
}

// Returns a gameConfig-shaped object (config fields + savedState), ready
// to hand straight to the same restore path used for localStorage saves —
// or null if the code is missing/corrupted/malformed.
export function parseShareCode(code) {
  try {
    const json = decompressFromEncodedURIComponent(code)
    if (!json) return null
    const payload = JSON.parse(json)

    const { startLocation, gameBounds, selectedMode, selectedSize, targetBar, targetLocation, visitedBars } = payload
    if (!startLocation || !gameBounds || !selectedMode || !selectedSize || !targetBar || !targetLocation || !Array.isArray(visitedBars)) {
      return null
    }

    const gameWon = visitedBars.length > 0 && visitedBars[visitedBars.length - 1].name.toLowerCase() === targetBar.toLowerCase()
    const mergedZoneCoords = recomputeMergedZoneCoords(gameBounds, startLocation, visitedBars)

    return {
      startLocation,
      gameBounds,
      selectedMode,
      selectedSize,
      restaurantsConsidered: !!payload.restaurantsConsidered,
      seed: payload.seed,
      isExtreme: !!payload.isExtreme,
      savedState: {
        gameState: {
          targetBar, targetLocation, visitedBars, gameWon,
          jokers: payload.jokers ?? { confirm: 0, freeCut: 0 },
        },
        allBars: [],
        mergedZoneCoords,
        visitCount: visitedBars.length,
      },
    }
  } catch {
    return null
  }
}
