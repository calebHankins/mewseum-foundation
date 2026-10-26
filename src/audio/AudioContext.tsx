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
  // Stores whether audio was on before a dialog pause so we can restore it exactly.
  // Using a ref avoids an extra re-render on pause/resume.
  const prePauseEnabledRef = useRef(true)

  const toggleAudio = useCallback(() => {
    setAudioEnabled(v => !v)
  }, [])

  const pauseForDialog = useCallback(() => {
    setAudioEnabled(current => {
      prePauseEnabledRef.current = current
      return false
    })
  }, [])

  const resumeAfterDialog = useCallback(() => {
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
