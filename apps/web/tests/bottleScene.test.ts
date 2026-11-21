import { describe, it, expect } from 'vitest';
import { getNextCardIndex } from '../src/ui/PolaroidStack';

describe('Polaroid Stack Navigation', () => {
  it('should advance to next card on swipe left and loop or clamp at end', () => {
    expect(getNextCardIndex(0, 'left', 4)).toBe(1);
    expect(getNextCardIndex(3, 'left', 4)).toBe(3);
    expect(getNextCardIndex(2, 'right', 4)).toBe(1);
  });
});
