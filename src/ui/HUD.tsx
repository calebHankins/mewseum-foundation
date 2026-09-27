import { useState, useEffect } from 'react'
import { useCatProgress } from '../progression/CatProgressContext'
import { useAudioContext } from '../audio/AudioContext'
import { useAmbientAudio } from '../audio/useAmbientAudio'
import { CAT_REGISTRY } from '../cats/catData'

const TUTORIAL_KEY = 'mewseum_tutorial_seen'
const TOTAL_CATS = CAT_REGISTRY.length

/** Returns true if this is the first visit */
function isFirstVisit(): boolean {
  return !localStorage.getItem(TUTORIAL_KEY)
}

export default function HUD() {
  const { foundCount } = useCatProgress()
  const { audioEnabled, toggleAudio } = useAudioContext()
  const [showTutorial, setShowTutorial] = useState(isFirstVisit)
  const [isDesktop, setIsDesktop] = useState(true)

  // Drive ambient audio from context state
  useAmbientAudio(audioEnabled)

  useEffect(() => {
    setIsDesktop(window.matchMedia('(pointer: fine)').matches)
  }, [])

  function dismissTutorial() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setShowTutorial(false)
  }

  return (
    <div className="fixed inset-0 pointer-events-none select-none z-10">

      {/* ── Cat counter — top right ─────────────────────────────────────── */}
      <div className="absolute top-3 right-4 pointer-events-auto">
        <div className="bg-sanctuary-dark/80 border border-sanctuary-amber/40 px-3 py-2 rounded">
          <span className="font-pixel text-sanctuary-amber text-xs">
            🐾 {foundCount} / {TOTAL_CATS}
          </span>
        </div>
      </div>

      {/* ── Audio toggle — top left ─────────────────────────────────────── */}
      <button
        className="absolute top-3 left-4 pointer-events-auto bg-sanctuary-dark/80 border border-sanctuary-amber/40 px-3 py-2 rounded font-pixel text-xs text-sanctuary-amber hover:bg-sanctuary-warm/80 transition-colors"
        onClick={toggleAudio}
        aria-label={audioEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}
      >
        {audioEnabled ? '🔊' : '🔇'}
      </button>

      {/* ── Controls hint — bottom centre ──────────────────────────────── */}
      {!showTutorial && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <span className="font-pixel text-sanctuary-dust/50 text-xs">
            {isDesktop ? 'Click to look · WASD to move · Click cats to pet' : 'Drag right to look · Drag left to move · Tap cats to pet'}
          </span>
        </div>
      )}

      {/* ── First-visit tutorial overlay ────────────────────────────────── */}
      {showTutorial && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <div className="bg-sanctuary-dark/92 border-2 border-sanctuary-amber/60 rounded-lg max-w-sm w-full mx-4 p-6 text-center">
            <h1 className="font-pixel text-sanctuary-amber text-sm mb-4 leading-relaxed">
              Welcome to<br />The Found Foyer
            </h1>
            <p className="font-pixel text-sanctuary-dust text-xs leading-relaxed mb-4">
              This is a sanctuary for stray cats.<br />
              Explore the space and pet the cats to bring them home.
            </p>
            <div className="border-t border-sanctuary-amber/20 pt-4 mb-4">
              <p className="font-pixel text-sanctuary-dust/70 text-xs leading-relaxed">
                {isDesktop
                  ? 'Click canvas → look with mouse\nWASD or arrow keys to move\nClick a cat to pet it\nClick a frame to open a game'
                  : 'Drag left side → move\nDrag right side → look\nTap a cat to pet it\nTap a frame to open a game'}
              </p>
            </div>
            <button
              className="font-pixel text-xs bg-sanctuary-amber/80 text-sanctuary-dark px-4 py-2 rounded hover:bg-sanctuary-amber transition-colors"
              onClick={dismissTutorial}
            >
              Enter the Refuge →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
