import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useAudioContext } from '../audio/AudioContext'
import { playPebbleSound } from '../audio/pebbleSounds'

interface PebbleSortProps {
  onClose: () => void
}

const COLORS = [
  { id: 'rose', name: 'Rose', hex: '#c97778', light: '#edaaa0' },
  { id: 'tide', name: 'Tide', hex: '#5a9291', light: '#9bc8b9' },
  { id: 'moss', name: 'Moss', hex: '#849151', light: '#bcc58a' },
  { id: 'honey', name: 'Honey', hex: '#d39a4e', light: '#f0c477' },
] as const
const PEBBLES_PER_COLOR = 6
const TOTAL_PEBBLES = COLORS.length * PEBBLES_PER_COLOR

interface Pebble {
  id: number
  color: typeof COLORS[number]['id']
  count: number
}

interface PebbleGesture {
  id: number
  startX: number
  startY: number
  moved: boolean
}

function shuffledPebbles(): Pebble[] {
  const pebbles = COLORS.flatMap(color =>
    Array.from({ length: PEBBLES_PER_COLOR }, (_, index) => ({
      id: COLORS.indexOf(color) * PEBBLES_PER_COLOR + index,
      color: color.id,
      count: 1,
    })),
  )

  for (let index = pebbles.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[pebbles[index], pebbles[swapIndex]] = [pebbles[swapIndex], pebbles[index]]
  }
  return pebbles
}

export default function PebbleSort({ onClose }: PebbleSortProps) {
  const { audioEnabled } = useAudioContext()
  const [pebbles, setPebbles] = useState(shuffledPebbles)
  const [sorted, setSorted] = useState<Pebble[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<{ id: number; x: number; y: number } | null>(null)
  const [moves, setMoves] = useState(0)
  const [message, setMessage] = useState('Choose a pebble, then find its colour bowl.')
  const gestureRef = useRef<PebbleGesture | null>(null)
  const suppressClickRef = useRef<number | null>(null)
  const pebbleRefs = useRef(new Map<number, HTMLButtonElement>())
  const previousPositionsRef = useRef(new Map<number, { left: number; top: number }>())
  const settleTimeoutRef = useRef<number | null>(null)
  const sortedCount = sorted.reduce((total, pebble) => total + pebble.count, 0)
  const complete = sortedCount === TOTAL_PEBBLES

  function playSound(sound: Parameters<typeof playPebbleSound>[0]) {
    if (audioEnabled) playPebbleSound(sound)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useLayoutEffect(() => {
    const previousPositions = previousPositionsRef.current
    if (previousPositions.size === 0) return

    const settlingElements: HTMLButtonElement[] = []
    pebbleRefs.current.forEach((element, id) => {
      const previousPosition = previousPositions.get(id)
      if (!previousPosition) return
      const currentPosition = element.getBoundingClientRect()
      const offsetX = previousPosition.left - currentPosition.left
      const offsetY = previousPosition.top - currentPosition.top
      if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) return

      element.style.setProperty('--settle-x', `${offsetX}px`)
      element.style.setProperty('--settle-y', `${offsetY}px`)
      element.classList.add('is-settling')
      settlingElements.push(element)
    })
    previousPositions.clear()

    settleTimeoutRef.current = window.setTimeout(() => {
      settlingElements.forEach(element => {
        element.classList.remove('is-settling')
        element.style.removeProperty('--settle-x')
        element.style.removeProperty('--settle-y')
      })
      settleTimeoutRef.current = null
    }, 420)

    return () => {
      if (settleTimeoutRef.current !== null) window.clearTimeout(settleTimeoutRef.current)
      settlingElements.forEach(element => {
        element.classList.remove('is-settling')
        element.style.removeProperty('--settle-x')
        element.style.removeProperty('--settle-y')
      })
    }
  }, [pebbles])

  function capturePebblePositions() {
    const positions = previousPositionsRef.current
    positions.clear()
    pebbleRefs.current.forEach((element, id) => {
      const rect = element.getBoundingClientRect()
      positions.set(id, { left: rect.left, top: rect.top })
    })
  }

  function sortInto(colorId: Pebble['color'], pebbleId: number | null) {
    if (pebbleId === null) {
      playSound('error')
      setMessage('Pick up a pebble first.')
      return
    }

    const pebble = pebbles.find(item => item.id === pebbleId)
    if (!pebble) return
    setMoves(current => current + 1)

    if (pebble.color !== colorId) {
      playSound('error')
      const targetName = COLORS.find(color => color.id === pebble.color)?.name
      setMessage(`Not quite. That pebble belongs in the ${targetName} bowl.`)
      return
    }

    setPebbles(current => current.filter(item => item.id !== pebble.id))
    playSound('sort')
    setSorted(current => [...current, pebble])
    setSelectedId(null)
    setMessage('A lovely fit. Keep going.')
  }

  function arePebblesNearby(firstId: number, secondId: number) {
    const first = document.querySelector<HTMLElement>(`[data-pebble-id="${firstId}"]`)
    const second = document.querySelector<HTMLElement>(`[data-pebble-id="${secondId}"]`)
    if (!first || !second) return false

    const firstRect = first.getBoundingClientRect()
    const secondRect = second.getBoundingClientRect()
    const firstX = firstRect.left + firstRect.width / 2
    const firstY = firstRect.top + firstRect.height / 2
    const secondX = secondRect.left + secondRect.width / 2
    const secondY = secondRect.top + secondRect.height / 2
    return Math.hypot(firstX - secondX, firstY - secondY) <= 92
  }

  function combinePebbles(firstId: number, secondId: number) {
    const first = pebbles.find(item => item.id === firstId)
    const second = pebbles.find(item => item.id === secondId)
    if (!first || !second) return
    if (first.color !== second.color) {
      playSound('error')
      setMessage('Only pebbles of the same colour can combine.')
      return
    }

    capturePebblePositions()
    setPebbles(current => current.flatMap(item => {
      if (item.id === firstId) return [{ ...item, count: first.count + second.count }]
      if (item.id === secondId) return []
      return [item]
    }))
    playSound('combine')
    setSelectedId(null)
    const colorName = COLORS.find(color => color.id === first.color)?.name
    setMessage(`Joined into a bundle! Drop it into the ${colorName} bowl.`)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, pebbleId: number) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = {
      id: pebbleId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>, pebbleId: number) {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== pebbleId) return
    const x = event.clientX - gesture.startX
    const y = event.clientY - gesture.startY
    if (Math.abs(x) + Math.abs(y) > 6) gesture.moved = true
    if (gesture.moved) setDragOffset({ id: pebbleId, x, y })
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>, pebble: Pebble) {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== pebble.id) return
    gestureRef.current = null
    setDragOffset(null)

    if (!gesture.moved) return
    suppressClickRef.current = pebble.id
    window.setTimeout(() => {
      if (suppressClickRef.current === pebble.id) suppressClickRef.current = null
    }, 0)
    setSelectedId(pebble.id)
    const bowl = document.elementsFromPoint(event.clientX, event.clientY)
      .map(element => element.closest<HTMLElement>('[data-pebble-bowl]'))
      .find((element): element is HTMLElement => element !== null)
    const colorId = bowl?.dataset.pebbleBowl
    if (colorId && COLORS.some(color => color.id === colorId)) {
      sortInto(colorId as Pebble['color'], pebble.id)
    } else {
      const target = document.elementsFromPoint(event.clientX, event.clientY)
        .map(element => element.closest<HTMLElement>('[data-pebble-id]'))
        .find((element): element is HTMLElement =>
          element !== null && Number(element.dataset.pebbleId) !== pebble.id,
        )
      const targetId = Number(target?.dataset.pebbleId)
      if (target && targetId !== pebble.id) {
        combinePebbles(pebble.id, targetId)
      } else {
        setMessage('Drop a pebble into a colour bowl or onto a matching pebble.')
      }
    }
  }

  function reset() {
    setPebbles(shuffledPebbles())
    setSorted([])
    setSelectedId(null)
    setMoves(0)
    previousPositionsRef.current.clear()
    playSound('shuffle')
    setMessage('Choose a pebble, then find its colour bowl.')
  }

  function shuffleLoosePebbles() {
    const loosePebbles = pebbles.filter(pebble => pebble.count === 1)
    if (loosePebbles.length < 2) {
      playSound('error')
      setMessage('There are not enough loose pebbles to shuffle.')
      return
    }

    if (!loosePebbles.some(pebble => pebble.color !== loosePebbles[0].color)) {
      playSound('error')
      setMessage('All loose pebbles are the same colour.')
      return
    }

    setPebbles(current => {
      const shuffledLoose = current.filter(pebble => pebble.count === 1)
      for (let index = shuffledLoose.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        ;[shuffledLoose[index], shuffledLoose[swapIndex]] = [shuffledLoose[swapIndex], shuffledLoose[index]]
      }

      if (shuffledLoose.every((pebble, index) => pebble.color === loosePebbles[index].color)) {
        shuffledLoose.push(shuffledLoose.shift()!)
      }

      let looseIndex = 0
      return current.map(pebble => pebble.count === 1 ? shuffledLoose[looseIndex++] : pebble)
    })
    playSound('shuffle')
    setSelectedId(null)
    setMessage('Loose pebbles shuffled. Look for new matching neighbours.')
  }

  return (
    <div className="pebble-overlay" role="dialog" aria-modal="true" aria-labelledby="pebble-title">
      <section className="pebble-game">
        <header className="pebble-header">
          <div>
            <p className="pebble-kicker">A quiet little puzzle</p>
            <h1 id="pebble-title">Pebble Sort</h1>
          </div>
          <button className="pebble-icon-button" onClick={onClose} aria-label="Close Pebble Sort" title="Close">
            ×
          </button>
        </header>

        <div className="pebble-status" aria-live="polite">
          <span>{complete ? 'All gathered' : message}</span>
          <span className="pebble-progress">{sortedCount} <i>/</i> {TOTAL_PEBBLES} <b>·</b> {moves} moves</span>
        </div>

        {complete ? (
          <div className="pebble-complete">
            <div className="pebble-complete-stones" aria-hidden="true">● ● ● ●</div>
            <h2>Every pebble found its place.</h2>
            <p>You sorted the whole shore in {moves} moves.</p>
            <button className="pebble-action" onClick={reset}>Gather another set</button>
          </div>
        ) : (
          <>
            <div className="pebble-workspace">
              <div className="pebble-tray" aria-label="Unsorted pebbles">
                {pebbles.map((pebble, index) => {
                  const color = COLORS.find(item => item.id === pebble.color)!
                  return (
                    <button
                      key={pebble.id}
                      ref={element => {
                        if (element) pebbleRefs.current.set(pebble.id, element)
                        else pebbleRefs.current.delete(pebble.id)
                      }}
                      data-pebble-id={pebble.id}
                      data-count={pebble.count}
                      className={`pebble-stone${pebble.count > 1 ? ' is-bundle' : ''}${selectedId === pebble.id ? ' is-selected' : ''}${dragOffset?.id === pebble.id ? ' is-dragging' : ''}`}
                      style={{
                        '--stone-color': color.hex,
                        '--stone-light': color.light,
                        '--stone-index': index,
                        '--drag-x': `${dragOffset?.id === pebble.id ? dragOffset.x : 0}px`,
                        '--drag-y': `${dragOffset?.id === pebble.id ? dragOffset.y : 0}px`,
                        '--settle-delay': `${(index % 4) * 24}ms`,
                      } as React.CSSProperties}
                      onPointerDown={event => handlePointerDown(event, pebble.id)}
                      onPointerMove={event => handlePointerMove(event, pebble.id)}
                      onPointerUp={event => handlePointerUp(event, pebble)}
                      onPointerCancel={() => {
                        gestureRef.current = null
                        setDragOffset(null)
                      }}
                      onClick={() => {
                        if (suppressClickRef.current === pebble.id) {
                          suppressClickRef.current = null
                          return
                        }
                        if (selectedId !== null && selectedId !== pebble.id) {
                          const selectedPebble = pebbles.find(item => item.id === selectedId)
                          if (selectedPebble?.color === pebble.color) {
                            if (arePebblesNearby(selectedId, pebble.id)) {
                              combinePebbles(selectedId, pebble.id)
                            } else {
                              playSound('error')
                              setMessage('Matching pebbles need to be close together to combine.')
                            }
                            return
                          }
                        }
                        playSound('select')
                        setSelectedId(current => current === pebble.id ? null : pebble.id)
                        setMessage(`Find the ${color.name} bowl.`)
                      }}
                      aria-label={`${color.name} ${pebble.count > 1 ? `bundle of ${pebble.count} pebbles` : 'pebble'}${selectedId === pebble.id ? ', selected' : ''}`}
                      aria-pressed={selectedId === pebble.id}
                    />
                  )
                })}
                {pebbles.length === 0 && <span className="pebble-tray-empty">The shore is clear.</span>}
              </div>
              <div className="pebble-bowls" aria-label="Colour bowls">
                {COLORS.map(color => {
                  const count = sorted
                    .filter(pebble => pebble.color === color.id)
                    .reduce((total, pebble) => total + pebble.count, 0)
                  return (
                    <button
                      key={color.id}
                      className="pebble-bowl"
                      data-pebble-bowl={color.id}
                      style={{ '--bowl-color': color.hex, '--bowl-light': color.light } as React.CSSProperties}
                      onClick={() => sortInto(color.id, selectedId)}
                      aria-label={`${color.name} bowl, ${count} of ${PEBBLES_PER_COLOR} pebbles`}
                    >
                      <span className="pebble-bowl-name">{color.name}</span>
                      <span className="pebble-bowl-stones" aria-hidden="true">
                        {Array.from({ length: count }, (_, index) => <i key={index} />)}
                      </span>
                      <span className="pebble-bowl-count">{count} / {PEBBLES_PER_COLOR}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <footer className="pebble-footer">
              <span>Combine nearby matching pebbles into bundles, then sort them into bowls.</span>
              <button className="pebble-reset" onClick={shuffleLoosePebbles} title="Redistribute loose pebbles">Shuffle</button>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}