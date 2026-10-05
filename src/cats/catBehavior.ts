import * as THREE from 'three'
import { getObstacleSteeringForce, isPositionClear } from '../player/obstacleCollision'

export const catPositionsRegistry: Record<string, THREE.Vector3> = {}
export const catSocialStateRegistry: Record<string, boolean> = {}

export const PET_DURATION = 0.6
export const IDLE_SPEED = 0.8
export const HEART_DURATION = 1.2
export const WANDER_SPEED = 1.8
export const ROTATION_SPEED = 2.5
export const WANDER_CHANGE_DIR = 1.5
export const SOCIAL_RADIUS = 3.5
export const SOCIAL_INTERACTION = 2.5
export const SOCIAL_TIMEOUT = 4
export const SOCIAL_SEPARATION_MULT = 4
export const PET_COOLDOWN = 8
export const STAY_NEAR_PLAYER_RADIUS = 5
export const COLLISION_RADIUS = 0.6

export const CAT_RADIUS = 0.35
const AVOID_DETECT_RADIUS = 1.2
export const STUCK_TIMEOUT = 2.5
export const PROGRESS_THRESHOLD = 0.4

export { isPositionClear }

export type CatState = 'IDLE' | 'WANDER' | 'SOCIAL' | 'REST' | 'COOLDOWN' | 'PUSHBACK' | 'EAT'

export function computeSteerDir(pos: THREE.Vector3, target: THREE.Vector3): THREE.Vector3 {
  const desired = new THREE.Vector3().subVectors(target, pos)
  desired.y = 0
  if (desired.lengthSq() < 0.0001) return new THREE.Vector3()
  desired.normalize()
  const avoidance = getObstacleSteeringForce(pos, AVOID_DETECT_RADIUS)
  desired.addScaledVector(avoidance, 2.5)
  desired.y = 0
  const len = desired.length()
  return len > 0.001 ? desired.divideScalar(len) : desired
}

export function sampleSafeTarget(
  baseX: number,
  baseZ: number,
  rangeX: number,
  rangeZ: number,
  posY: number,
  maxTries = 8,
): THREE.Vector3 {
  for (let i = 0; i < maxTries; i++) {
    const x = baseX + (Math.random() - 0.5) * rangeX
    const z = baseZ + (Math.random() - 0.5) * rangeZ
    const candidate = new THREE.Vector3(x, posY, z)
    if (isPositionClear(candidate, CAT_RADIUS + 0.4)) return candidate
  }
  return new THREE.Vector3(baseX, posY, baseZ)
}