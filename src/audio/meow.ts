let sharedAudioCtx: AudioContext | null = null

/**
 * Generates a cute, procedural "meow" sound using the Web Audio API.
 * Modulates pitch and applies a bandpass filter to sound vocal.
 */
export function playMeow() {
    if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioContext()
    }
    if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume()
    }

    const ctx = sharedAudioCtx

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    const now = ctx.currentTime
    osc.type = 'sawtooth'

    // Random base pitch so every cat sounds slightly different
    const baseFreq = 500 + Math.random() * 400

    // Pitch envelop: quick rise, slow fall
    osc.frequency.setValueAtTime(baseFreq, now)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.1)
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.4)

    // Volume envelope
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.2, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    gain.gain.setValueAtTime(0, now + 0.45)

    // Bandpass filter to create a vocal tract "formant" sound
    filter.type = 'bandpass'
    // Sweep the filter frequency down slightly as pitch falls to mimic opening/closing mouth
    filter.frequency.setValueAtTime(baseFreq * 2, now)
    filter.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.4)
    filter.Q.value = 4.0

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.5)
}
