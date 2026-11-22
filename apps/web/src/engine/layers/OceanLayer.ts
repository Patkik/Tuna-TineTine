/**
 * OceanLayer.ts — Stylized cel-shaded ocean gradient (#58C4F6 -> #7DD3FC -> #BAE6FD),
 * crisp drifting horizontal white sunlight shimmer streaks, and scalloped tide foam.
 * Over-scanned horizontally so 0.7x gyroscope diorama parallax never exposes edge seams.
 */
import { Container, Graphics } from 'pixi.js';
import type { SceneLayout } from '../layout/sceneLayout';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import { createOceanTideFilter, type OceanTideController } from '../shaders/oceanTide';

const PARALLAX_OVERSCAN = 40;

export class OceanLayer extends Container {
  private waterQuad = new Graphics();
  private shimmerGraphics = new Graphics();
  private fallbackFoam = new Graphics();
  private tideController: OceanTideController | null = null;
  private oceanWidth = 1024;
  private oceanTop = 300;
  private oceanBandHeight = 96;
  private unitScale = 1;

  constructor() {
    super();
    this.addChild(this.waterQuad);
    this.addChild(this.shimmerGraphics);

    try {
      this.tideController = createOceanTideFilter();
      this.waterQuad.filters = [this.tideController.filter];
    } catch {
      this.tideController = null;
      this.addChild(this.fallbackFoam);
    }
  }

  applyLayout(layout: SceneLayout): void {
    const { width: w, dunes, unitScale: u } = layout;
    this.oceanWidth = w;
    this.unitScale = u;

    const top = dunes.horizonY;
    const bottom = dunes.backSandY + 56 * u;
    const height = Math.max(48, bottom - top);
    this.oceanTop = top;
    this.oceanBandHeight = height;

    this.waterQuad.clear();
    this.waterQuad.rect(-PARALLAX_OVERSCAN, top, w + PARALLAX_OVERSCAN * 2, height);
    this.waterQuad.fill({ color: 0x58c4f6 });

    if (!this.tideController) {
      this.fallbackFoam.clear();
      this.fallbackFoam.rect(-PARALLAX_OVERSCAN, top + height * 0.7, w + PARALLAX_OVERSCAN * 2, 4);
      this.fallbackFoam.fill({ color: 0xffffff, alpha: 0.82 });
    }
  }

  update(_dt: number, clock: AtmosphereClock): void {
    const w = this.oceanWidth;
    const spanW = w + 120;
    const u = Math.max(0.65, this.unitScale);
    const bandH = this.oceanBandHeight * 0.62;

    if (this.tideController) {
      const midWind = clock.windAt(w * 0.5);
      this.tideController.setUniforms(clock.time, midWind, clock.tidePhase(), 0.72);
    }

    // Crisp staggered horizontal white sunlight shimmer bars matching preview canvas style
    const sg = this.shimmerGraphics;
    sg.clear();
    const rowStep = bandH / 6.2;
    for (let i = 0; i < 6; i++) {
      const sy = this.oceanTop + 8 * u + i * rowStep;
      const sx = -PARALLAX_OVERSCAN + ((i * 137 + clock.time * (18 + i * 4.5)) % spanW) - 30;
      const len = (36 + (i % 3) * 20) * u;
      sg.moveTo(sx, sy);
      sg.lineTo(sx + len, sy);
    }
    sg.stroke({ color: 0xffffff, alpha: 0.58, width: Math.max(2, 2.5 * u), cap: 'round' });
  }
}
