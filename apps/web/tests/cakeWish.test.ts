import { describe, it, expect, vi } from 'vitest';
import {
  advanceExtinguishCharge,
  computeRawBlowIntensity,
  smoothBlowIntensity,
} from '../src/vision/blowMath';
import { BlowFaceDetector } from '../src/vision/BlowFaceDetector';

describe('Cake blow-out detector math & MediaPipe hardware teardown', () => {
  it('computes continuous raw blow intensity from MediaPipe mouthPucker/mouthFunnel/cheekPuff blendshapes', () => {
    const score = computeRawBlowIntensity([
      { categoryName: 'mouthPucker', score: 0.8 },
      { categoryName: 'mouthFunnel', score: 0.4 },
      { categoryName: 'cheekPuff', score: 0.5 },
    ]);
    // 0.8 * 0.72 + 0.5 * 0.28 = 0.576 + 0.14 = 0.716
    expect(score).toBeCloseTo(0.716, 4);
    expect(computeRawBlowIntensity([])).toBe(0);
  });

  it('smooths jitter with EMA alpha=0.35 and charges extinguishProgress in ~600ms above 0.45', () => {
    const s1 = smoothBlowIntensity(0, 0.8, 0.35);
    expect(s1).toBeCloseTo(0.28, 4);
    const s2 = smoothBlowIntensity(s1, 0.8, 0.35);
    expect(s2).toBeCloseTo(0.462, 4);

    expect(advanceExtinguishCharge(0, 0.44, 66)).toBe(0);

    let charge = 0;
    for (let i = 0; i < 10; i++) {
      charge = advanceExtinguishCharge(charge, 0.7, 66);
    }
    expect(charge).toBe(1);

    const paused = advanceExtinguishCharge(0.6, 0.1, 200);
    expect(paused).toBeGreaterThan(0.4);
    expect(paused).toBeLessThan(0.6);
  });

  it('stops all MediaStream tracks and closes FaceLandmarker cleanly on destroy()', () => {
    const detector = new BlowFaceDetector();
    const stopTrack = vi.fn();
    const closeLandmarker = vi.fn();

    (detector as unknown as { stream: { getTracks: () => Array<{ stop: () => void }> } }).stream = {
      getTracks: () => [{ stop: stopTrack }, { stop: stopTrack }],
    };
    (detector as unknown as { faceLandmarker: { close: () => void } }).faceLandmarker = {
      close: closeLandmarker,
    };

    detector.destroy();
    expect(stopTrack).toHaveBeenCalledTimes(2);
    expect(closeLandmarker).toHaveBeenCalledTimes(1);
  });
});
