/**
 * CloudHoleMaskController.ts — Canvas2D destination-out cloud masking with soft ~12s healing.
 *
 * Backs a MeshPlane cloud texture with an immutable clean canvas + live masked canvas so
 * the airplane carves a scalloped sky-revealing cutout without extra draw calls or WebGL stencil issues.
 */
import { ImageSource, Texture } from 'pixi.js';

export interface CloudHoleStamp {
  active: boolean;
  localX: number;
  localY: number;
  radius: number;
  age: number;
  healDuration: number;
  seed: number;
}

const MAX_HOLES = 40;
const SILHOUETTE_GRID = 64;
const HEAL_UPLOAD_INTERVAL_SEC = 1 / 25;
const LOBE_COUNT = 6;
const TWO_PI = Math.PI * 2;

export function computeEffectiveHoleRadius(stamp: Readonly<CloudHoleStamp>): number {
  if (!stamp.active || stamp.healDuration <= 0) return 0;
  const u = Math.max(0, Math.min(1, stamp.age / stamp.healDuration));
  if (u >= 1) return 0;
  // Hold full punched cutout briefly (~20% of duration) so the hole reads clearly before billowing closed
  if (u <= 0.2) return stamp.radius;
  const healU = (u - 0.2) / 0.8;
  const smooth = healU * healU * (3 - 2 * healU);
  return stamp.radius * (1 - smooth);
}

export class CloudHoleMaskController {
  public readonly texture: Texture;
  public readonly logicalWidth: number;
  public readonly logicalHeight: number;
  private readonly sourceTexture: Texture;
  private readonly resolution: number;
  private readonly defaultHealDurationSec: number;

  private readonly holes: CloudHoleStamp[];
  private readonly cleanCanvas: HTMLCanvasElement | null = null;
  private readonly liveCanvas: HTMLCanvasElement | null = null;
  private readonly liveCtx: CanvasRenderingContext2D | null = null;
  private readonly alphaGrid: Uint8Array | null = null;
  private readonly ownsLiveTexture: boolean = false;

  private dirty = false;
  private uploadCooldown = 0;

  constructor(
    sourceTexture: Texture,
    logicalWidth: number,
    logicalHeight: number,
    resolution = 1.5,
    healDurationSec = 12.0,
  ) {
    this.sourceTexture = sourceTexture;
    this.logicalWidth = Math.max(1, logicalWidth);
    this.logicalHeight = Math.max(1, logicalHeight);
    this.resolution = Math.max(1, resolution);
    this.defaultHealDurationSec = Math.max(1, healDurationSec);

    this.holes = Array.from({ length: MAX_HOLES }, () => ({
      active: false,
      localX: 0,
      localY: 0,
      radius: 0,
      age: 0,
      healDuration: this.defaultHealDurationSec,
      seed: 0,
    }));

    const canDraw = typeof document !== 'undefined' && typeof CanvasRenderingContext2D !== 'undefined';
    const resource = sourceTexture.source?.resource as CanvasImageSource | undefined;

    if (canDraw && resource) {
      const pxW = Math.max(1, Math.round(this.logicalWidth * this.resolution));
      const pxH = Math.max(1, Math.round(this.logicalHeight * this.resolution));

      const clean = document.createElement('canvas');
      clean.width = pxW;
      clean.height = pxH;
      const cleanCtx = clean.getContext('2d');

      const live = document.createElement('canvas');
      live.width = pxW;
      live.height = pxH;
      const liveCtx = live.getContext('2d');

      if (cleanCtx && liveCtx) {
        const res = sourceTexture.source?.resolution || 1;
        const frame = sourceTexture.frame;
        if (frame && frame.width > 0 && frame.height > 0) {
          cleanCtx.drawImage(
            resource,
            frame.x * res,
            frame.y * res,
            frame.width * res,
            frame.height * res,
            0,
            0,
            pxW,
            pxH,
          );
        } else {
          cleanCtx.drawImage(resource, 0, 0, pxW, pxH);
        }
        liveCtx.drawImage(clean, 0, 0);

        this.cleanCanvas = clean;
        this.liveCanvas = live;
        this.liveCtx = liveCtx;
        this.alphaGrid = this.buildSilhouetteGrid(cleanCtx, pxW, pxH);

        this.texture = new Texture({
          source: new ImageSource({
            resource: live,
            resolution: this.resolution,
            alphaMode: 'premultiply-alpha-on-upload',
            label: 'cloud-hole-mask',
          }),
          label: 'cloud-hole-mask',
        });
        this.ownsLiveTexture = true;
        return;
      }
    }

    this.texture = sourceTexture;
  }

  private buildSilhouetteGrid(
    ctx: CanvasRenderingContext2D,
    pxW: number,
    pxH: number,
  ): Uint8Array | null {
    try {
      const data = ctx.getImageData(0, 0, pxW, pxH).data;
      const grid = new Uint8Array(SILHOUETTE_GRID * SILHOUETTE_GRID);
      for (let gy = 0; gy < SILHOUETTE_GRID; gy++) {
        const sy = Math.min(pxH - 1, Math.floor(((gy + 0.5) / SILHOUETTE_GRID) * pxH));
        for (let gx = 0; gx < SILHOUETTE_GRID; gx++) {
          const sx = Math.min(pxW - 1, Math.floor(((gx + 0.5) / SILHOUETTE_GRID) * pxW));
          const alpha = data[(sy * pxW + sx) * 4 + 3];
          grid[gy * SILHOUETTE_GRID + gx] = alpha > 40 ? 1 : 0;
        }
      }
      return grid;
    } catch {
      return null;
    }
  }

  isInsideSilhouette(localX: number, localY: number): boolean {
    if (
      localX < 0 ||
      localX > this.logicalWidth ||
      localY < 0 ||
      localY > this.logicalHeight
    ) {
      return false;
    }

    if (this.alphaGrid) {
      const gx = Math.min(
        SILHOUETTE_GRID - 1,
        Math.max(0, Math.floor((localX / this.logicalWidth) * SILHOUETTE_GRID)),
      );
      const gy = Math.min(
        SILHOUETTE_GRID - 1,
        Math.max(0, Math.floor((localY / this.logicalHeight) * SILHOUETTE_GRID)),
      );
      return this.alphaGrid[gy * SILHOUETTE_GRID + gx] === 1;
    }

    // Elliptical silhouette fallback for headless tests
    const nx = localX / this.logicalWidth - 0.5;
    const ny = localY / this.logicalHeight - 0.58;
    return (nx * nx) / 0.16 + (ny * ny) / 0.17 <= 1;
  }

  punchHole(localX: number, localY: number, radius: number, healDurationSec?: number): boolean {
    if (radius <= 1) return false;
    let target = this.holes.find((h) => !h.active);
    if (!target) {
      target = this.holes.reduce((oldest, cur) => (cur.age > oldest.age ? cur : oldest), this.holes[0]);
    }
    if (!target) return false;

    target.active = true;
    target.localX = localX;
    target.localY = localY;
    target.radius = radius;
    target.age = 0;
    target.healDuration = healDurationSec ?? this.defaultHealDurationSec;
    target.seed = (localX * 0.13 + localY * 0.07) % TWO_PI;

    // Force immediate visual cutout on the frame the plane punches the cloud
    this.dirty = true;
    this.uploadCooldown = 0;
    this.redrawIfNeeded();
    return true;
  }

  update(dt: number): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    if (safeDt === 0) return;

    let anyActive = false;
    let expiredNow = false;
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (!h.active) continue;
      h.age += safeDt;
      if (h.age >= h.healDuration) {
        h.active = false;
        expiredNow = true;
      } else {
        anyActive = true;
      }
    }

    if (!anyActive && !expiredNow && !this.dirty) {
      return;
    }

    this.dirty = true;
    this.uploadCooldown -= safeDt;
    if (expiredNow && !anyActive) {
      // Perform final clean restore immediately and pause uploads until next punch
      this.uploadCooldown = 0;
    }
    if (this.uploadCooldown <= 0) {
      this.uploadCooldown = HEAL_UPLOAD_INTERVAL_SEC;
      this.redrawIfNeeded();
    }
  }

  private traceScallopedCircle(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    seed: number,
  ): void {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TWO_PI);
    const orbitDist = radius * 0.46;
    const lobeRadius = radius * 0.5;
    for (let k = 0; k < LOBE_COUNT; k++) {
      const ang = seed + (k * TWO_PI) / LOBE_COUNT;
      ctx.moveTo(cx + Math.cos(ang) * orbitDist + lobeRadius, cy + Math.sin(ang) * orbitDist);
      ctx.arc(cx + Math.cos(ang) * orbitDist, cy + Math.sin(ang) * orbitDist, lobeRadius, 0, TWO_PI);
    }
  }

  private redrawIfNeeded(): void {
    if (!this.dirty) return;
    this.dirty = false;

    const ctx = this.liveCtx;
    const clean = this.cleanCanvas;
    if (!ctx || !clean || !this.liveCanvas) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.liveCanvas.width, this.liveCanvas.height);
    ctx.drawImage(clean, 0, 0);

    // Subtle pale sky-blue cartoon inner rim around the hole before cutting out
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(182, 228, 249, 0.72)';
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (!h.active) continue;
      const r = computeEffectiveHoleRadius(h) * this.resolution * 1.14;
      if (r <= 1) continue;
      this.traceScallopedCircle(ctx, h.localX * this.resolution, h.localY * this.resolution, r, h.seed);
      ctx.fill();
    }

    // Punch scalloped hole cleanly out of the cloud so cerulean sky shows through
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000000';
    for (let i = 0; i < this.holes.length; i++) {
      const h = this.holes[i];
      if (!h.active) continue;
      const r = computeEffectiveHoleRadius(h) * this.resolution;
      if (r <= 1) continue;
      this.traceScallopedCircle(ctx, h.localX * this.resolution, h.localY * this.resolution, r, h.seed);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    this.texture.source.update();
  }

  getActiveHoleCount(): number {
    let count = 0;
    for (let i = 0; i < this.holes.length; i++) {
      if (this.holes[i].active) count++;
    }
    return count;
  }

  clearAllHoles(): void {
    for (let i = 0; i < this.holes.length; i++) {
      this.holes[i].active = false;
    }
    this.dirty = true;
    this.uploadCooldown = 0;
    this.redrawIfNeeded();
  }

  destroy(): void {
    for (let i = 0; i < this.holes.length; i++) {
      this.holes[i].active = false;
    }
    if (this.ownsLiveTexture && this.texture !== this.sourceTexture && !this.texture.destroyed) {
      this.texture.destroy(true);
    }
  }
}
