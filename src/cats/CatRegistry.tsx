import { CAT_REGISTRY } from './catData'
import Cat from './Cat'

/**
 * CatRegistry — renders all cats defined in CAT_REGISTRY.
 * Each Cat component self-manages its found/hidden state via CatProgressContext.
 * 
 * To add a new cat to the sanctuary, add an entry to catData.ts — no changes needed here.
 */
export default function CatRegistry() {
  return (
    <>
      {CAT_REGISTRY.map(def => (
        <Cat key={def.id} def={def} />
      ))}
    </>
  )
}
