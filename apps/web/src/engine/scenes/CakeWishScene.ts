/**
 * CakeWishScene.ts — Beat 9 "Blow the Cake" & Twilight Keepsake centerpiece:
 * - Cel-shaded 3-candle beach birthday cake (cream frosting, pink glaze drip, starfish & seashells)
 * - Zero-GC pre-allocated Sprite pools for wind sparks, wind streaks & curling smoke wisps
 * - Progressive flame wind-bend & flicker + sequential 200ms L->R candle snuff + smoke wisps
 */
import { Container, Graphics, Sprite, Ticker } from 'pixi.js';
import gsap from 'gsap';
import { CAKE_CANDLE_OFFSETS } from '../assets/stage2Svgs';
import {
  createMoteTexture,
  createRibbonTexture,
  createSoftGlowTexture,
  type Stage2Textures,
} from '../assets/svgTextureFactory';
import type { SceneLayout } from '../layout/sceneLayout';
import { triggerExtinguishHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

interface PooledSpark {
  sprite: Sprite;
  active: boolean;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface PooledWindStreak {
  sprite: Sprite;
  active: boolean;
  vx: number;
  age: number;
  life: number;
}

interface PooledSmoke {
  sprite: Sprite;
  active: boolean;
  vx: number;
  vy: number;
  baseScale: number;
  age: number;
  life: number;
  delay: number;
}

const SPARK_POOL_SIZE = 36;
const WIND_POOL_SIZE = 8;
const SMOKE_POOL_SIZE = 12;

export class CakeWishScene extends Container {
  private readonly cakeContainer = new Container();
  private readonly cakeGlow: Sprite;
  private readonly cakeSprite: Sprite;
  private readonly flamesLayer = new Graphics();
  private readonly windLayer = new Container();
  private readonly sparksLayer = new Container();
  private readonly smokeLayer = new Container();

  private readonly sparkPool: PooledSpark[] = [];
  private readonly windPool: PooledWindStreak[] = [];
  private readonly smokePool: PooledSmoke[] = [];

  private windStrength = 0;
  private extinguished = false;
  private keepsakeMode = false;
  private candleLit: [boolean, boolean, boolean] = [true, true, true];
  private timeAccum = 0;
  private tickerFn: ((ticker: Ticker) => void) | null = null;
  private lastWindPuff = 0;
  private lastSparkAt = 0;
  private extinguishTimers: Array<ReturnType<typeof setTimeout>> = [];

  constructor(textures: Stage2Textures) {
    super();
    const glowTex = createSoftGlowTexture();
    const moteTex = createMoteTexture();
    const ribbonTex = createRibbonTexture();

    this.cakeGlow = new Sprite(glowTex);
    this.cakeGlow.anchor.set(0.5, 0.5);
    this.cakeGlow.tint = 0xfef08a;
    this.cakeGlow.position.set(0, -108);
    this.cakeGlow.scale.set(2.1);
    this.cakeGlow.alpha = 0.58;

    this.cakeSprite = new Sprite(textures.birthdayCake);
    this.cakeSprite.anchor.set(0.5, 0.85);

    this.cakeContainer.addChild(this.cakeGlow, this.cakeSprite, this.flamesLayer);
    this.addChild(this.cakeContainer);
    this.addChild(this.windLayer);
    this.addChild(this.sparksLayer);
    this.addChild(this.smokeLayer);

    for (let i = 0; i < SPARK_POOL_SIZE; i++) {
      const sp = new Sprite(moteTex);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.sparksLayer.addChild(sp);
      this.sparkPool.push({ sprite: sp, active: false, vx: 0, vy: 0, age: 0, life: 0.45 });
    }

    for (let i = 0; i < WIND_POOL_SIZE; i++) {
      const sp = new Sprite(ribbonTex);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.windLayer.addChild(sp);
      this.windPool.push({ sprite: sp, active: false, vx: 380, age: 0, life: 0.42 });
    }

    for (let i = 0; i < SMOKE_POOL_SIZE; i++) {
      const sp = new Sprite(textures.smokeWisp);
      sp.anchor.set(0.5, 0.9);
      sp.visible = false;
      this.smokeLayer.addChild(sp);
      this.smokePool.push({
        sprite: sp,
        active: false,
        vx: 14,
        vy: -32,
        baseScale: 0.7,
        age: 0,
        life: 1.5,
        delay: 0,
      });
    }
  }

  start(layout: SceneLayout, ticker: Ticker, startExtinguished = false): void {
    this.keepsakeMode = startExtinguished;
    if (startExtinguished) {
      this.extinguished = true;
      this.candleLit = [false, false, false];
      this.cakeGlow.alpha = 0;
    }
    this.applyLayout(layout);

    this.cakeContainer.scale.set(startExtinguished ? 1 : 0.25);
    if (!startExtinguished) {
      gsap.to(this.cakeContainer.scale, {
        x: 1,
        y: 1,
        duration: 0.62,
        ease: 'back.out(1.7)',
      });
    }

    this.drawFlames();

    this.tickerFn = (t: Ticker) => {
      const dtSec = Math.max(0, Math.min(t.deltaMS / 1000, 0.05));
      this.timeAccum += t.deltaMS * 0.012;
      this.drawFlames();
      this.stepPools(dtSec);

      const anyLit = this.candleLit[0] || this.candleLit[1] || this.candleLit[2];
      if (anyLit) {
        this.cakeGlow.alpha = 0.48 + Math.sin(this.timeAccum * 0.6) * 0.1;
        const now = performance.now();
        if (
          this.windStrength > 0.2 &&
          now - this.lastSparkAt > Math.max(48, 150 - this.windStrength * 95)
        ) {
          this.lastSparkAt = now;
          this.spawnWindSpark();
        }
        if (this.windStrength > 0.15 && now - this.lastWindPuff > 130) {
          this.lastWindPuff = now;
          this.spawnWindStreak();
        }
      } else if (this.cakeGlow.alpha > 0.005) {
        this.cakeGlow.alpha *= Math.exp(-3.5 * dtSec);
      } else {
        this.cakeGlow.alpha = 0;
      }
    };
    ticker.add(this.tickerFn);
  }

  setKeepsakeMode(enabled: boolean, layout: SceneLayout): void {
    this.keepsakeMode = enabled;
    this.applyLayout(layout);
  }

  private drawFlames(): void {
    this.flamesLayer.clear();

    for (let idx = 0; idx < CAKE_CANDLE_OFFSETS.length; idx++) {
      const pos = CAKE_CANDLE_OFFSETS[idx];
      const cx = pos.x;
      const cy = pos.y;

      this.flamesLayer.moveTo(cx, cy + 2);
      this.flamesLayer.lineTo(cx, cy - 3);
      this.flamesLayer.stroke({ color: 0x4a2c1d, width: 2.2, cap: 'round' });

      if (!this.candleLit[idx]) continue;

      const flicker =
        Math.sin(this.timeAccum * (1.9 + this.windStrength * 6.8) + idx * 2.1) *
        (2.2 + this.windStrength * 3.0);
      const lean = this.windStrength * 26 + flicker * 0.7;
      const heightScale = Math.max(0.3, 1 - this.windStrength * 0.44);
      const widthScale = 1 + this.windStrength * 0.54;

      this.flamesLayer.circle(
        cx + lean * 0.4,
        cy - 8 * heightScale,
        13 * Math.max(heightScale, 0.65),
      );
      this.flamesLayer.fill({ color: 0xfacc15, alpha: 0.34 });

      this.flamesLayer.moveTo(cx - 5.2 * widthScale, cy - 1);
      this.flamesLayer.bezierCurveTo(
        cx - 6 * widthScale,
        cy - 10 * heightScale,
        cx + lean - 2 * widthScale,
        cy - 18 * heightScale,
        cx + lean,
        cy - 20 * heightScale,
      );
      this.flamesLayer.bezierCurveTo(
        cx + lean + 4 * widthScale,
        cy - 14 * heightScale,
        cx + 6 * widthScale,
        cy - 8 * heightScale,
        cx + 5.2 * widthScale,
        cy - 1,
      );
      this.flamesLayer.closePath();
      this.flamesLayer.fill({ color: 0xf97316 });

      this.flamesLayer.ellipse(
        cx + lean * 0.35,
        cy - 6.5 * heightScale,
        3 * widthScale * 0.85,
        5.5 * heightScale,
      );
      this.flamesLayer.fill({ color: 0xfef08a });
    }
  }

  private spawnWindSpark(): void {
    const litIndices: number[] = [];
    for (let i = 0; i < 3; i++) {
      if (this.candleLit[i]) litIndices.push(i);
    }
    if (litIndices.length === 0) return;

    const slot = this.sparkPool.find((s) => !s.active) ?? this.sparkPool[0];
    if (!slot) return;

    const idx = litIndices[Math.floor(Math.random() * litIndices.length)];
    const pos = CAKE_CANDLE_OFFSETS[idx];
    const s = this.cakeSprite.scale.x || 1;
    const lean = this.windStrength * 26;
    const heightScale = Math.max(0.3, 1 - this.windStrength * 0.44);

    slot.active = true;
    slot.age = 0;
    slot.life = 0.36 + Math.random() * 0.22;
    slot.vx = (76 + this.windStrength * 125 + Math.random() * 45) * s;
    slot.vy = (-26 + (Math.random() - 0.5) * 34) * s;
    slot.sprite.tint = Math.random() > 0.4 ? 0xfef08a : 0xf97316;
    slot.sprite.scale.set((0.4 + Math.random() * 0.35) * s);
    slot.sprite.position.set(
      this.cakeContainer.x + (pos.x + lean * 0.85) * s,
      this.cakeContainer.y + (pos.y - 12 * heightScale) * s,
    );
    slot.sprite.alpha = 0.95;
    slot.sprite.visible = true;
  }

  private spawnWindStreak(): void {
    const slot = this.windPool.find((w) => !w.active) ?? this.windPool[0];
    if (!slot) return;

    const s = this.cakeSprite.scale.x || 1;
    slot.active = true;
    slot.age = 0;
    slot.life = 0.42;
    slot.vx = (360 + this.windStrength * 140) * s;
    slot.sprite.position.set(
      this.cakeContainer.x - 135 * s,
      this.cakeContainer.y - (110 + (Math.random() - 0.5) * 52) * s,
    );
    slot.sprite.scale.set(1.3 * s, 0.75 * s);
    slot.sprite.alpha = 0.82;
    slot.sprite.visible = true;
  }

  private spawnCurlingSmoke(idx: number): void {
    const pos = CAKE_CANDLE_OFFSETS[idx];
    const s = this.cakeSprite.scale.x || 1;
    const baseX = this.cakeContainer.x + pos.x * s;
    const baseY = this.cakeContainer.y + (pos.y - 4) * s;

    let spawned = 0;
    for (let i = 0; i < this.smokePool.length && spawned < 3; i++) {
      const slot = this.smokePool[i];
      if (slot.active) continue;
      slot.active = true;
      slot.age = 0;
      slot.delay = spawned * 0.14;
      slot.life = 1.35 + spawned * 0.2;
      slot.vx = (8 + Math.random() * 14) * s;
      slot.vy = -(28 + spawned * 8) * s;
      slot.baseScale = (0.52 + spawned * 0.16) * s;
      slot.sprite.position.set(baseX, baseY);
      slot.sprite.scale.set(slot.baseScale * 0.5);
      slot.sprite.alpha = 0;
      slot.sprite.visible = true;
      spawned++;
    }
  }

  private stepPools(dtSec: number): void {
    for (let i = 0; i < this.sparkPool.length; i++) {
      const sp = this.sparkPool[i];
      if (!sp.active) continue;
      sp.age += dtSec;
      const u = sp.age / sp.life;
      if (u >= 1) {
        sp.active = false;
        sp.sprite.visible = false;
        continue;
      }
      sp.vy += 90 * dtSec;
      sp.sprite.x += sp.vx * dtSec;
      sp.sprite.y += sp.vy * dtSec;
      sp.sprite.alpha = Math.max(0, 1 - u);
    }

    for (let i = 0; i < this.windPool.length; i++) {
      const w = this.windPool[i];
      if (!w.active) continue;
      w.age += dtSec;
      const u = w.age / w.life;
      if (u >= 1) {
        w.active = false;
        w.sprite.visible = false;
        continue;
      }
      w.sprite.x += w.vx * dtSec;
      w.sprite.alpha = Math.sin(u * Math.PI) * 0.8;
    }

    for (let i = 0; i < this.smokePool.length; i++) {
      const sm = this.smokePool[i];
      if (!sm.active) continue;
      if (sm.delay > 0) {
        sm.delay -= dtSec;
        continue;
      }
      sm.age += dtSec;
      const u = sm.age / sm.life;
      if (u >= 1) {
        sm.active = false;
        sm.sprite.visible = false;
        continue;
      }
      sm.sprite.x += (sm.vx + Math.sin(u * 8) * 10) * dtSec;
      sm.sprite.y += sm.vy * dtSec;
      const grow = sm.baseScale * (0.55 + u * 0.85);
      sm.sprite.scale.set(grow);
      sm.sprite.alpha = Math.min(1, u * 4) * (1 - u) * 0.72;
    }
  }

  setWindStrength(strength: number): void {
    this.windStrength = Math.max(0, Math.min(1, strength));
  }

  extinguish(): void {
    if (this.extinguished) return;
    this.extinguished = true;
    triggerExtinguishHaptic();
    audioManager.playSfx('sparkle');

    // Sequentially extinguish candles left-to-right over 200ms
    CAKE_CANDLE_OFFSETS.forEach((_, idx) => {
      const timer = setTimeout(() => {
        this.candleLit[idx] = false;
        this.drawFlames();
        this.spawnCurlingSmoke(idx);
      }, idx * 100);
      this.extinguishTimers.push(timer);
    });
  }

  applyLayout(layout: SceneLayout): void {
    const { unitScale, width, height } = layout;
    if (this.keepsakeMode) {
      this.cakeContainer.x = width * 0.43;
      this.cakeContainer.y = height * 0.84;
      const sc = 1.05 * unitScale;
      this.cakeSprite.scale.set(sc);
      this.flamesLayer.scale.set(sc);
      this.cakeGlow.scale.set(2.0 * sc);
    } else {
      this.cakeContainer.x = width * 0.5;
      this.cakeContainer.y = height * 0.72;
      const sc = 1.38 * unitScale;
      this.cakeSprite.scale.set(sc);
      this.flamesLayer.scale.set(sc);
      this.cakeGlow.scale.set(2.1 * sc);
    }
  }

  stop(ticker: Ticker): void {
    if (this.tickerFn) {
      ticker.remove(this.tickerFn);
      this.tickerFn = null;
    }
    for (const timer of this.extinguishTimers) {
      clearTimeout(timer);
    }
    this.extinguishTimers = [];

    gsap.killTweensOf(this.cakeContainer);
    gsap.killTweensOf(this.cakeContainer.scale);
  }
}
