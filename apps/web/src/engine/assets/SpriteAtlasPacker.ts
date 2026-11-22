/**
 * SpriteAtlasPacker.ts — Packs SVG asset dictionaries into a single 2x offscreen GPU canvas
 * atlas with >=4px padding between frames so PixiJS v8 batches sprites in 1-3 draw calls
 * without texture bleeding.
 */
import { ImageSource, Rectangle, Texture } from 'pixi.js';
import { yieldToMain } from '../../core/yieldToMain';

export interface AtlasSpecItem {
  width: number;
  height: number;
  svg: string;
}

export interface PackedAtlasRect {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PackedAtlasLayout {
  width: number;
  height: number;
  rects: PackedAtlasRect[];
}

export const DEFAULT_ATLAS_PADDING = 4;

export function svgToBase64Uri(svg: string): string {
  const bytes = new TextEncoder().encode(svg.trim());
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/**
 * Deterministic shelf-packing algorithm reserving `padding` px on all sides of every sprite.
 */
export function packAtlasRects(
  items: Record<string, Pick<AtlasSpecItem, 'width' | 'height'>>,
  padding = DEFAULT_ATLAS_PADDING,
  maxWidth = 2048,
): PackedAtlasLayout {
  const pad = Math.max(0, padding);
  const sorted = Object.entries(items)
    .map(([key, spec]) => ({
      key,
      width: Math.max(1, Math.ceil(spec.width)),
      height: Math.max(1, Math.ceil(spec.height)),
    }))
    .sort((a, b) => b.height - a.height || b.width - a.width || a.key.localeCompare(b.key));

  const rects: PackedAtlasRect[] = [];
  let cursorX = pad;
  let cursorY = pad;
  let rowHeight = 0;
  let usedWidth = pad * 2;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    if (cursorX > pad && cursorX + item.width + pad > maxWidth) {
      cursorX = pad;
      cursorY += rowHeight + pad;
      rowHeight = 0;
    }

    rects.push({
      key: item.key,
      x: cursorX,
      y: cursorY,
      width: item.width,
      height: item.height,
    });

    cursorX += item.width + pad;
    rowHeight = Math.max(rowHeight, item.height);
    usedWidth = Math.max(usedWidth, cursorX);
  }

  return {
    width: Math.max(1, usedWidth),
    height: Math.max(1, cursorY + rowHeight + pad),
    rects,
  };
}

async function decodeSvgElement(svg: string, width: number, height: number, scale: number): Promise<HTMLImageElement> {
  const img = new Image();
  img.width = width * scale;
  img.height = height * scale;

  let objectUrl: string | null = null;
  if (typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([svg.trim()], { type: 'image/svg+xml;charset=utf-8' });
    objectUrl = URL.createObjectURL(blob);
    img.src = objectUrl;
  } else {
    img.src = svgToBase64Uri(svg);
  }

  try {
    if (typeof img.decode === 'function') {
      await img.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG decode failed'));
      });
    }
    return img;
  } finally {
    if (objectUrl && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function packSvgAtlas<K extends string>(
  specs: Record<K, AtlasSpecItem>,
  options?: {
    scale?: number;
    padding?: number;
    label?: string;
    yieldEvery?: number;
  },
): Promise<{
  textures: Record<K, Texture>;
  atlasSource: ImageSource | null;
}> {
  const keys = Object.keys(specs) as K[];
  const fallbackTextures = (): Record<K, Texture> => {
    const map = {} as Record<K, Texture>;
    for (let i = 0; i < keys.length; i++) {
      map[keys[i]] = Texture.WHITE;
    }
    return map;
  };

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return { textures: fallbackTextures(), atlasSource: null };
  }

  const scale = options?.scale ?? 2;
  const padding = options?.padding ?? DEFAULT_ATLAS_PADDING;
  const layout = packAtlasRects(specs, padding, 2048);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(layout.width * scale));
  canvas.height = Math.max(1, Math.round(layout.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { textures: fallbackTextures(), atlasSource: null };
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const yieldEvery = options?.yieldEvery ?? 0;
  for (let i = 0; i < layout.rects.length; i++) {
    const rect = layout.rects[i];
    const spec = specs[rect.key as K];
    try {
      const img = await decodeSvgElement(spec.svg, rect.width, rect.height, scale);
      ctx.drawImage(
        img,
        rect.x * scale,
        rect.y * scale,
        rect.width * scale,
        rect.height * scale,
      );
    } catch {
      // Leave slot transparent if an individual SVG fails in headless mocks
    }

    if (yieldEvery > 0 && (i + 1) % yieldEvery === 0) {
      await yieldToMain();
    }
  }

  const atlasSource = new ImageSource({
    resource: canvas,
    resolution: scale,
    alphaMode: 'premultiply-alpha-on-upload',
    label: options?.label ?? 'svg-atlas',
  });

  const result = {} as Record<K, Texture>;
  for (let i = 0; i < layout.rects.length; i++) {
    const rect = layout.rects[i];
    result[rect.key as K] = new Texture({
      source: atlasSource,
      frame: new Rectangle(rect.x, rect.y, rect.width, rect.height),
      label: rect.key,
    });
  }

  return { textures: result, atlasSource };
}
