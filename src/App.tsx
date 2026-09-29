import { useState } from 'react'
import { CatProgressProvider } from './progression/CatProgressContext'
import { AudioProvider } from './audio/AudioContext'
import Scene from './Scene'
import HUD from './ui/HUD'
import PebbleSort from './games/PebbleSort'
import { TreatProvider } from './treats/TreatContext'

export default function App() {
  const [pebbleSortOpen, setPebbleSortOpen] = useState(false)

  return (
    <CatProgressProvider>
      <AudioProvider>
        <TreatProvider>
          {/* Full-screen 3D canvas */}
          <div className="fixed inset-0">
            <Scene onOpenPebbleSort={() => setPebbleSortOpen(true)} />
          </div>
          {/* React UI overlay — rendered on top of canvas */}
          <HUD />
          {pebbleSortOpen && <PebbleSort onClose={() => setPebbleSortOpen(false)} />}
        </TreatProvider>
      </AudioProvider>
    </CatProgressProvider>
  )
}
