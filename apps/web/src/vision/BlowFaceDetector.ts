/**
 * BlowFaceDetector.ts — 100% on-device MediaPipe FaceLandmarker blow detector.
 * Lazy-loads WASM & model assets, runs throttled ~15 FPS inference on a 320x240
 * front camera stream, smooths blendshapes via EMA, and tears down hardware
 * immediately on blow-out, visibilitychange, or unmount.
 */
import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import {
  advanceExtinguishCharge,
  computeRawBlowIntensity,
  smoothBlowIntensity,
  type BlowFaceUpdate,
} from './blowMath';

const INFERENCE_INTERVAL_MS = 66; // ~15 FPS decoupled from 60-120 FPS render ticker
const NO_FACE_TIMEOUT_MS = 4000;
const SELF_HOSTED_WASM = '/models/wasm';
const SELF_HOSTED_MODEL = '/models/face_landmarker.task';
const FALLBACK_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm';
const FALLBACK_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export class BlowFaceDetector {
  private faceLandmarker: FaceLandmarker | null = null;
  private initPromise: Promise<boolean> | null = null;
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private ownsVideoEl = false;
  private rafId: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private running = false;
  private destroyed = false;

  async init(): Promise<boolean> {
    if (this.faceLandmarker) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const mp = await import('@mediapipe/tasks-vision');
        const { FilesetResolver, FaceLandmarker: LandmarkerCtor } = mp;

        const candidates: Array<{ wasm: string; model: string; delegate: 'GPU' | 'CPU' }> = [
          { wasm: SELF_HOSTED_WASM, model: SELF_HOSTED_MODEL, delegate: 'GPU' },
          { wasm: SELF_HOSTED_WASM, model: SELF_HOSTED_MODEL, delegate: 'CPU' },
          { wasm: SELF_HOSTED_WASM, model: FALLBACK_MODEL, delegate: 'GPU' },
          { wasm: SELF_HOSTED_WASM, model: FALLBACK_MODEL, delegate: 'CPU' },
          { wasm: FALLBACK_WASM, model: FALLBACK_MODEL, delegate: 'GPU' },
          { wasm: FALLBACK_WASM, model: FALLBACK_MODEL, delegate: 'CPU' },
        ];

        for (const candidate of candidates) {
          if (this.destroyed) return false;
          try {
            const vision = await FilesetResolver.forVisionTasks(candidate.wasm);
            const landmarker = await LandmarkerCtor.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath: candidate.model,
                delegate: candidate.delegate,
              },
              runningMode: 'VIDEO',
              outputFaceBlendshapes: true,
              numFaces: 1,
            });
            if (this.destroyed) {
              landmarker.close();
              return false;
            }
            this.faceLandmarker = landmarker;
            return true;
          } catch {
            // Try next asset path or CPU delegate fallback
          }
        }
        return false;
      } catch {
        return false;
      }
    })();

    const ok = await this.initPromise;
    if (!ok) this.initPromise = null;
    return ok;
  }

  async start(
    onUpdate: (state: BlowFaceUpdate) => void,
    onExtinguished: () => void,
    videoElement?: HTMLVideoElement | null,
  ): Promise<boolean> {
    this.destroyed = false;

    const notifyFallback = (charge = 0) => {
      onUpdate({
        rawIntensity: 0,
        smoothedIntensity: 0,
        extinguishProgress: charge,
        faceDetected: false,
        noFaceFallback: true,
        status: 'fallback',
      });
    };

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      notifyFallback();
      return false;
    }

    onUpdate({
      rawIntensity: 0,
      smoothedIntensity: 0,
      extinguishProgress: 0,
      faceDetected: false,
      noFaceFallback: false,
      status: 'loading',
    });

    const [ready, stream] = await Promise.all([
      this.init(),
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { max: 30 },
          },
          audio: false,
        })
        .catch(() => null),
    ]);

    if (this.destroyed || !ready || !stream || !this.faceLandmarker) {
      stream?.getTracks().forEach((t) => t.stop());
      if (!this.destroyed) {
        notifyFallback();
      }
      return false;
    }

    this.stream = stream;

    let video = videoElement ?? null;
    if (!video && typeof document !== 'undefined') {
      video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);
      this.ownsVideoEl = true;
    }
    if (!video) {
      this.destroy();
      notifyFallback();
      return false;
    }

    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = stream;
    this.videoEl = video;

    try {
      await video.play();
    } catch {
      this.destroy();
      notifyFallback();
      return false;
    }

    if (this.destroyed) {
      this.destroy();
      return false;
    }

    this.running = true;
    let smoothed = 0;
    let charge = 0;
    let lastInferAt = 0;
    let lastTimestampMs = 0;
    let lastVideoTime = -1;
    let lastFaceAt = performance.now();
    let fallbackSignaled = false;

    if (typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.hidden && this.running) {
          this.destroy();
          notifyFallback(charge);
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    const tick = (nowMs: number) => {
      if (!this.running || this.destroyed || !this.faceLandmarker || !this.videoEl) {
        return;
      }

      if (nowMs - lastInferAt >= INFERENCE_INTERVAL_MS) {
        const deltaMs = lastInferAt > 0 ? Math.min(200, nowMs - lastInferAt) : INFERENCE_INTERVAL_MS;
        lastInferAt = nowMs;

        if (this.videoEl.readyState >= 2 && this.videoEl.currentTime !== lastVideoTime) {
          lastVideoTime = this.videoEl.currentTime;
          const ts = Math.max(nowMs, lastTimestampMs + 1);
          lastTimestampMs = ts;

          const result = this.faceLandmarker.detectForVideo(this.videoEl, ts);
          const categories = result.faceBlendshapes?.[0]?.categories;
          const faceDetected = Boolean(categories && categories.length > 0);

          if (faceDetected && categories) {
            lastFaceAt = nowMs;
          } else if (!fallbackSignaled && nowMs - lastFaceAt >= NO_FACE_TIMEOUT_MS) {
            fallbackSignaled = true;
          }

          const raw = faceDetected && categories ? computeRawBlowIntensity(categories) : 0;
          smoothed = smoothBlowIntensity(smoothed, raw, 0.35);
          charge = advanceExtinguishCharge(charge, smoothed, deltaMs);

          if (charge >= 1) {
            onUpdate({
              rawIntensity: raw,
              smoothedIntensity: smoothed,
              extinguishProgress: 1,
              faceDetected,
              noFaceFallback: fallbackSignaled,
              status: 'extinguished',
            });
            this.destroy();
            onExtinguished();
            return;
          }

          onUpdate({
            rawIntensity: raw,
            smoothedIntensity: smoothed,
            extinguishProgress: charge,
            faceDetected,
            noFaceFallback: fallbackSignaled,
            status: 'active',
          });
        } else if (!fallbackSignaled && nowMs - lastFaceAt >= NO_FACE_TIMEOUT_MS) {
          fallbackSignaled = true;
          onUpdate({
            rawIntensity: 0,
            smoothedIntensity: smoothed,
            extinguishProgress: charge,
            faceDetected: false,
            noFaceFallback: true,
            status: 'active',
          });
        }
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
    return true;
  }

  destroy(): void {
    this.running = false;
    this.destroyed = true;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.srcObject = null;
      if (this.ownsVideoEl && this.videoEl.parentNode) {
        this.videoEl.parentNode.removeChild(this.videoEl);
      }
      this.videoEl = null;
      this.ownsVideoEl = false;
    }

    if (this.faceLandmarker) {
      try {
        this.faceLandmarker.close();
      } catch {
        // Ignore already-closed MediaPipe runtime
      }
      this.faceLandmarker = null;
    }

    this.initPromise = null;
  }
}
