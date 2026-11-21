/**
 * audioManager.ts — Howler.js singleton with Android-safe Web Audio lifecycle
 * Suspends on visibilitychange (Android app switch) and resumes on return.
 */
import { Howl, Howler } from 'howler';

export type SoundName = 'waves' | 'sandCrunch' | 'crabScuttle' | 'chime' | 'musicBox' | 'cork' | 'sparkle' | 'heartbeat';

interface SoundConfig {
  src: string[];
  volume: number;
  loop?: boolean;
  sprite?: Record<string, [number, number]>;
}

const SOUND_CONFIG: Record<SoundName, SoundConfig> = {
  waves: { src: ['/assets/audio/waves.ogg', '/assets/audio/waves.mp3'], volume: 0.4, loop: true },
  musicBox: { src: ['/assets/audio/music-box.ogg', '/assets/audio/music-box.mp3'], volume: 0.6, loop: true },
  sandCrunch: { src: ['/assets/audio/sand-crunch.ogg', '/assets/audio/sand-crunch.mp3'], volume: 0.7 },
  crabScuttle: { src: ['/assets/audio/crab-scuttle.ogg', '/assets/audio/crab-scuttle.mp3'], volume: 0.5 },
  chime: { src: ['/assets/audio/chime.ogg', '/assets/audio/chime.mp3'], volume: 0.8 },
  cork: { src: ['/assets/audio/cork.ogg', '/assets/audio/cork.mp3'], volume: 0.9 },
  sparkle: { src: ['/assets/audio/sparkle.ogg', '/assets/audio/sparkle.mp3'], volume: 0.7 },
  heartbeat: { src: ['/assets/audio/heartbeat.ogg', '/assets/audio/heartbeat.mp3'], volume: 0.3 },
};

class AudioManager {
  private sounds = new Map<SoundName, Howl>();
  private audioUnlocked = false;
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Android Chrome requires a user gesture to unlock Web Audio
    // We lazy-create sounds only after unlockAudioContext() is called
    this.setupVisibilityHandler();
  }

  /**
   * Must be called from a user gesture (tap, touch) to unlock Android Web Audio API.
   */
  unlockAudioContext(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    // Resume Howler's internal AudioContext
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().catch(() => { /* silent */ });
    }
  }

  play(name: SoundName): void {
    if (!this.audioUnlocked) return;
    let sound = this.sounds.get(name);
    if (!sound) {
      const config = SOUND_CONFIG[name];
      if (!config) return;
      sound = new Howl({ ...config });
      this.sounds.set(name, sound);
    }
    sound.play();
  }

  stop(name: SoundName): void {
    this.sounds.get(name)?.stop();
  }

  fadeIn(name: SoundName, durationMs = 1000): void {
    if (!this.audioUnlocked) return;
    let sound = this.sounds.get(name);
    if (!sound) {
      const config = SOUND_CONFIG[name];
      if (!config) return;
      sound = new Howl({ ...config, volume: 0 });
      this.sounds.set(name, sound);
    }
    sound.play();
    sound.fade(0, SOUND_CONFIG[name].volume, durationMs);
  }

  fadeOut(name: SoundName, durationMs = 500): void {
    const sound = this.sounds.get(name);
    if (!sound) return;
    sound.fade(sound.volume(), 0, durationMs);
    setTimeout(() => sound.stop(), durationMs + 50);
  }

  private setupVisibilityHandler(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        Howler.mute(true);
      } else {
        Howler.mute(false);
        if (Howler.ctx?.state === 'suspended') {
          Howler.ctx.resume().catch(() => { /* silent */ });
        }
      }
    });
  }
}

export const audioManager = new AudioManager();
