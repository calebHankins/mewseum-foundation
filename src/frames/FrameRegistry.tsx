import { FRAME_DATA } from './frameData'
import GameFrame from './GameFrame'

interface FrameRegistryProps {
  onOpenPebbleSort: () => void
}

/** Renders all Sanctuary Exhibits defined in frameData.ts */
export default function FrameRegistry({ onOpenPebbleSort }: FrameRegistryProps) {
  return (
    <>
      {FRAME_DATA.map(def => (
        <GameFrame key={def.id} def={def} onOpenPebbleSort={onOpenPebbleSort} />
      ))}
    </>
  )
}
