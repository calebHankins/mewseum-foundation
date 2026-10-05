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
  margin = 0.1,
): void {
  OBSTACLE_LIST.push({
    min: new THREE.Vector3(center[0] - halfX - margin, -Infinity, center[2] - halfZ - margin),
    max: new THREE.Vector3(center[0] + halfX + margin,  Infinity, center[2] + halfZ + margin),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveObstacleCollision
//
// Given an XZ position and a radius (capsule footprint), push the position
// out of any overlapping AABBs.  The Y axis is intentionally ignored —
// obstacles are treated as infinite vertical columns so the check works
// regardless of height.
//
// Call this after applying movement each frame:
//   resolveObstacleCollision(camera.position, PLAYER_RADIUS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve the XZ position of a circle (radius `r`) against all registered
 * obstacle AABBs.  Mutates `pos` in-place; Y is untouched.
 */
export function resolveObstacleCollision(pos: THREE.Vector3, r: number): void {
  for (const box of OBSTACLE_LIST) {
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
