export class AudioEngine {
  private ctx: AudioContext | null = null;
  private loops: Map<string, { source: OscillatorNode; gain: GainNode }> = new Map();
  private masterGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private getMaster(): GainNode {
    this.getContext();
    return this.masterGain!;
  }

  startLoop(name: string, config: {
    frequency: number;
    type: OscillatorType;
    volume: number;
    detune?: number;
  }) {
    if (this.loops.has(name)) return;

    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.value = config.frequency;
    if (config.detune) osc.detune.value = config.detune;

    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start();

    this.loops.set(name, { source: osc, gain });
  }

  stopLoop(name: string) {
    const loop = this.loops.get(name);
    if (!loop) return;

    const ctx = this.getContext();
    loop.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => {
      loop.source.stop();
      loop.source.disconnect();
      loop.gain.disconnect();
      this.loops.delete(name);
    }, 600);
  }

  playEffect(config: {
    frequency: number;
    type: OscillatorType;
    duration: number;
    volume: number;
    sweep?: number; // end frequency for sweep
  }) {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = config.type;
    osc.frequency.value = config.frequency;
    if (config.sweep) {
      osc.frequency.linearRampToValueAtTime(config.sweep, ctx.currentTime + config.duration);
    }

    gain.gain.value = config.volume;
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + config.duration);

    osc.connect(gain);
    gain.connect(this.getMaster());
    osc.start();
    osc.stop(ctx.currentTime + config.duration);
  }

  // Sonar-style ping sound
  playPing() {
    this.playEffect({
      frequency: 1200,
      type: 'sine',
      duration: 0.8,
      volume: 0.15,
      sweep: 800,
    });
  }

  // Warm commend sound
  playCommend() {
    const ctx = this.getContext();
    [523, 659, 784].forEach((freq, i) => {
      setTimeout(() => {
        this.playEffect({
          frequency: freq,
          type: 'sine',
          duration: 0.3,
          volume: 0.12,
        });
      }, i * 120);
    });
  }

  // Ka-chunk power reroute
  playPowerChange() {
    this.playEffect({
      frequency: 80,
      type: 'square',
      duration: 0.15,
      volume: 0.2,
    });
    setTimeout(() => {
      this.playEffect({
        frequency: 200,
        type: 'sine',
        duration: 0.3,
        volume: 0.1,
      });
    }, 100);
  }

  // Alert flash sound
  playAlert() {
    this.playEffect({ frequency: 880, type: 'square', duration: 0.1, volume: 0.3 });
    setTimeout(() => {
      this.playEffect({ frequency: 880, type: 'square', duration: 0.1, volume: 0.3 });
    }, 200);
    setTimeout(() => {
      this.playEffect({ frequency: 1100, type: 'square', duration: 0.2, volume: 0.3 });
    }, 400);
  }

  setMasterVolume(v: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }
  }

  dispose() {
    for (const [name] of this.loops) {
      this.stopLoop(name);
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}
