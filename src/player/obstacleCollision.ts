import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Obstacle Collision Registry
//
// A module-level list of axis-aligned bounding boxes (AABB) that represent
// solid obstacles in the world (benches, pedestals, etc.).
//
// Both PlayerController and Cat read from this list each frame to resolve
// positional overlaps — no physics library required.
// ─────────────────────────────────────────────────────────────────────────────

export interface ObstacleAABB {
  /** Minimum corner of the AABB (world-space). */
  min: THREE.Vector3
  /** Maximum corner of the AABB (world-space). */
  max: THREE.Vector3
}

/** Shared list of solid obstacles. Populated once at scene mount. */
export const OBSTACLE_LIST: ObstacleAABB[] = []

/**
 * Register an axis-aligned bounding box as a solid obstacle.
 *
 * @param center  World-space centre of the obstacle.
 * @param halfX   Half-extent in X.
 * @param halfZ   Half-extent in Z.
 * @param margin  Extra padding added to each side (default 0.1 m).
 */
export function registerObstacle(
  center: [number, number, number],
  halfX: number,
  halfZ: number,
  halfY: number,
  margin = 0.1,
): void {
  OBSTACLE_LIST.push({
    min: new THREE.Vector3(center[0] - halfX - margin, center[1] - halfY, center[2] - halfZ - margin),
    max: new THREE.Vector3(center[0] + halfX + margin, center[1] + halfY, center[2] + halfZ + margin),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveObstacleCollision
//
// Given a player position, footprint radius, and vertical body bounds, push
// out of any overlapping AABBs. Obstacles can be jumped over when clear.
//
// Call this after applying movement each frame:
//   resolveObstacleCollision(camera.position, PLAYER_RADIUS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the XZ position of a circle (radius `r`) against all registered
 * obstacle AABBs.  Mutates `pos` in-place; Y is untouched.
 */
export function resolveObstacleCollision(
  pos: THREE.Vector3,
  r: number,
  feetY: number,
  bodyHeight: number,
): void {
  for (const box of OBSTACLE_LIST) {
    if (feetY >= box.max.y || feetY + bodyHeight <= box.min.y) continue

    // Closest point on the AABB to the circle centre (XZ plane only)
    const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x))
    const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z))

    const dx = pos.x - cx
    const dz = pos.z - cz
    const distSq = dx * dx + dz * dz

    if (distSq < r * r && distSq > 0) {
      // Push the position out along the shortest penetration axis
      const dist = Math.sqrt(distSq)
      const overlap = r - dist
      pos.x += (dx / dist) * overlap
      pos.z += (dz / dist) * overlap
    } else if (distSq === 0) {
      // Centre is exactly on the AABB boundary — push right
      pos.x += r
    }
  }
}

/** Returns the highest obstacle top overlapping the player's circular footprint. */
export function getObstacleTopAt(pos: THREE.Vector3, r: number): number | null {
  let highestTop: number | null = null
  for (const box of OBSTACLE_LIST) {
    const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x))
    const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z))
    const dx = pos.x - cx
    const dz = pos.z - cz
    if (dx * dx + dz * dz <= r * r && (highestTop === null || box.max.y > highestTop)) {
      highestTop = box.max.y
    }
  }
  return highestTop
}

/**
 * Returns a combined avoidance steering vector pointing away from any obstacle
 * within `detectionRadius` of `pos` (XZ plane only).  Each contribution scales
 * linearly from 1 (touching the AABB surface) to 0 (at the detection boundary).
 * Add the result to a desired-direction vector, then re-normalise.
 */
export function getObstacleSteeringForce(
  pos: THREE.Vector3,
  detectionRadius: number,
): THREE.Vector3 {
  const force = new THREE.Vector3()
  for (const box of OBSTACLE_LIST) {
    const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x))
    const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z))
    const dx = pos.x - cx
    const dz = pos.z - cz
    const distSq = dx * dx + dz * dz
    if (distSq < detectionRadius * detectionRadius) {
      const dist = Math.sqrt(distSq) || 0.001
      const weight = 1 - dist / detectionRadius
      force.x += (dx / dist) * weight
      force.z += (dz / dist) * weight
    }
  }
  return force
}

/**
 * Returns true if the circular footprint (radius `r`, centred at `pos` in XZ)
 * does not overlap any registered obstacle AABB.
 */
export function isPositionClear(pos: THREE.Vector3, r: number): boolean {
  for (const box of OBSTACLE_LIST) {
    const cx = Math.max(box.min.x, Math.min(pos.x, box.max.x))
    const cz = Math.max(box.min.z, Math.min(pos.z, box.max.z))
    const dx = pos.x - cx
    const dz = pos.z - cz
    if (dx * dx + dz * dz < r * r) return false
  }
  return true
}
