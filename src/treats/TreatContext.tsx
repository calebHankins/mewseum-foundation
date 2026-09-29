import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import * as THREE from 'three'
import { DROP_FORWARD_OFFSET, TREAT_COLORS } from './treatData'
import type { TreatColor } from './treatData'

export interface WorldTreatState {
  id: number
  position: THREE.Vector3
  color: TreatColor
  claimedBy: string | null
}

export interface TreatState {
  heldTreat: TreatColor | null
  worldTreats: WorldTreatState[]
}

interface TreatContextValue extends TreatState {
  dispenseTreat: () => void
  dropTreat: (playerPos: THREE.Vector3, playerForward: THREE.Vector3) => void
  pickupTreat: (treatId: number) => void
  claimTreat: (catId: string, treatId: number) => void
  consumeTreat: (catId: string, treatId: number) => void
}

const TreatCtx = createContext<TreatContextValue | null>(null)

export function TreatProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TreatState>({
    heldTreat: null,
    worldTreats: [],
  })
  const nextTreatId = useRef(0)

  const dispenseTreat = useCallback(() => {
    const color = TREAT_COLORS[Math.floor(Math.random() * TREAT_COLORS.length)]
    setState(current => current.heldTreat !== null
      ? current
      : { ...current, heldTreat: color })
  }, [])

  const dropTreat = useCallback((playerPos: THREE.Vector3, playerForward: THREE.Vector3) => {
    const treatId = nextTreatId.current++
    setState(current => {
      if (current.heldTreat === null) return current
      return {
        ...current,
        heldTreat: null,
        worldTreats: [
          ...current.worldTreats,
          {
            id: treatId,
            position: playerPos.clone().addScaledVector(playerForward, DROP_FORWARD_OFFSET),
            color: current.heldTreat,
            claimedBy: null,
          },
        ],
      }
    })
  }, [])

  const pickupTreat = useCallback((treatId: number) => {
    setState(current => {
      const treat = current.worldTreats.find(candidate => candidate.id === treatId)
      if (current.heldTreat !== null || !treat || treat.claimedBy !== null) return current
      return {
        ...current,
        heldTreat: treat.color,
        worldTreats: current.worldTreats.filter(candidate => candidate.id !== treatId),
      }
    })
  }, [])

  const claimTreat = useCallback((catId: string, treatId: number) => {
    setState(current => {
      const treat = current.worldTreats.find(candidate => candidate.id === treatId)
      if (!treat || treat.claimedBy !== null) return current
      return {
        ...current,
        worldTreats: current.worldTreats.map(candidate => candidate.id === treatId
          ? { ...candidate, claimedBy: catId }
          : candidate),
      }
    })
  }, [])

  const consumeTreat = useCallback((catId: string, treatId: number) => {
    setState(current => {
      const treat = current.worldTreats.find(candidate => candidate.id === treatId)
      if (!treat || treat.claimedBy !== catId) return current
      return {
        ...current,
        worldTreats: current.worldTreats.filter(candidate => candidate.id !== treatId),
      }
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