import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { createPointerEvents } from '@react-three/fiber'
import type { ComputeFunction } from '@react-three/fiber'
import * as THREE from 'three'
import SanctuaryRoom from './environment/SanctuaryRoom'
import Atmosphere from './environment/Atmosphere'
import CatRegistry from './cats/CatRegistry'
import CatTalisman from './cats/CatTalisman'
import FrameRegistry from './frames/FrameRegistry'
import PlayerController from './player/PlayerController'
import PS1Pipeline from './shaders/PS1Pipeline'

// ─────────────────────────────────────────────────────────────────────────────
// centeredEvents — identical to R3F's default pointer events, except that when
// the Pointer Lock API has captured the cursor we force the ray through NDC
// (0, 0), i.e. the screen centre where the HUD reticle lives.
// ─────────────────────────────────────────────────────────────────────────────
function centeredEvents(store: Parameters<typeof createPointerEvents>[0]) {
  const base = createPointerEvents(store)
  // base.compute is typed as optional; assert it exists (it always does for createPointerEvents)
  const baseFn = base.compute!
  const compute: ComputeFunction = (event, state, previous) => {
    if (document.pointerLockElement) {
      // Pointer is locked → cursor is hidden → reticle (centre) is the aim point.
      // Force the ray through NDC (0,0) so it matches the HUD crosshair exactly.
      state.pointer.set(0, 0)
      state.raycaster.setFromCamera(state.pointer, state.camera)
    } else {
      // Normal (unlocked) mode — use the true cursor position
      baseFn(event, state, previous)
    }
  }
  const filter = (intersections: THREE.Intersection[]) => {
    // On desktop, the first canvas click only captures the pointer; it should not
    // also activate an object under the pre-lock cursor position.
    if (!document.pointerLockElement && window.matchMedia('(pointer: fine)').matches) return []
    return intersections
  }
  return { ...base, compute, filter }
}


// ─────────────────────────────────────────────────────────────────────────────
// SceneLights — ambient + directional warm lighting
// ─────────────────────────────────────────────────────────────────────────────
function SceneLights() {
  return (
    <>
      {/* Warm ambient fill */}
      <ambientLight color="#8A6040" intensity={0.55} />
      {/* Primary warm directional (simulates sunlight from windows) */}
      <directionalLight
        color="#D4955A"
        intensity={1.2}
        position={[-8, 7, -4]}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={10}
        shadow-camera-bottom={-2}
      />
      {/* Cool fill from opposite side */}
      <directionalLight
        color="#607080"
        intensity={0.3}
        position={[8, 4, 6]}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene — root R3F Canvas
// ─────────────────────────────────────────────────────────────────────────────
interface SceneProps {
  onOpenPebbleSort: () => void
}

export default function Scene({ onOpenPebbleSort }: SceneProps) {
  return (
    <Canvas
      // PS1: no anti-aliasing, locked pixel ratio
      gl={{
        antialias: false,
        powerPreference: 'default',
        alpha: false,
      }}
      dpr={1}
      shadows={{ type: THREE.PCFSoftShadowMap }}
      camera={{
        fov: 75,
        near: 0.1,
        far: 80,
      }}
      style={{ background: '#1A1410' }}
      events={centeredEvents}
    >
      <Suspense fallback={null}>
        {/* Navigation */}
        <PlayerController />

        {/* Lighting */}
        <SceneLights />

        {/* Environment */}
        <SanctuaryRoom />
        <Atmosphere />

        {/* Inhabitants */}
        <CatRegistry />

        {/* Sanctuary offering for finding stray cats */}
        <CatTalisman position={[-1.5, 0, 10]} />

        {/* Game exhibits */}
        <FrameRegistry onOpenPebbleSort={onOpenPebbleSort} />

        {/* PS1 post-processing — dither + colour banding */}
        <PS1Pipeline />
      </Suspense>
    </Canvas>
  )
}
