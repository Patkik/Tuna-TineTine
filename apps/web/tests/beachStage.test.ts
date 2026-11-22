import { describe, it, expect } from 'vitest';
import { clampDevicePixelRatio } from '../src/engine/BeachStage';

describe('BeachStage DPR capping', () => {
  it('caps devicePixelRatio at 2 to prevent Android GPU overload', () => {
    expect(clampDevicePixelRatio(1)).toBe(1);
    expect(clampDevicePixelRatio(1.5)).toBe(1.5);
    expect(clampDevicePixelRatio(2)).toBe(2);
    expect(clampDevicePixelRatio(3)).toBe(2);
    expect(clampDevicePixelRatio(4)).toBe(2);
    expect(clampDevicePixelRatio(NaN)).toBe(1);
  });
});
