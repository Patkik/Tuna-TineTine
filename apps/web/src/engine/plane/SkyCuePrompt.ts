/**
 * SkyCuePrompt.ts — Centered "Look at the sky..." storybook prompt with upward-drifting
 * pastel sparkles and tap-to-advance interaction.
 */
import { Container, ImageSource, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';

interface CueSparkle {
  sprite: Sprite;
  offsetX: number;
  baseY: number;
  age: number;
  life: number;
  baseScale: number;
}

type CueVisualState = 'hidden' | 'showing' | 'fading';

function createStorybookSparkleTexture(): Texture {
  if (typeof document === 'undefined') return Texture.WHITE;
  const canvas = document.createElement('canvas');
  canvas.width = 28;
  canvas.height = 28;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Texture.WHITE;

  ctx.clearRect(0, 0, 28, 28);
  ctx.beginPath();
  ctx.moveTo(14, 2);
  ctx.quadraticCurveTo(15.5, 12.5, 26, 14);
  ctx.quadraticCurveTo(15.5, 15.5, 14, 26);
  ctx.quadraticCurveTo(12.5, 15.5, 2, 14);
  ctx.quadraticCurveTo(12.5, 12.5, 14, 2);
  ctx.closePath();

  ctx.fillStyle = '#FFFDF2';
  ctx.fill();
  ctx.strokeStyle = '#4A2C1D';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.stroke();

  return new Texture({
    source: new ImageSource({
      resource: canvas,
      resolution: 2,
      alphaMode: 'premultiply-alpha-on-upload',
      label: 'sky-cue-sparkle',
    }),
    label: 'sky-cue-sparkle',
  });
}

export class SkyCuePrompt extends Container {
  private readonly promptText: Text;
  private readonly sparkleTexture: Texture;
  private readonly sparkles: CueSparkle[] = [];

  private state: CueVisualState = 'hidden';
  private timer = 0;
  private anchorX = 195;
  private anchorY = 180;
  private fadeDuration = 0.45;
  private fadeDriftY = 0;
  private fadeDriftX = 0;
  private currentFontSize = 27;
  private currentStrokeWidth = 6.5;
  private scaleFactor = 1;

  constructor(onTap?: () => void) {
    super();

    this.promptText = new Text({
      text: 'Look at the sky...',
      style: new TextStyle({
        fontFamily: 'Fredoka, M PLUS Rounded 1c, sans-serif',
        fontSize: this.currentFontSize,
        fontWeight: '700',
        fill: '#FFFDF2',
        stroke: { color: '#4A2C1D', width: this.currentStrokeWidth, join: 'round' },
        dropShadow: {
          color: 'rgba(74, 44, 29, 0.22)',
          blur: 2,
          distance: 3,
          angle: Math.PI / 2,
        },
        align: 'center',
      }),
    });
    this.promptText.anchor.set(0.5, 0.5);
    this.addChild(this.promptText);

    this.sparkleTexture = createStorybookSparkleTexture();
    const offsets = [
      { x: -108, y: -14, delay: 0.0, tint: 0xfacc15 },
      { x: -56, y: 18, delay: 0.35, tint: 0xfffdf2 },
      { x: -6, y: -26, delay: 0.7, tint: 0xfacc15 },
      { x: 52, y: 16, delay: 0.2, tint: 0xfffdf2 },
      { x: 102, y: -12, delay: 0.55, tint: 0xfacc15 },
      { x: 16, y: 22, delay: 0.9, tint: 0xf9a8d4 },
    ];

    for (let i = 0; i < offsets.length; i++) {
      const sp = new Sprite(this.sparkleTexture);
      sp.anchor.set(0.5, 0.5);
      sp.tint = offsets[i].tint;
      this.addChild(sp);

      this.sparkles.push({
        sprite: sp,
        offsetX: offsets[i].x,
        baseY: offsets[i].y,
        age: offsets[i].delay,
        life: 1.25 + (i % 3) * 0.25,
        baseScale: 0.72 + (i % 2) * 0.22,
      });
    }

    this.visible = false;
    this.alpha = 0;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', (e) => {
      e.stopPropagation();
      onTap?.();
    });

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!this.destroyed) {
          this.promptText.style = new TextStyle({
            fontFamily: 'Fredoka, M PLUS Rounded 1c, sans-serif',
            fontSize: this.currentFontSize,
            fontWeight: '700',
            fill: '#FFFDF2',
            stroke: { color: '#4A2C1D', width: this.currentStrokeWidth, join: 'round' },
            dropShadow: {
              color: 'rgba(74, 44, 29, 0.22)',
              blur: 2,
              distance: 3,
              angle: Math.PI / 2,
            },
            align: 'center',
          });
        }
      });
    }
  }

  applyLayout(width: number, height: number, isPortrait: boolean, unitScale: number): void {
    const scaleFactor = Math.min(1.15, Math.max(0.42, unitScale));
    this.scaleFactor = scaleFactor;
    this.anchorX = width * 0.5;
    this.anchorY = Math.max(26, height * (isPortrait ? 0.22 : 0.24));
    this.currentFontSize = Math.max(15, Math.round((isPortrait ? 27 : 34) * scaleFactor));
    this.currentStrokeWidth = Math.max(3.2, 6.5 * scaleFactor);
    this.promptText.style = new TextStyle({
      fontFamily: 'Fredoka, M PLUS Rounded 1c, sans-serif',
      fontSize: this.currentFontSize,
      fontWeight: '700',
      fill: '#FFFDF2',
      stroke: { color: '#4A2C1D', width: this.currentStrokeWidth, join: 'round' },
      dropShadow: {
        color: 'rgba(74, 44, 29, 0.22)',
        blur: 2 * scaleFactor,
        distance: 3 * scaleFactor,
        angle: Math.PI / 2,
      },
      align: 'center',
    });

    const spread = isPortrait ? Math.min(1, width / 390) : Math.min(1.25, scaleFactor * 1.15);
    const sparkleXs = [-108, -56, -6, 52, 102, 16];
    const sparkleBaseYs = [-14, 18, -26, 16, -12, 22];
    for (let i = 0; i < this.sparkles.length; i++) {
      this.sparkles[i].offsetX = sparkleXs[i] * spread;
      this.sparkles[i].baseY = sparkleBaseYs[i] * scaleFactor;
      this.sparkles[i].baseScale = (0.72 + (i % 2) * 0.22) * scaleFactor;
    }

    if (this.state !== 'hidden') {
      this.position.set(this.anchorX + this.fadeDriftX, this.anchorY + this.fadeDriftY);
    }
  }

  show(): void {
    this.state = 'showing';
    this.timer = 0;
    this.fadeDriftX = 0;
    this.fadeDriftY = 0;
    this.alpha = 0;
    this.scale.set(0.94);
    this.position.set(this.anchorX, this.anchorY);
    this.visible = true;
  }

  beginFadeOut(durationSec = 0.45): void {
    if (this.state === 'hidden' || this.state === 'fading') return;
    this.state = 'fading';
    this.timer = 0;
    this.fadeDuration = Math.max(0.15, durationSec);
  }

  hide(): void {
    this.state = 'hidden';
    this.visible = false;
    this.alpha = 0;
    this.fadeDriftX = 0;
    this.fadeDriftY = 0;
  }

  update(dt: number, clock: AtmosphereClock): void {
    if (this.state === 'hidden') return;
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    this.timer += safeDt;

    if (this.state === 'showing') {
      const fadeIn = Math.min(1, this.timer / 0.28);
      this.alpha = fadeIn;
      const pop = 0.94 + Math.sin(fadeIn * Math.PI * 0.5) * 0.06;
      this.scale.set(pop);
      const floatY = Math.sin(clock.time * 2.4) * 3.5;
      this.position.set(this.anchorX, this.anchorY + floatY);
    } else if (this.state === 'fading') {
      const progress = Math.min(1, this.timer / this.fadeDuration);
      const localWind = clock.windAt(this.anchorX);
      this.fadeDriftY -= 44 * this.scaleFactor * safeDt;
      this.fadeDriftX += (18 + localWind * 24) * this.scaleFactor * safeDt;
      this.alpha = Math.max(0, 1 - progress);
      this.position.set(this.anchorX + this.fadeDriftX, this.anchorY + this.fadeDriftY);
      if (progress >= 1) {
        this.hide();
        return;
      }
    }

    // Subtle upward-drifting storybook sparkles around the cue
    for (let i = 0; i < this.sparkles.length; i++) {
      const s = this.sparkles[i];
      s.age += safeDt;
      if (s.age >= s.life) {
        s.age = 0;
      }
      const u = s.age / s.life;
      s.sprite.x = s.offsetX + (Math.sin(clock.time * 2 + i) * 5 + u * 8) * this.scaleFactor;
      s.sprite.y = s.baseY - u * 28 * this.scaleFactor;
      s.sprite.alpha = Math.sin(u * Math.PI) * 0.95;
      s.sprite.scale.set(s.baseScale * (0.65 + Math.sin(u * Math.PI) * 0.45));
      s.sprite.rotation = Math.sin(clock.time * 3 + i) * 0.22;
    }
  }

  destroyPrompt(): void {
    if (this.sparkleTexture !== Texture.WHITE && !this.sparkleTexture.destroyed) {
      this.sparkleTexture.destroy(true);
    }
  }
}
