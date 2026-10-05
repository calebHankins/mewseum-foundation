import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import * as THREE from 'three'
import type { CatDef } from './catData'
import { CAT_REGISTRY } from './catData'
import {
  catPositionsRegistry,
  catSocialStateRegistry,
  CAT_RADIUS,
  PROGRESS_THRESHOLD,
  ROTATION_SPEED,
  SOCIAL_RADIUS,
  STUCK_TIMEOUT,
  STAY_NEAR_PLAYER_RADIUS,
  WANDER_CHANGE_DIR,
  WANDER_SPEED,
  computeSteerDir,
  isPositionClear,
  sampleSafeTarget,
} from './catBehavior'
import type { CatState } from './catBehavior'

interface WanderBehaviorOptions {
  def: CatDef
  ownCatId: string
  group: THREE.Group
  delta: number
  catState: CatState
  cooldownTimer: number
  targetPos: THREE.Vector3 | null
  claimedTreatThisFrame: boolean
  socialDrive: number
  isCatFound: (id: string) => boolean
  wanderTimerRef: MutableRefObject<number>
  stuckTimerRef: MutableRefObject<number>
  lastProgressPosRef: MutableRefObject<THREE.Vector3 | null>
  socialSnapshotRef: MutableRefObject<THREE.Vector3 | null>
  partnerCooldownsRef: MutableRefObject<Map<string, number>>
  socialTimeoutRef: MutableRefObject<number>
  setCatState: Dispatch<SetStateAction<CatState>>
  setTargetPos: Dispatch<SetStateAction<THREE.Vector3 | null>>
  setSocialTarget: Dispatch<SetStateAction<string | null>>
  setCatPosition: Dispatch<SetStateAction<THREE.Vector3>>
}

export function updateWanderBehavior({
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
}: WanderBehaviorOptions): void {
  if (claimedTreatThisFrame) return

  if (catState === 'IDLE') {
    if (cooldownTimer > 0) {
      if (wanderTimerRef.current >= 2.0) {
        const maxDist = STAY_NEAR_PLAYER_RADIUS * 0.5
        const target = sampleSafeTarget(
          group.position.x, group.position.z, maxDist, maxDist, group.position.y,
        )
        setTargetPos(target)
        stuckTimerRef.current = 0
        lastProgressPosRef.current = null
        setCatState('WANDER')
        wanderTimerRef.current = 0
        console.log(`[Cat ${def.name}] Staying close during cooldown`)
      }
    } else if (wanderTimerRef.current >= 2.0) {
      const target = sampleSafeTarget(def.position[0], def.position[2], 6, 10, group.position.y)
      setTargetPos(target)
      stuckTimerRef.current = 0
      lastProgressPosRef.current = null
      setCatState('WANDER')
      wanderTimerRef.current = 0
      console.log(`[Cat ${def.name}] Starting wander to [${target.x.toFixed(1)}, ${target.z.toFixed(1)}]`)
    }
    return
  }

  if (catState !== 'WANDER') return

  if (wanderTimerRef.current >= WANDER_CHANGE_DIR) {
    const nearbyCat = Object.entries(catPositionsRegistry).find(
      ([id, pos]) => id !== ownCatId && pos.distanceTo(group.position) < SOCIAL_RADIUS && isCatFound(id),
    )

    if (nearbyCat) {
      const partnerId = nearbyCat[0]
      const socialChance = socialDrive / 10
      const randomRoll = Math.random()
      const shouldSocialize = randomRoll < socialChance
      const partnerInSocial = catSocialStateRegistry[partnerId] === true
      const partnerOnCooldown = (partnerCooldownsRef.current.get(partnerId) ?? 0) > 0

      console.log(`[Cat ${def.name}] Detected nearby cat: ${partnerId} (distance: ${nearbyCat[1].distanceTo(group.position).toFixed(2)}m)`)

      if (shouldSocialize && !partnerInSocial && !partnerOnCooldown) {
        const socialCat = CAT_REGISTRY.find(cat => cat.id === partnerId)
        if (socialCat) {
          setSocialTarget(partnerId)
          let socialSnapshot = catPositionsRegistry[partnerId].clone().add(
            new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5),
          )
          if (!isPositionClear(socialSnapshot, CAT_RADIUS + 0.4)) {
            socialSnapshot = sampleSafeTarget(
              catPositionsRegistry[partnerId].x,
              catPositionsRegistry[partnerId].z,
              2.0,
              2.0,
              group.position.y,
            )
          }
          socialSnapshotRef.current = socialSnapshot
          setTargetPos(socialSnapshot.clone())
          stuckTimerRef.current = 0
          lastProgressPosRef.current = null
          socialTimeoutRef.current = 0
          catSocialStateRegistry[ownCatId] = true
          setCatState('SOCIAL')
          wanderTimerRef.current = 0
          console.log(`[Cat ${def.name}] Approaching social partner ${partnerId} (drive: ${socialDrive}, rolled: ${randomRoll.toFixed(2)})`)
        }
      } else {
        const target = sampleSafeTarget(def.position[0], def.position[2], 6, 10, group.position.y)
        setTargetPos(target)
        stuckTimerRef.current = 0
        lastProgressPosRef.current = null
        wanderTimerRef.current = 0
        console.log(`[Cat ${def.name}] Skipping social with ${partnerId} (drive: ${socialDrive}, chance: ${socialChance.toFixed(2)}, rolled: ${randomRoll.toFixed(2)})`)
      }
    } else {
      const target = sampleSafeTarget(def.position[0], def.position[2], 6, 10, group.position.y)
      setTargetPos(target)
      stuckTimerRef.current = 0
      lastProgressPosRef.current = null
      wanderTimerRef.current = 0
      console.log(`[Cat ${def.name}] New wander target [${target.x.toFixed(1)}, ${target.z.toFixed(1)}]`)
    }
  }

  if (!targetPos) return
  const distance = group.position.distanceTo(targetPos)

  if (distance <= 0.2) {
    setCatState('IDLE')
    wanderTimerRef.current = 0
    setTargetPos(null)
    console.log(`[Cat ${def.name}] Reached target, idling...`)
    return
  }

  if (lastProgressPosRef.current === null) lastProgressPosRef.current = group.position.clone()
  if (group.position.distanceTo(lastProgressPosRef.current) > PROGRESS_THRESHOLD) {
    lastProgressPosRef.current = group.position.clone()
    stuckTimerRef.current = 0
  } else {
    stuckTimerRef.current += delta
    if (stuckTimerRef.current > STUCK_TIMEOUT) {
      stuckTimerRef.current = 0
      lastProgressPosRef.current = null
      setCatState('IDLE')
      setTargetPos(null)
      wanderTimerRef.current = 0
      console.log(`[Cat ${def.name}] Stuck — abandoning wander target`)
      return
    }
  }

  const steerDir = computeSteerDir(group.position, targetPos)
  let rotDiff = Math.atan2(steerDir.x, steerDir.z) - group.rotation.y
  while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
  while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
  group.rotation.y += rotDiff * ROTATION_SPEED * delta * 0.5
  group.position.x += steerDir.x * WANDER_SPEED * delta
  group.position.z += steerDir.z * WANDER_SPEED * delta
  setCatPosition(group.position.clone())
}