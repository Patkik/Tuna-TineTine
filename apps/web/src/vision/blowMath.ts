/**
 * blowMath.ts — Pure zero-dependency facial blow intensity math & status types.
 * Separated from BlowFaceDetector so UI & tests never statically pull MediaPipe WASM.
 */

export interface BlendshapeCategory {
  categoryName: string;
  score: number;
}

export type BlowDetectorStatus = 'loading' | 'active' | 'fallback' | 'extinguished';

export interface BlowFaceUpdate {
  rawIntensity: number;
  smoothedIntensity: number;
  extinguishProgress: number;
  faceDetected: boolean;
  noFaceFallback: boolean;
  status: BlowDetectorStatus;
}

export function computeRawBlowIntensity(
  categories: ReadonlyArray<BlendshapeCategory>,
): number {
  let mouthPucker = 0;
  let mouthFunnel = 0;
  let cheekPuff = 0;

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    if (cat.categoryName === 'mouthPucker') {
      mouthPucker = cat.score;
    } else if (cat.categoryName === 'mouthFunnel') {
      mouthFunnel = cat.score;
    } else if (cat.categoryName === 'cheekPuff') {
      cheekPuff = cat.score;
    }
  }

  const raw = Math.max(mouthPucker, mouthFunnel) * 0.72 + cheekPuff * 0.28;
  return Math.max(0, Math.min(1, raw));
}

export function smoothBlowIntensity(
  previous: number,
  raw: number,
  alpha = 0.35,
): number {
  return Math.max(0, Math.min(1, previous + alpha * (raw - previous)));
}

export function advanceExtinguishCharge(
  currentCharge: number,
  smoothedIntensity: number,
  deltaMs: number,
  options?: {
    threshold?: number;
    chargeDurationMs?: number;
    decayDurationMs?: number;
  },
): number {
  const threshold = options?.threshold ?? 0.45;
  const chargeDurationMs = options?.chargeDurationMs ?? 600;
  const decayDurationMs = options?.decayDurationMs ?? 1350;

  if (smoothedIntensity > threshold) {
    return Math.min(1, currentCharge + deltaMs / chargeDurationMs);
  }
  return Math.max(0, currentCharge - deltaMs / decayDurationMs);
}
