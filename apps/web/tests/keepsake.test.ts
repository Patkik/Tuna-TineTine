import { describe, it, expect } from 'vitest';
import {
  KEEPSAKE_HEIGHT,
  KEEPSAKE_WIDTH,
  formatKeepsakeFilename,
} from '../src/core/keepsakeGenerator';

describe('Keepsake exporter landscape PNG config', () => {
  it('uses crisp 1920x1080 widescreen resolution and formats standard Feb 5, 2027 PNG filename', () => {
    expect(KEEPSAKE_WIDTH).toBe(1920);
    expect(KEEPSAKE_HEIGHT).toBe(1080);
    expect(formatKeepsakeFilename('2027-02-05')).toBe('kristine-beach-birthday-2027-02-05.png');
  });
});
