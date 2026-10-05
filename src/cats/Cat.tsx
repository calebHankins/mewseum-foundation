import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import { useAudioContext } from '../audio/AudioContext'
import { playMeow } from '../audio/meow'
import { useTreatContext } from '../treats/TreatContext'
import type { WorldTreatState } from '../treats/TreatContext'
import {
  CAT_TREAT_DIGESTION_DURATION,
  CAT_TREAT_SCALE_INCREASE,
  TREAT_DETECTION_RADIUS,
  TREAT_REACH_DISTANCE,
} from '../treats/treatData'
import type { CatDef } from './catData'
import { CAT_REGISTRY } from './catData'
import { resolveObstacleCollision } from '../player/obstacleCollision'

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
// Shared position registry - ALL Cat instances share this
// ─────────────────────────────────────────────────────────────────────────────
const catPositionsRegistry: Record<string, THREE.Vector3> = {}
const catSocialStateRegistry: Record<string, boolean> = {}

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
const SOCIAL_TIMEOUT = 4       // seconds before a social approach is abandoned
const SOCIAL_SEPARATION_MULT = 4
const PET_COOLDOWN = 8        // seconds cat stays near player after being pet
const STAY_NEAR_PLAYER_RADIUS = 5 // meters to stay near player
const COLLISION_RADIUS = 0.6  // meters at which cats push away from each other
// Removed unused constants for cleaner code

// ─────────────────────────────────────────────────────────────────────────────
// Cat behavior states
// ─────────────────────────────────────────────────────────────────────────────
type CatState = 'IDLE' | 'WANDER' | 'SOCIAL' | 'REST' | 'COOLDOWN' | 'PUSHBACK' | 'EAT'

export default function Cat({ def }: CatProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Mesh>(null)

  const { isCatFound, findCat } = useCatProgress()
  const { audioEnabled } = useAudioContext()
  const { worldTreats, claimTreat, unclaimTreat, consumeTreat } = useTreatContext()
  const found = isCatFound(def.id)

  // Get social properties with defaults
  const socialDrive = def.socialDrive ?? 5

  // Behavior state
  const [petting, setPetting] = useState(false)
  const [petTimer, setPetTimer] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [heartTimer, setHeartTimer] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [catState, setCatState] = useState<CatState>('IDLE')
  const [targetPos, setTargetPos] = useState<THREE.Vector3 | null>(null)
  const [targetTreatId, setTargetTreatId] = useState<number | null>(null)
  const [socialTarget, setSocialTarget] = useState<string | null>(null)
  const [cooldownTimer, setCooldownTimer] = useState(0)
  const [interactionTimer, setInteractionTimer] = useState(0)
  const [showFriendHeart, setShowFriendHeart] = useState(false)

  // Current position state (needed for movement since def.position is immutable)
  const [catPosition, setCatPosition] = useState<THREE.Vector3>(() => {
    const pos = def.position
    return new THREE.Vector3(pos[0], pos[1], pos[2])
  })

  // Idle breathing oscillation
  const idlePhaseRef = useRef(Math.random() * Math.PI * 2)
  const wanderTimerRef = useRef(0)
  const treatDigestionRef = useRef<number[]>([])
  const socialSnapshotRef = useRef<THREE.Vector3 | null>(null)
  const partnerCooldownsRef = useRef<Map<string, number>>(new Map())
  const socialTimeoutRef = useRef(0)

  // Use the shared module-level registry
  const ownCatId = def.id

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
    if (socialTarget) {
      partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)
    }
    catSocialStateRegistry[ownCatId] = false
    socialSnapshotRef.current = null
    socialTimeoutRef.current = 0

    if (catState === 'EAT' && targetTreatId !== null) {
      unclaimTreat(def.id, targetTreatId)
    }

    // Set cooldown state - cat will stay near player for a while
    setCatState('COOLDOWN')
    setCooldownTimer(PET_COOLDOWN)
    // Pick a target near the player
    setTargetPos(new THREE.Vector3(groupRef.current?.position.x ?? def.position[0], groupRef.current?.position.y ?? def.position[1], groupRef.current?.position.z ?? def.position[2]))
    setTargetTreatId(null)
    console.log(`[Cat ${def.name}] Petted! Entering cooldown for ${PET_COOLDOWN}s`)
  }, [audioEnabled, catState, def.id, def.name, def.position, def.socialFatigue, findCat, found, ownCatId, socialTarget, targetTreatId, unclaimTreat])

  useEffect(() => {
    if (catState === 'EAT' || targetTreatId === null) return
    unclaimTreat(def.id, targetTreatId)
    setTargetTreatId(null)
  }, [catState, def.id, targetTreatId, unclaimTreat])

  useFrame((_, delta) => {
    const group = groupRef.current
    const body = bodyRef.current
    if (!group || !body) return

    idlePhaseRef.current += delta * IDLE_SPEED

    let activeTreatGrowth = 0
    for (let index = treatDigestionRef.current.length - 1; index >= 0; index -= 1) {
      const remaining = treatDigestionRef.current[index] - delta / CAT_TREAT_DIGESTION_DURATION
      if (remaining <= 0) {
        treatDigestionRef.current.splice(index, 1)
      } else {
        treatDigestionRef.current[index] = remaining
        activeTreatGrowth += remaining
      }
    }
    const growthScale = 1 + activeTreatGrowth * CAT_TREAT_SCALE_INCREASE
    group.scale.setScalar(growthScale)

    // Idle breathing: subtle Y scale oscillation
    const breath = 1 + Math.sin(idlePhaseRef.current) * 0.015
    if (!petting) body.scale.setScalar(breath)

    // Petting scale pulse
    if (petting) {
      const t = petTimer / PET_DURATION
      const pulse = 1 + Math.sin(t * Math.PI) * 0.18
      group.scale.setScalar(growthScale * pulse)
      setPetTimer(prev => {
        const next = prev + delta
        if (next >= PET_DURATION) {
          setPetting(false)
          group.scale.setScalar(growthScale)
        }
        return next
      })
    }

    // ── Collision Physics Check (for all states) ───────────────────
    // First, update own position in registry
    catPositionsRegistry[ownCatId] = group.position.clone()
    
    const collisionVector = new THREE.Vector3(0, 0, 0)
    
    // Check other cats (using positions from registry)
    Object.entries(catPositionsRegistry).forEach(([otherId, otherPos]) => {
      if (otherId !== ownCatId) {
        const toOther = new THREE.Vector3().subVectors(otherPos, group.position)
        const distance = toOther.length()
        
        // Repel cats from one another, including pairs at the exact same position.
        if (distance < COLLISION_RADIUS * 2) {
          if (distance > Number.EPSILON) {
            toOther.normalize()
          } else {
            // Use opposite directions for the same-position pair so both cats separate.
            toOther.set(ownCatId < otherId ? 1 : -1, 0, 0)
          }
          const repulsionStrength = Math.max(0, (COLLISION_RADIUS * 2 - distance) * 1.5)
          collisionVector.sub(toOther.multiplyScalar(repulsionStrength))
        }
      }
    })
    
    // Check room boundaries (walls)
    const roomW = 20
    const roomD = 24
    const wallMargin = 1.0
    
    if (group.position.x < -roomW/2 + wallMargin) collisionVector.x += 1.5
    if (group.position.x > roomW/2 - wallMargin) collisionVector.x -= 1.5
    if (group.position.z < -roomD/2 + wallMargin) collisionVector.z += 1.5
    if (group.position.z > roomD/2 - wallMargin) collisionVector.z -= 1.5
    
    // Apply collision repulsion with smoothing
    if (collisionVector.length() > 0) {
      collisionVector.normalize()
      collisionVector.y = 0
      
      // Gentle push - use lower multiplier for smooth movement
      const separationMultiplier = catState === 'SOCIAL' ? SOCIAL_SEPARATION_MULT : 1.5
      group.position.x += collisionVector.x * WANDER_SPEED * separationMultiplier * delta
      group.position.z += collisionVector.z * WANDER_SPEED * separationMultiplier * delta
      
      setCatPosition(new THREE.Vector3(group.position.x, group.position.y, group.position.z))
    }

    // Resolve cat vs. solid obstacles (benches, pedestals)
    resolveObstacleCollision(group.position, 0.35)

      // Heart countdown
    if (showHeart) {
      setHeartTimer(prev => {
        const next = prev + delta
        if (next >= HEART_DURATION) setShowHeart(false)
        return next
      })
    }
    // Reset friend heart when not showing
    if (!showFriendHeart && interactionTimer > 0) {
      setInteractionTimer(0)
    }

    for (const [partnerId, remaining] of partnerCooldownsRef.current) {
      const next = remaining - delta
      if (next <= 0) {
        partnerCooldownsRef.current.delete(partnerId)
      } else {
        partnerCooldownsRef.current.set(partnerId, next)
      }
    }

    // ── Wandering, social, and treat behavior ─────────────────────
    if (found && !petting) {
      wanderTimerRef.current += delta
      let claimedTreatThisFrame = false

      if (catState === 'IDLE' || catState === 'WANDER') {
        let nearestTreat: WorldTreatState | null = null
        let nearestDistance = TREAT_DETECTION_RADIUS
        for (const treat of worldTreats) {
          if (treat.claimedBy !== null) continue
          const distance = treat.position.distanceTo(group.position)
          if (distance <= nearestDistance) {
            nearestTreat = treat
            nearestDistance = distance
          }
        }

        if (nearestTreat) {
          claimTreat(def.id, nearestTreat.id)
          claimedTreatThisFrame = true
          setCatState('EAT')
          setTargetTreatId(nearestTreat.id)
          setTargetPos(nearestTreat.position.clone())
        }
      }

      // State machine for cat behavior
      if (catState === 'IDLE' && !claimedTreatThisFrame) {
        // If in cooldown, stay close to player (current position)
        if (cooldownTimer > 0) {
          if (wanderTimerRef.current >= 2.0) {
            // Stay within a small radius during cooldown
            const maxDist = STAY_NEAR_PLAYER_RADIUS * 0.5
            const newX = group.position.x + (Math.random() - 0.5) * maxDist
            const newZ = group.position.z + (Math.random() - 0.5) * maxDist
            setTargetPos(new THREE.Vector3(newX, group.position.y, newZ))
            setCatState('WANDER')
            wanderTimerRef.current = 0
            console.log(`[Cat ${def.name}] Staying close during cooldown`)
          }
        } else {
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
        }
      } else if (catState === 'WANDER' && !claimedTreatThisFrame) {
        // Wander for a duration, then possibly socialize
        if (wanderTimerRef.current >= WANDER_CHANGE_DIR) {
          // Check for nearby found cats using shared position registry
          const nearbyCat = Object.entries(catPositionsRegistry).find(
            ([id, pos]) => id !== ownCatId && pos.distanceTo(group.position) < SOCIAL_RADIUS && isCatFound(id)
          )
          
          if (nearbyCat) {
            // Debug: Log when cats detect each other
            console.log(`[Cat ${def.name}] Detected nearby cat: ${nearbyCat[0]} (distance: ${nearbyCat[1].distanceTo(group.position).toFixed(2)}m)`)
            
            // Check if this cat is willing to socialize based on drive
            const partnerId = nearbyCat[0]
            const socialChance = socialDrive / 10 // 0-1 based on drive
            
            // Only approach if random chance based on social drive passes
            const randomRoll = Math.random()
            const shouldSocialize = randomRoll < socialChance
            
            const partnerInSocial = catSocialStateRegistry[partnerId] === true
            const partnerOnCooldown = (partnerCooldownsRef.current.get(partnerId) ?? 0) > 0

            if (shouldSocialize && !partnerInSocial && !partnerOnCooldown) {
              // Find a social target
              const socialCat = CAT_REGISTRY.find(c => c.id === partnerId)
              if (socialCat) {
                setSocialTarget(partnerId)
                const socialSnapshot = catPositionsRegistry[partnerId].clone().add(
                  new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5),
                )
                socialSnapshotRef.current = socialSnapshot
                setTargetPos(socialSnapshot.clone())
                socialTimeoutRef.current = 0
                catSocialStateRegistry[ownCatId] = true
                setCatState('SOCIAL')
                wanderTimerRef.current = 0
                console.log(`[Cat ${def.name}] Approaching social partner ${partnerId} (drive: ${socialDrive}, rolled: ${randomRoll.toFixed(2)})`)
              }
            } else {
              const wanderRangeX = 6
              const wanderRangeZ = 10
              const newX = def.position[0] + (Math.random() - 0.5) * wanderRangeX
              const newZ = def.position[2] + (Math.random() - 0.5) * wanderRangeZ
              setTargetPos(new THREE.Vector3(newX, group.position.y, newZ))
              wanderTimerRef.current = 0
              console.log(`[Cat ${def.name}] Skipping social with ${partnerId} (drive: ${socialDrive}, chance: ${socialChance.toFixed(2)}, rolled: ${randomRoll.toFixed(2)})`)
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
        socialTimeoutRef.current += delta
        if (socialTarget && socialSnapshotRef.current && socialTimeoutRef.current < SOCIAL_TIMEOUT) {
          const targetCat = catPositionsRegistry[socialTarget]
          if (targetCat) {
            const direction = new THREE.Vector3().subVectors(socialSnapshotRef.current, group.position)
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
              setInteractionTimer(prev => {
                const next = prev + delta
                if (next >= SOCIAL_INTERACTION) {
                  setCatState('IDLE')
                  catSocialStateRegistry[ownCatId] = false
                  partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)
                  setSocialTarget(null)
                  socialSnapshotRef.current = null
                  socialTimeoutRef.current = 0
                  wanderTimerRef.current = 0
                  setTargetPos(null)
                  setInteractionTimer(0)
                  setShowFriendHeart(false)
                  console.log(`[Cat ${def.name}] Social interaction complete`)
                  return 0
                }
                // Show heart and meow during social interaction
                if (next < SOCIAL_INTERACTION) {
                  setShowFriendHeart(true)
                  if (audioEnabled) {
                    // Play meow every 1.5 seconds
                    if (Math.floor(next / 1.5) > Math.floor((next - delta) / 1.5)) {
                      playMeow()
                      console.log(`[Cat ${def.name}] Meowing to friend!`)
                    }
                  }
                }
                return next
              })
            }
          }
        } else {
          if (socialTarget) {
            partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)
          }
          catSocialStateRegistry[ownCatId] = false
          setCatState('IDLE')
          setSocialTarget(null)
          socialSnapshotRef.current = null
          socialTimeoutRef.current = 0
          setTargetPos(null)
          setInteractionTimer(0)
          setShowFriendHeart(false)
          wanderTimerRef.current = 0
          console.log(`[Cat ${def.name}] Social interaction timed out`)
        }
      } else if (catState === 'EAT') {
        const targetTreat = worldTreats.find(treat => treat.id === targetTreatId)
        if (!targetTreat || targetTreat.claimedBy !== def.id) {
          if (targetTreatId !== null) {
            unclaimTreat(def.id, targetTreatId)
          }
          setCatState('IDLE')
          setTargetPos(null)
          setTargetTreatId(null)
        } else {
          const direction = new THREE.Vector3().subVectors(targetTreat.position, group.position)
          direction.y = 0
          const distance = direction.length()

          if (distance <= TREAT_REACH_DISTANCE) {
            consumeTreat(def.id, targetTreat.id)
            treatDigestionRef.current.push(1)
            setPetting(true)
            setPetTimer(0)
            setShowHeart(true)
            setHeartTimer(0)
            setCatState('COOLDOWN')
            setCooldownTimer(PET_COOLDOWN)
            setTargetTreatId(null)
            if (audioEnabled) playMeow()
          } else if (distance > 0) {
            direction.normalize()
            const targetRotation = Math.atan2(direction.x, direction.z)
            let rotationDiff = targetRotation - group.rotation.y
            while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
            while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2
            group.rotation.y += rotationDiff * ROTATION_SPEED * delta * 0.5
            group.position.x += direction.x * WANDER_SPEED * delta
            group.position.z += direction.z * WANDER_SPEED * delta
            setCatPosition(new THREE.Vector3(group.position.x, group.position.y, group.position.z))
          }
        }
      } else if (catState === 'COOLDOWN') {
        // ── Cooldown behavior ───────────────────────────────────────
        // Decrease cooldown timer
        setCooldownTimer(prev => {
          const next = prev - delta
          if (next <= 0) {
            // Cooldown complete, return to wandering
            console.log(`[Cat ${def.name}] Cooldown complete, returning to wandering`)
            return 0
          }
          return next
        })
        
        // During cooldown, stay near the player's last known position
        // The player's position is not directly available here, so we use a simple
        // random wander near current position to simulate staying close
        if (wanderTimerRef.current >= 1.0) {
          // Pick a target within STAY_NEAR_PLAYER_RADIUS
          const maxDist = STAY_NEAR_PLAYER_RADIUS
          const newX = group.position.x + (Math.random() - 0.5) * maxDist * 0.8
          const newZ = group.position.z + (Math.random() - 0.5) * maxDist * 0.8
          setTargetPos(new THREE.Vector3(newX, group.position.y, newZ))
          wanderTimerRef.current = 0
        }
        
        // Move toward target
        if (targetPos) {
          const direction = new THREE.Vector3().subVectors(targetPos, group.position)
          const distance = direction.length()
          direction.normalize()
          
          if (distance > 0.3) {
            // Rotate toward target
            const targetRotation = Math.atan2(direction.x, direction.z)
            const currentRotation = group.rotation.y
            const rotationDiff = targetRotation - currentRotation
            
            let rotDiff = rotationDiff
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
            
            group.rotation.y += rotDiff * ROTATION_SPEED * delta * 0.4
            group.position.x += direction.x * (WANDER_SPEED * 0.5) * delta
            group.position.z += direction.z * (WANDER_SPEED * 0.5) * delta
            
            // Update React state for next render
            setCatPosition(new THREE.Vector3(group.position.x, group.position.y, group.position.z))
          } else {
            // Reached target, idling briefly before picking new target
            setCatState('IDLE')
            wanderTimerRef.current = 0
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

      {/* ── Friend heart during cat-to-cat interaction ───────────── */}
      {showFriendHeart && (
        <Billboard position={[0, 2.0, 0]}>
          <Text
            fontSize={0.28}
            color="#6AD4D4"
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
