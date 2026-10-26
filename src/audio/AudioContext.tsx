import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react'

interface AudioContextValue {
  audioEnabled: boolean
  toggleAudio: () => void
  /** Store the current audio state and silence audio while a dialog is open. */
  pauseForDialog: () => void
  /** Restore the audio state that was captured by the last `pauseForDialog` call. */
  resumeAfterDialog: () => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [audioEnabled, setAudioEnabled] = useState(true)
  const isPausedForDialogRef = useRef(false)
  const prePauseEnabledRef = useRef(true)

  const toggleAudio = useCallback(() => {
    setAudioEnabled(v => {
      // If user toggles audio manually while dialog is open or anytime, track their intent
      prePauseEnabledRef.current = !v
      return !v
    })
  }, [])

  const pauseForDialog = useCallback(() => {
    // If already paused for dialog, don't overwrite prePauseEnabledRef with false!
    if (!isPausedForDialogRef.current) {
      isPausedForDialogRef.current = true
      setAudioEnabled(current => {
        prePauseEnabledRef.current = current
        return false
      })
    }
  }, [])

  const resumeAfterDialog = useCallback(() => {
    isPausedForDialogRef.current = false
    setAudioEnabled(prePauseEnabledRef.current)
  }, [])

  return (
    <AudioCtx.Provider value={{ audioEnabled, toggleAudio, pauseForDialog, resumeAfterDialog }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudioContext must be used within AudioProvider')
  return ctx
}
