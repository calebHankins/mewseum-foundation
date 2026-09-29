import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreatContext } from './TreatContext'
import { DROP_ANIM_DURATION, TREAT_BOB_AMPLITUDE, TREAT_COLOR } from './treatData'

export default function WorldTreat() {
  const { worldTreat, heldTreat, claimedBy, pickupTreat } = useTreatContext()
  const meshRef = useRef<THREE.Mesh>(null)
  const elapsedRef = useRef(0)
  const [hovered, setHovered] = useState(false)

  function handlePickup(event: ThreeEvent<PointerEvent | MouseEvent>) {
    event.stopPropagation()
    pickupTreat()
  }

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh || !worldTreat) return

    elapsedRef.current += delta
    const elapsed = elapsedRef.current
    const entranceScale = Math.min(elapsed / DROP_ANIM_DURATION, 1)
    mesh.scale.setScalar(entranceScale)
    mesh.position.y = worldTreat.position.y + Math.sin(elapsed * Math.PI) * TREAT_BOB_AMPLITUDE
  })

  if (!worldTreat) return null

  return (
    <mesh
      ref={meshRef}
      position={worldTreat.position}
      castShadow
      onClick={handlePickup}
      onPointerDown={handlePickup}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.14, 5, 4]} />
      <meshLambertMaterial color={hovered && !heldTreat && claimedBy === null ? '#A77A52' : TREAT_COLOR} />
    </mesh>
  )
}