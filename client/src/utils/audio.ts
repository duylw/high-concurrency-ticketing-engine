/**
 * Web Audio API Sound Effects Utility
 * Zero external audio dependencies. Generates synthetic chimes, buzzers, and tones directly in browser memory.
 */

class SoundFxService {
  private ctx: AudioContext | null = null

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignored if waiting for user interaction
      })
    }

    return this.ctx
  }

  /**
   * High-pitch pleasant two-tone chime for valid check-in (HTTP 200)
   * 880Hz (A5) -> 1174.66Hz (D6)
   */
  playSuccess(): void {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      osc.frequency.setValueAtTime(1174.66, now + 0.09)

      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.35)
    } catch (e) {
      console.warn('[AUDIO] Failed to play success sound:', e)
    }
  }

  /**
   * Dual-burst low siren buzzer for Anti-Passback duplicate check-in violation (HTTP 409)
   * 240Hz -> 120Hz sawtooth wave
   */
  playAntiPassback(): void {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const bursts = [0, 0.22]

      bursts.forEach((offset) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(240, now + offset)
        osc.frequency.linearRampToValueAtTime(120, now + offset + 0.18)

        gain.gain.setValueAtTime(0.35, now + offset)
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.18)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + offset)
        osc.stop(now + offset + 0.18)
      })
    } catch (e) {
      console.warn('[AUDIO] Failed to play anti-passback sound:', e)
    }
  }

  /**
   * Low warning tone for invalid ticket or system error
   */
  playWarning(): void {
    try {
      const ctx = this.initContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'triangle'
      osc.frequency.setValueAtTime(320, now)

      gain.gain.setValueAtTime(0.25, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.25)
    } catch (e) {
      console.warn('[AUDIO] Failed to play warning sound:', e)
    }
  }
}

export const soundFx = new SoundFxService()
