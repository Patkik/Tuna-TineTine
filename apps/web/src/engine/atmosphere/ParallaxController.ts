/**
 * ParallaxController.ts — Smoothed DeviceOrientation + desktop pointer diorama parallax.
 * Applies staggered depth multipliers: 0.3x (sky), 0.7x (ocean), 1.4x (sand & props).
 */

export const PARALLAX_DEPTHS = {
  sky: 0.3,
  ocean: 0.7,
  sand: 1.4,
} as const;

export class ParallaxController {
  public targetX = 0;
  public targetY = 0;
  public x = 0;
  public y = 0;
  public maxShiftPx = 12;

  private hasGyro = false;
  private readonly orientHandler: (e: DeviceOrientationEvent) => void;
  private readonly pointerHandler: (e: PointerEvent) => void;

  constructor(bindListeners = true) {
    this.orientHandler = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      this.hasGyro = true;
      this.targetX = Math.max(-1, Math.min(1, e.gamma / 30));
      this.targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    };

    this.pointerHandler = (e: PointerEvent) => {
      if (this.hasGyro) return;
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      this.targetX = Math.max(-1, Math.min(1, (e.clientX / w - 0.5) * 0.7));
      this.targetY = Math.max(-1, Math.min(1, (e.clientY / h - 0.5) * 0.5));
    };

    if (bindListeners && typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', this.orientHandler, { passive: true });
      window.addEventListener('pointermove', this.pointerHandler, { passive: true });
    }
  }

  update(dt: number): { x: number; y: number } {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    const k = 1 - Math.exp(-safeDt * 7.5);
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
    return { x: this.x, y: this.y };
  }

  writeOffsetFor(depthMultiplier: number, out: { x: number; y: number }): void {
    out.x = this.x * this.maxShiftPx * depthMultiplier;
    out.y = this.y * this.maxShiftPx * 0.45 * depthMultiplier;
  }

  offsetFor(depthMultiplier: number): { x: number; y: number } {
    return {
      x: this.x * this.maxShiftPx * depthMultiplier,
      y: this.y * this.maxShiftPx * 0.45 * depthMultiplier,
    };
  }

  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('deviceorientation', this.orientHandler);
      window.removeEventListener('pointermove', this.pointerHandler);
    }
  }
}
