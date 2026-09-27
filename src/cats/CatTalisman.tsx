import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import type { CatDef } from './catData'
import { CAT_REGISTRY } from './catData'

const TALISMAN_COOLDOWN = 3
const ACTIVATION_DURATION = 0.8
const EYE_FORWARD = new THREE.Vector3(0, 0, -1)

// ─────────────────────────────────────────────────────────────────────────────
// CatTalisman — A glowing sanctuary object that helps players find stray cats
// Players can interact with it to "revel" an unfound cat from the mist
// ─────────────────────────────────────────────────────────────────────────────

interface CatTalismanProps {
  position?: [number, number, number]
}

export default function CatTalisman({ position = [-1.5, 0, 12] }: CatTalismanProps) {
  const groupRef = useRef<THREE.Group>(null)
  const orbGroupRef = useRef<THREE.Group>(null)
  const irisGroupRef = useRef<THREE.Group>(null)
  const pupilGroupRef = useRef<THREE.Group>(null)
  const outerRingRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const cameraLocalPosition = useRef(new THREE.Vector3())
  const targetOrbQuaternion = useRef(new THREE.Quaternion())
  const pulseRef = useRef(0)
  const cooldownRef = useRef(0)
  const activationRef = useRef(0)
  const messageTimerRef = useRef(0)
  const [hovered, setHovered] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

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
      messageTimerRef.current = Math.min(1.5, cooldownRef.current)
      return
    }

    const unfoundCat = getUnfoundCat()
    if (unfoundCat) {
      findCat(unfoundCat.id)
      cooldownRef.current = TALISMAN_COOLDOWN
      activationRef.current = 0
      setMessage(`Found ${unfoundCat.name}!`)
      messageTimerRef.current = 3
      console.log(`[CatTalisman] Found cat: ${unfoundCat.name}`)
    } else {
      setMessage('All cats have been found!')
      messageTimerRef.current = 3
      console.log('[CatTalisman] All cats found')
    }
  }, [findCat, getUnfoundCat])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    // Gentle floating animation (only affect Y around target)
    pulseRef.current += delta * 1.5
    targetY.current = initialPos.current.y + 1.5 + Math.sin(pulseRef.current) * 0.15
    group.position.y = targetY.current
    group.updateMatrixWorld(true)

    const orbGroup = orbGroupRef.current
    if (orbGroup) {
      const cameraPosition = state.camera.getWorldPosition(cameraLocalPosition.current)
      group.worldToLocal(cameraPosition)
      if (cameraPosition.lengthSq() > 0) {
        targetOrbQuaternion.current.setFromUnitVectors(EYE_FORWARD, cameraPosition.normalize())
        orbGroup.quaternion.slerp(targetOrbQuaternion.current, 1 - Math.exp(-delta * 5))
      }
    }

    if (outerRingRef.current && innerRingRef.current) {
      outerRingRef.current.rotation.x += delta * 0.9
      outerRingRef.current.rotation.z += delta * 0.65
      innerRingRef.current.rotation.x -= delta * 0.75
      innerRingRef.current.rotation.z += delta * 1.1
    }

    const irisGroup = irisGroupRef.current
    const pupilGroup = pupilGroupRef.current
    if (irisGroup && pupilGroup) {
      const quiverX = Math.sin(pulseRef.current * 14) * 0.0025
      const quiverY = Math.sin(pulseRef.current * 19 + 1) * 0.002
      irisGroup.position.x = THREE.MathUtils.damp(irisGroup.position.x, quiverX * 0.35, 8, delta)
      irisGroup.position.y = THREE.MathUtils.damp(irisGroup.position.y, quiverY * 0.35, 8, delta)
      pupilGroup.position.x = THREE.MathUtils.damp(pupilGroup.position.x, quiverX, 8, delta)
      pupilGroup.position.y = THREE.MathUtils.damp(pupilGroup.position.y, quiverY, 8, delta)
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

    if (messageTimerRef.current > 0) {
      messageTimerRef.current = Math.max(0, messageTimerRef.current - delta)
      if (messageTimerRef.current === 0) setMessage(null)
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
      <group ref={orbGroupRef}>
        {/* ── Cat-Eye Sclera ────────────────────────────────────── */}
        <mesh castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial color="#E2C49D" />
        </mesh>

        {/* ── Cat-Eye Iris ──────────────────────────────────────── */}
        <group ref={irisGroupRef}>
          <mesh position={[0, 0, -0.39]} scale={[0.16, 0.24, 0.03]}>
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial color="#D8953F" />
          </mesh>

          {/* ── Cat-Eye Pupil ───────────────────────────────────── */}
          <group ref={pupilGroupRef}>
            <mesh position={[0, 0, -0.422]} scale={[0.035, 0.14, 0.012]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color="#2A1712" />
            </mesh>
            <mesh position={[-0.045, 0.075, -0.425]}>
              <sphereGeometry args={[0.018, 8, 6]} />
              <meshBasicMaterial color="#FFF0C2" />
            </mesh>
          </group>
        </group>
      </group>

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