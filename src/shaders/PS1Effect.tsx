import { Effect } from 'postprocessing'
import { Uniform } from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// PS1 Post-Processing Effect
// Applies screen-space dithering + colour banding to mimic PS1 rendering.
// ─────────────────────────────────────────────────────────────────────────────

const fragmentShader = /* glsl */ `
  uniform float uBands;
  uniform float uDitherStrength;

  // 4×4 Bayer ordered dither matrix
  float bayer4x4(vec2 pos) {
    int x = int(mod(pos.x, 4.0));
    int y = int(mod(pos.y, 4.0));
    int index = x + y * 4;
    float matrix[16];
    matrix[0]  =  0.0 / 16.0; matrix[1]  =  8.0 / 16.0;
    matrix[2]  =  2.0 / 16.0; matrix[3]  = 10.0 / 16.0;
    matrix[4]  = 12.0 / 16.0; matrix[5]  =  4.0 / 16.0;
    matrix[6]  = 14.0 / 16.0; matrix[7]  =  6.0 / 16.0;
    matrix[8]  =  3.0 / 16.0; matrix[9]  = 11.0 / 16.0;
    matrix[10] =  1.0 / 16.0; matrix[11] =  9.0 / 16.0;
    matrix[12] = 15.0 / 16.0; matrix[13] =  7.0 / 16.0;
    matrix[14] = 13.0 / 16.0; matrix[15] =  5.0 / 16.0;
    return matrix[index];
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 pixelPos = floor(uv * resolution);
    float dither = bayer4x4(pixelPos) * uDitherStrength;

    // Colour banding: quantise each channel to N bands
    vec3 banded = floor((inputColor.rgb + dither) * uBands) / uBands;

    outputColor = vec4(banded, inputColor.a);
  }
`

export class PS1EffectImpl extends Effect {
  constructor({ bands = 24.0, ditherStrength = 0.08 } = {}) {
    super('PS1Effect', fragmentShader, {
      uniforms: new Map<string, Uniform<number>>([
        ['uBands', new Uniform(bands)],
        ['uDitherStrength', new Uniform(ditherStrength)],
      ]),
    })
  }

  set bands(value: number) {
    const u = this.uniforms.get('uBands')
    if (u) u.value = value
  }

  set ditherStrength(value: number) {
    const u = this.uniforms.get('uDitherStrength')
    if (u) u.value = value
  }
}
