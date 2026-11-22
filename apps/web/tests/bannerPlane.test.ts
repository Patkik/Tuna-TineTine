import { describe, it, expect } from 'vitest';
import {
  computeBannerWaveOffset,
  computePlaneBob,
  computePlanePitch,
} from '../src/engine/layers/BannerPlane';

describe('BannerPlane cloth-wave & flight physics', () => {
  it('pins the front tow bar stiff (u = 0) and scales wave amplitude quadratically toward the tail', () => {
    for (const t of [0, 0.35, 1.1, 2.7]) {
      expect(computeBannerWaveOffset(0, t, 7.5)).toBeCloseTo(0, 6);
    }

    let maxMid = 0;
    let maxTail = 0;
    for (let t = 0; t < 4; t += 0.05) {
      maxMid = Math.max(maxMid, Math.abs(computeBannerWaveOffset(0.5, t, 7.5)));
      maxTail = Math.max(maxTail, Math.abs(computeBannerWaveOffset(1.0, t, 7.5)));
    }
    expect(maxTail).toBeGreaterThan(maxMid * 2.5);
    expect(maxTail).toBeCloseTo(7.5, 1);
  });

  it('couples vertical sine bob and derivative cosine nose pitch + tap boost tilt', () => {
    expect(computePlaneBob(0)).toBeCloseTo(0, 6);
    expect(computePlanePitch(0, 0)).toBeCloseTo(0.045, 5);
    expect(computePlanePitch(0, -4.2)).toBeLessThan(0);
  });
});
