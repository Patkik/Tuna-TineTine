import { describe, it, expect } from 'vitest';
import { clampDevicePixelRatio } from '../src/engine/BeachStage';

describe('BeachStage Engine Settings', () => {
  it('should clamp high-DPR Android screens to 2.0 max', () => {
    expect(clampDevicePixelRatio(1)).toBe(1);
    expect(clampDevicePixelRatio(2)).toBe(2);
    expect(clampDevicePixelRatio(3)).toBe(2);
    expect(clampDevicePixelRatio(3.5)).toBe(2);
  });
});
