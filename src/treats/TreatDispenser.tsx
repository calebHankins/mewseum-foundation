import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreatContext } from './TreatContext'
import { DISPENSER_BASE_COLOR, DISPENSER_GLOBE_COLOR, TREAT_COLORS } from './treatData'
import type { TreatColor } from './treatData'

interface CandySpec {
  position: [number, number, number]
  phase: number
  color: TreatColor
}

const CANDY_COUNT = 40
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const CANDIES: CandySpec[] = Array.from({ length: CANDY_COUNT }, (_, index) => {
  const vertical = 1 - 2 * ((index + 0.5) / CANDY_COUNT)
  const horizontalRadius = Math.sqrt(1 - vertical * vertical)
  const directionAngle = index * GOLDEN_ANGLE
  const radialIndex = (index * 17) % CANDY_COUNT
  const radius = 0.39 * Math.cbrt((radialIndex + 0.5) / CANDY_COUNT)

  return {
    position: [
      Math.cos(directionAngle) * horizontalRadius * radius,
      vertical * radius,
      Math.sin(directionAngle) * horizontalRadius * radius,
    ],
    phase: index * 0.91,
    color: TREAT_COLORS[index % TREAT_COLORS.length],
  }
})

const CANDY_JOSTLE_DURATION = 0.7

export default function TreatDispenser() {
  const { heldTreat, dispenseTreat } = useTreatContext()
  const [hovered, setHovered] = useState(false)
  const [showHandsFull, setShowHandsFull] = useState(false)
  const tooltipTimer = useRef(0)
  const lastPointerDown = useRef(0)
  const candyRefs = useRef<Array<THREE.Mesh | null>>([])
  const jostleElapsed = useRef<number | null>(null)

  useFrame((_, delta) => {
    if (tooltipTimer.current > 0) {
      tooltipTimer.current = Math.max(0, tooltipTimer.current - delta)
      if (tooltipTimer.current === 0) setShowHandsFull(false)
    }

    if (jostleElapsed.current === null) return
    const elapsed = jostleElapsed.current + delta
    jostleElapsed.current = elapsed
    const remaining = Math.max(0, 1 - elapsed / CANDY_JOSTLE_DURATION)
    CANDIES.forEach((candy, index) => {
      const mesh = candyRefs.current[index]
      if (!mesh) return
      const phase = elapsed * 26 + candy.phase
      mesh.position.x = candy.position[0] + Math.sin(phase) * 0.045 * remaining
      mesh.position.y = candy.position[1] + Math.cos(phase * 0.83) * 0.04 * remaining
      mesh.position.z = candy.position[2] + Math.sin(phase * 0.67) * 0.035 * remaining
      mesh.rotation.set(phase * 0.12, phase * 0.18, Math.cos(phase) * 0.3 * remaining)
    })
    if (remaining === 0) {
      CANDIES.forEach((candy, index) => {
        const mesh = candyRefs.current[index]
        if (!mesh) return
        mesh.position.set(candy.position[0], candy.position[1], candy.position[2])
        mesh.rotation.set(0, 0, 0)
      })
      jostleElapsed.current = null
    }
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
    jostleElapsed.current = 0
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
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>
      <group position={[0, 1.65, 0]}>
        {CANDIES.map((candy, index) => (
          <mesh
            key={index}
            ref={mesh => { candyRefs.current[index] = mesh }}
            position={candy.position}
            castShadow
          >
            <sphereGeometry args={[0.075, 5, 4]} />
            <meshLambertMaterial color={candy.color} />
          </mesh>
        ))}
      </group>
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
      {hovered && !showHandsFull && (
        <Billboard position={[0, 2.45, 0]}>
          <Text
            fontSize={0.18}
            color="#D4955A"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#1A1410"
          >
            Treat dispenser
          </Text>
        </Billboard>
      )}
    </group>
  )
}