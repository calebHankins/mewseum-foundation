import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import type { CatDef } from './catData'
import { CAT_REGISTRY } from './catData'

const TALISMAN_COOLDOWN = 3
const ACTIVATION_DURATION = 0.8

// ─────────────────────────────────────────────────────────────────────────────
// CatTalisman — A glowing sanctuary object that helps players find stray cats
// Players can interact with it to "revel" an unfound cat from the mist
// ─────────────────────────────────────────────────────────────────────────────

interface CatTalismanProps {
  position?: [number, number, number]
}

export default function CatTalisman({ position = [-1.5, 0, 12] }: CatTalismanProps) {
  const groupRef = useRef<THREE.Group>(null)
  const outerRingRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const pulseRef = useRef(0)
  const cooldownRef = useRef(0)
  const activationRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTimer, setMessageTimer] = useState(0)

  // Store initial position in a ref to preserve x/z during y animation
  const initialPos = useRef<THREE.Vector3>(new THREE.Vector3(position[0], position[1], position[2]))
  const targetY = useRef(1.5)

  // Set initial group position on mount
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(position[0], position[1], position[2])
    }
  }, [position])

  const { foundCats, findCat } = useCatProgress()

  // Pick a random unfound cat when the talisman is activated
  const getUnfoundCat = useCallback(() => {
    const unfound = CAT_REGISTRY.filter((c: CatDef) => !foundCats.has(c.id))
    return unfound.length > 0 ? unfound[Math.floor(Math.random() * unfound.length)] : null
  }, [foundCats])

  const handleInteract = useCallback(() => {
    if (cooldownRef.current > 0) {
      setMessage('The talisman is resting')
      setMessageTimer(0)
      return
    }

    const unfoundCat = getUnfoundCat()
    if (unfoundCat) {
      findCat(unfoundCat.id)
      cooldownRef.current = TALISMAN_COOLDOWN
      activationRef.current = 0
      setMessage(`Found ${unfoundCat.name}!`)
      setMessageTimer(0)
      console.log(`[CatTalisman] Found cat: ${unfoundCat.name}`)
    } else {
      setMessage('All cats have been found!')
      setMessageTimer(0)
      console.log('[CatTalisman] All cats found')
    }
  }, [findCat, getUnfoundCat])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    // Gentle floating animation (only affect Y around target)
    pulseRef.current += delta * 1.5
    targetY.current = initialPos.current.y + 1.5 + Math.sin(pulseRef.current) * 0.15
    group.position.y = targetY.current

    // Slow rotation
    group.rotation.y += delta * 0.1

    if (outerRingRef.current && innerRingRef.current) {
      outerRingRef.current.rotation.x += delta * 0.9
      outerRingRef.current.rotation.z += delta * 0.65
      innerRingRef.current.rotation.x -= delta * 0.75
      innerRingRef.current.rotation.z += delta * 1.1
    }

    if (activationRef.current < ACTIVATION_DURATION) {
      activationRef.current += delta
      const progress = Math.min(activationRef.current / ACTIVATION_DURATION, 1)
      group.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.2)
    } else {
      group.scale.setScalar(1)
    }

    if (cooldownRef.current > 0) {
      cooldownRef.current = Math.max(0, cooldownRef.current - delta)
    }

    // Message countdown
    if (messageTimer > 0) {
      setMessageTimer(prev => {
        const next = prev + delta
        if (next >= 3) setMessage(null)
        return next
      })
    }
  })

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerDown={handleInteract}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* ── Glowing Orb Core ────────────────────────────────────── */}
      <mesh castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#D4955A" />
      </mesh>

      {/* ── Inner Pulse Glow ────────────────────────────────────── */}
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#F4B460" />
      </mesh>

      {/* ── Outer Radiance Ring (wireframe) ─────────────────────── */}
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.02, 8, 24]} />
        <meshBasicMaterial color="#D4955A" transparent opacity={0.6} />
      </mesh>

      {/* ── Second Radiance Ring ────────────────────────────────── */}
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1.3, 1.3]}>
        <torusGeometry args={[0.7, 0.01, 6, 16]} />
        <meshBasicMaterial color="#B88050" transparent opacity={0.4} />
      </mesh>

      {/* ── Invisible unified hitbox for interaction ────────────── */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>

      {/* ── Tooltip ─────────────────────────────────────────────── */}
      {hovered && (
        <Billboard position={[0, 1.2, 0]}>
          <Text
            fontSize={0.16}
            color="#D4955A"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#1A1410"
          >
            Find a stray cat
          </Text>
        </Billboard>
      )}

      {/* ── Status Message ──────────────────────────────────────── */}
      {message && (
        <Billboard position={[0, 2.5, 0]}>
          <Text
            fontSize={0.22}
            color="#F4B460"
            anchorX="center"
            anchorY="middle"
          >
            {message}
          </Text>
        </Billboard>
      )}
    </group>
  )
}