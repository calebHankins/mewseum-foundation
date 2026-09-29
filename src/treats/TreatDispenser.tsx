import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useTreatContext } from './TreatContext'
import { DISPENSER_BASE_COLOR, DISPENSER_GLOBE_COLOR } from './treatData'

export default function TreatDispenser() {
  const { heldTreat, dispenseTreat } = useTreatContext()
  const [hovered, setHovered] = useState(false)
  const [showHandsFull, setShowHandsFull] = useState(false)
  const tooltipTimer = useRef(0)
  const lastPointerDown = useRef(0)

  useFrame((_, delta) => {
    if (tooltipTimer.current <= 0) return
    tooltipTimer.current = Math.max(0, tooltipTimer.current - delta)
    if (tooltipTimer.current === 0) setShowHandsFull(false)
  })

  function interact(event: ThreeEvent<PointerEvent | MouseEvent>) {
    event.stopPropagation()
    if (event.nativeEvent.type === 'pointerdown') {
      lastPointerDown.current = performance.now()
    } else if (performance.now() - lastPointerDown.current < 500) {
      return
    }

    if (heldTreat) {
      tooltipTimer.current = 1.5
      setShowHandsFull(true)
      return
    }
    dispenseTreat()
  }

  return (
    <group
      position={[0, 0, 0]}
      onClick={interact}
      onPointerDown={interact}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.5, 0.8, 6]} />
        <meshLambertMaterial color={DISPENSER_BASE_COLOR} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.3, 6]} />
        <meshLambertMaterial color={DISPENSER_BASE_COLOR} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.55, 6, 5]} />
        <meshLambertMaterial
          color={DISPENSER_GLOBE_COLOR}
          emissive="#D4955A"
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0, 0.48, 0.48]} castShadow>
        <boxGeometry args={[0.18, 0.06, 0.1]} />
        <meshLambertMaterial color="#A77A52" />
      </mesh>
      {showHandsFull && (
        <Billboard position={[0, 2.45, 0]}>
          <Text
            fontSize={0.2}
            color="#D4955A"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#1A1410"
          >
            Hands full!
          </Text>
        </Billboard>
      )}
    </group>
  )
}