import { useState } from 'react'
import { CatProgressProvider } from './progression/CatProgressContext'
import { AudioProvider } from './audio/AudioContext'
import Scene from './Scene'
import HUD from './ui/HUD'
import PebbleSort from './games/PebbleSort'

export default function App() {
  const [pebbleSortOpen, setPebbleSortOpen] = useState(false)

  return (
    <CatProgressProvider>
      <AudioProvider>
        {/* Full-screen 3D canvas */}
        <div className="fixed inset-0">
          <Scene onOpenPebbleSort={() => setPebbleSortOpen(true)} />
        </div>
        {/* React UI overlay — rendered on top of canvas */}
        <HUD />
        {pebbleSortOpen && <PebbleSort onClose={() => setPebbleSortOpen(false)} />}
      </AudioProvider>
    </CatProgressProvider>
  )
}
