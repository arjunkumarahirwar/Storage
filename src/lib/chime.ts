/**
 * The bell that says time is up.
 *
 * Three rising double-beeps made with the Web Audio API — no audio file to
 * download, nothing to cache, and it works offline. Browsers only allow sound
 * after a tap, so `primeChime()` is called from the "start" click; the context
 * stays awake and can ring two hours later.
 */

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext }

let context: AudioContext | null = null

const audio = (): AudioContext | null => {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext
  if (!Ctor) return null
  if (!context) {
    try {
      context = new Ctor()
    } catch {
      return null
    }
  }
  return context
}

/** Call from a tap: this is the gesture that lets the page ring later. */
export const primeChime = () => {
  const ctx = audio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
}

const beep = (ctx: AudioContext, at: number, frequency: number, length: number) => {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(0.35, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(at)
  oscillator.stop(at + length + 0.05)
}

/** Two beeps, three times — about three seconds of ringing. */
export const playTimeoutChime = () => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate([300, 120, 300, 120, 500])
    } catch {
      /* not allowed on this device */
    }
  }

  const ctx = audio()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  const start = ctx.currentTime + 0.05
  for (let cycle = 0; cycle < 3; cycle += 1) {
    const at = start + cycle * 0.9
    beep(ctx, at, 880, 0.35)
    beep(ctx, at + 0.45, 660, 0.35)
  }
}
