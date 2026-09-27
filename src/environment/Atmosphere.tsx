import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 180
const SPREAD_X = 18
const SPREAD_Y = 5.5
const SPREAD_Z = 22

/** Floating pixel dust motes — simple BufferGeometry point cloud */
function PixelDust() {
  const pointsRef = useRef<THREE.Points>(null)

  // Random positions + drift velocities, generated once
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * SPREAD_X
      positions[i * 3 + 1] = Math.random() * SPREAD_Y + 0.2
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z
      // Slow drift
      velocities[i * 3]     = (Math.random() - 0.5) * 0.004
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004
    }
    return { positions, velocities }
  }, [])

  useFrame(() => {
    const pts = pointsRef.current
    if (!pts) return
    const pos = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3]     += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1]
      pos[i * 3 + 2] += velocities[i * 3 + 2]
      // Wrap within bounds
      if (pos[i * 3]     >  SPREAD_X / 2)  pos[i * 3]     = -SPREAD_X / 2
      if (pos[i * 3]     < -SPREAD_X / 2)  pos[i * 3]     =  SPREAD_X / 2
      if (pos[i * 3 + 1] > SPREAD_Y)       pos[i * 3 + 1] = 0.2
      if (pos[i * 3 + 1] < 0.2)            pos[i * 3 + 1] = SPREAD_Y
      if (pos[i * 3 + 2] >  SPREAD_Z / 2)  pos[i * 3 + 2] = -SPREAD_Z / 2
      if (pos[i * 3 + 2] < -SPREAD_Z / 2)  pos[i * 3 + 2] =  SPREAD_Z / 2
    }
    pts.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#D4B896"
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  )
}

/**
 * GodRay — a semi-transparent stretched box to simulate a volumetric light shaft.
 * Positioned to appear to come through a window on the left wall.
 */
function GodRay({ position, rotation }: {
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[1.4, 0.05, 7]} />
      <meshBasicMaterial
        color="#D4A060"
        transparent
        opacity={0.06}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

export default function Atmosphere() {
  return (
    <group>
      {/* ── Pixel dust ─────────────────────────────────────── */}
      <PixelDust />

      {/* ── God rays — angled shafts from left windows ─────── */}
      <GodRay position={[-6, 2.5, -5]}  rotation={[0, 0, -0.3]} />
      <GodRay position={[-5, 2.8, -5.5]} rotation={[0, 0, -0.35]} />
      <GodRay position={[-6, 2.5,  5]}  rotation={[0, 0, -0.3]} />
      <GodRay position={[-5, 2.8,  5.5]} rotation={[0, 0, -0.35]} />

      {/* ── Warm point lights near windows ─────────────────── */}
      <pointLight position={[-7, 3.5, -6]} color="#D4955A" intensity={1.8} distance={10} castShadow />
      <pointLight position={[-7, 3.5,  6]} color="#D4955A" intensity={1.8} distance={10} castShadow />
    </group>
  )
}
