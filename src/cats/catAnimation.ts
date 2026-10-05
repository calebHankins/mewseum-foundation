import type { Dispatch, SetStateAction } from 'react'
import * as THREE from 'three'
import {
  CAT_TREAT_DIGESTION_DURATION,
  CAT_TREAT_SCALE_INCREASE,
} from '../treats/treatData'
import { HEART_DURATION, IDLE_SPEED, PET_DURATION } from './catBehavior'

export function updateCatGrowth(
  group: THREE.Group,
  body: THREE.Mesh,
  delta: number,
  petting: boolean,
  petTimer: number,
  treatDigestion: number[],
  idlePhase: { current: number },
  setPetting: Dispatch<SetStateAction<boolean>>,
  setPetTimer: Dispatch<SetStateAction<number>>,
): void {
  idlePhase.current += delta * IDLE_SPEED

  let activeTreatGrowth = 0
  for (let index = treatDigestion.length - 1; index >= 0; index -= 1) {
    const remaining = treatDigestion[index] - delta / CAT_TREAT_DIGESTION_DURATION
    if (remaining <= 0) {
      treatDigestion.splice(index, 1)
    } else {
      treatDigestion[index] = remaining
      activeTreatGrowth += remaining
    }
  }

  const growthScale = 1 + activeTreatGrowth * CAT_TREAT_SCALE_INCREASE
  group.scale.setScalar(growthScale)

  const breath = 1 + Math.sin(idlePhase.current) * 0.015
  if (!petting) body.scale.setScalar(breath)

  if (petting) {
    const pulse = 1 + Math.sin((petTimer / PET_DURATION) * Math.PI) * 0.18
    group.scale.setScalar(growthScale * pulse)
    setPetTimer(previous => {
      const next = previous + delta
      if (next >= PET_DURATION) {
        setPetting(false)
        group.scale.setScalar(growthScale)
      }
      return next
    })
  }
}

export function updateHeartTimer(
  delta: number,
  showHeart: boolean,
  setShowHeart: Dispatch<SetStateAction<boolean>>,
  setHeartTimer: Dispatch<SetStateAction<number>>,
): void {
  if (!showHeart) return
  setHeartTimer(previous => {
    const next = previous + delta
    if (next >= HEART_DURATION) setShowHeart(false)
    return next
  })
}