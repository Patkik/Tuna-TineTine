/**
 * blowDetector.ts — Candle blow-out detection
 * Primary: tap-and-hold wind gust (100% reliable, all Android devices)
 * Optional: Web Audio AnalyserNode microphone frequency detection (graceful fallback)
 */

/** Returns true when hold duration exceeds the extinguish threshold (1500ms) */
export function evaluateBlowProgress(holdDurationMs: number): boolean {
  return holdDurationMs >= 1500;
}

export class BlowDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  public onBlow?: () => void;

  /** Request mic and start frequency detection */
  async startMicDetection(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.analyser);
      this.detectBlowLoop();
      return true;
    } catch {
      // Permission denied or no mic — caller falls back to touch
      return false;
    }
  }

  private detectBlowLoop(): void {
    if (!this.analyser) return;
    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    const check = () => {
      this.analyser!.getByteFrequencyData(buffer);
      // Blow detection: sustained low-mid frequency energy spike
      const lowMidEnergy = buffer.slice(2, 20).reduce((s, v) => s + v, 0) / 18;
      if (lowMidEnergy > 80) {
        this.onBlow?.();
      }
      this.animFrameId = requestAnimationFrame(check);
    };
    this.animFrameId = requestAnimationFrame(check);
  }

  stop(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close().catch(() => { /* silent */ });
    this.analyser = null;
    this.mediaStream = null;
    this.audioContext = null;
  }
}
