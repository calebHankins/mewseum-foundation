import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreatContext } from './TreatContext'
import type { WorldTreatState } from './TreatContext'
import { DROP_ANIM_DURATION, TREAT_BOB_AMPLITUDE, TREAT_COLOR } from './treatData'

interface WorldTreatMeshProps {
  treat: WorldTreatState
  heldTreat: boolean
  pickupTreat: (treatId: number) => void
}

function WorldTreatMesh({ treat, heldTreat, pickupTreat }: WorldTreatMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const elapsedRef = useRef(0)
  const [hovered, setHovered] = useState(false)

  function handlePickup(event: ThreeEvent<PointerEvent | MouseEvent>) {
    event.stopPropagation()
    pickupTreat(treat.id)
  }

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    elapsedRef.current += delta
    const elapsed = elapsedRef.current
    const entranceScale = Math.min(elapsed / DROP_ANIM_DURATION, 1)
    mesh.scale.setScalar(entranceScale)
    mesh.position.y = treat.position.y + Math.sin(elapsed * Math.PI) * TREAT_BOB_AMPLITUDE
  })

  return (
    <mesh
      ref={meshRef}
      position={treat.position}
      castShadow
      onClick={handlePickup}
      onPointerDown={handlePickup}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[0.14, 5, 4]} />
      <meshLambertMaterial color={hovered && !heldTreat && treat.claimedBy === null ? '#A77A52' : TREAT_COLOR} />
    </mesh>
  )
}

export default function WorldTreat() {
  const { worldTreats, heldTreat, pickupTreat } = useTreatContext()

  return (
    <>
      {worldTreats.map(treat => (
        <WorldTreatMesh
          key={treat.id}
          treat={treat}
          heldTreat={heldTreat}
          pickupTreat={pickupTreat}
        />
      ))}
    </>
  )
}