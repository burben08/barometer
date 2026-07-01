const STORAGE_KEY = 'barHuntSaves'
const MAX_SAVES = 20

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function write(saves) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saves))
  } catch (e) {
    console.error('Could not save to localStorage:', e)
  }
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function buildEntry(config, gs, allBars, mergedZoneCoords, visitCount) {
  return {
    savedAt: new Date().toISOString(),
    isFinished: gs.gameWon,
    config: {
      startLocation: config.startLocation,
      gameBounds: config.gameBounds,
      selectedMode: config.selectedMode,
      selectedSize: config.selectedSize,
      restaurantsConsidered: config.restaurantsConsidered,
      seed: config.seed,
    },
    gameState: {
      targetBar: gs.targetBar,
      targetLocation: gs.targetLocation,
      visitedBars: gs.visitedBars.map(b => ({ ...b })),
      gameWon: gs.gameWon,
    },
    allBars: allBars.map(b => ({ ...b })),
    mergedZoneCoords: mergedZoneCoords ? [...mergedZoneCoords] : null,
    visitCount,
  }
}

export function getSaves() {
  return read()
}

export function createSave(config, gs, allBars, mergedZoneCoords, visitCount) {
  const saves = read()
  const id = makeId()
  saves.unshift({ id, ...buildEntry(config, gs, allBars, mergedZoneCoords, visitCount) })
  if (saves.length > MAX_SAVES) saves.splice(MAX_SAVES)
  write(saves)
  return { id, savedAt: saves[0].savedAt }
}

export function updateSave(id, config, gs, allBars, mergedZoneCoords, visitCount) {
  const saves = read()
  const idx = saves.findIndex(s => s.id === id)
  if (idx === -1) return createSave(config, gs, allBars, mergedZoneCoords, visitCount)
  const updated = { id, ...buildEntry(config, gs, allBars, mergedZoneCoords, visitCount) }
  saves.splice(idx, 1)
  saves.unshift(updated)
  write(saves)
  return { id, savedAt: updated.savedAt }
}

export function deleteSave(id) {
  write(read().filter(s => s.id !== id))
}
