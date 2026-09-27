import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import type { CatDef } from './catData'

// ─────────────────────────────────────────────────────────────────────────────
// Low-poly cat built from Three.js primitives.
// Body: stretched octahedron-ish box
// Head: smaller box
// Ears: two pyramids (cones, 4 segments)
// Tail: thin elongated box, angled up
// ─────────────────────────────────────────────────────────────────────────────

interface CatProps {
  def: CatDef
}

const PET_DURATION = 0.6   // seconds for scale-pulse animation
const IDLE_SPEED = 0.8   // idle breathing cycle speed
const HEART_DURATION = 1.2 // seconds heart stays visible

export default function Cat({ def }: CatProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)

  const { isCatFound, findCat } = useCatProgress()
  const found = isCatFound(def.id)

  const [petting, setPetting] = useState(false)
  const [petTimer, setPetTimer] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [heartTimer, setHeartTimer] = useState(0)
  const [hovered, setHovered] = useState(false)

  // Idle breathing oscillation
  const idlePhaseRef = useRef(Math.random() * Math.PI * 2)

  const handlePet = useCallback(() => {
    if (!found) findCat(def.id)
    setPetting(true)
    setPetTimer(0)
    setShowHeart(true)
    setHeartTimer(0)
  }, [found, findCat, def.id])

  useFrame((_, delta) => {
    const group = groupRef.current
    const body = bodyRef.current
    if (!group || !body) return

    idlePhaseRef.current += delta * IDLE_SPEED

    // Idle breathing: subtle Y scale oscillation
    const breath = 1 + Math.sin(idlePhaseRef.current) * 0.015
    if (!petting) body.scale.setScalar(breath)

    // Petting scale pulse
    if (petting) {
      const t = petTimer / PET_DURATION
      const pulse = 1 + Math.sin(t * Math.PI) * 0.18
      group.scale.setScalar(pulse)
      setPetTimer(prev => {
        const next = prev + delta
        if (next >= PET_DURATION) {
          setPetting(false)
          group.scale.setScalar(1)
        }
        return next
      })
    }

    // Heart countdown
    if (showHeart) {
      setHeartTimer(prev => {
        const next = prev + delta
        if (next >= HEART_DURATION) setShowHeart(false)
        return next
      })
    }
  })

  const bodyColor = def.color
  const accentColor = def.accentColor

  // Unfound cats are translucent until found for the first time
  const opacity = found ? 1 : 0.0
  if (!found) return null   // hidden until found

  return (
    <group
      ref={groupRef}
      position={def.position}
      rotation={def.rotation}
      onPointerDown={handlePet}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* ── Invisible Unified Hitbox ───────────────────────────── */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.0, 1.3, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ── Body ─────────────────────────────────── */}
      <mesh ref={bodyRef} position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.55, 0.42, 0.72]} />
        <meshLambertMaterial color={bodyColor} opacity={opacity} transparent={opacity < 1} />
      </mesh>

      {/* ── Head ─────────────────────────────────── */}
      <mesh position={[0, 0.78, 0.22]} castShadow>
        <boxGeometry args={[0.44, 0.38, 0.38]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>

      {/* ── Ears (low-poly cones, 4 segments) ─────── */}
      <mesh position={[-0.14, 1.06, 0.22]} castShadow>
        <coneGeometry args={[0.1, 0.18, 4]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      <mesh position={[0.14, 1.06, 0.22]} castShadow>
        <coneGeometry args={[0.1, 0.18, 4]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>

      {/* ── Tail ─────────────────────────────────── */}
      <mesh position={[0, 0.55, -0.46]} rotation={[0.5, 0, 0.15]} castShadow>
        <boxGeometry args={[0.1, 0.55, 0.1]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>

      {/* ── Front paws ───────────────────────────── */}
      <mesh position={[-0.18, 0.1, 0.24]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.2]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>
      <mesh position={[0.18, 0.1, 0.24]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.2]} />
        <meshLambertMaterial color={accentColor} />
      </mesh>

      {/* ── Eyes (small dark boxes) ───────────────── */}
      <mesh position={[-0.12, 0.82, 0.41]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshBasicMaterial color="#1A0A0A" />
      </mesh>
      <mesh position={[0.12, 0.82, 0.41]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshBasicMaterial color="#1A0A0A" />
      </mesh>

      {/* ── Tooltip name on hover ─────────────────── */}
      {hovered && (
        <Billboard position={[0, 1.4, 0]}>
          <Text
            fontSize={0.18}
            color="#D4955A"
            font={undefined}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#1A1410"
          >
            {def.name}
          </Text>
        </Billboard>
      )}

      {/* ── Floating heart on pet ─────────────────── */}
      {showHeart && (
        <Billboard position={[0, 1.65 + heartTimer * 0.4, 0]}>
          <Text
            fontSize={0.32}
            color="#D4606A"
            anchorX="center"
            anchorY="middle"
          >
            ♥
          </Text>
        </Billboard>
      )}
    </group>
  )
}
