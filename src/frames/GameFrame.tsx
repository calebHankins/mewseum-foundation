import { useRef, useState, useCallback } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FrameDef } from './frameData'

interface GameFrameProps {
  def: FrameDef
}

/**
 * GameFrame — a wall-mounted exhibit.
 * Displays the game title + description on a low-poly frame.
 * Clicking/tapping opens the game URL in a new tab.
 */
export default function GameFrame({ def }: GameFrameProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  const handleClick = useCallback(() => {
    window.open(def.url, '_blank', 'noopener,noreferrer')
  }, [def.url])

  const accent = new THREE.Color(def.accentColor)
  const frameColor = hovered
    ? accent.clone().multiplyScalar(1.4)
    : accent

  return (
    <group
      ref={groupRef}
      position={def.position}
      rotation={def.rotation}
      onPointerDown={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* ── Outer frame border ─────────────────────────── */}
      <mesh castShadow>
        <boxGeometry args={[2.6, 2.2, 0.08]} />
        <meshLambertMaterial color={frameColor} />
      </mesh>

      {/* ── Inner canvas / "screen" ────────────────────── */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[2.2, 1.8]} />
        <meshLambertMaterial color="#1A1410" />
      </mesh>

      {/* ── Title text ─────────────────────────────────── */}
      <Text
        position={[0, 0.45, 0.1]}
        fontSize={0.22}
        color={def.accentColor}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.0}
        textAlign="center"
      >
        {def.title}
      </Text>

      {/* ── Description text ───────────────────────────── */}
      <Text
        position={[0, 0.05, 0.1]}
        fontSize={0.12}
        color="#C8A882"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.9}
        textAlign="center"
      >
        {def.description}
      </Text>

      {/* ── "Click to enter" prompt — visible on hover ─── */}
      {hovered && (
        <Text
          position={[0, -0.5, 0.1]}
          fontSize={0.1}
          color="#D4955A"
          anchorX="center"
          anchorY="middle"
        >
          ▶ Enter
        </Text>
      )}

      {/* ── Bracket corners (decorative low-poly detail) ── */}
      {([[-1.2, 1.0], [1.2, 1.0], [-1.2, -1.0], [1.2, -1.0]] as const).map(
        ([x, y], i) => (
          <mesh key={i} position={[x, y, 0.05]}>
            <boxGeometry args={[0.15, 0.15, 0.06]} />
            <meshLambertMaterial color="#D4955A" />
          </mesh>
        ),
      )}
    </group>
  )
}
