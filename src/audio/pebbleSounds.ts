type PebbleSound = 'select' | 'sort' | 'combine' | 'error' | 'shuffle'

let sharedAudioContext: AudioContext | null = null

const SOUND_NOTES: Record<PebbleSound, { frequency: number; delay: number }[]> = {
  select: [{ frequency: 245, delay: 0 }],
  sort: [{ frequency: 190, delay: 0 }, { frequency: 235, delay: 0.09 }],
  combine: [{ frequency: 175, delay: 0 }, { frequency: 225, delay: 0.08 }],
  error: [{ frequency: 145, delay: 0 }],
  shuffle: [{ frequency: 170, delay: 0 }, { frequency: 135, delay: 0.08 }, { frequency: 155, delay: 0.2 }],
}

export function playPebbleSound(sound: PebbleSound) {
  if (typeof window === 'undefined' || !window.AudioContext) return
  if (!sharedAudioContext) sharedAudioContext = new window.AudioContext()
  if (sharedAudioContext.state === 'suspended') void sharedAudioContext.resume()

  const context = sharedAudioContext
  const now = context.currentTime
  for (const note of SOUND_NOTES[sound]) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const noise = context.createBufferSource()
    const noiseFilter = context.createBiquadFilter()
    const noiseGain = context.createGain()
    const start = now + note.delay
    const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.05), context.sampleRate)
    const noiseData = noiseBuffer.getChannelData(0)
    for (let index = 0; index < noiseData.length; index++) noiseData[index] = Math.random() * 2 - 1

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(note.frequency, start)
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(sound === 'error' ? 0.012 : 0.018, start + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28)
    noise.buffer = noiseBuffer
    noiseFilter.type = 'lowpass'
    noiseFilter.frequency.setValueAtTime(650, start)
    noiseGain.gain.setValueAtTime(0, start)
    noiseGain.gain.linearRampToValueAtTime(0.009, start + 0.008)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.06)
    oscillator.connect(gain)
    gain.connect(context.destination)
    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(context.destination)
    oscillator.start(start)
    oscillator.stop(start + 0.3)
    noise.start(start)
    noise.stop(start + 0.065)
  }
}