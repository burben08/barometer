import { useState, useEffect } from 'react'
import SetupScreen from './components/SetupScreen/SetupScreen'
import BoundaryScreen from './components/BoundaryScreen/BoundaryScreen'
import GameScreen from './components/GameScreen/GameScreen'
import { parseShareCode } from './lib/shareGame'

export default function App() {
  const [screen, setScreen] = useState('setup') // 'setup' | 'boundary' | 'game'
  const [gameConfig, setGameConfig] = useState(null)
  const [joinError, setJoinError] = useState('')
  // Barometer Extreme — hidden spin-off, toggled from SetupScreen's "secret"
  // trigger. Kept in App so Exit-to-setup returns to whichever variant the
  // player was in; only the explicit "Back to regular" button clears it.
  const [extremeMode, setExtremeMode] = useState(false)

  // A shared-game link (?g=<code>) jumps straight into the game, skipping
  // setup/boundary entirely — same destination as loading a local save.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('g')
    if (!code) return
    window.history.replaceState(null, '', window.location.pathname)
    const joined = parseShareCode(code)
    if (joined) {
      setExtremeMode(!!joined.isExtreme)
      setGameConfig(joined)
      setScreen('game')
    } else {
      setJoinError('That share link looks broken or out of date.')
    }
  }, [])

  function handleJoinCode(code) {
    const joined = parseShareCode(code)
    if (!joined) {
      setJoinError('That code looks invalid. Double-check it and try again.')
      return
    }
    setJoinError('')
    setExtremeMode(!!joined.isExtreme)
    setGameConfig(joined)
    setScreen('game')
  }

  function handleSetupContinue(config) {
    setGameConfig(config)
    setScreen('boundary')
  }

  function handleBoundaryStart(updatedConfig) {
    setGameConfig(updatedConfig)
    setScreen('game')
  }

  function handleLoadSave(save) {
    setExtremeMode(!!save.config.isExtreme)
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
        <SetupScreen
          onContinue={handleSetupContinue}
          onLoadSave={handleLoadSave}
          onJoinCode={handleJoinCode}
          joinError={joinError}
          extremeMode={extremeMode}
          onSetExtreme={setExtremeMode}
        />
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
