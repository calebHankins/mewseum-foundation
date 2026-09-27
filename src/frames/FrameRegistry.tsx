import { FRAME_DATA } from './frameData'
import GameFrame from './GameFrame'

/** Renders all Sanctuary Exhibits defined in frameData.ts */
export default function FrameRegistry() {
  return (
    <>
      {FRAME_DATA.map(def => (
        <GameFrame key={def.id} def={def} />
      ))}
    </>
  )
}
