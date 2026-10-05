import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import * as THREE from 'three'
import { playMeow } from '../audio/meow'
import type { WorldTreatState } from '../treats/TreatContext'
import { TREAT_REACH_DISTANCE } from '../treats/treatData'
import type { CatDef } from './catData'
import { PET_COOLDOWN, ROTATION_SPEED, WANDER_SPEED } from './catBehavior'
import type { CatState } from './catBehavior'

interface TreatBehaviorOptions {
  def: CatDef
  group: THREE.Group
  delta: number
  worldTreats: WorldTreatState[]
  targetTreatId: number | null
  treatDigestionRef: MutableRefObject<number[]>
  audioEnabled: boolean
  setCatState: Dispatch<SetStateAction<CatState>>
  setTargetPos: Dispatch<SetStateAction<THREE.Vector3 | null>>
  setTargetTreatId: Dispatch<SetStateAction<number | null>>
  setPetting: Dispatch<SetStateAction<boolean>>
  setPetTimer: Dispatch<SetStateAction<number>>
  setShowHeart: Dispatch<SetStateAction<boolean>>
  setHeartTimer: Dispatch<SetStateAction<number>>
  setCooldownTimer: Dispatch<SetStateAction<number>>
  setCatPosition: Dispatch<SetStateAction<THREE.Vector3>>
  unclaimTreat: (catId: string, treatId: number) => void
  consumeTreat: (catId: string, treatId: number) => void
}

export function updateTreatBehavior({
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
}: TreatBehaviorOptions): void {
  const targetTreat = worldTreats.find(treat => treat.id === targetTreatId)
  if (!targetTreat || targetTreat.claimedBy !== def.id) {
    if (targetTreatId !== null) unclaimTreat(def.id, targetTreatId)
    setCatState('IDLE')
    setTargetPos(null)
    setTargetTreatId(null)
    return
  }

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
    return
  }

  if (distance <= 0) return
  direction.normalize()
  const targetRotation = Math.atan2(direction.x, direction.z)
  let rotationDiff = targetRotation - group.rotation.y
  while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
  while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2
  group.rotation.y += rotationDiff * ROTATION_SPEED * delta * 0.5
  group.position.x += direction.x * WANDER_SPEED * delta
  group.position.z += direction.z * WANDER_SPEED * delta
  setCatPosition(group.position.clone())
}