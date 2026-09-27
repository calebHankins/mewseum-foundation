import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import { useAudioContext } from '../audio/AudioContext'
import { playMeow } from '../audio/meow'
import type { CatDef } from './catData'
import { CAT_REGISTRY } from './catData'

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

// ─────────────────────────────────────────────────────────────────────────────
// Cat wandering and social behavior constants
// ─────────────────────────────────────────────────────────────────────────────
const PET_DURATION = 0.6      // seconds for scale-pulse animation
const IDLE_SPEED = 0.8        // idle breathing cycle speed
const HEART_DURATION = 1.2    // seconds heart stays visible
const WANDER_SPEED = 1.8      // meters per second
const ROTATION_SPEED = 2.5    // radians per second
const WANDER_CHANGE_DIR = 1.5 // seconds between direction changes
const SOCIAL_RADIUS = 3.5     // meters to consider another cat "nearby"
const SOCIAL_INTERACTION = 2.5 // seconds social interaction lasts
// Removed unused constants for cleaner code

// ─────────────────────────────────────────────────────────────────────────────
// Cat behavior states
// ─────────────────────────────────────────────────────────────────────────────
type CatState = 'IDLE' | 'WANDER' | 'SOCIAL' | 'REST'

export default function Cat({ def }: CatProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)

  const { isCatFound, findCat } = useCatProgress()
  const { audioEnabled } = useAudioContext()
  const found = isCatFound(def.id)

  // Behavior state
  const [petting, setPetting] = useState(false)
  const [petTimer, setPetTimer] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [heartTimer, setHeartTimer] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [catState, setCatState] = useState<CatState>('IDLE')
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null)
  const [socialTarget, setSocialTarget] = useState<string | null>(null)

  // Current position state (needed for movement since def.position is immutable)
  const [catPosition, setCatPosition] = useState<THREE.Vector3>(() => {
    const pos = def.position
    return new THREE.Vector3(pos[0], pos[1], pos[2])
  })

  // Idle breathing oscillation
  const idlePhaseRef = useRef(Math.random() * Math.PI * 2)
  const wanderTimerRef = useRef(0)

  // Get all cat positions for social interaction (outside useFrame to avoid recreating)
  const catPositions = useRef(CAT_REGISTRY.map(c => ({ id: c.id, position: new THREE.Vector3(...c.position) }))).current

  // Log when behavior starts (only once per cat)
  useEffect(() => {
    if (found) {
      console.log(`[Cat ${def.name}] Behavior started`)
    }
  }, [found, def.name])

  const handlePet = useCallback(() => {
    if (!found) findCat(def.id)
    if (audioEnabled) playMeow()
    setPetting(true)
    setPetTimer(0)
    setShowHeart(true)
    setHeartTimer(0)
  }, [found, findCat, def.id, audioEnabled])

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

    // ── Wandering and Social Behavior ─────────────────────────────
    if (found && !petting) {
      wanderTimerRef.current += delta

      // State machine for cat behavior
      if (catState === 'IDLE') {
        // After a short delay, start wandering
        if (wanderTimerRef.current >= 2.0) {
          setCatState('WANDER')
          wanderTimerRef.current = 0
          // Pick a random wander target
          const wanderRangeX = 6
          const wanderRangeZ = 10
          const newX = def.position[0] + (Math.random() - 0.5) * wanderRangeX
          const newZ = def.position[2] + (Math.random() - 0.5) * wanderRangeZ
          setTargetPos(new THREE.Vector3(newX, group.position.y, newZ))
          console.log(`[Cat ${def.name}] Starting wander to [${newX.toFixed(1)}, ${newZ.toFixed(1)}]`)
        }
      } else if (catState === 'WANDER') {
        // Wander for a duration, then possibly socialize
        if (wanderTimerRef.current >= WANDER_CHANGE_DIR) {
          // Check for nearby found cats (using group.position which reflects current state)
          const nearbyCat = catPositions.find(
            c => c.id !== def.id && c.position.distanceTo(group.position) < SOCIAL_RADIUS && isCatFound(c.id)
          )
          
          if (nearbyCat && Math.random() < 0.35) {
            // Find a social target
            const socialCat = CAT_REGISTRY.find(c => c.id === nearbyCat.id)
            if (socialCat) {
              setSocialTarget(nearbyCat.id)
              setTargetPos(nearbyCat.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5)))
              setCatState('SOCIAL')
              wanderTimerRef.current = 0
              console.log(`[Cat ${def.name}] Approaching social partner`)
            }
          } else {
            // Pick a new random wander target
            const wanderRangeX = 6
            const wanderRangeZ = 10
            const newX = def.position[0] + (Math.random() - 0.5) * wanderRangeX
            const newZ = def.position[2] + (Math.random() - 0.5) * wanderRangeZ
            setTargetPos(new THREE.Vector3(newX, group.position.y, newZ))
            wanderTimerRef.current = 0
            console.log(`[Cat ${def.name}] New wander target [${newX.toFixed(1)}, ${newZ.toFixed(1)}]`)
          }
        }
        
        // Move toward target
        if (targetPos) {
          const direction = new THREE.Vector3().subVectors(targetPos, group.position)
          const distance = direction.length()
          direction.normalize()
          
          if (distance > 0.2) {
            // Rotate toward target
            const targetRotation = Math.atan2(direction.x, direction.z)
            const currentRotation = group.rotation.y
            const rotationDiff = targetRotation - currentRotation
            
            // Smooth rotation (handle wrap-around)
            let rotDiff = rotationDiff
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
            
            group.rotation.y += rotDiff * ROTATION_SPEED * delta * 0.5
            
            // Move forward
            group.position.x += direction.x * WANDER_SPEED * delta
            group.position.z += direction.z * WANDER_SPEED * delta
            
            // Update React state for next render
            setCatPosition(new THREE.Vector3(group.position.x, group.position.y, group.position.z))
          } else {
            // Reached target, idle briefly before picking new target
            setCatState('IDLE')
            wanderTimerRef.current = 0
            setTargetPos(null)
            console.log(`[Cat ${def.name}] Reached target, idling...`)
          }
        }
      } else if (catState === 'SOCIAL') {
        // Move toward social target
        if (socialTarget && targetPos) {
          const targetCat = catPositions.find(c => c.id === socialTarget)
          if (targetCat) {
            const direction = new THREE.Vector3().subVectors(targetPos, group.position)
            const distance = direction.length()
            direction.normalize()
            
            if (distance > 0.5) {
              const targetRotation = Math.atan2(direction.x, direction.z)
              const currentRotation = group.rotation.y
              const rotationDiff = targetRotation - currentRotation
              
              let rotDiff = rotationDiff
              while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
              while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
              
              group.rotation.y += rotDiff * ROTATION_SPEED * delta
              group.position.x += direction.x * (WANDER_SPEED * 0.7) * delta
              group.position.z += direction.z * (WANDER_SPEED * 0.7) * delta
              
              // Update React state for next render
              setCatPosition(new THREE.Vector3(group.position.x, group.position.y, group.position.z))
            } else {
              // Reached social partner - interact briefly
              if (wanderTimerRef.current >= SOCIAL_INTERACTION) {
                setCatState('IDLE')
                setSocialTarget(null)
                wanderTimerRef.current = 0
                setTargetPos(null)
                console.log(`[Cat ${def.name}] Social interaction complete`)
              }
            }
          }
        }
      }
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
      position={catPosition}
      rotation={def.rotation}
      onPointerDown={handlePet}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* ── Invisible Unified Hitbox ───────────────────────────── */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.5, 2.0]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
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
