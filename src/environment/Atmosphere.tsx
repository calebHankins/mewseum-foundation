import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const PARTICLE_COUNT = 180
const MAX_SMALL_PARTICLES = 1000
const SPREAD_X = 18
const SPREAD_Y = 5.5
const SPREAD_Z = 22
const SPLIT_DISTANCE = 10 // Max world-space distance from camera to mote

/** Floating pixel dust motes — simple BufferGeometry point cloud */
function PixelDust() {
  const pointsRef = useRef<THREE.Points>(null)
  const smallPointsRef = useRef<THREE.Points>(null)

  // Random positions + drift velocities, generated once
  const { positions, velocities, active } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const velocities = new Float32Array(PARTICLE_COUNT * 3)
    const active = new Uint8Array(PARTICLE_COUNT).fill(1)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * SPREAD_X
      positions[i * 3 + 1] = Math.random() * SPREAD_Y + 0.2
      positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD_Z
      // Slow drift
      velocities[i * 3] = (Math.random() - 0.5) * 0.004
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.004
    }
    return { positions, velocities, active }
  }, [])

  const { smallPositions, smallVelocities } = useMemo(() => {
    const smallPositions = new Float32Array(MAX_SMALL_PARTICLES * 3)
    const smallVelocities = new Float32Array(MAX_SMALL_PARTICLES * 3)
    return { smallPositions, smallVelocities }
  }, [])

  const smallCountRef = useRef(0)

  useFrame(() => {
    const pts = pointsRef.current
    if (pts) {
      const pos = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (active[i] === 0) continue

        pos[i * 3] += velocities[i * 3]
        pos[i * 3 + 1] += velocities[i * 3 + 1]
        pos[i * 3 + 2] += velocities[i * 3 + 2]
        // Wrap within bounds
        if (pos[i * 3] > SPREAD_X / 2) pos[i * 3] = -SPREAD_X / 2
        if (pos[i * 3] < -SPREAD_X / 2) pos[i * 3] = SPREAD_X / 2
        if (pos[i * 3 + 1] > SPREAD_Y) pos[i * 3 + 1] = 0.2
        if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = SPREAD_Y
        if (pos[i * 3 + 2] > SPREAD_Z / 2) pos[i * 3 + 2] = -SPREAD_Z / 2
        if (pos[i * 3 + 2] < -SPREAD_Z / 2) pos[i * 3 + 2] = SPREAD_Z / 2
      }
      pts.geometry.attributes.position.needsUpdate = true
    }

    const spts = smallPointsRef.current
    if (spts && smallCountRef.current > 0) {
      const pos = (spts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
      const count = smallCountRef.current
      for (let i = 0; i < count; i++) {
        pos[i * 3] += smallVelocities[i * 3]
        pos[i * 3 + 1] += smallVelocities[i * 3 + 1]
        pos[i * 3 + 2] += smallVelocities[i * 3 + 2]

        // Wrap within bounds
        if (pos[i * 3] > SPREAD_X / 2) pos[i * 3] = -SPREAD_X / 2
        if (pos[i * 3] < -SPREAD_X / 2) pos[i * 3] = SPREAD_X / 2
        if (pos[i * 3 + 1] > SPREAD_Y) pos[i * 3 + 1] = 0.2
        if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = SPREAD_Y
        if (pos[i * 3 + 2] > SPREAD_Z / 2) pos[i * 3 + 2] = -SPREAD_Z / 2
        if (pos[i * 3 + 2] < -SPREAD_Z / 2) pos[i * 3 + 2] = SPREAD_Z / 2
      }
      spts.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <>
      <points
        ref={pointsRef}
        onClick={(e) => {
          if (e.distance > SPLIT_DISTANCE || e.index === undefined) return
          e.stopPropagation()
          const idx = e.index
          if (active[idx] === 0) return

          const pts = pointsRef.current
          const spts = smallPointsRef.current
          if (!pts || !spts) return

          const spawnCount = 4
          // Guard the cap before committing to anything
          if (smallCountRef.current + spawnCount >= MAX_SMALL_PARTICLES) return

          const pos = (pts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
          const x = pos[idx * 3]
          const y = pos[idx * 3 + 1]
          const z = pos[idx * 3 + 2]

          // Spawn first, then hide the parent
          const spos = (spts.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array
          const currentCount = smallCountRef.current

          for (let i = 0; i < spawnCount; i++) {
            const sidx = currentCount + i
            spos[sidx * 3] = x + (Math.random() - 0.5) * 0.1
            spos[sidx * 3 + 1] = y + (Math.random() - 0.5) * 0.1
            spos[sidx * 3 + 2] = z + (Math.random() - 0.5) * 0.1
            smallVelocities[sidx * 3] = (Math.random() - 0.5) * 0.02
            smallVelocities[sidx * 3 + 1] = (Math.random() - 0.5) * 0.02
            smallVelocities[sidx * 3 + 2] = (Math.random() - 0.5) * 0.02
          }

          smallCountRef.current += spawnCount
          spts.geometry.setDrawRange(0, smallCountRef.current)
          spts.geometry.attributes.position.needsUpdate = true

          // Only now hide the parent mote
          active[idx] = 0
          pos[idx * 3] = 9999
          pos[idx * 3 + 1] = 9999
          pos[idx * 3 + 2] = 9999
          pts.geometry.attributes.position.needsUpdate = true
        }}
      >
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

      <points ref={smallPointsRef} frustumCulled={false}>
        <bufferGeometry drawRange={{ start: 0, count: 0 }}>
          <bufferAttribute
            attach="attributes-position"
            args={[smallPositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#D4B896"
          size={0.02}
          sizeAttenuation
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </points>
    </>
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
      <GodRay position={[-6, 2.5, -5]} rotation={[0, 0, -0.3]} />
      <GodRay position={[-5, 2.8, -5.5]} rotation={[0, 0, -0.35]} />
      <GodRay position={[-6, 2.5, 5]} rotation={[0, 0, -0.3]} />
      <GodRay position={[-5, 2.8, 5.5]} rotation={[0, 0, -0.35]} />

      {/* ── Warm point lights near windows ─────────────────── */}
      <pointLight position={[-7, 3.5, -6]} color="#D4955A" intensity={1.8} distance={10} />
      <pointLight position={[-7, 3.5, 6]} color="#D4955A" intensity={1.8} distance={10} />
    </group>
  )
}
