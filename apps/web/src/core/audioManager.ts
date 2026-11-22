/**
 * audioManager.ts — Zero-404 procedural Web Audio engine with Android visibility suspend.
 * Generates cozy music-box notes, ocean surf swells, and responsive beach & foley SFX.
 */

export type SoundEffect =
  | 'wiggle'
  | 'crab'
  | 'heart'
  | 'sandCrunch'
  | 'chime'
  | 'corkPop'
  | 'corkPlop'
  | 'wind'
  | 'sparkle'
  | 'planeZoom'
  | 'poof'
  | 'cloudPunch'
  | 'foilScratch'
  | 'paperWhoosh'
  | 'brassClick'
  | 'glassKnock'
  | 'cakeRevealChime'
  | 'waterPlop'
  | 'corkTwist';

const HAPPY_BIRTHDAY_NOTES: Array<{ freq: number; beats: number }> = [
  { freq: 392.0, beats: 0.75 }, // G4
  { freq: 392.0, beats: 0.25 },
  { freq: 440.0, beats: 1.0 },  // A4
  { freq: 392.0, beats: 1.0 },  // G4
  { freq: 523.25, beats: 1.0 }, // C5
  { freq: 493.88, beats: 2.0 }, // B4

  { freq: 392.0, beats: 0.75 },
  { freq: 392.0, beats: 0.25 },
  { freq: 440.0, beats: 1.0 },
  { freq: 392.0, beats: 1.0 },
  { freq: 587.33, beats: 1.0 }, // D5
  { freq: 523.25, beats: 2.0 }, // C5

  { freq: 392.0, beats: 0.75 },
  { freq: 392.0, beats: 0.25 },
  { freq: 783.99, beats: 1.0 }, // G5
  { freq: 659.25, beats: 1.0 }, // E5
  { freq: 523.25, beats: 1.0 }, // C5
  { freq: 493.88, beats: 1.0 }, // B4
  { freq: 440.0, beats: 1.5 },  // A4

  { freq: 698.46, beats: 0.75 }, // F5
  { freq: 698.46, beats: 0.25 },
  { freq: 659.25, beats: 1.0 },  // E5
  { freq: 523.25, beats: 1.0 },  // C5
  { freq: 587.33, beats: 1.0 },  // D5
  { freq: 523.25, beats: 2.5 },  // C5
];

class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private oceanNode: AudioBufferSourceNode | null = null;
  private oceanLfo: OscillatorNode | null = null;
  private oceanGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setTimeout> | null = null;
  private noteIndex = 0;
  private musicPlaying = false;
  private unlocked = false;
  private muted = false;
  private lastCrunchAt = 0;
  private lastScratchAt = 0;
  private visibilityBound = false;

  init(): void {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) {
        void this.ctx.suspend().catch(() => undefined);
      } else if (this.unlocked && !this.muted) {
        void this.ctx.resume().catch(() => undefined);
      }
    });
  }

  unlockAudioContext(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.7;
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined);
    }
    this.unlocked = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.masterGain || !this.ctx) return;
    this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  isMuted(): boolean {
    return this.muted;
  }

  startOceanAmbience(): void {
    if (!this.ctx || !this.masterGain || this.oceanNode) return;
    const sampleRate = this.ctx.sampleRate;
    const seconds = 3;
    const buffer = this.ctx.createBuffer(1, sampleRate * seconds, sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      data[i] = (b0 + b1 + b2) * 0.35;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;

    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.14;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.045;

    const surfGain = this.ctx.createGain();
    surfGain.gain.value = 0.07;

    lfo.connect(lfoGain);
    lfoGain.connect(surfGain.gain);
    src.connect(filter);
    filter.connect(surfGain);
    surfGain.connect(this.masterGain);

    src.start();
    lfo.start();
    this.oceanNode = src;
    this.oceanLfo = lfo;
    this.oceanGain = surfGain;
  }

  stopOceanAmbience(): void {
    try {
      this.oceanNode?.stop();
    } catch {
      // Ignore already stopped
    }
    try {
      this.oceanLfo?.stop();
    } catch {
      // Ignore already stopped
    }
    this.oceanNode = null;
    this.oceanLfo = null;
    this.oceanGain?.disconnect();
    this.oceanGain = null;
  }

  startMusicBox(): void {
    if (!this.ctx || !this.masterGain || this.musicPlaying) return;
    this.musicPlaying = true;
    this.noteIndex = 0;
    this.scheduleNextNote();
  }

  stopMusicBox(): void {
    this.musicPlaying = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  stopAll(): void {
    this.stopMusicBox();
    this.stopOceanAmbience();
  }

  private scheduleNextNote(): void {
    if (!this.musicPlaying || !this.ctx || !this.masterGain) return;
    if (!document.hidden && !this.muted && this.ctx.state === 'running') {
      const note = HAPPY_BIRTHDAY_NOTES[this.noteIndex % HAPPY_BIRTHDAY_NOTES.length];
      this.playBell(note.freq, 0.075, 0.55);
      const waitMs = Math.round(note.beats * 460);
      this.noteIndex = (this.noteIndex + 1) % HAPPY_BIRTHDAY_NOTES.length;
      this.musicTimer = setTimeout(() => this.scheduleNextNote(), waitMs);
    } else {
      this.musicTimer = setTimeout(() => this.scheduleNextNote(), 400);
    }
  }

  private playBell(freq: number, volume = 0.08, duration = 0.45): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, now);

    const overGain = this.ctx.createGain();
    overGain.gain.setValueAtTime(0.18, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    overtone.start(now);
    osc.stop(now + duration + 0.05);
    overtone.stop(now + duration + 0.05);
  }

  playSfx(name: SoundEffect): void {
    if (!this.unlocked) {
      this.unlockAudioContext();
    }
    if (!this.ctx || !this.masterGain || this.muted) return;

    switch (name) {
      case 'wiggle': {
        this.playToneSweep(280, 420, 0.14, 0.09, 'sine');
        break;
      }
      case 'crab': {
        this.playToneSweep(620, 880, 0.08, 0.07, 'triangle');
        break;
      }
      case 'heart': {
        this.playBell(659.25, 0.08, 0.35);
        setTimeout(() => this.playBell(880, 0.07, 0.35), 75);
        break;
      }
      case 'sandCrunch': {
        const ms = Date.now();
        if (ms - this.lastCrunchAt < 90) return;
        this.lastCrunchAt = ms;
        this.playNoiseBurst(0.06, 1800, 0.08);
        break;
      }
      case 'foilScratch': {
        const ms = Date.now();
        if (ms - this.lastScratchAt < 75) return;
        this.lastScratchAt = ms;
        this.playNoiseBurst(0.055, 3400, 0.065);
        break;
      }
      case 'paperWhoosh': {
        this.playNoiseBurst(0.28, 1200, 0.085);
        this.playToneSweep(340, 210, 0.2, 0.03, 'sine');
        break;
      }
      case 'brassClick': {
        this.playToneSweep(1400, 920, 0.032, 0.065, 'triangle');
        setTimeout(() => this.playToneSweep(1680, 1180, 0.028, 0.05, 'triangle'), 45);
        break;
      }
      case 'chime': {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
          setTimeout(() => this.playBell(f, 0.09, 0.55), idx * 70);
        });
        break;
      }
      case 'cakeRevealChime': {
        [523.25, 659.25, 783.99, 987.77, 1318.51].forEach((f, idx) => {
          setTimeout(() => this.playBell(f, 0.1, 0.65), idx * 65);
        });
        break;
      }
      case 'corkPop': {
        this.playToneSweep(220, 720, 0.11, 0.15, 'sine');
        break;
      }
      case 'corkPlop': {
        this.playToneSweep(560, 190, 0.09, 0.11, 'sine');
        break;
      }
      case 'glassKnock': {
        this.playToneSweep(880, 620, 0.055, 0.12, 'triangle');
        this.playNoiseBurst(0.025, 2200, 0.05);
        break;
      }
      case 'wind': {
        this.playNoiseBurst(0.25, 700, 0.06);
        break;
      }
      case 'sparkle': {
        [783.99, 987.77, 1174.66, 1567.98].forEach((f, idx) => {
          setTimeout(() => this.playBell(f, 0.08, 0.5), idx * 65);
        });
        break;
      }
      case 'planeZoom': {
        this.playToneSweep(340, 760, 0.22, 0.08, 'triangle');
        setTimeout(() => this.playBell(987.77, 0.075, 0.35), 90);
        break;
      }
      case 'poof': {
        this.playNoiseBurst(0.2, 520, 0.085);
        this.playToneSweep(310, 190, 0.09, 0.045, 'sine');
        break;
      }
      case 'cloudPunch': {
        this.playNoiseBurst(0.16, 420, 0.075);
        this.playToneSweep(260, 480, 0.1, 0.04, 'sine');
        break;
      }
      case 'waterPlop': {
        this.playToneSweep(250, 610, 0.085, 0.12, 'sine');
        setTimeout(() => this.playToneSweep(480, 740, 0.06, 0.08, 'sine'), 55);
        break;
      }
      case 'corkTwist': {
        this.playNoiseBurst(0.055, 1850, 0.075);
        this.playToneSweep(190, 260, 0.065, 0.05, 'triangle');
        break;
      }
      default:
        break;
    }
  }

  private playToneSweep(
    startFreq: number,
    endFreq: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  private playNoiseBurst(duration: number, cutoffHz: number, volume: number): void {
    if (!this.ctx || !this.masterGain) return;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoffHz;

    const now = this.ctx.currentTime;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }
}

export const audioManager = new AudioManager();
