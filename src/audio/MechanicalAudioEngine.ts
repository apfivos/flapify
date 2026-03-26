class MechanicalAudioEngine {
  private ctx: AudioContext | null = null;
  private buffers: AudioBuffer[] = [];
  private lastTick = 0;
  private readonly minSpacingMs = 12;
  enabled = true;
  volume = 0.36;

  init(): void {
    if (this.ctx) {
      return;
    }

    const AudioContextCtor = window.AudioContext ?? (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    this.ctx = new AudioContextCtor();
    this.buffers = Array.from({ length: 8 }, (_, index) => this.createClack(index));
  }

  async prime(): Promise<void> {
    this.init();
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume().catch(() => undefined);
    }
  }

  private createClack(variant: number): AudioBuffer {
    if (!this.ctx) {
      throw new Error("Audio context not ready");
    }

    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * (0.022 + variant * 0.002));
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const output = buffer.getChannelData(0);

    for (let index = 0; index < length; index += 1) {
      const time = index / sampleRate;
      const envelope = Math.exp(-time * (260 + variant * 28));
      const click = Math.sin(time * (3000 + variant * 360)) * 0.5;
      const metal = Math.sin(time * (880 + variant * 70)) * 0.14;
      const body = Math.sin(time * (180 + variant * 20)) * 0.22;
      const noise = (Math.random() * 2 - 1) * 0.35;
      output[index] = (click + metal + body + noise) * envelope;
    }

    return buffer;
  }

  play(): void {
    if (!this.ctx || !this.enabled || this.buffers.length === 0) {
      return;
    }

    const now = performance.now();
    if (now - this.lastTick < this.minSpacingMs) {
      return;
    }
    this.lastTick = now;

    const source = this.ctx.createBufferSource();
    const gain = this.ctx.createGain();
    gain.gain.value = this.volume * (0.7 + Math.random() * 0.4);
    source.buffer = this.buffers[Math.floor(Math.random() * this.buffers.length)];
    source.detune.value = (Math.random() - 0.5) * 260;
    source.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(this.ctx.currentTime + Math.random() * 0.008);
  }
}

export const mechanicalAudioEngine = new MechanicalAudioEngine();
