/**
 * BeachStage.ts — PixiJS v8 Application, single WebGL2 context, DPR clamping
 */
import { Application, Container } from 'pixi.js';
import gsap from 'gsap';

export function clampDevicePixelRatio(dpr: number): number {
  return Math.min(dpr, 2);
}

export class BeachStage {
  public app!: Application;
  public stage!: Container;
  private canvas: HTMLCanvasElement;
  private resizeObserver!: ResizeObserver;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async init(): Promise<void> {
    const dpr = clampDevicePixelRatio(window.devicePixelRatio || 1);

    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: dpr,
      autoDensity: true,
      backgroundAlpha: 0,
      preference: 'webgl',
      powerPreference: 'high-performance',
      antialias: false, // Off for perf on Android
    });

    this.stage = this.app.stage;
    this.syncGsapTicker();
    this.setupResize();
  }

  /**
   * Synchronize GSAP to Pixi ticker — eliminates double RAF and 90/120Hz jank.
   */
  private syncGsapTicker(): void {
    gsap.ticker.remove(gsap.updateRoot);
    this.app.ticker.add((ticker) => {
      gsap.updateRoot(ticker.lastTime / 1000);
    });
  }

  private setupResize(): void {
    this.resizeObserver = new ResizeObserver(() => {
      const dpr = clampDevicePixelRatio(window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.app.renderer.resize(w, h, dpr);
    });
    this.resizeObserver.observe(document.documentElement);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    gsap.ticker.add(gsap.updateRoot); // Restore GSAP ticker
    this.app?.destroy(false, { children: true });
  }
}
