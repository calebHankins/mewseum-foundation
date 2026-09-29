import { EffectComposer, wrapEffect } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { PS1EffectImpl } from './PS1Effect'

// wrapEffect turns a postprocessing Effect class into a React component.
// Props are passed directly as constructor arguments.
const PS1Effect = wrapEffect(PS1EffectImpl)

/**
 * PS1Pipeline — drop inside a <Canvas> to apply PS1 dithering and colour banding.
 */
export default function PS1Pipeline() {
  return (
    <EffectComposer>
      <PS1Effect
        blendFunction={BlendFunction.NORMAL}
        bands={64}
        ditherStrength={0.015625}
      />
    </EffectComposer>
  )
}
