// Synthesized Fintech Sound FX & Haptics Engine (0 KB audio files)
// Uses HTML5 Web Audio API Oscillators & Envelopes

class SoundEngine {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lumina_sound_fx');
      this.soundEnabled = saved !== 'false';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public toggleSound(enabled?: boolean): boolean {
    this.soundEnabled = enabled !== undefined ? enabled : !this.soundEnabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lumina_sound_fx', String(this.soundEnabled));
    }
    return this.soundEnabled;
  }

  // 1. Subtle Coin Clink (for buttons, chips, micro-interactions)
  public playCoin() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(2200, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {}
  }

  // 2. Uplifting Success Chime (for QR detected, goal saved)
  public playSuccess() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Dual harmonic chime (F#5 -> C#6)
      const freqs = [740, 1108];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.06;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
    } catch {}
  }

  // 3. Fintech "Cha-Ching / Cash Register" Bell (for payments logged & settled)
  public playChaChing() {
    if (!this.soundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Step 1: Mechanical cash drawer click
      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'square';
      click.frequency.setValueAtTime(180, now);
      clickGain.gain.setValueAtTime(0.07, now);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      click.connect(clickGain);
      clickGain.connect(ctx.destination);
      click.start(now);
      click.stop(now + 0.03);

      // Step 2: Bright twin bell rings
      const bellPitches = [1320, 1980]; // E6 -> B6
      bellPitches.forEach((p, i) => {
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        const bellStart = now + 0.04 + i * 0.08;

        bell.type = 'sine';
        bell.frequency.setValueAtTime(p, bellStart);

        bellGain.gain.setValueAtTime(0.18, bellStart);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, bellStart + 0.55);

        bell.connect(bellGain);
        bellGain.connect(ctx.destination);

        bell.start(bellStart);
        bell.stop(bellStart + 0.55);
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 50, 60]);
      }
    } catch {}
  }
}

export const soundFX = new SoundEngine();
