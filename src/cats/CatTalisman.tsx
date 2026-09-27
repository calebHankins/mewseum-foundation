import { useRef, useState, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import type { CatDef } from './catData'
import { CAT_REGISTRY } from './catData'

// ─────────────────────────────────────────────────────────────────────────────
// CatTalisman — A glowing sanctuary object that helps players find stray cats
// Players can interact with it to "revel" an unfound cat from the mist
// ─────────────────────────────────────────────────────────────────────────────

export default function CatTalisman() {
  const groupRef = useRef<THREE.Group>(null)
  const pulseRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTimer, setMessageTimer] = useState(0)

  const { foundCats, findCat } = useCatProgress()

  // Pick a random unfound cat when the talisman is activated
  const getUnfoundCat = useCallback(() => {
    const unfound = CAT_REGISTRY.filter((c: CatDef) => !foundCats.has(c.id))
    return unfound.length > 0 ? unfound[Math.floor(Math.random() * unfound.length)] : null
  }, [foundCats])

  const handleInteract = useCallback(() => {
    const unfoundCat = getUnfoundCat()
    if (unfoundCat) {
      findCat(unfoundCat.id)
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

    // Gentle floating animation
    pulseRef.current += delta * 1.5
    group.position.y = 1.5 + Math.sin(pulseRef.current) * 0.15

    // Slow rotation
    group.rotation.y += delta * 0.1

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
      position={[-1.5, 0, 12]}
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
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.7, 0.02, 8, 24]} />
        <meshBasicMaterial color="#D4955A" transparent opacity={0.6} />
      </mesh>

      {/* ── Second Radiance Ring ────────────────────────────────── */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.3, 1.3, 1.3]}>
        <torusGeometry args={[0.7, 0.01, 6, 16]} />
        <meshBasicMaterial color="#B88050" transparent opacity={0.4} />
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