import * as THREE from 'three'
import { resolveObstacleCollision } from '../player/obstacleCollision'
import {
  catPositionsRegistry,
  COLLISION_RADIUS,
  SOCIAL_SEPARATION_MULT,
  WANDER_SPEED,
} from './catBehavior'
import type { CatState } from './catBehavior'

export function applyCatPhysics(
  group: THREE.Group,
  ownCatId: string,
  catState: CatState,
  delta: number,
): boolean {
  catPositionsRegistry[ownCatId] = group.position.clone()

  const collisionVector = new THREE.Vector3()

  Object.entries(catPositionsRegistry).forEach(([otherId, otherPos]) => {
    if (otherId === ownCatId) return

    const toOther = new THREE.Vector3().subVectors(otherPos, group.position)
    const distance = toOther.length()

    if (distance < COLLISION_RADIUS * 2) {
      if (distance > Number.EPSILON) {
        toOther.normalize()
      } else {
        toOther.set(ownCatId < otherId ? 1 : -1, 0, 0)
      }
      const repulsionStrength = Math.max(0, (COLLISION_RADIUS * 2 - distance) * 1.5)
      collisionVector.sub(toOther.multiplyScalar(repulsionStrength))
    }
  })

  const roomWidth = 20
  const roomDepth = 24
  const wallMargin = 1

  if (group.position.x < -roomWidth / 2 + wallMargin) collisionVector.x += 1.5
  if (group.position.x > roomWidth / 2 - wallMargin) collisionVector.x -= 1.5
  if (group.position.z < -roomDepth / 2 + wallMargin) collisionVector.z += 1.5
  if (group.position.z > roomDepth / 2 - wallMargin) collisionVector.z -= 1.5

  const wasPushed = collisionVector.length() > 0
  if (wasPushed) {
    collisionVector.normalize()
    collisionVector.y = 0

    const separationMultiplier = catState === 'SOCIAL' ? SOCIAL_SEPARATION_MULT : 1.5
    group.position.x += collisionVector.x * WANDER_SPEED * separationMultiplier * delta
    group.position.z += collisionVector.z * WANDER_SPEED * separationMultiplier * delta
  }

  resolveObstacleCollision(group.position, 0.35, group.position.y, 0.5)
  return wasPushed
}