import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useCatProgress } from '../progression/CatProgressContext'
import { useAudioContext } from '../audio/AudioContext'
import { playMeow } from '../audio/meow'
import { useTreatContext } from '../treats/TreatContext'
import type { WorldTreatState } from '../treats/TreatContext'
import {
  TREAT_DETECTION_RADIUS,
} from '../treats/treatData'
import type { CatDef } from './catData'
import { CatVisual } from './CatVisual'
import { applyCatPhysics, createCatPhysicsState } from './catPhysics'
import { updateCatGrowth, updateHeartTimer } from './catAnimation'
import { updateWanderBehavior } from './catWanderBehavior'
import { updateSocialBehavior } from './catSocialBehavior'
import { updateTreatBehavior } from './catTreatBehavior'
import { updateCooldownBehavior } from './catCooldownBehavior'
import { catSocialStateRegistry, PET_COOLDOWN } from './catBehavior'
import type { CatState } from './catBehavior'

interface CatProps {
  def: CatDef
}


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
  // Stuck-detection: how long the cat has failed to make forward progress
  const stuckTimerRef = useRef(0)
  const lastProgressPosRef = useRef<THREE.Vector3 | null>(null)
  const catPhysicsStateRef = useRef(createCatPhysicsState())

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

    updateCatGrowth(
      group,
      body,
      delta,
      petting,
      petTimer,
      treatDigestionRef.current,
      idlePhaseRef,
      setPetting,
      setPetTimer,
    )

    const physicsResult = applyCatPhysics(
      group,
      ownCatId,
      catState,
      delta,
      catPhysicsStateRef.current,
      def.floating ?? false,
    )
    if (physicsResult.moved) {
      setCatPosition(group.position.clone())
    }
    if (physicsResult.jumped) {
      stuckTimerRef.current = 0
      lastProgressPosRef.current = group.position.clone()
    }

      // Heart countdown
    updateHeartTimer(delta, showHeart, setShowHeart, setHeartTimer)
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
      if (catState === 'IDLE' || catState === 'WANDER') {
        updateWanderBehavior({
          def,
          ownCatId,
          group,
          delta,
          catState,
          cooldownTimer,
          targetPos,
          claimedTreatThisFrame,
          socialDrive,
          isCatFound,
          wanderTimerRef,
          stuckTimerRef,
          lastProgressPosRef,
          socialSnapshotRef,
          partnerCooldownsRef,
          socialTimeoutRef,
          setCatState,
          setTargetPos,
          setSocialTarget,
          setCatPosition,
        })
      } else if (catState === 'SOCIAL') {
        updateSocialBehavior({
          def,
          ownCatId,
          group,
          delta,
          socialTarget,
          socialSnapshotRef,
          socialTimeoutRef,
          partnerCooldownsRef,
          wanderTimerRef,
          stuckTimerRef,
          lastProgressPosRef,
          audioEnabled,
          setCatState,
          setSocialTarget,
          setTargetPos,
          setInteractionTimer,
          setShowFriendHeart,
          setCatPosition,
        })
      } else if (catState === 'EAT') {
        updateTreatBehavior({
          def,
          group,
          delta,
          worldTreats,
          targetTreatId,
          treatDigestionRef,
          audioEnabled,
          setCatState,
          setTargetPos,
          setTargetTreatId,
          setPetting,
          setPetTimer,
          setShowHeart,
          setHeartTimer,
          setCooldownTimer,
          setCatPosition,
          unclaimTreat,
          consumeTreat,
        })
      } else if (catState === 'COOLDOWN') {
        updateCooldownBehavior({
          def,
          group,
          delta,
          targetPos,
          wanderTimerRef,
          stuckTimerRef,
          lastProgressPosRef,
          setCooldownTimer,
          setCatState,
          setTargetPos,
          setCatPosition,
        })
      }
    }
  })

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
      <CatVisual
        def={def}
        bodyRef={bodyRef}
        hovered={hovered}
        showHeart={showHeart}
        heartTimer={heartTimer}
        showFriendHeart={showFriendHeart}
        opacity={opacity}
      />
    </group>
  )
}
