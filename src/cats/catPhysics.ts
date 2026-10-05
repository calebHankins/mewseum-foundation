import * as THREE from 'three'
import {
  getObstacleTopAt,
  OBSTACLE_CONTACT_EPSILON,
  resolveObstacleCollision,
} from '../player/obstacleCollision'
import {
  catPositionsRegistry,
  COLLISION_RADIUS,
  SOCIAL_SEPARATION_MULT,
  WANDER_SPEED,
} from './catBehavior'
import type { CatState } from './catBehavior'

const CAT_GRAVITY = 10
const CAT_JUMP_FORCE = 5.2
const CAT_RADIUS = 0.35
const CAT_BODY_HEIGHT = 0.65
const STUCK_JUMP_DELAY = 1

export interface CatPhysicsState {
  verticalVelocity: number
  jumpCooldown: number
  grounded: boolean
  obstacleContactDuration: number
}

export function createCatPhysicsState(): CatPhysicsState {
  return {
    verticalVelocity: 0,
    jumpCooldown: 1.5 + Math.random() * 2,
    grounded: true,
    obstacleContactDuration: 0,
  }
}

export function applyCatPhysics(
  group: THREE.Group,
  ownCatId: string,
  catState: CatState,
  delta: number,
  physics: CatPhysicsState,
  floating: boolean,
): { moved: boolean; jumped: boolean } {
  const previousPosition = group.position.clone()

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

  if (collisionVector.length() > 0) {
    collisionVector.normalize()
    collisionVector.y = 0

    const separationMultiplier = catState === 'SOCIAL' ? SOCIAL_SEPARATION_MULT : 1.5
    group.position.x += collisionVector.x * WANDER_SPEED * separationMultiplier * delta
    group.position.z += collisionVector.z * WANDER_SPEED * separationMultiplier * delta
  }

  physics.jumpCooldown = Math.max(0, physics.jumpCooldown - delta)
  if (floating) {
    physics.verticalVelocity = 0
    physics.grounded = true
  } else {
    const previousFeetY = group.position.y
    group.position.y += physics.verticalVelocity * delta
    physics.verticalVelocity -= CAT_GRAVITY * delta

    const obstacleTop = getObstacleTopAt(group.position, CAT_RADIUS)
    const landingY = obstacleTop !== null && previousFeetY >= obstacleTop - OBSTACLE_CONTACT_EPSILON
      ? Math.max(0, obstacleTop)
      : 0
    if (
      physics.verticalVelocity <= 0
      && previousFeetY >= landingY - OBSTACLE_CONTACT_EPSILON
      && group.position.y <= landingY
    ) {
      group.position.y = landingY
      physics.verticalVelocity = 0
      physics.grounded = true
    } else {
      physics.grounded = false
    }
  }

  const beforeObstacleCollision = group.position.clone()
  resolveObstacleCollision(group.position, CAT_RADIUS, group.position.y, CAT_BODY_HEIGHT)
  const hitObstacle = Math.hypot(
    group.position.x - beforeObstacleCollision.x,
    group.position.z - beforeObstacleCollision.z,
  ) > 1e-4

  if (floating) {
    physics.obstacleContactDuration = 0
  } else if (hitObstacle && physics.grounded) {
    physics.obstacleContactDuration += delta
  } else {
    physics.obstacleContactDuration = 0
  }

  const jumped = !floating
    && physics.grounded
    && physics.jumpCooldown === 0
    && physics.obstacleContactDuration >= STUCK_JUMP_DELAY
  if (jumped) {
    physics.verticalVelocity = CAT_JUMP_FORCE
    physics.jumpCooldown = 4 + Math.random() * 3
    physics.grounded = false
    physics.obstacleContactDuration = 0
  }

  catPositionsRegistry[ownCatId] = group.position.clone()

  return {
    moved: previousPosition.distanceToSquared(group.position) > 1e-8,
    jumped,
  }
}