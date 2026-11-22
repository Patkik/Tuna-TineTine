import { describe, it, expect } from 'vitest';
import {
  computeFixedStageSize,
  computeSceneLayout,
} from '../src/engine/layout/sceneLayout';
import { STAGE1_SVGS } from '../src/engine/assets/stage1Svgs';

describe('Full-Screen Stage Sizing & Portrait Detection', () => {
  it('fills available viewport dimensions and detects portrait vs landscape cleanly', () => {
    const portrait = computeFixedStageSize(390, 844);
    expect(portrait.isPortraitViewport).toBe(true);
    expect(portrait.width).toBe(390);
    expect(portrait.height).toBe(844);

    const mobileLandscape = computeFixedStageSize(844, 390);
    expect(mobileLandscape.isPortraitViewport).toBe(false);
    expect(mobileLandscape.width).toBe(844);
    expect(mobileLandscape.height).toBe(390);

    const desktop = computeFixedStageSize(1024, 576);
    expect(desktop.isPortraitViewport).toBe(false);
    expect(desktop.width).toBe(1024);
    expect(desktop.height).toBe(576);

    const ultrawide = computeFixedStageSize(2560, 1080);
    expect(ultrawide.isPortraitViewport).toBe(false);
    expect(ultrawide.width).toBe(2560);
    expect(ultrawide.height).toBe(1080);
  });
});

describe('Clean Beach SceneLayout (Zero Sand Mounds & Zero Stage 1 Spoilers)', () => {
  it('lays out mobile landscape 844x390 and 1920x1080 cleanly inside viewport bounds without sand mounds', () => {
    for (const [vw, vh] of [
      [844, 390],
      [1920, 1080],
    ] as const) {
      const layout = computeSceneLayout(vw, vh);
      expect(layout.isPortrait).toBe(false);
      expect('sandBearSculpture' in layout).toBe(false);
      for (const item of [
        layout.korilakkuma,
        layout.rilakkumaHead,
        layout.umbrella,
        layout.bucket,
        layout.octopus,
        layout.sailboat,
      ]) {
        expect(item.x).toBeGreaterThan(0);
        expect(item.x).toBeLessThan(vw);
        expect(item.y).toBeGreaterThan(150);
        expect(item.y).toBeLessThan(vh);
      }
    }
  });

  it('lays out landscape 1024x576 matching cel-shaded beach ratios', () => {
    const layout = computeSceneLayout(1024, 576);
    expect(layout.isPortrait).toBe(false);
    expect(layout.korilakkuma.x).toBeLessThan(layout.umbrella.x);
    expect(layout.umbrella.x).toBeLessThan(layout.rilakkumaHead.x);
    expect(layout.rilakkumaHead.rotation).toBeGreaterThan(0.4);
    expect(layout.crabs).toHaveLength(3);
    expect(layout.rilakkumaFeet).toHaveLength(2);
    expect(layout.octopus.x).toBeLessThan(360);
  });

  it('keeps the secret octopus unobstructed by the bottom-center countdown area on mobile viewports', () => {
    const seLandscape = computeSceneLayout(667, 375);
    expect(seLandscape.octopus.x).toBeLessThan(190);
    expect(seLandscape.octopus.y).toBeLessThan(350);

    const sePortrait = computeSceneLayout(375, 667);
    expect(sePortrait.octopus.y).toBeLessThan(470);
  });

  it('contains zero Japanese calligraphy or birthday spoilers in Stage 1 SVGs', () => {
    const combined = JSON.stringify(STAGE1_SVGS);
    expect(combined).not.toMatch(/[\u3040-\u30FF\u4E00-\u9FAF]/);
    expect(combined).not.toContain('heyy tinee');
    expect('sandBearSculpture' in STAGE1_SVGS).toBe(false);
  });
});
