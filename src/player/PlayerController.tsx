import { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// PlayerController
// Handles first-person movement and camera control for both desktop and mobile.
//
// Desktop:  Click canvas to lock pointer → WASD / Arrow Keys to move,
//           mouse movement to look.
// Mobile:   Two-touch: left side = move joystick, right side = look drag.
// ─────────────────────────────────────────────────────────────────────────────

const MOVE_SPEED    = 5.0
const LOOK_SENS     = 0.002
const TOUCH_LOOK_SENS = 0.006
const PLAYER_HEIGHT = 1.65
const BOUNDS        = { x: 8.5, z: 10.5 }  // half-extents, keeps player in room

type Keys = Record<string, boolean>

export default function PlayerController() {
  const { camera, gl } = useThree()
  const keys = useRef<Keys>({})
  const yaw   = useRef(0)   // horizontal look angle
  const pitch = useRef(0)   // vertical look angle (clamped)
  const isLocked = useRef(false)

  // Touch state
  const moveTouch  = useRef<{ id: number; sx: number; sy: number } | null>(null)
  const lookTouch  = useRef<{ id: number; lx: number; ly: number } | null>(null)
  const touchMove  = useRef({ dx: 0, dy: 0 })
  const touchLook  = useRef({ dx: 0, dy: 0 })

  // ── Initial camera position ──────────────────────────────────────────────
  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 6)
    camera.rotation.order = 'YXZ'
  }, [camera])

  // ── Pointer lock (desktop) ───────────────────────────────────────────────
  const requestLock = useCallback(() => {
    gl.domElement.requestPointerLock()
  }, [gl])

  useEffect(() => {
    const canvas = gl.domElement

    const onLockChange = () => {
      isLocked.current = document.pointerLockElement === canvas
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isLocked.current) return
      yaw.current   -= e.movementX * LOOK_SENS
      pitch.current -= e.movementY * LOOK_SENS
      pitch.current  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch.current))
    }
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true }
    const onKeyUp   = (e: KeyboardEvent) => { keys.current[e.code] = false }

    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMouseMove)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('click', requestLock)

    return () => {
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('click', requestLock)
    }
  }, [gl, requestLock])

  // ── Touch controls (mobile) ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement
    const W = canvas.clientWidth

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        if (t.clientX < W / 2 && !moveTouch.current) {
          moveTouch.current = { id: t.identifier, sx: t.clientX, sy: t.clientY }
        } else if (t.clientX >= W / 2 && !lookTouch.current) {
          lookTouch.current = { id: t.identifier, lx: t.clientX, ly: t.clientY }
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      for (const t of Array.from(e.changedTouches)) {
        if (moveTouch.current && t.identifier === moveTouch.current.id) {
          touchMove.current = {
            dx: t.clientX - moveTouch.current.sx,
            dy: t.clientY - moveTouch.current.sy,
          }
        }
        if (lookTouch.current && t.identifier === lookTouch.current.id) {
          touchLook.current = {
            dx: t.clientX - lookTouch.current.lx,
            dy: t.clientY - lookTouch.current.ly,
          }
          lookTouch.current.lx = t.clientX
          lookTouch.current.ly = t.clientY
        }
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (moveTouch.current && t.identifier === moveTouch.current.id) {
          moveTouch.current = null
          touchMove.current = { dx: 0, dy: 0 }
        }
        if (lookTouch.current && t.identifier === lookTouch.current.id) {
          lookTouch.current = null
          touchLook.current = { dx: 0, dy: 0 }
        }
      }
    }

    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [gl])

  // ── Per-frame movement ────────────────────────────────────────────────────
  const forward = useRef(new THREE.Vector3())
  const right   = useRef(new THREE.Vector3())
  const vel     = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    // Apply touch look
    yaw.current   -= touchLook.current.dx * TOUCH_LOOK_SENS
    pitch.current -= touchLook.current.dy * TOUCH_LOOK_SENS
    pitch.current  = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch.current))
    touchLook.current = { dx: 0, dy: 0 }

    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ')

    // Compute forward/right from yaw only (no pitch in movement)
    forward.current.set(Math.sin(yaw.current), 0, Math.cos(yaw.current)).negate()
    right.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current))

    vel.current.set(0, 0, 0)

    const k = keys.current
    if (k['KeyW']       || k['ArrowUp'])    vel.current.addScaledVector(forward.current, 1)
    if (k['KeyS']       || k['ArrowDown'])  vel.current.addScaledVector(forward.current, -1)
    if (k['KeyA']       || k['ArrowLeft'])  vel.current.addScaledVector(right.current, -1)
    if (k['KeyD']       || k['ArrowRight']) vel.current.addScaledVector(right.current, 1)

    // Touch joystick movement
    const td = touchMove.current
    if (Math.abs(td.dx) > 8 || Math.abs(td.dy) > 8) {
      vel.current.addScaledVector(forward.current, -td.dy / 60)
      vel.current.addScaledVector(right.current,    td.dx / 60)
    }

    if (vel.current.lengthSq() > 0) {
      vel.current.normalize()
      camera.position.addScaledVector(vel.current, MOVE_SPEED * delta)

      // Clamp to room bounds
      camera.position.x = Math.max(-BOUNDS.x, Math.min(BOUNDS.x, camera.position.x))
      camera.position.z = Math.max(-BOUNDS.z, Math.min(BOUNDS.z, camera.position.z))
      camera.position.y = PLAYER_HEIGHT
    }
  })

  return null
}
