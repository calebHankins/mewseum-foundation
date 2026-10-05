import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import * as THREE from 'three'
import { playMeow } from '../audio/meow'
import type { CatDef } from './catData'
import {
  catPositionsRegistry,
  catSocialStateRegistry,
  PROGRESS_THRESHOLD,
  ROTATION_SPEED,
  SOCIAL_INTERACTION,
  SOCIAL_TIMEOUT,
  STUCK_TIMEOUT,
  WANDER_SPEED,
  computeSteerDir,
} from './catBehavior'
import type { CatState } from './catBehavior'

interface SocialBehaviorOptions {
  def: CatDef
  ownCatId: string
  group: THREE.Group
  delta: number
  socialTarget: string | null
  socialSnapshotRef: MutableRefObject<THREE.Vector3 | null>
  socialTimeoutRef: MutableRefObject<number>
  partnerCooldownsRef: MutableRefObject<Map<string, number>>
  wanderTimerRef: MutableRefObject<number>
  stuckTimerRef: MutableRefObject<number>
  lastProgressPosRef: MutableRefObject<THREE.Vector3 | null>
  audioEnabled: boolean
  setCatState: Dispatch<SetStateAction<CatState>>
  setSocialTarget: Dispatch<SetStateAction<string | null>>
  setTargetPos: Dispatch<SetStateAction<THREE.Vector3 | null>>
  setInteractionTimer: Dispatch<SetStateAction<number>>
  setShowFriendHeart: Dispatch<SetStateAction<boolean>>
  setCatPosition: Dispatch<SetStateAction<THREE.Vector3>>
}

export function updateSocialBehavior({
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
}: SocialBehaviorOptions): void {
  socialTimeoutRef.current += delta
  if (!socialTarget || !socialSnapshotRef.current || socialTimeoutRef.current >= SOCIAL_TIMEOUT) {
    finishSocialBehavior()
    return
  }

  const targetCat = catPositionsRegistry[socialTarget]
  if (!targetCat) return

  const direction = new THREE.Vector3().subVectors(socialSnapshotRef.current, group.position)
  const distance = direction.length()
  direction.normalize()

  if (distance > 0.5) {
    if (lastProgressPosRef.current === null) lastProgressPosRef.current = group.position.clone()
    if (group.position.distanceTo(lastProgressPosRef.current) > PROGRESS_THRESHOLD) {
      lastProgressPosRef.current = group.position.clone()
      stuckTimerRef.current = 0
    } else {
      stuckTimerRef.current += delta
      if (stuckTimerRef.current > STUCK_TIMEOUT) {
        stuckTimerRef.current = 0
        lastProgressPosRef.current = null
        if (socialTarget) partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)
        finishSocialBehavior(false)
        console.log(`[Cat ${def.name}] Stuck approaching social partner — giving up`)
        return
      }
    }

    const steerDir = computeSteerDir(group.position, socialSnapshotRef.current)
    let rotDiff = Math.atan2(steerDir.x, steerDir.z) - group.rotation.y
    while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
    while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
    group.rotation.y += rotDiff * ROTATION_SPEED * delta
    group.position.x += steerDir.x * (WANDER_SPEED * 0.7) * delta
    group.position.z += steerDir.z * (WANDER_SPEED * 0.7) * delta
    setCatPosition(group.position.clone())
    return
  }

  setInteractionTimer(previous => {
    const next = previous + delta
    if (next >= SOCIAL_INTERACTION) {
      completeSocialInteraction()
      return 0
    }

    setShowFriendHeart(true)
    if (audioEnabled && Math.floor(next / 1.5) > Math.floor((next - delta) / 1.5)) {
      playMeow()
      console.log(`[Cat ${def.name}] Meowing to friend!`)
    }
    return next
  })

  function completeSocialInteraction() {
    finishSocialBehavior(false, false)
    console.log(`[Cat ${def.name}] Social interaction complete`)
  }

  function finishSocialBehavior(logTimeout = true, resetInteractionTimer = true) {
    setCatState('IDLE')
    catSocialStateRegistry[ownCatId] = false
    if (socialTarget) partnerCooldownsRef.current.set(socialTarget, def.socialFatigue ?? 15)
    setSocialTarget(null)
    socialSnapshotRef.current = null
    socialTimeoutRef.current = 0
    setTargetPos(null)
    if (resetInteractionTimer) setInteractionTimer(0)
    setShowFriendHeart(false)
    wanderTimerRef.current = 0
    if (logTimeout) console.log(`[Cat ${def.name}] Social interaction timed out`)
  }
}