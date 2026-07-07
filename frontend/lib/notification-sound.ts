let audioCtx: AudioContext | null = null
let unlocked = false

function ensureAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !unlocked) return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
  }
  return audioCtx
}

/** Розблокувати звук після першої взаємодії (політика автопрогравання браузера). */
export function unlockNotificationSound() {
  unlocked = true
  const ctx = ensureAudioContext()
  if (ctx?.state === 'suspended') void ctx.resume()
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, volume = 0.12) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  osc.connect(gain)
  gain.connect(ctx.destination)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.start(start)
  osc.stop(start + duration)
}

/** Короткий двотоновий сигнал для нових сповіщень. */
export function playNotificationSound() {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return

  const ctx = ensureAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    tone(ctx, 880, t, 0.12)
    tone(ctx, 1175, t + 0.14, 0.16)
  } catch {
    // ignore autoplay / audio errors
  }
}
