import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { DROP_FORWARD_OFFSET } from './treatData'

export interface TreatState {
  heldTreat: boolean
  worldTreat: { position: THREE.Vector3 } | null
  claimedBy: string | null
}

interface TreatContextValue extends TreatState {
  dispenseTreat: () => void
  dropTreat: (playerPos: THREE.Vector3, playerForward: THREE.Vector3) => void
  pickupTreat: () => void
  claimTreat: (catId: string) => void
  consumeTreat: (catId: string) => void
}

const TreatCtx = createContext<TreatContextValue | null>(null)

export function TreatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TreatState>({
    heldTreat: false,
    worldTreat: null,
    claimedBy: null,
  })

  const dispenseTreat = useCallback(() => {
    setState(current => current.heldTreat
      ? current
      : { ...current, heldTreat: true })
  }, [])

  const dropTreat = useCallback((playerPos: THREE.Vector3, playerForward: THREE.Vector3) => {
    setState(current => {
      if (!current.heldTreat || current.worldTreat !== null) return current
      return {
        ...current,
        heldTreat: false,
        worldTreat: { position: playerPos.clone().addScaledVector(playerForward, DROP_FORWARD_OFFSET) },
        claimedBy: null,
      }
    })
  }, [])

  const pickupTreat = useCallback(() => {
    setState(current => {
      if (current.heldTreat || current.worldTreat === null || current.claimedBy !== null) return current
      return { ...current, heldTreat: true, worldTreat: null, claimedBy: null }
    })
  }, [])

  const claimTreat = useCallback((catId: string) => {
    setState(current => {
      if (current.worldTreat === null || current.claimedBy !== null) return current
      return { ...current, claimedBy: catId }
    })
  }, [])

  const consumeTreat = useCallback((catId: string) => {
    setState(current => {
      if (current.claimedBy !== catId) return current
      return { ...current, worldTreat: null, claimedBy: null }
    })
  }, [])

  const value = useMemo(() => ({ ...state, dispenseTreat, dropTreat, pickupTreat, claimTreat, consumeTreat }), [
    state,
    dispenseTreat,
    dropTreat,
    pickupTreat,
    claimTreat,
    consumeTreat,
  ])

  return <TreatCtx.Provider value={value}>{children}</TreatCtx.Provider>
}

export function useTreatContext(): TreatContextValue {
  const context = useContext(TreatCtx)
  if (!context) throw new Error('useTreatContext must be used within TreatProvider')
  return context
}

export default TreatProvider