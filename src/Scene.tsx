import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import SanctuaryRoom from './environment/SanctuaryRoom'
import Atmosphere from './environment/Atmosphere'
import CatRegistry from './cats/CatRegistry'
import CatTalisman from './cats/CatTalisman'
import FrameRegistry from './frames/FrameRegistry'
import PlayerController from './player/PlayerController'
import PS1Pipeline from './shaders/PS1Pipeline'

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
export default function Scene() {
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
        <FrameRegistry />

        {/* PS1 post-processing — dither + colour banding */}
        <PS1Pipeline />
      </Suspense>
    </Canvas>
  )
}
