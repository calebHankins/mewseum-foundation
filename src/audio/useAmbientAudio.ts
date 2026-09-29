import { useEffect } from 'react'

/** Plays a slow, procedurally varied pentatonic melody over a warm chord loop. */
export function useAmbientAudio(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return

    const audioCtx = new AudioContext()
    const masterGain = audioCtx.createGain()
    masterGain.gain.setValueAtTime(0.5, audioCtx.currentTime)
    masterGain.connect(audioCtx.destination)

    const chords = [
      { bass: 48, notes: [60, 64, 67] }, // C
      { bass: 45, notes: [57, 60, 64] }, // Am
      { bass: 53, notes: [60, 65, 69] }, // F
      { bass: 55, notes: [59, 62, 67] }, // G
    ]
    const pentatonicScale = [60, 62, 64, 67, 69, 72]
    const beatDuration = 60 / 68
    let beatIndex = 0
    let melodyIndex = 2
    let nextNoteTime = audioCtx.currentTime + 0.1

    const midiToFrequency = (note: number) => 440 * 2 ** ((note - 69) / 12)

    const playNote = (note: number, startTime: number, duration: number, volume: number) => {
      const oscillator = audioCtx.createOscillator()
      const envelope = audioCtx.createGain()
      const endTime = startTime + duration

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(midiToFrequency(note), startTime)
      envelope.gain.setValueAtTime(0.0001, startTime)
      envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.025)
      envelope.gain.exponentialRampToValueAtTime(0.0001, endTime)

      oscillator.connect(envelope)
      envelope.connect(masterGain)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
      }
      oscillator.start(startTime)
      oscillator.stop(endTime + 0.03)
    }

    const scheduleNotes = () => {
      const now = audioCtx.currentTime
      if (nextNoteTime < now - 0.05) {
        const skippedBeats = Math.ceil((now - 0.05 - nextNoteTime) / beatDuration)
        beatIndex += skippedBeats
        nextNoteTime += skippedBeats * beatDuration
      }

      const scheduleThrough = now + 0.12
      while (nextNoteTime < scheduleThrough) {
        const chord = chords[Math.floor(beatIndex / 4) % chords.length]
        const step = Math.random()
        const movement = step < 0.25 ? 0 : step < 0.625 ? 1 : -1
        const nextMelodyIndex = melodyIndex + movement
        melodyIndex = Math.max(0, Math.min(pentatonicScale.length - 1, nextMelodyIndex))

        if (beatIndex > 0 && beatIndex % 8 === 0) {
          melodyIndex = Math.random() < 0.5 ? 1 : 2
        }

        playNote(pentatonicScale[melodyIndex], nextNoteTime, beatDuration * 0.78, 0.055)
        if (beatIndex % 4 === 0) {
          playNote(chord.bass, nextNoteTime, beatDuration * 2.5, 0.035)
          chord.notes.forEach(note => {
            playNote(note, nextNoteTime, beatDuration * 1.8, 0.012)
          })
        }

        beatIndex += 1
        nextNoteTime += beatDuration
      }
    }

    const scheduler = window.setInterval(scheduleNotes, 100)
    const resumeAudio = () => {
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => undefined)
      }
    }
    window.addEventListener('pointerdown', resumeAudio)
    window.addEventListener('keydown', resumeAudio)

    return () => {
      window.clearInterval(scheduler)
      window.removeEventListener('pointerdown', resumeAudio)
      window.removeEventListener('keydown', resumeAudio)
      audioCtx.close().catch(() => undefined)
    }
  }, [enabled])
}
