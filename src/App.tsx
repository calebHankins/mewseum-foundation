import { useState, useCallback } from 'react'
import { CatProgressProvider } from './progression/CatProgressContext'
import { AudioProvider, useAudioContext } from './audio/AudioContext'
import Scene from './Scene'
import HUD from './ui/HUD'
import PebbleSort from './games/PebbleSort'
import { ExitConfirmDialog } from './ui/ExitConfirmDialog'
import { TreatProvider } from './treats/TreatContext'

/** Inner shell — must live inside AudioProvider to access useAudioContext. */
function AppShell() {
  const [pebbleSortOpen, setPebbleSortOpen] = useState(false)
  const [exitConfirm, setExitConfirm] = useState<{ url: string; title: string } | null>(null)
  const { pauseForDialog, resumeAfterDialog } = useAudioContext()

  /** Called by GameFrame when the player clicks a frame with an external url. */
  const handleRequestExternalNav = useCallback(
    (payload: { url: string; title: string }) => {
      document.exitPointerLock?.()
      pauseForDialog()
      setExitConfirm(payload)
    },
    [pauseForDialog],
  )

  /** Player confirmed — open the external game then resume Mewseum. */
  const handleConfirmExit = useCallback(() => {
    const url = exitConfirm?.url
    setExitConfirm(null)
    resumeAfterDialog()
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
    // Do NOT re-request pointer lock — the player is intentionally navigating away;
    // they can click the canvas when they return to this tab.
  }, [exitConfirm, resumeAfterDialog])

  /** Player cancelled — close dialog and fully restore Mewseum state. */
  const handleCancelExit = useCallback(() => {
    setExitConfirm(null)
    resumeAfterDialog()
    // Re-request pointer lock so the player can move immediately without
    // having to click the canvas again.
    document.querySelector('canvas')?.requestPointerLock()
  }, [resumeAfterDialog])

  const dialogOpen = exitConfirm !== null

  return (
    <TreatProvider>
      {/* Full-screen 3D canvas — paused while the exit confirmation is open */}
      <div className="fixed inset-0">
        <Scene
          onOpenPebbleSort={() => setPebbleSortOpen(true)}
          onRequestExternalNav={handleRequestExternalNav}
          paused={dialogOpen}
        />
      </div>
      {/* React UI overlay — rendered on top of canvas */}
      <HUD />
      {pebbleSortOpen && <PebbleSort onClose={() => setPebbleSortOpen(false)} />}
      <ExitConfirmDialog
        pending={exitConfirm}
        onConfirm={handleConfirmExit}
        onCancel={handleCancelExit}
      />
    </TreatProvider>
  )
}

export default function App() {
  return (
    <CatProgressProvider>
      <AudioProvider>
        <AppShell />
      </AudioProvider>
    </CatProgressProvider>
  )
}
