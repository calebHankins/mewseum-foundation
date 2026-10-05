import type { RefObject } from 'react'
import { Billboard, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { CatDef } from './catData'

interface CatVisualProps {
  def: CatDef
  bodyRef: RefObject<THREE.Mesh>
  hovered: boolean
  showHeart: boolean
  heartTimer: number
  showFriendHeart: boolean
  opacity: number
}

export function CatVisual({
  def,
  bodyRef,
  hovered,
  showHeart,
  heartTimer,
  showFriendHeart,
  opacity,
}: CatVisualProps) {
  return (
    <>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.5, 2.0]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>

      <mesh ref={bodyRef} position={[0, 0.38, 0]} castShadow>
        <boxGeometry args={[0.55, 0.42, 0.72]} />
        <meshLambertMaterial color={def.color} opacity={opacity} transparent={opacity < 1} />
      </mesh>

      <mesh position={[0, 0.78, 0.22]} castShadow>
        <boxGeometry args={[0.44, 0.38, 0.38]} />
        <meshLambertMaterial color={def.color} />
      </mesh>

      <mesh position={[-0.14, 1.06, 0.22]} castShadow>
        <coneGeometry args={[0.1, 0.18, 4]} />
        <meshLambertMaterial color={def.accentColor} />
      </mesh>
      <mesh position={[0.14, 1.06, 0.22]} castShadow>
        <coneGeometry args={[0.1, 0.18, 4]} />
        <meshLambertMaterial color={def.accentColor} />
      </mesh>

      <mesh position={[0, 0.55, -0.46]} rotation={[0.5, 0, 0.15]} castShadow>
        <boxGeometry args={[0.1, 0.55, 0.1]} />
        <meshLambertMaterial color={def.accentColor} />
      </mesh>

      <mesh position={[-0.18, 0.1, 0.24]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.2]} />
        <meshLambertMaterial color={def.accentColor} />
      </mesh>
      <mesh position={[0.18, 0.1, 0.24]} castShadow>
        <boxGeometry args={[0.16, 0.18, 0.2]} />
        <meshLambertMaterial color={def.accentColor} />
      </mesh>

      <mesh position={[-0.12, 0.82, 0.41]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshBasicMaterial color="#1A0A0A" />
      </mesh>
      <mesh position={[0.12, 0.82, 0.41]}>
        <boxGeometry args={[0.07, 0.05, 0.02]} />
        <meshBasicMaterial color="#1A0A0A" />
      </mesh>

      {hovered && (
        <Billboard position={[0, 1.4, 0]}>
          <Text
            fontSize={0.18}
            color="#D4955A"
            font={undefined}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#1A1410"
          >
            {def.name}
          </Text>
        </Billboard>
      )}

      {showHeart && (
        <Billboard position={[0, 1.65 + heartTimer * 0.4, 0]}>
          <Text fontSize={0.32} color="#D4606A" anchorX="center" anchorY="middle">
            ♥
          </Text>
        </Billboard>
      )}

      {showFriendHeart && (
        <Billboard position={[0, 2.0, 0]}>
          <Text fontSize={0.28} color="#6AD4D4" anchorX="center" anchorY="middle">
            ♥
          </Text>
        </Billboard>
      )}
    </>
  )
}