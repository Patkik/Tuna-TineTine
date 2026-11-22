import { describe, it, expect } from 'vitest';
import {
  clampElasticPeek,
  computeCompassOffsetPx,
  computeFigure8Sway,
} from '../src/engine/scenes/spyglassMath';
import {
  SCRATCH_AUTO_CLEAR_THRESHOLD,
  ScratchCoverageGrid,
  shouldDismissSwipe,
} from '../src/ui/scratchMath';
import {
  DEFAULT_ATLAS_PADDING,
  packAtlasRects,
} from '../src/engine/assets/SpriteAtlasPacker';
import { STAGE1_SVGS } from '../src/engine/assets/stage1Svgs';
import { STAGE2_SVGS } from '../src/engine/assets/stage2Svgs';
import {
  OCTOPUS_CINEMA_DURATION,
  getOctopusCinemaShot,
} from '../src/engine/scenes/octopusCinemaMath';

describe('Spyglass optical sway, elastic peek & compass strip math', () => {
  it('bounds figure-8 sway within ±3px X and ±2px Y and clamps elastic peek to 45px', () => {
    for (let t = 0; t < 12; t += 0.17) {
      const sway = computeFigure8Sway(t);
      expect(Math.abs(sway.x)).toBeLessThanOrEqual(3.0001);
      expect(Math.abs(sway.y)).toBeLessThanOrEqual(2.0001);
    }

    const inside = clampElasticPeek(20, -10, 45);
    expect(inside).toEqual({ x: 20, y: -10 });

    const clamped = clampElasticPeek(90, 120, 45);
    expect(Math.hypot(clamped.x, clamped.y)).toBeCloseTo(45, 5);

    expect(computeCompassOffsetPx(0, 56)).toBe(-0);
    expect(computeCompassOffsetPx(1, 56)).toBe(-56);
    expect(computeCompassOffsetPx(-1, 56)).toBe(56);
  });
});

describe('ScratchCoverageGrid & swipe-flick thresholds', () => {
  it('auto-clears at >= 58% coverage and detects flick/drag dismissals', () => {
    expect(SCRATCH_AUTO_CLEAR_THRESHOLD).toBe(0.58);
    const grid = new ScratchCoverageGrid(24, 12);
    expect(grid.getProgress()).toBe(0);

    for (let x = 0.05; x <= 0.95; x += 0.1) {
      for (let y = 0.1; y <= 0.9; y += 0.2) {
        grid.stamp(x, y, 0.1, 0.18);
      }
    }
    expect(grid.getProgress()).toBeGreaterThanOrEqual(SCRATCH_AUTO_CLEAR_THRESHOLD);

    grid.reset();
    expect(grid.getProgress()).toBe(0);

    expect(shouldDismissSwipe(110, 0, 0.1, 300)).toBe(true);
    expect(shouldDismissSwipe(0, -90, 0.1, 300)).toBe(true);
    expect(shouldDismissSwipe(10, 0, 0.6, 300)).toBe(true);
    expect(shouldDismissSwipe(20, 5, 0.05, 300)).toBe(false);
  });
});

describe('SpriteAtlasPacker shelf packing & >=4px padding', () => {
  it('packs all Stage 1 sprites without overlaps and preserves >= 4px edge padding', () => {
    const layout = packAtlasRects(STAGE1_SVGS, DEFAULT_ATLAS_PADDING, 2048);
    expect(layout.rects).toHaveLength(Object.keys(STAGE1_SVGS).length);
    expect(layout.width).toBeLessThanOrEqual(2048);

    for (let i = 0; i < layout.rects.length; i++) {
      const a = layout.rects[i];
      expect(a.x).toBeGreaterThanOrEqual(DEFAULT_ATLAS_PADDING);
      expect(a.y).toBeGreaterThanOrEqual(DEFAULT_ATLAS_PADDING);
      expect(a.x + a.width + DEFAULT_ATLAS_PADDING).toBeLessThanOrEqual(layout.width);
      expect(a.y + a.height + DEFAULT_ATLAS_PADDING).toBeLessThanOrEqual(layout.height);

      for (let j = i + 1; j < layout.rects.length; j++) {
        const b = layout.rects[j];
        const separatedX =
          a.x + a.width + DEFAULT_ATLAS_PADDING <= b.x ||
          b.x + b.width + DEFAULT_ATLAS_PADDING <= a.x;
        const separatedY =
          a.y + a.height + DEFAULT_ATLAS_PADDING <= b.y ||
          b.y + b.height + DEFAULT_ATLAS_PADDING <= a.y;
        expect(separatedX || separatedY).toBe(true);
      }
    }
  });

  it('packs all Stage 2 sprites (including octopus cinema & corkscrew) cleanly inside 2048px', () => {
    const layout = packAtlasRects(STAGE2_SVGS, DEFAULT_ATLAS_PADDING, 2048);
    expect(layout.rects).toHaveLength(Object.keys(STAGE2_SVGS).length);
    expect(layout.width).toBeLessThanOrEqual(2048);
    expect(layout.height).toBeLessThanOrEqual(2048);

    for (let i = 0; i < layout.rects.length; i++) {
      const a = layout.rects[i];
      expect(a.x).toBeGreaterThanOrEqual(DEFAULT_ATLAS_PADDING);
      expect(a.y).toBeGreaterThanOrEqual(DEFAULT_ATLAS_PADDING);
      for (let j = i + 1; j < layout.rects.length; j++) {
        const b = layout.rects[j];
        const separatedX =
          a.x + a.width + DEFAULT_ATLAS_PADDING <= b.x ||
          b.x + b.width + DEFAULT_ATLAS_PADDING <= a.x;
        const separatedY =
          a.y + a.height + DEFAULT_ATLAS_PADDING <= b.y ||
          b.y + b.height + DEFAULT_ATLAS_PADDING <= a.y;
        expect(separatedX || separatedY).toBe(true);
      }
    }
  });
});

describe('OctopusBottleCinema 5-frame storyboard timeline', () => {
  it('maps elapsed time deterministically across all 5 storyboard shots', () => {
    expect(OCTOPUS_CINEMA_DURATION).toBe(9.6);
    expect(getOctopusCinemaShot(0.5).frame).toBe('discovery');
    expect(getOctopusCinemaShot(2.5).frame).toBe('swimming');
    expect(getOctopusCinemaShot(4.5).frame).toBe('ashore');
    expect(getOctopusCinemaShot(6.5).frame).toBe('placement');
    expect(getOctopusCinemaShot(8.5).frame).toBe('mission_complete');
    expect(getOctopusCinemaShot(8.5).frameIndex).toBe(5);
  });
});
