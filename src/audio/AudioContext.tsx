import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface AudioContextValue {
  audioEnabled: boolean
  toggleAudio: () => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  // Default OFF — respects autoplay policy
  const [audioEnabled, setAudioEnabled] = useState(false)

  const toggleAudio = useCallback(() => {
    setAudioEnabled(v => !v)
  }, [])

  return (
    <AudioCtx.Provider value={{ audioEnabled, toggleAudio }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudioContext(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudioContext must be used within AudioProvider')
  return ctx
}
