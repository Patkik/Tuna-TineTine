/**
 * BeachStage.ts — Single WebGPU/WebGL2 PixiJS v8 engine, DPR cap <= 2, synchronized GSAP ticker,
 * Unified AtmosphereClock & zero-GC ParallaxController (0.3x sky, 0.7x ocean, 1.4x sand),
 * CameraRig zoom/pan/focus-blur bypass, actor & scope layers, visibility pause, and keepsake capture.
 */
import { Application, BlurFilter, Container, type Filter } from 'pixi.js';
import gsap from 'gsap';
import { createSunsetTintFilter, type SunsetTintController } from './shaders/sunsetTint';
import { AtmosphereClock } from './atmosphere/AtmosphereClock';
import { PARALLAX_DEPTHS, ParallaxController } from './atmosphere/ParallaxController';
import { computeFixedStageSize } from './layout/sceneLayout';
import type { SkyLayer } from './layers/SkyLayer';
import type { OceanLayer } from './layers/OceanLayer';
import type { SandLayer } from './layers/SandLayer';
import type { AtmosphereEffectsLayer } from './layers/AtmosphereEffectsLayer';
import type { TimeOfDay } from '../store/storyFsm';

export function clampDevicePixelRatio(dpr: number): number {
  if (!Number.isFinite(dpr) || dpr <= 1) return 1;
  return Math.min(dpr, 2);
}

export class BeachStage {
  public app!: Application;
  public stage!: Container;
  public worldLayer!: Container;
  public actorLayer!: Container;
  public scopeLayer!: Container;
  public sunsetController: SunsetTintController | null = null;
  public readonly atmosphere = new AtmosphereClock();
  public readonly parallax = new ParallaxController();

  private canvas: HTMLCanvasElement;
  private hostElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onResizeCallback: ((w: number, h: number) => void) | null = null;
  private orientationHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;
  private tickerBound = false;

  private skyLayer: SkyLayer | null = null;
  private oceanLayer: OceanLayer | null = null;
  private sandLayer: SandLayer | null = null;
  private effectsLayer: AtmosphereEffectsLayer | null = null;

  private baseTimeOfDayProgress = 0;
  private ambientBreathEnabled = false;
  private isTransitioningTime = false;
  private timeTween: gsap.core.Tween | null = null;

  private dofBlurFilter: BlurFilter | null = null;
  private worldBlurStrength = 0;
  private blurTween: gsap.core.Tween | null = null;
  private activeFilterMask = 0;
  private readonly filterScratch: Filter[] = [];

  private readonly camState = {
    zoom: 1,
    focusX: 0.5,
    focusY: 0.5,
    offsetX: 0,
    offsetY: 0,
  };
  private camTween: gsap.core.Tween | null = null;

  private readonly skyOff = { x: 0, y: 0 };
  private readonly oceanOff = { x: 0, y: 0 };
  private readonly sandOff = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.hostElement = canvas.parentElement;
  }

  getStageSize(): { width: number; height: number } {
    return this.measureStageSize();
  }

  private measureStageSize(): { width: number; height: number } {
    if (
      this.hostElement &&
      this.hostElement.clientWidth >= 16 &&
      this.hostElement.clientHeight >= 16
    ) {
      return {
        width: this.hostElement.clientWidth,
        height: this.hostElement.clientHeight,
      };
    }
    const rect = this.hostElement?.getBoundingClientRect();
    if (rect && rect.width >= 16 && rect.height >= 16) {
      return { width: Math.round(rect.width), height: Math.round(rect.height) };
    }
    const fixed = computeFixedStageSize(window.innerWidth, window.innerHeight);
    return { width: fixed.width, height: fixed.height };
  }

  async init(onResize?: (w: number, h: number) => void): Promise<void> {
    this.onResizeCallback = onResize ?? null;
    this.hostElement = this.canvas.parentElement;
    const dpr = clampDevicePixelRatio(window.devicePixelRatio || 1);
    const { width: w, height: h } = this.measureStageSize();
    this.atmosphere.setViewport(w, h);

    this.app = new Application();
    await this.app.init({
      canvas: this.canvas,
      width: w,
      height: h,
      resolution: dpr,
      autoDensity: true,
      backgroundColor: 0x0ea5e9,
      preference: 'webgl',
      powerPreference: 'high-performance',
      antialias: true,
    });

    this.stage = this.app.stage;
    this.worldLayer = new Container();
    this.actorLayer = new Container();
    this.scopeLayer = new Container();
    this.stage.addChild(this.worldLayer);
    this.stage.addChild(this.actorLayer);
    this.stage.addChild(this.scopeLayer);

    try {
      this.sunsetController = createSunsetTintFilter();
    } catch {
      this.sunsetController = null;
    }

    try {
      this.dofBlurFilter = new BlurFilter({
        strength: 0,
        quality: 2,
        resolution: 0.5,
      });
    } catch {
      this.dofBlurFilter = null;
    }

    this.syncWorldFilters();
    this.applyCameraTransform();
    this.syncTickerLoop();
    this.setupResize();
    this.setupVisibilityPause();
  }

  registerParallaxLayers(
    sky: SkyLayer,
    ocean: OceanLayer,
    sand: SandLayer,
    effects: AtmosphereEffectsLayer,
  ): void {
    this.skyLayer = sky;
    this.oceanLayer = ocean;
    this.sandLayer = sand;
    this.effectsLayer = effects;
  }

  setAmbientBreathEnabled(enabled: boolean): void {
    this.ambientBreathEnabled = enabled;
  }

  /**
   * Bypasses fullscreen filter render-targets whenever sunsetProgress <= 0.001 and blur <= 0.05.
   */
  private syncWorldFilters(): void {
    if (!this.worldLayer) return;
    const sunsetActive = Boolean(
      this.sunsetController && this.sunsetController.getProgress() > 0.001,
    );
    const blurActive = Boolean(this.dofBlurFilter && this.worldBlurStrength > 0.05);
    const mask = (sunsetActive ? 1 : 0) | (blurActive ? 2 : 0);

    if (blurActive && this.dofBlurFilter) {
      this.dofBlurFilter.strength = this.worldBlurStrength;
    }

    if (mask === this.activeFilterMask) return;
    this.activeFilterMask = mask;

    this.filterScratch.length = 0;
    if (blurActive && this.dofBlurFilter) {
      this.filterScratch.push(this.dofBlurFilter);
    }
    if (sunsetActive && this.sunsetController) {
      this.filterScratch.push(this.sunsetController.filter);
    }

    this.worldLayer.filters = this.filterScratch.length > 0 ? this.filterScratch : null;
  }

  setWorldBlurImmediate(px: number): void {
    this.blurTween?.kill();
    this.worldBlurStrength = Math.max(0, px);
    this.syncWorldFilters();
  }

  setWorldBlur(px: number, durationSec = 0.35): void {
    this.blurTween?.kill();
    const target = Math.max(0, px);
    if (durationSec <= 0) {
      this.worldBlurStrength = target;
      this.syncWorldFilters();
      return;
    }
    const proxy = { v: this.worldBlurStrength };
    this.blurTween = gsap.to(proxy, {
      v: target,
      duration: durationSec,
      ease: 'power2.out',
      onUpdate: () => {
        this.worldBlurStrength = proxy.v;
        this.syncWorldFilters();
      },
      onComplete: () => {
        this.worldBlurStrength = target;
        this.syncWorldFilters();
      },
    });
  }

  private applyCameraTransform(): void {
    if (!this.worldLayer) return;
    const w = this.atmosphere.screenWidth;
    const h = this.atmosphere.screenHeight;
    const px = w * this.camState.focusX;
    const py = h * this.camState.focusY;
    this.worldLayer.pivot.set(px, py);
    this.worldLayer.position.set(px + this.camState.offsetX, py + this.camState.offsetY);
    this.worldLayer.scale.set(this.camState.zoom);
  }

  setCamera(
    zoom: number,
    focusNormX = 0.5,
    focusNormY = 0.5,
    durationSec = 0.65,
    ease = 'power2.inOut',
  ): void {
    this.camTween?.kill();
    const tz = Math.max(1, zoom);
    const tfx = Math.max(0.05, Math.min(0.95, focusNormX));
    const tfy = Math.max(0.05, Math.min(0.95, focusNormY));

    if (durationSec <= 0) {
      this.camState.zoom = tz;
      this.camState.focusX = tfx;
      this.camState.focusY = tfy;
      this.applyCameraTransform();
      return;
    }

    this.camTween = gsap.to(this.camState, {
      zoom: tz,
      focusX: tfx,
      focusY: tfy,
      duration: durationSec,
      ease,
      onUpdate: () => this.applyCameraTransform(),
    });
  }

  setCameraOffset(dx: number, dy: number): void {
    this.camState.offsetX = dx;
    this.camState.offsetY = dy;
    this.applyCameraTransform();
  }

  resetCamera(durationSec = 0.55): void {
    this.camState.offsetX = 0;
    this.camState.offsetY = 0;
    this.setCamera(1, 0.5, 0.5, durationSec, 'power2.out');
  }

  private syncTickerLoop(): void {
    this.tickerBound = true;
    gsap.ticker.remove(gsap.updateRoot);

    this.app.ticker.add((ticker) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.05);

      this.atmosphere.update(dt);
      this.parallax.update(dt);

      this.parallax.writeOffsetFor(PARALLAX_DEPTHS.sky, this.skyOff);
      this.parallax.writeOffsetFor(PARALLAX_DEPTHS.ocean, this.oceanOff);
      this.parallax.writeOffsetFor(PARALLAX_DEPTHS.sand, this.sandOff);

      if (this.skyLayer) {
        this.skyLayer.x = this.skyOff.x;
        this.skyLayer.y = this.skyOff.y * 0.5;
        this.skyLayer.update(dt, this.atmosphere);
      }
      if (this.oceanLayer) {
        this.oceanLayer.x = this.oceanOff.x;
        this.oceanLayer.y = this.oceanOff.y * 0.4;
        this.oceanLayer.update(dt, this.atmosphere);
      }
      if (this.sandLayer) {
        this.sandLayer.x = this.sandOff.x;
        this.sandLayer.y = this.sandOff.y * 0.45;
        this.sandLayer.update(dt, this.atmosphere);
      }
      if (this.effectsLayer) {
        this.effectsLayer.x = this.sandOff.x;
        this.effectsLayer.y = this.sandOff.y * 0.45;
        this.effectsLayer.update(dt, this.atmosphere);
      }

      if (this.sunsetController && !this.isTransitioningTime && this.ambientBreathEnabled) {
        const nextProg =
          this.baseTimeOfDayProgress + Math.max(0, this.atmosphere.ambientLightBreath() * 0.55);
        this.sunsetController.setProgress(nextProg);
        this.syncWorldFilters();
      }

      gsap.updateRoot(ticker.lastTime / 1000);
    });
  }

  private syncToContainerSize(): void {
    if (!this.app?.renderer) return;
    const { width: w, height: h } = this.measureStageSize();
    if (w <= 0 || h <= 0) return;

    const dpr = clampDevicePixelRatio(window.devicePixelRatio || 1);
    this.atmosphere.setViewport(w, h);
    this.app.renderer.resize(w, h, dpr);
    this.applyCameraTransform();
    this.onResizeCallback?.(w, h);
    this.app.render();
  }

  private setupResize(): void {
    const observeTarget = this.hostElement ?? document.documentElement;
    this.resizeObserver = new ResizeObserver(() => {
      this.syncToContainerSize();
    });
    this.resizeObserver.observe(observeTarget);

    this.orientationHandler = () => {
      requestAnimationFrame(() => this.syncToContainerSize());
    };
    window.addEventListener('orientationchange', this.orientationHandler);
  }

  private setupVisibilityPause(): void {
    this.visibilityHandler = () => {
      if (!this.app?.ticker) return;
      if (document.hidden) {
        this.app.ticker.stop();
      } else {
        this.app.ticker.start();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  transitionTimeOfDay(target: TimeOfDay, durationSec = 2.0): void {
    const targetVal = target === 'day' ? 0 : target === 'sunset' ? 0.5 : 1.0;
    this.baseTimeOfDayProgress = targetVal;
    this.timeTween?.kill();

    if (!this.sunsetController) {
      this.atmosphere.setTimeOfDayProgress(targetVal);
      return;
    }

    this.isTransitioningTime = true;
    const proxy = { p: this.sunsetController.getProgress() };
    this.timeTween = gsap.to(proxy, {
      p: targetVal,
      duration: durationSec,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.sunsetController?.setProgress(proxy.p);
        this.atmosphere.setTimeOfDayProgress(proxy.p);
        this.syncWorldFilters();
      },
      onComplete: () => {
        this.isTransitioningTime = false;
        this.sunsetController?.setProgress(targetVal);
        this.atmosphere.setTimeOfDayProgress(targetVal);
        this.syncWorldFilters();
      },
    });
  }

  captureStageCanvas(): HTMLCanvasElement {
    return this.app.renderer.extract.canvas(this.stage) as HTMLCanvasElement;
  }

  destroy(): void {
    this.timeTween?.kill();
    this.blurTween?.kill();
    this.camTween?.kill();
    this.parallax.destroy();
    this.skyLayer?.destroyLayer();
    this.sandLayer?.destroyLayer();
    this.effectsLayer?.destroyLayer();
    this.resizeObserver?.disconnect();
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (this.tickerBound) {
      gsap.ticker.add(gsap.updateRoot);
    }
    this.app?.destroy(false, { children: true });
  }
}
