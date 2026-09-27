import { CatProgressProvider } from './progression/CatProgressContext'
import { AudioProvider } from './audio/AudioContext'
import Scene from './Scene'
import HUD from './ui/HUD'

export default function App() {
  return (
    <CatProgressProvider>
      <AudioProvider>
        {/* Full-screen 3D canvas */}
        <div className="fixed inset-0">
          <Scene />
        </div>
        {/* React UI overlay — rendered on top of canvas */}
        <HUD />
      </AudioProvider>
    </CatProgressProvider>
  )
}
