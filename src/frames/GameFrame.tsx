import { useRef, useState, useCallback } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FrameDef } from './frameData'

interface GameFrameProps {
  def: FrameDef
  onOpenPebbleSort: () => void
  /** Called instead of window.open when this frame has an external url. */
  onRequestExternalNav: (payload: { url: string; title: string }) => void
}

/**
 * GameFrame — a wall-mounted exhibit.
 * Displays the game title + description on a low-poly frame.
 * Clicking/tapping opens linked exhibits or the built-in Pebble Sort game.
 */
export default function GameFrame({ def, onOpenPebbleSort, onRequestExternalNav }: GameFrameProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const isInteractive = def.id === 'pebbles' || Boolean(def.url)
  const isComingSoon = def.id !== 'pebbles' && !def.url

  const lastInteraction = useRef(0)

  const handleInteract = useCallback((e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.()
    const now = performance.now()
    if (now - lastInteraction.current < 400) return
    lastInteraction.current = now

    if (def.id === 'pebbles') {
      document.exitPointerLock?.()
      onOpenPebbleSort()
    } else if (def.url) {
      onRequestExternalNav({ url: def.url, title: def.title })
    }
  }, [def.id, def.url, def.title, onOpenPebbleSort, onRequestExternalNav])

  const accent = new THREE.Color(def.accentColor)
  const frameColor = hovered
    ? accent.clone().multiplyScalar(1.4)
    : accent

  return (
    <group
      ref={groupRef}
      position={def.position}
      rotation={def.rotation}
      onClick={isInteractive ? handleInteract : undefined}
      onPointerDown={isInteractive ? handleInteract : undefined}
      onPointerOver={isInteractive ? () => setHovered(true) : undefined}
      onPointerOut={isInteractive ? () => setHovered(false) : undefined}
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

      {/* ── Procedural badge disc & glyph ──────────────── */}
      {def.badgeGlyph && (
        <group position={[0, 0.48, 0.08]}>
          <mesh>
            <circleGeometry args={[0.26, 16]} />
            <meshLambertMaterial color="#120E0B" />
          </mesh>
          <mesh position={[0, 0, -0.005]}>
            <circleGeometry args={[0.29, 16]} />
            <meshLambertMaterial color={def.accentColor} />
          </mesh>
          <Text
            position={[0, -0.02, 0.02]}
            fontSize={0.24}
            anchorX="center"
            anchorY="middle"
          >
            {def.badgeGlyph}
          </Text>
        </group>
      )}

      {/* ── Title text ─────────────────────────────────── */}
      <Text
        position={[0, def.badgeGlyph ? 0.05 : 0.45, 0.1]}
        fontSize={0.2}
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
        position={[0, def.badgeGlyph ? -0.28 : 0.05, 0.1]}
        fontSize={0.11}
        color="#C8A882"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.9}
        textAlign="center"
      >
        {def.description}
      </Text>

      {isComingSoon && (
        <group position={[0, -0.64, 0.08]}>
          <mesh>
            <boxGeometry args={[1.05, 0.22, 0.04]} />
            <meshLambertMaterial color={def.accentColor} />
          </mesh>
          <Text
            position={[0, 0, 0.025]}
            fontSize={0.095}
            color="#F2E0C2"
            anchorX="center"
            anchorY="middle"
          >
            COMING SOON
          </Text>
        </group>
      )}

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
