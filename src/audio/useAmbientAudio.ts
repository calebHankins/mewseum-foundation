import { useEffect, useRef } from 'react'

/**
 * Synthesises three layered ambient tracks using the Web Audio API:
 *  1. Deep drone — two detuned oscillators + heavy low-pass filter
 *  2. Purring loop — amplitude-modulated low-frequency noise burst
 *  3. Building hum — narrow band-pass filtered white noise
 *
 * All synthesis is done at runtime; no audio files needed.
 */
export function useAmbientAudio(enabled: boolean): void {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<AudioNode[]>([])

  useEffect(() => {
    if (!enabled) {
      // Stop and clean up
      nodesRef.current.forEach(n => {
        try {
          if (n instanceof OscillatorNode || n instanceof AudioBufferSourceNode) {
            n.stop()
          }
        } catch {
          // already stopped
        }
      })
      nodesRef.current = []
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => undefined)
        ctxRef.current = null
      }
      return
    }

    const audioCtx = new AudioContext()
    ctxRef.current = audioCtx
    const nodes: AudioNode[] = []

    // ── 1. Deep ambient drone ────────────────────────────────────────────────
    const masterGain = audioCtx.createGain()
    masterGain.gain.setValueAtTime(0.18, audioCtx.currentTime)
    masterGain.connect(audioCtx.destination)

    const droneFreqs = [55, 55.5, 110.2] // slightly detuned for warmth
    droneFreqs.forEach(freq => {
      const osc = audioCtx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime)

      const filter = audioCtx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(300, audioCtx.currentTime)
      filter.Q.setValueAtTime(1.2, audioCtx.currentTime)

      const gain = audioCtx.createGain()
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(masterGain)
      osc.start()
      nodes.push(osc)
    })

    // ── 2. Purring loop (amplitude-modulated low noise) ──────────────────────
    const purrBase = audioCtx.createOscillator()
    purrBase.type = 'sine'
    purrBase.frequency.setValueAtTime(28, audioCtx.currentTime) // sub-bass purr

    const purrMod = audioCtx.createOscillator()
    purrMod.type = 'sine'
    purrMod.frequency.setValueAtTime(25, audioCtx.currentTime) // ~25Hz AM = purr rate

    const purrGain = audioCtx.createGain()
    purrGain.gain.setValueAtTime(0, audioCtx.currentTime)

    const purrAmp = audioCtx.createGain()
    purrAmp.gain.setValueAtTime(0.08, audioCtx.currentTime)

    purrMod.connect(purrGain.gain as unknown as AudioNode)
    purrBase.connect(purrGain)
    purrGain.connect(purrAmp)
    purrAmp.connect(masterGain)
    purrBase.start()
    purrMod.start()
    nodes.push(purrBase, purrMod)

    // ── 3. Building hum (filtered white noise) ───────────────────────────────
    const bufferSize = audioCtx.sampleRate * 2
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noiseSource = audioCtx.createBufferSource()
    noiseSource.buffer = noiseBuffer
    noiseSource.loop = true

    const humFilter = audioCtx.createBiquadFilter()
    humFilter.type = 'bandpass'
    humFilter.frequency.setValueAtTime(80, audioCtx.currentTime)
    humFilter.Q.setValueAtTime(8, audioCtx.currentTime)

    const humGain = audioCtx.createGain()
    humGain.gain.setValueAtTime(0.04, audioCtx.currentTime)

    noiseSource.connect(humFilter)
    humFilter.connect(humGain)
    humGain.connect(masterGain)
    noiseSource.start()
    nodes.push(noiseSource)

    nodesRef.current = nodes

    return () => {
      nodes.forEach(n => {
        try {
          if (n instanceof OscillatorNode || n instanceof AudioBufferSourceNode) {
            n.stop()
          }
        } catch {
          // already stopped
        }
      })
      audioCtx.close().catch(() => undefined)
    }
  }, [enabled])
}
