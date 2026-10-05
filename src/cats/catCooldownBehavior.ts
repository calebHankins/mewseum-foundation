import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import * as THREE from 'three'
import type { CatDef } from './catData'
import {
  PROGRESS_THRESHOLD,
  ROTATION_SPEED,
  STAY_NEAR_PLAYER_RADIUS,
  STUCK_TIMEOUT,
  WANDER_SPEED,
  computeSteerDir,
  sampleSafeTarget,
} from './catBehavior'
import type { CatState } from './catBehavior'

interface CooldownBehaviorOptions {
  def: CatDef
  group: THREE.Group
  delta: number
  targetPos: THREE.Vector3 | null
  wanderTimerRef: MutableRefObject<number>
  stuckTimerRef: MutableRefObject<number>
  lastProgressPosRef: MutableRefObject<THREE.Vector3 | null>
  setCooldownTimer: Dispatch<SetStateAction<number>>
  setCatState: Dispatch<SetStateAction<CatState>>
  setTargetPos: Dispatch<SetStateAction<THREE.Vector3 | null>>
  setCatPosition: Dispatch<SetStateAction<THREE.Vector3>>
}

export function updateCooldownBehavior({
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
}: CooldownBehaviorOptions): void {
  setCooldownTimer(previous => {
    const next = previous - delta
    if (next <= 0) {
      console.log(`[Cat ${def.name}] Cooldown complete, returning to wandering`)
      return 0
    }
    return next
  })

  if (wanderTimerRef.current >= 1.0) {
    const target = sampleSafeTarget(
      group.position.x,
      group.position.z,
      STAY_NEAR_PLAYER_RADIUS * 0.8,
      STAY_NEAR_PLAYER_RADIUS * 0.8,
      group.position.y,
    )
    setTargetPos(target)
    stuckTimerRef.current = 0
    lastProgressPosRef.current = null
    wanderTimerRef.current = 0
  }

  if (!targetPos) return
  const distance = group.position.distanceTo(targetPos)

  if (distance <= 0.3) {
    setCatState('IDLE')
    wanderTimerRef.current = 0
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
      return
    }
  }

  const steerDir = computeSteerDir(group.position, targetPos)
  let rotDiff = Math.atan2(steerDir.x, steerDir.z) - group.rotation.y
  while (rotDiff > Math.PI) rotDiff -= Math.PI * 2
  while (rotDiff < -Math.PI) rotDiff += Math.PI * 2
  group.rotation.y += rotDiff * ROTATION_SPEED * delta * 0.4
  group.position.x += steerDir.x * (WANDER_SPEED * 0.5) * delta
  group.position.z += steerDir.z * (WANDER_SPEED * 0.5) * delta
  setCatPosition(group.position.clone())
}