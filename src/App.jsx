import { useState } from 'react'
import SetupScreen from './components/SetupScreen/SetupScreen'
import BoundaryScreen from './components/BoundaryScreen/BoundaryScreen'
import GameScreen from './components/GameScreen/GameScreen'

export default function App() {
  const [screen, setScreen] = useState('setup') // 'setup' | 'boundary' | 'game'
  const [gameConfig, setGameConfig] = useState(null)

  function handleSetupContinue(config) {
    setGameConfig(config)
    // Region mode has fixed bounds — skip the boundary adjustment screen
    setScreen(config.selectedMode === 'region' ? 'game' : 'boundary')
  }

  function handleBoundaryStart(updatedConfig) {
    setGameConfig(updatedConfig)
    setScreen('game')
  }

  function handleLoadSave(save) {
    setGameConfig({
      ...save.config,
      saveId: save.id,
      saveDate: save.savedAt,
      savedState: {
        gameState: save.gameState,
        allBars: save.allBars,
        mergedZoneCoords: save.mergedZoneCoords,
        visitCount: save.visitCount,
      },
    })
    setScreen('game')
  }

  function handleReset() {
    setGameConfig(null)
    setScreen('setup')
  }

  return (
    <>
      {screen === 'setup' && (
        <SetupScreen onContinue={handleSetupContinue} onLoadSave={handleLoadSave} />
      )}
      {screen === 'boundary' && (
        <BoundaryScreen
          config={gameConfig}
          onStart={handleBoundaryStart}
          onBack={() => setScreen('setup')}
        />
      )}
      {screen === 'game' && (
        <GameScreen config={gameConfig} onReset={handleReset} />
      )}
    </>
  )
}
