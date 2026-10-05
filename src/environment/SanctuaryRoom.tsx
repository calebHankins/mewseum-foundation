import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { registerObstacle } from '../player/obstacleCollision'

// Room dimensions (metres, roughly)
const ROOM_W = 20
const ROOM_H = 4.1
const ROOM_D = 24

// ─── Register solid obstacle AABBs (called once at module evaluation) ─────────
// Bench bounds include the legs and seat; XZ padding helps avoid clipping corners.
registerObstacle([ 5,  0.1, -9], 1.2, 0.4, 0.3)   // bench 1
registerObstacle([-5,  0.1,  9], 1.2, 0.4, 0.3)   // bench 2
registerObstacle([ 0,  0.1,  9], 1.2, 0.4, 0.3)   // bench 3
// Pedestal bounds include the base and top trim plate.
registerObstacle([ 7,  0.365, -10], 0.4, 0.4, 0.365) // pedestal 0
registerObstacle([-7,  0.365, -10], 0.4, 0.4, 0.365) // pedestal 1
registerObstacle([ 7,  0.365,  10], 0.4, 0.4, 0.365) // pedestal 2
registerObstacle([-7,  0.365,  10], 0.4, 0.4, 0.365) // pedestal 3
// ─────────────────────────────────────────────────────────────────────────────

// Warm amber palette — all Lambert (unlit-ish, PS1 style)
const PALETTE = {
  floor:   new THREE.Color('#5C4A32'),
  wall:    new THREE.Color('#3D2E1E'),
  ceiling: new THREE.Color('#2A1F14'),
  trim:    new THREE.Color('#D4955A'),
  window:  new THREE.Color('#D4B896'),
}

function makeMat(color: THREE.Color, side: THREE.Side = THREE.FrontSide) {
  return new THREE.MeshLambertMaterial({ color, side })
}

/** Chunky low-poly bench: a box with four short leg boxes */
function Bench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Seat */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <meshLambertMaterial color="#6B4F30" />
      </mesh>
      {/* Legs */}
      {([-1, 1] as const).map(sx =>
        ([-0.3, 0.3] as const).map(sz => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.0, -0.3, sz]} castShadow>
            <boxGeometry args={[0.15, 0.4, 0.15]} />
            <meshLambertMaterial color="#5C3D20" />
          </mesh>
        )),
      )}
    </group>
  )
}

interface PedestalProps {
  position: [number, number, number]
  index: number
}

// Sound effect helper: plays a gentle high-pitched bell/chime ping when interacting with gallery relics
function playRelicChime(freq = 660) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(freq, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.45)
  } catch {
    // Ignore audio autoplay restrictions
  }
}

function MysticStarPolyhedron() {
  const groupRef = useRef<THREE.Group>(null)
  const coreMeshRef = useRef<THREE.Mesh>(null)
  const bead1Ref = useRef<THREE.Mesh>(null)
  const bead2Ref = useRef<THREE.Mesh>(null)
  const bead3Ref = useRef<THREE.Mesh>(null)
  const elapsedRef = useRef(3.0)
  const interactRef = useRef<number | null>(null)
  const lastPointerDown = useRef(0)

  function triggerInteract(e: ThreeEvent<PointerEvent | MouseEvent>) {
    e.stopPropagation()
    if (e.nativeEvent.type === 'pointerdown') {
      lastPointerDown.current = performance.now()
    } else if (performance.now() - lastPointerDown.current < 500) {
      return
    }
    interactRef.current = 0
    playRelicChime(880)
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return
    elapsedRef.current += delta
    const t = elapsedRef.current

    let boost = 1.0
    let burstScale = 1.0

    if (interactRef.current !== null) {
      interactRef.current += delta
      const prog = Math.min(interactRef.current / 0.85, 1)
      const remaining = 1 - prog
      // Bead acceleration boost and star core scale pulse
      boost = 1.0 + remaining * 4.5
      burstScale = 1.0 + Math.sin(prog * Math.PI) * 0.45

      if (prog >= 1) {
        interactRef.current = null
      }
    }

    if (coreMeshRef.current) {
      coreMeshRef.current.scale.setScalar(burstScale)
    }

    // Floating bob & star rotation
    groupRef.current.position.y = 0.95 + Math.sin(t * 2.2) * 0.07
    groupRef.current.rotation.y += delta * 0.5 * boost
    groupRef.current.rotation.z = Math.sin(t * 0.8) * 0.1

    // Bead 1: Fast horizontal-ish close orbit
    if (bead1Ref.current) {
      const a1 = t * 2.0 * boost
      const r1 = 0.36 * burstScale
      bead1Ref.current.position.set(
        Math.cos(a1) * r1,
        Math.sin(a1 * 0.5) * 0.08,
        Math.sin(a1) * r1,
      )
    }

    // Bead 2: Tilted polar orbit, medium speed, opposite direction
    if (bead2Ref.current) {
      const a2 = (-t * 1.4 + 1.2) * boost
      const r2 = 0.44 * burstScale
      bead2Ref.current.position.set(
        Math.cos(a2) * r2 * 0.7,
        Math.sin(a2) * r2,
        Math.cos(a2) * r2 * 0.7,
      )
    }

    // Bead 3: Slow wide equatorial loop with vertical undulation
    if (bead3Ref.current) {
      const a3 = (t * 1.1 + 3.14) * boost
      const r3 = 0.52 * burstScale
      bead3Ref.current.position.set(
        Math.sin(a3) * r3,
        Math.cos(a3 * 2) * 0.14,
        Math.cos(a3) * r3,
      )
    }
  })

  return (
    <group
      ref={groupRef}
      onClick={triggerInteract}
      onPointerDown={triggerInteract}
    >
      {/* Central Star Core */}
      <mesh ref={coreMeshRef} castShadow>
        <icosahedronGeometry args={[0.22, 0]} />
        <meshLambertMaterial color="#5CA08E" emissive="#1D4A40" emissiveIntensity={0.25} />
      </mesh>

      {/* Orbiting Bead 1: Fast inner ring */}
      <mesh ref={bead1Ref} castShadow>
        <boxGeometry args={[0.065, 0.065, 0.065]} />
        <meshLambertMaterial color="#A4E0CE" />
      </mesh>

      {/* Orbiting Bead 2: Inclined polar orbit */}
      <mesh ref={bead2Ref} castShadow>
        <octahedronGeometry args={[0.045, 0]} />
        <meshLambertMaterial color="#D4F0E6" />
      </mesh>

      {/* Orbiting Bead 3: Wide gentle undulating orbit */}
      <mesh ref={bead3Ref} castShadow>
        <boxGeometry args={[0.055, 0.055, 0.055]} />
        <meshLambertMaterial color="#7EC4B2" />
      </mesh>
    </group>
  )
}

/**
 * 4 unique low-poly cozy gallery objects:
 * 0: Floating Crystal Geode / Gem (octahedron)
 * 1: Cozy Yarn Ball with small needles (sphere + crossed rods)
 * 2: Ancient Star Relic / Prism (icosahedron / 12-sided low poly star)
 * 3: Low-poly Teapot / Urn (cylinder bowl + lid + spout + handle)
 */
function FloatingDisplayObject({ index }: { index: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const childGroupRef = useRef<THREE.Group>(null)
  const elapsedRef = useRef(index * 1.5) // staggered initial phase
  const interactRef = useRef<number | null>(null)
  const lastPointerDown = useRef(0)

  function triggerInteract(e: ThreeEvent<PointerEvent | MouseEvent>) {
    e.stopPropagation()
    if (e.nativeEvent.type === 'pointerdown') {
      lastPointerDown.current = performance.now()
    } else if (performance.now() - lastPointerDown.current < 500) {
      return
    }
    interactRef.current = 0

    // Relic sound pitch varies by object
    const pitches = [520, 620, 880, 440]
    playRelicChime(pitches[index] || 550)
  }

  useFrame((_, delta) => {
    if (!groupRef.current) return
    elapsedRef.current += delta
    const t = elapsedRef.current

    let spinBoost = 0
    let liftBoost = 0
    let wobbleX = 0
    let wobbleZ = 0
    let scaleX = 1
    let scaleY = 1
    let scaleZ = 1

    if (interactRef.current !== null) {
      interactRef.current += delta
      const prog = interactRef.current / 0.75
      const remaining = Math.max(0, 1 - prog)

      if (index === 0) {
        // Crystal Save Point: Rapid spinning charge-up + vertical leap + jewel flash
        spinBoost = remaining * 18
        liftBoost = Math.sin(prog * Math.PI) * 0.28
        scaleX = 1 + Math.sin(prog * Math.PI) * 0.25
        scaleY = 1 + Math.sin(prog * Math.PI) * 0.35
        scaleZ = scaleX
      } else if (index === 1) {
        // Woolen Yarn: Bouncy squash-and-stretch + excited roll
        liftBoost = Math.sin(prog * Math.PI) * 0.22
        const bounce = Math.sin(prog * Math.PI * 4) * remaining
        scaleY = 1 - bounce * 0.3
        scaleX = 1 + bounce * 0.25
        scaleZ = 1 + bounce * 0.25
        spinBoost = Math.sin(prog * Math.PI * 2) * 6
      } else if (index === 3) {
        // Ceramic Teapot: Spirited wobble dance and lid puff
        liftBoost = Math.sin(prog * Math.PI) * 0.15
        wobbleX = Math.sin(t * 30) * 0.25 * remaining
        wobbleZ = Math.cos(t * 26) * 0.2 * remaining
        spinBoost = Math.sin(prog * Math.PI * 2) * 4
      }

      if (prog >= 1) {
        interactRef.current = null
      }
    }

    // Bobbing motion similar to treats (Math.sin(t * Math.PI) * amplitude)
    groupRef.current.position.y = 0.95 + Math.sin(t * 2.2) * 0.07 + liftBoost
    // Gentle rotation + interact spin boost
    groupRef.current.rotation.y += delta * (0.75 + spinBoost)
    groupRef.current.rotation.x = Math.sin(t * 1.1) * 0.08 + wobbleX
    groupRef.current.rotation.z = wobbleZ
    groupRef.current.scale.set(scaleX, scaleY, scaleZ)
  })

  // Object 0: Crystal Geode (Warm Emerald Green / PS1 Memory Save Crystal)
  if (index === 0) {
    return (
      <group
        ref={groupRef}
        onClick={triggerInteract}
        onPointerDown={triggerInteract}
      >
        {/* Central dual pyramid crystal — classic PS1 save-point warm green */}
        <mesh castShadow>
          <octahedronGeometry args={[0.26, 0]} />
          <meshLambertMaterial color="#4BB865" emissive="#124A1E" emissiveIntensity={0.35} />
        </mesh>
        {/* Inner core accent — pale luminous mint */}
        <mesh>
          <octahedronGeometry args={[0.13, 0]} />
          <meshLambertMaterial color="#B8F7C8" />
        </mesh>
      </group>
    )
  }

  // Object 1: Cozy Woolen Yarn Ball with knitting needles
  if (index === 1) {
    return (
      <group
        ref={groupRef}
        onClick={triggerInteract}
        onPointerDown={triggerInteract}
      >
        {/* Main wool ball */}
        <mesh castShadow>
          <sphereGeometry args={[0.22, 6, 5]} />
          <meshLambertMaterial color="#D96B6B" />
        </mesh>
        {/* Crossing knitting needles */}
        <mesh position={[0, 0, 0]} rotation={[0.6, 0.4, 0.7]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.65, 4]} />
          <meshLambertMaterial color="#F4E0C0" />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[-0.5, 0.2, -0.6]} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 0.65, 4]} />
          <meshLambertMaterial color="#F4E0C0" />
        </mesh>
      </group>
    )
  }

  // Object 2: Mystic Star Polyhedron with multi-orbit beads
  if (index === 2) {
    return <MysticStarPolyhedron />
  }

  // Object 3: Antiquated Cozy Ceramic Urn / Teapot
  return (
    <group
      ref={groupRef}
      onClick={triggerInteract}
      onPointerDown={triggerInteract}
    >
      {/* Urn / pot body */}
      <mesh position={[0, -0.04, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.12, 0.28, 6]} />
        <meshLambertMaterial color="#C48E58" />
      </mesh>
      {/* Lid & knob */}
      <group ref={childGroupRef}>
        <mesh position={[0, 0.14, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.19, 0.08, 6]} />
          <meshLambertMaterial color="#7D5028" />
        </mesh>
        <mesh position={[0, 0.21, 0]} castShadow>
          <sphereGeometry args={[0.045, 4, 3]} />
          <meshLambertMaterial color="#E8C88A" />
        </mesh>
      </group>
      {/* Spout */}
      <mesh position={[0.2, 0.04, 0]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.22, 5]} />
        <meshLambertMaterial color="#9E6E3D" />
      </mesh>
    </group>
  )
}

/** Stand / Pedestal with a gently floating unique object */
function PedestalWithArtifact({ position, index }: PedestalProps) {
  return (
    <group position={position}>
      {/* Brown wooden pedestal stand */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.7, 0.8]} />
        <meshLambertMaterial color="#7A5C3A" />
      </mesh>
      {/* Pedestal top trim plate */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.72, 0.04, 0.72]} />
        <meshLambertMaterial color="#5C3D20" />
      </mesh>

      {/* Floating unique exhibit object */}
      <FloatingDisplayObject index={index} />
    </group>
  )
}

/** Window opening with warm emissive glow — simulates light coming in */
function Window({ position, rotation }: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[2.2, 2.8, 0.12]} />
        <meshLambertMaterial color="#4A3520" />
      </mesh>
      {/* Glass — emissive warm amber */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.8, 2.4]} />
        <meshLambertMaterial
          color={PALETTE.window}
          emissive={new THREE.Color('#C89050')}
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default function SanctuaryRoom() {
  // We use useMemo so geometry/material objects aren't recreated on every render
  const floorMat  = useMemo(() => makeMat(PALETTE.floor, THREE.FrontSide), [])
  const wallMat   = useMemo(() => makeMat(PALETTE.wall, THREE.BackSide), [])
  const ceilMat   = useMemo(() => makeMat(PALETTE.ceiling, THREE.FrontSide), [])

  return (
    <group>
      {/* ── Floor ─────────────────────────────────────────────── */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D, 4, 4]} />
        <primitive object={floorMat} />
      </mesh>

      {/* Floor planks (thin raised strips for depth) */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[i * 2.4 - 9.6, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, ROOM_D]} />
          <meshLambertMaterial color="#4A3A28" />
        </mesh>
      ))}

      {/* ── Room box (viewed from inside → BackSide) ──────────── */}
      <mesh position={[0, ROOM_H / 2, 0]}>
        <boxGeometry args={[ROOM_W, ROOM_H, ROOM_D]} />
        <primitive object={wallMat} />
      </mesh>

      {/* ── Ceiling ───────────────────────────────────────────── */}
      <mesh position={[0, ROOM_H - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D, 2, 2]} />
        <primitive object={ceilMat} />
      </mesh>

      {/* ── Trim / skirting boards ────────────────────────────── */}
      {/* Front & back */}
      {([-ROOM_D / 2, ROOM_D / 2] as const).map(z => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[ROOM_W, 0.24, 0.06]} />
          <meshLambertMaterial color={PALETTE.trim} />
        </mesh>
      ))}
      {/* Left & right */}
      {([-ROOM_W / 2, ROOM_W / 2] as const).map(x => (
        <mesh key={x} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.06, 0.24, ROOM_D]} />
          <meshLambertMaterial color={PALETTE.trim} />
        </mesh>
      ))}

      {/* ── Windows — left wall, facing into the room ─────────── */}
      <Window position={[-ROOM_W / 2 + 0.08, 2.6, -6]} rotation={[0, Math.PI / 2, 0]} />
      <Window position={[-ROOM_W / 2 + 0.08, 2.6,  6]} rotation={[0, Math.PI / 2, 0]} />

      {/* ── Furniture ─────────────────────────────────────────── */}
      <Bench position={[ 5,  0.3, -9]} />
      <Bench position={[-5,  0.3,  9]} />
      <Bench position={[ 0,  0.3,  9]} />

      <PedestalWithArtifact position={[ 7,  0.35, -10]} index={0} />
      <PedestalWithArtifact position={[-7,  0.35, -10]} index={1} />
      <PedestalWithArtifact position={[ 7,  0.35,  10]} index={2} />
      <PedestalWithArtifact position={[-7,  0.35,  10]} index={3} />
    </group>
  )
}
