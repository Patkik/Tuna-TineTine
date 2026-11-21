import { describe, it, expect } from 'vitest';
import { evaluateBlowProgress } from '../src/core/blowDetector';

describe('Candle Blow-Out Logic', () => {
  it('should extinguish candles when wind hold reaches 1.5 seconds', () => {
    expect(evaluateBlowProgress(1000)).toBe(false);
    expect(evaluateBlowProgress(1500)).toBe(true);
    expect(evaluateBlowProgress(2000)).toBe(true);
  });
});
