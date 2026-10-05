import { useState, useEffect } from 'react'
import { useCatProgress } from '../progression/CatProgressContext'
import { useAudioContext } from '../audio/AudioContext'
import { useAmbientAudio } from '../audio/useAmbientAudio'
import { CAT_REGISTRY } from '../cats/catData'
import { playerState } from '../player/playerState'
import { useTreatContext } from '../treats/TreatContext'
import { TREAT_REST_HEIGHT } from '../treats/treatData'

const TUTORIAL_KEY = 'mewseum_tutorial_seen'
const HELP_KEY = 'mewseum_help_visible'
const TOTAL_CATS = CAT_REGISTRY.length

/** Returns true if this is the first visit */
function isFirstVisit(): boolean {
  return !localStorage.getItem(TUTORIAL_KEY)
}

function isHelpVisible(): boolean {
  const value = localStorage.getItem(HELP_KEY)
  return value === null ? false : value === 'true'
}

export default function HUD() {
  const { foundCount } = useCatProgress()
  const { audioEnabled, toggleAudio } = useAudioContext()
  const { heldTreat, worldTreats, dropTreat } = useTreatContext()
  const [showTutorial, setShowTutorial] = useState(isFirstVisit)
  const [isDesktop, setIsDesktop] = useState(true)
  const [showHelpText, setShowHelpText] = useState(isHelpVisible)
  const [reticlePosition, setReticlePosition] = useState(() => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  }))

  // Drive ambient audio from context state
  useAmbientAudio(audioEnabled)

  useEffect(() => {
    setIsDesktop(window.matchMedia('(pointer: fine)').matches)
  }, [])

  useEffect(() => {
    localStorage.setItem(HELP_KEY, String(showHelpText))
  }, [showHelpText])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyF' || !heldTreat || event.repeat) return
      const dropPosition = playerState.position.clone()
      dropPosition.y = TREAT_REST_HEIGHT
      dropTreat(dropPosition, playerState.forward.clone())
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dropTreat, heldTreat])

  useEffect(() => {
    const pointerPosition = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const updatePointerPosition = (event: PointerEvent) => {
      pointerPosition.x = event.clientX
      pointerPosition.y = event.clientY
      if (!document.pointerLockElement) {
        setReticlePosition({ ...pointerPosition })
      }
    }
    const updateLockPosition = () => {
      setReticlePosition(document.pointerLockElement
        ? { x: window.innerWidth / 2, y: window.innerHeight / 2 }
        : { ...pointerPosition })
    }
    const updateCenter = () => {
      if (document.pointerLockElement) {
        setReticlePosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
      }
    }

    window.addEventListener('pointermove', updatePointerPosition)
    window.addEventListener('pointerdown', updatePointerPosition)
    window.addEventListener('resize', updateCenter)
    document.addEventListener('pointerlockchange', updateLockPosition)
    return () => {
      window.removeEventListener('pointermove', updatePointerPosition)
      window.removeEventListener('pointerdown', updatePointerPosition)
      window.removeEventListener('resize', updateCenter)
      document.removeEventListener('pointerlockchange', updateLockPosition)
    }
  }, [])

  function dismissTutorial() {
    localStorage.setItem(TUTORIAL_KEY, '1')
    setShowTutorial(false)
  }

  function triggerJump() {
    window.dispatchEvent(new CustomEvent('player:jump'))
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

      <span className="sr-only" aria-label="Treat dispenser — click to get a treat">
        Treat dispenser
      </span>
      {worldTreats.some(treat => treat.claimedBy === null) && !heldTreat && (
        <span className="sr-only" aria-label="Dropped treats — click or tap to pick one up">
          Dropped treats
        </span>
      )}

      {heldTreat && (
        <div
          className={`absolute pointer-events-auto flex flex-col items-center gap-1 ${isDesktop ? 'bottom-14 right-4' : 'bottom-28 right-4'}`}
          aria-label="Held treat — press F or tap to drop"
        >
          <button
            className="bg-sanctuary-dark/80 border border-sanctuary-amber/40 px-3 py-2 rounded font-pixel text-lg text-sanctuary-amber flex items-center gap-2"
            aria-label="Held treat — press F or tap to drop"
            style={{ borderColor: heldTreat, color: heldTreat }}
            onClick={() => {
              const dropPosition = playerState.position.clone()
              dropPosition.y = TREAT_REST_HEIGHT
              dropTreat(dropPosition, playerState.forward.clone())
            }}
            onPointerDown={() => {
              const dropPosition = playerState.position.clone()
              dropPosition.y = TREAT_REST_HEIGHT
              dropTreat(dropPosition, playerState.forward.clone())
            }}
          >
            🍬
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: heldTreat }} aria-hidden="true" />
          </button>
          <span className="font-pixel text-sanctuary-dust/70 text-xs">
            {isDesktop ? 'F to drop' : 'Tap to drop'}
          </span>
        </div>
      )}

      {/* ── Audio toggle — top left ─────────────────────────────────────── */}
      <button
        className="absolute top-3 left-4 pointer-events-auto bg-sanctuary-dark/80 border border-sanctuary-amber/40 px-3 py-2 rounded font-pixel text-xs text-sanctuary-amber hover:bg-sanctuary-warm/80 transition-colors"
        onClick={toggleAudio}
        aria-label={audioEnabled ? 'Mute ambient sound' : 'Enable ambient sound'}
      >
        {audioEnabled ? '🔊' : '🔇'}
      </button>

      {!isDesktop && (
        <button
          className="absolute bottom-5 right-5 pointer-events-auto bg-sanctuary-amber/90 border-2 border-sanctuary-warm text-sanctuary-dark px-4 py-3 rounded-lg font-pixel text-xs shadow-lg active:scale-95 transition-transform"
          aria-label="Jump"
          onClick={triggerJump}
          onPointerDown={triggerJump}
        >
          JUMP
        </button>
      )}

      <button
        className="absolute bottom-3 left-4 pointer-events-auto bg-sanctuary-dark/80 border border-sanctuary-amber/40 rounded-full w-8 h-8 flex items-center justify-center font-pixel text-sm text-sanctuary-amber shadow-lg"
        aria-label={showHelpText ? 'Hide help text' : 'Show help text'}
        onClick={() => setShowHelpText(value => !value)}
      >
        ?
      </button>

      {/* ── Reticle — centre ──────────────────────────────────────────── */}
      {!showTutorial && (
        <div
          className="absolute -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-sanctuary-dust/60 rounded-full pointer-events-none"
          style={{ left: reticlePosition.x, top: reticlePosition.y }}
        />
      )}

      {/* ── Controls hint — bottom centre ──────────────────────────────── */}
      {!showTutorial && showHelpText && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <span className="font-pixel text-sanctuary-dust/50 text-xs shadow-black drop-shadow-md">
            {isDesktop ? 'Click to look · WASD to move · Click cats to pet' : 'Drag right to look · Drag left to move · Tap jump to leap · Tap cats to pet'}
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
                  : 'Drag left side → move\nDrag right side → look\nTap JUMP to leap\nTap a cat to pet it\nTap a frame to open a game'}
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
