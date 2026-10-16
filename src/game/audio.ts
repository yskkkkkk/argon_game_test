/**
 * Tactile Analog-Mechanical Sound Synthesizer (Web Audio API)
 * Synthesizes heavy mechanical ratchet clicks, brass bells, vault latches,
 * bellows air puffs, and heavy vault door release sounds using noise buffers and resonant filters.
 */

class MechanicalAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastTickTime: number = 0;

  private ensureContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * Heavy mechanical ratchet / dial click
   */
  public playClick(pitchMultiplier: number = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Short filtered noise burst (metallic detent transient)
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.025);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * pitchMultiplier, now);
    filter.Q.setValueAtTime(4.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.28, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.022);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);

    // 2. Low mechanical body thud
    const bodyOsc = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(240 * pitchMultiplier, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(65, now + 0.03);

    bodyGain.gain.setValueAtTime(0.18, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    bodyOsc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.035);
  }

  /**
   * Iron filings / sand grain friction tick when shaking window
   */
  public playShakeTick() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastTickTime < 0.055) return;
    this.lastTickTime = now;

    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.04);

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1800 + Math.random() * 900, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.038);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Subtle mechanical relay / optical alignment click
   */
  public playScanHum(mode: 'xray' | 'laser' = 'xray') {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (now - this.lastTickTime < 0.28) return;
    this.lastTickTime = now;

    this.playClick(mode === 'xray' ? 1.25 : 0.85);
  }

  /**
   * Bellows air puff sound for thermal cooling
   */
  public playCoolingPulse(tempRatio: number) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(ctx, 0.11);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450 + (1 - tempRatio) * 650, now);
    filter.Q.setValueAtTime(1.8, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  /**
   * Brass Bell + Heavy Mechanical Latch Clunk when a module is unlocked
   */
  public playModuleClear() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Mechanical Latch Clunk
    this.playClick(0.65);

    // 2. Warm Brass Bell Harmonics
    const fundamental = 880; // A5
    const partials = [1, 2.0, 2.756, 4.08];
    partials.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * ratio, now + 0.05);

      const amp = 0.14 / (idx + 1);
      gain.gain.setValueAtTime(amp, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55 / (idx * 0.6 + 1));

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + 0.05);
      osc.stop(now + 0.6);
    });
  }

  /**
   * Mechanical jam / tumbler reject clack
   */
  public playErrorBuzz() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.11].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(110, now + offset);
      osc.frequency.exponentialRampToValueAtTime(55, now + offset + 0.08);

      gain.gain.setValueAtTime(0.15, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.085);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  /**
   * Heavy Vault Door Bolts Retracting + Triumphant Brass Chime
   */
  public playSystemUnlockFanfare() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 3 heavy steel bolts retracting
    [0, 0.14, 0.28].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160 - idx * 20, now + delay);
      osc.frequency.exponentialRampToValueAtTime(42, now + delay + 0.11);

      gain.gain.setValueAtTime(0.26, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.115);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });

    // Resonant Brass Chord (C5 - E5 - G5 - C6)
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + 0.42 + i * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.13, start);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.9);
    });
  }
}

export const cyberAudio = new MechanicalAudioEngine();
