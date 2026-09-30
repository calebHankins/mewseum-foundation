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

const TREAT_DROP_SPACING = 0.32
const TREAT_DROP_SPIRAL_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface TreatContextValue extends TreatState {
  dispenseTreat: () => void
  dropTreat: (playerPos: THREE.Vector3, playerForward: THREE.Vector3) => void
  pickupTreat: (treatId: number) => void
  claimTreat: (catId: string, treatId: number) => void
  unclaimTreat: (catId: string, treatId: number) => void
  expireClaimedTreat: (catId: string, treatId: number) => void
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
      const dropPosition = playerPos.clone().addScaledVector(playerForward, DROP_FORWARD_OFFSET)
      let candidateIndex = 0
      while (current.worldTreats.some(treat => treat.position.distanceTo(dropPosition) < TREAT_DROP_SPACING)) {
        candidateIndex += 1
        const radius = TREAT_DROP_SPACING * Math.sqrt(candidateIndex)
        const angle = candidateIndex * TREAT_DROP_SPIRAL_ANGLE
        dropPosition.set(
          playerPos.x + playerForward.x * DROP_FORWARD_OFFSET + Math.cos(angle) * radius,
          playerPos.y + playerForward.y * DROP_FORWARD_OFFSET,
          playerPos.z + playerForward.z * DROP_FORWARD_OFFSET + Math.sin(angle) * radius,
        )
      }
      return {
        ...current,
        heldTreat: null,
        worldTreats: [
          ...current.worldTreats,
          {
            id: treatId,
            position: dropPosition,
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

  const unclaimTreat = useCallback((catId: string, treatId: number) => {
    setState(current => {
      const treat = current.worldTreats.find(candidate => candidate.id === treatId)
      if (!treat || treat.claimedBy !== catId) return current
      return {
        ...current,
        worldTreats: current.worldTreats.map(candidate => candidate.id === treatId
          ? { ...candidate, claimedBy: null }
          : candidate),
      }
    })
  }, [])

  const expireClaimedTreat = useCallback((catId: string, treatId: number) => {
    setState(current => {
      const treat = current.worldTreats.find(candidate => candidate.id === treatId)
      if (!treat || treat.claimedBy !== catId) return current
      return {
        ...current,
        worldTreats: current.worldTreats.filter(candidate => candidate.id !== treatId),
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

  const value = useMemo(() => ({ ...state, dispenseTreat, dropTreat, pickupTreat, claimTreat, unclaimTreat, expireClaimedTreat, consumeTreat }), [
    state,
    dispenseTreat,
    dropTreat,
    pickupTreat,
    claimTreat,
    unclaimTreat,
    expireClaimedTreat,
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