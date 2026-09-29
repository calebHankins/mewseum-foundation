import { useMemo } from 'react'
import * as THREE from 'three'

// Room dimensions (metres, roughly)
const ROOM_W = 20
const ROOM_H = 4.1
const ROOM_D = 24

// Warm amber palette — all Lambert (unlit-ish, PS1 style)
const PALETTE = {
  floor:   new THREE.Color('#5C4A32'),
  wall:    new THREE.Color('#3D2E1E'),
  ceiling: new THREE.Color('#2A1F14'),
  trim:    new THREE.Color('#D4955A'),
  window:  new THREE.Color('#D4B896'),
}

function makeMat(color: THREE.Color, side: THREE.Side = THREE.FrontSide) {
  return new THREE.MeshLambertMaterial({ color, side })
}

/** Chunky low-poly bench: a box with four short leg boxes */
function Bench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Seat */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 0.2, 0.8]} />
        <meshLambertMaterial color="#6B4F30" />
      </mesh>
      {/* Legs */}
      {([-1, 1] as const).map(sx =>
        ([-0.3, 0.3] as const).map(sz => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.0, -0.3, sz]} castShadow>
            <boxGeometry args={[0.15, 0.4, 0.15]} />
            <meshLambertMaterial color="#5C3D20" />
          </mesh>
        )),
      )}
    </group>
  )
}

/** A low-poly square planter */
function Planter({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.7, 0.8]} />
        <meshLambertMaterial color="#7A5C3A" />
      </mesh>
      {/* Soil top */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.72, 0.04, 0.72]} />
        <meshLambertMaterial color="#3D2810" />
      </mesh>
      {/* Simple blocky plant */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.35, 0.6, 0.35]} />
        <meshLambertMaterial color="#4A7A3A" />
      </mesh>
    </group>
  )
}

/** Window opening with warm emissive glow — simulates light coming in */
function Window({ position, rotation }: {
  position: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Frame */}
      <mesh>
        <boxGeometry args={[2.2, 2.8, 0.12]} />
        <meshLambertMaterial color="#4A3520" />
      </mesh>
      {/* Glass — emissive warm amber */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1.8, 2.4]} />
        <meshLambertMaterial
          color={PALETTE.window}
          emissive={new THREE.Color('#C89050')}
          emissiveIntensity={0.6}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

export default function SanctuaryRoom() {
  // We use useMemo so geometry/material objects aren't recreated on every render
  const floorMat  = useMemo(() => makeMat(PALETTE.floor, THREE.FrontSide), [])
  const wallMat   = useMemo(() => makeMat(PALETTE.wall, THREE.BackSide), [])
  const ceilMat   = useMemo(() => makeMat(PALETTE.ceiling, THREE.FrontSide), [])

  return (
    <group>
      {/* ── Floor ─────────────────────────────────────────────── */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D, 4, 4]} />
        <primitive object={floorMat} />
      </mesh>

      {/* Floor planks (thin raised strips for depth) */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[i * 2.4 - 9.6, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.06, ROOM_D]} />
          <meshLambertMaterial color="#4A3A28" />
        </mesh>
      ))}

      {/* ── Room box (viewed from inside → BackSide) ──────────── */}
      <mesh position={[0, ROOM_H / 2, 0]}>
        <boxGeometry args={[ROOM_W, ROOM_H, ROOM_D]} />
        <primitive object={wallMat} />
      </mesh>

      {/* ── Ceiling ───────────────────────────────────────────── */}
      <mesh position={[0, ROOM_H - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D, 2, 2]} />
        <primitive object={ceilMat} />
      </mesh>

      {/* ── Trim / skirting boards ────────────────────────────── */}
      {/* Front & back */}
      {([-ROOM_D / 2, ROOM_D / 2] as const).map(z => (
        <mesh key={z} position={[0, 0.12, z]}>
          <boxGeometry args={[ROOM_W, 0.24, 0.06]} />
          <meshLambertMaterial color={PALETTE.trim} />
        </mesh>
      ))}
      {/* Left & right */}
      {([-ROOM_W / 2, ROOM_W / 2] as const).map(x => (
        <mesh key={x} position={[x, 0.12, 0]}>
          <boxGeometry args={[0.06, 0.24, ROOM_D]} />
          <meshLambertMaterial color={PALETTE.trim} />
        </mesh>
      ))}

      {/* ── Windows — left wall, facing into the room ─────────── */}
      <Window position={[-ROOM_W / 2 + 0.08, 2.6, -6]} rotation={[0, Math.PI / 2, 0]} />
      <Window position={[-ROOM_W / 2 + 0.08, 2.6,  6]} rotation={[0, Math.PI / 2, 0]} />

      {/* ── Furniture ─────────────────────────────────────────── */}
      <Bench position={[ 5,  0.3, -9]} />
      <Bench position={[-5,  0.3,  9]} />
      <Bench position={[ 0,  0.3,  9]} />

      <Planter position={[ 7,  0.35, -10]} />
      <Planter position={[-7,  0.35, -10]} />
      <Planter position={[ 7,  0.35,  10]} />
      <Planter position={[-7,  0.35,  10]} />
    </group>
  )
}
