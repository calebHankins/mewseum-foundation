import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface PebbleSortProps {
  onClose: () => void
}

const COLORS = [
  { id: 'rose', name: 'Rose', hex: '#c97778', light: '#edaaa0' },
  { id: 'tide', name: 'Tide', hex: '#5a9291', light: '#9bc8b9' },
  { id: 'moss', name: 'Moss', hex: '#849151', light: '#bcc58a' },
  { id: 'honey', name: 'Honey', hex: '#d39a4e', light: '#f0c477' },
] as const

interface Pebble {
  id: number
  color: typeof COLORS[number]['id']
}

interface PebbleGesture {
  id: number
  startX: number
  startY: number
  moved: boolean
}

function shuffledPebbles(): Pebble[] {
  const pebbles = COLORS.flatMap(color =>
    Array.from({ length: 4 }, (_, index) => ({
      id: COLORS.indexOf(color) * 4 + index,
      color: color.id,
    })),
  )

  for (let index = pebbles.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[pebbles[index], pebbles[swapIndex]] = [pebbles[swapIndex], pebbles[index]]
  }
  return pebbles
}

export default function PebbleSort({ onClose }: PebbleSortProps) {
  const [pebbles, setPebbles] = useState(shuffledPebbles)
  const [sorted, setSorted] = useState<Pebble[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [dragOffset, setDragOffset] = useState<{ id: number; x: number; y: number } | null>(null)
  const [moves, setMoves] = useState(0)
  const [message, setMessage] = useState('Choose a pebble, then find its colour bowl.')
  const gestureRef = useRef<PebbleGesture | null>(null)
  const suppressClickRef = useRef<number | null>(null)
  const complete = sorted.length === 16

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function sortInto(colorId: Pebble['color'], pebbleId: number | null) {
    if (pebbleId === null) {
      setMessage('Pick up a pebble first.')
      return
    }

    const pebble = pebbles.find(item => item.id === pebbleId)
    if (!pebble) return
    setMoves(current => current + 1)

    if (pebble.color !== colorId) {
      const targetName = COLORS.find(color => color.id === pebble.color)?.name
      setMessage(`Not quite. That pebble belongs in the ${targetName} bowl.`)
      return
    }

    setPebbles(current => current.filter(item => item.id !== pebble.id))
    setSorted(current => [...current, pebble])
    setSelectedId(null)
    setMessage('A lovely fit. Keep going.')
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
      setMessage('Drop a pebble into one of the colour bowls.')
    }
  }

  function reset() {
    setPebbles(shuffledPebbles())
    setSorted([])
    setSelectedId(null)
    setMoves(0)
    setMessage('Choose a pebble, then find its colour bowl.')
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
          <span className="pebble-progress">{sorted.length} <i>/</i> 16 <b>·</b> {moves} moves</span>
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
                      className={`pebble-stone${selectedId === pebble.id ? ' is-selected' : ''}${dragOffset?.id === pebble.id ? ' is-dragging' : ''}`}
                      style={{
                        '--stone-color': color.hex,
                        '--stone-light': color.light,
                        '--stone-index': index,
                        '--drag-x': `${dragOffset?.id === pebble.id ? dragOffset.x : 0}px`,
                        '--drag-y': `${dragOffset?.id === pebble.id ? dragOffset.y : 0}px`,
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
                        setSelectedId(current => current === pebble.id ? null : pebble.id)
                        setMessage(`Find the ${color.name} bowl.`)
                      }}
                      aria-label={`${color.name} pebble${selectedId === pebble.id ? ', selected' : ''}`}
                      aria-pressed={selectedId === pebble.id}
                    />
                  )
                })}
                {pebbles.length === 0 && <span className="pebble-tray-empty">The shore is clear.</span>}
              </div>
              <div className="pebble-bowls" aria-label="Colour bowls">
                {COLORS.map(color => {
                  const count = sorted.filter(pebble => pebble.color === color.id).length
                  return (
                    <button
                      key={color.id}
                      className="pebble-bowl"
                      data-pebble-bowl={color.id}
                      style={{ '--bowl-color': color.hex, '--bowl-light': color.light } as React.CSSProperties}
                      onClick={() => sortInto(color.id, selectedId)}
                      aria-label={`${color.name} bowl, ${count} of 4 pebbles`}
                    >
                      <span className="pebble-bowl-name">{color.name}</span>
                      <span className="pebble-bowl-stones" aria-hidden="true">
                        {Array.from({ length: count }, (_, index) => <i key={index} />)}
                      </span>
                      <span className="pebble-bowl-count">{count} / 4</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <footer className="pebble-footer">
              <span>Drag each pebble to its matching bowl, or tap to select.</span>
              <button className="pebble-reset" onClick={reset} title="Shuffle pebbles">Shuffle</button>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}