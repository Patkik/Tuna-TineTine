/**
 * svgTextureFactory.ts — Packed 2x GPU atlas loader + cached procedural textures.
 * Stage 1 & Stage 2 SVGs pack onto one shared offscreen canvas per stage with 4px padding
 * so PixiJS batches scene sprites in minimal draw calls without texture bleeding.
 */
import { ImageSource, Texture } from 'pixi.js';
import { packSvgAtlas } from './SpriteAtlasPacker';
import { STAGE1_SVGS, type Stage1AssetKey } from './stage1Svgs';
import type { Stage2AssetKey } from './stage2Svgs';

export type Stage1Textures = Record<Stage1AssetKey, Texture>;
export type Stage2Textures = Record<Stage2AssetKey, Texture>;

const proceduralCache = new Map<string, Texture>();
let stage1Promise: Promise<Stage1Textures> | null = null;
let stage2Promise: Promise<Stage2Textures> | null = null;

export async function preloadStage1Textures(): Promise<Stage1Textures> {
  if (!stage1Promise) {
    stage1Promise = packSvgAtlas(STAGE1_SVGS, {
      scale: 2,
      padding: 4,
      label: 'atlas_stage1',
    }).then((res) => res.textures);
  }
  return stage1Promise;
}

export async function preloadStage2Textures(): Promise<Stage2Textures> {
  if (!stage2Promise) {
    stage2Promise = import('./stage2Svgs').then(({ STAGE2_SVGS }) =>
      packSvgAtlas(STAGE2_SVGS, {
        scale: 2,
        padding: 4,
        label: 'atlas_stage2',
        yieldEvery: 4,
      }).then((res) => res.textures),
    );
  }
  return stage2Promise;
}

/**
 * Generates a crisp tapered pure-white stroke texture for pooled MeshRope wind ribbons & contrails.
 */
export function createRibbonTexture(): Texture {
  const key = 'proc:ribbon';
  const cached = proceduralCache.get(key);
  if (cached && !cached.destroyed) return cached;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.16, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.84, 'rgba(255,255,255,0.95)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 1.5, 64, 5, 2.5);
  ctx.fill();

  const tex = new Texture({
    source: new ImageSource({
      resource: canvas,
      alphaMode: 'premultiply-alpha-on-upload',
      label: key,
    }),
    label: key,
  });
  proceduralCache.set(key, tex);
  return tex;
}

/**
 * Generates a soft warm 16x16 radial mote sprite for capped ParticleContainer dust/sparkles/fireflies.
 */
export function createMoteTexture(): Texture {
  const key = 'proc:mote';
  const cached = proceduralCache.get(key);
  if (cached && !cached.destroyed) return cached;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  const grad = ctx.createRadialGradient(8, 8, 0.5, 8, 8, 8);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 16);

  const tex = new Texture({
    source: new ImageSource({
      resource: canvas,
      alphaMode: 'premultiply-alpha-on-upload',
      label: key,
    }),
    label: key,
  });
  proceduralCache.set(key, tex);
  return tex;
}

/**
 * Generates a flat 2D cel-shaded 3-lobed white cloud tuft texture with pale sky-blue shading.
 */
export function createCloudTuftTexture(): Texture {
  const key = 'proc:cloud-tuft';
  const cached = proceduralCache.get(key);
  if (cached && !cached.destroyed) return cached;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  ctx.clearRect(0, 0, 48, 36);

  const traceCloudPath = () => {
    ctx.beginPath();
    ctx.arc(14, 21, 9.5, Math.PI * 0.55, Math.PI * 1.55);
    ctx.arc(24, 15, 11.5, Math.PI * 1.05, Math.PI * 1.98);
    ctx.arc(34, 20.5, 9, Math.PI * 1.45, Math.PI * 0.45);
    ctx.lineTo(14, 30.5);
    ctx.closePath();
  };

  traceCloudPath();
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  ctx.save();
  traceCloudPath();
  ctx.clip();
  ctx.fillStyle = '#CBEBFA';
  ctx.beginPath();
  ctx.ellipse(24, 30.5, 19, 6.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  traceCloudPath();
  ctx.strokeStyle = '#B8E3F6';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();

  const tex = new Texture({
    source: new ImageSource({
      resource: canvas,
      resolution: 2,
      alphaMode: 'premultiply-alpha-on-upload',
      label: key,
    }),
    label: key,
  });
  proceduralCache.set(key, tex);
  return tex;
}

/**
 * Generates a translucent cream-white scalloped exhaust puff texture for the propeller plane.
 */
export function createExhaustPuffTexture(): Texture {
  const key = 'proc:exhaust-puff';
  const cached = proceduralCache.get(key);
  if (cached && !cached.destroyed) return cached;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 36;
  canvas.height = 28;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  ctx.clearRect(0, 0, 36, 28);
  ctx.fillStyle = 'rgba(255, 253, 246, 0.92)';
  ctx.beginPath();
  ctx.arc(11, 16.5, 7, 0, Math.PI * 2);
  ctx.arc(18, 12.5, 8.8, 0, Math.PI * 2);
  ctx.arc(25.5, 16, 6.8, 0, Math.PI * 2);
  ctx.arc(18, 18.5, 7.2, 0, Math.PI * 2);
  ctx.fill();

  const tex = new Texture({
    source: new ImageSource({
      resource: canvas,
      resolution: 2,
      alphaMode: 'premultiply-alpha-on-upload',
      label: key,
    }),
    label: key,
  });
  proceduralCache.set(key, tex);
  return tex;
}

/**
 * Generates a crisp concentric seafoam oval ring texture for pooled bottle shoreline waves.
 */
export function createFoamRingTexture(): Texture {
  const key = 'proc:foam-ring';
  const cached = proceduralCache.get(key);
  if (cached && !cached.destroyed) return cached;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 44;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  ctx.clearRect(0, 0, 96, 44);
  ctx.strokeStyle = 'rgba(255, 253, 247, 0.92)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(48, 22, 42, 16, 0, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new Texture({
    source: new ImageSource({
      resource: canvas,
      resolution: 2,
      alphaMode: 'premultiply-alpha-on-upload',
      label: key,
    }),
    label: key,
  });
  proceduralCache.set(key, tex);
  return tex;
}

/**
 * Generates a soft radial white condensation / glow sprite (used for lens breath fog & cake glow).
 */
export function createSoftGlowTexture(): Texture {
  const key = 'proc:soft-glow';
  const cached = proceduralCache.get(key);
  if (cached && !cached.destroyed) return cached;
  if (typeof document === 'undefined') return Texture.WHITE;

  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  const grad = ctx.createRadialGradient(48, 48, 4, 48, 48, 46);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.45)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 96, 96);

  const tex = new Texture({
    source: new ImageSource({
      resource: canvas,
      resolution: 2,
      alphaMode: 'premultiply-alpha-on-upload',
      label: key,
    }),
    label: key,
  });
  proceduralCache.set(key, tex);
  return tex;
}
