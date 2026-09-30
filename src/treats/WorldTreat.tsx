import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useTreatContext } from './TreatContext'
import type { WorldTreatState } from './TreatContext'
import { DROP_ANIM_DURATION, TREAT_ACCENT, TREAT_BOB_AMPLITUDE, TREAT_CLAIM_TIMEOUT } from './treatData'

interface WorldTreatMeshProps {
  treat: WorldTreatState
  heldTreat: boolean
  pickupTreat: (treatId: number) => void
  expireClaimedTreat: (catId: string, treatId: number) => void
}

function WorldTreatMesh({ treat, heldTreat, pickupTreat, expireClaimedTreat }: WorldTreatMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const elapsedRef = useRef(0)
  const claimElapsedRef = useRef(0)
  const lastClaimedByRef = useRef<string | null>(null)
  const expiredClaimRef = useRef<string | null>(null)
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

    if (lastClaimedByRef.current !== treat.claimedBy) {
      lastClaimedByRef.current = treat.claimedBy
      claimElapsedRef.current = 0
      expiredClaimRef.current = null
    }
    if (treat.claimedBy !== null && expiredClaimRef.current !== treat.claimedBy) {
      claimElapsedRef.current += delta
      if (claimElapsedRef.current >= TREAT_CLAIM_TIMEOUT) {
        expiredClaimRef.current = treat.claimedBy
        expireClaimedTreat(treat.claimedBy, treat.id)
      }
    }
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
      <meshLambertMaterial color={hovered && !heldTreat && treat.claimedBy === null ? TREAT_ACCENT : treat.color} />
    </mesh>
  )
}

export default function WorldTreat() {
  const { worldTreats, heldTreat, pickupTreat, expireClaimedTreat } = useTreatContext()

  return (
    <>
      {worldTreats.map(treat => (
        <WorldTreatMesh
          key={treat.id}
          treat={treat}
          heldTreat={heldTreat !== null}
          pickupTreat={pickupTreat}
          expireClaimedTreat={expireClaimedTreat}
        />
      ))}
    </>
  )
}