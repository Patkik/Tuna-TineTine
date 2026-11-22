/**
 * CloudFragmentPool.ts — Pre-allocated, zero-GC particle pool for the airplane sequence.
 *
 * Manages exhaust puffs, cloud-punch entry/exit radial bursts, tap sparkle/heart bursts,
 * far-wake specks, and Phase 3 falling cloud fragments across far and hero depth containers.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import {
  createCloudTuftTexture,
  createExhaustPuffTexture,
} from '../assets/svgTextureFactory';

interface PooledSpriteParticle {
  sprite: Sprite;
  active: boolean;
  layer: 'far' | 'hero';
  x: number;
  y: number;
  vx: number;
  vy: number;
  vRot: number;
  baseScale: number;
  age: number;
  life: number;
  phase: number;
  initialAlpha: number;
  mode: 'exhaust' | 'burst' | 'falling' | 'tap';
}

const EXHAUST_POOL_SIZE = 24;
const BURST_POOL_SIZE = 32;
const FALLING_POOL_SIZE = 32;
const TAP_BURST_POOL_SIZE = 16;

export interface ShedVelocity {
  vx: number;
  vy: number;
}

/**
 * Pure physics helper: detached cloud tufts inherit ~30% of plane horizontal momentum
 * plus gentle lateral scatter and an upward scatter pop before drifting down.
 */
export function computeShedFragmentInitialVelocity(
  planeVx: number,
  scatterNorm: number,
  popNorm: number,
): ShedVelocity {
  return {
    vx: planeVx * 0.3 + (scatterNorm - 0.5) * 32,
    vy: -(20 + Math.max(0, Math.min(1, popNorm)) * 28),
  };
}

export class CloudFragmentPool {
  private readonly farContainer: Container;
  private readonly heroContainer: Container;
  private readonly cloudTuftTexture: Texture;
  private readonly exhaustTexture: Texture;
  private readonly heartTexture: Texture;
  private readonly starfishTexture: Texture;

  private readonly exhaustPool: PooledSpriteParticle[] = [];
  private readonly burstPool: PooledSpriteParticle[] = [];
  private readonly fallingPool: PooledSpriteParticle[] = [];
  private readonly tapPool: PooledSpriteParticle[] = [];

  constructor(
    farContainer: Container,
    heroContainer: Container,
    textures: { heart?: Texture; starfish?: Texture } = {},
  ) {
    this.farContainer = farContainer;
    this.heroContainer = heroContainer;
    this.cloudTuftTexture = createCloudTuftTexture();
    this.exhaustTexture = createExhaustPuffTexture();
    this.heartTexture = textures.heart ?? Texture.WHITE;
    this.starfishTexture = textures.starfish ?? Texture.WHITE;

    this.allocatePool(this.exhaustPool, EXHAUST_POOL_SIZE, this.exhaustTexture, 'hero', 'exhaust');
    this.allocatePool(this.burstPool, BURST_POOL_SIZE, this.cloudTuftTexture, 'far', 'burst');
    this.allocatePool(this.fallingPool, FALLING_POOL_SIZE, this.cloudTuftTexture, 'hero', 'falling');
    this.allocatePool(this.tapPool, TAP_BURST_POOL_SIZE, this.heartTexture, 'hero', 'tap');

    for (let i = 0; i < this.tapPool.length; i++) {
      this.tapPool[i].sprite.texture = i % 2 === 0 ? this.heartTexture : this.starfishTexture;
    }
  }

  private allocatePool(
    target: PooledSpriteParticle[],
    count: number,
    texture: Texture,
    defaultLayer: 'far' | 'hero',
    mode: PooledSpriteParticle['mode'],
  ): void {
    const parent = defaultLayer === 'far' ? this.farContainer : this.heroContainer;
    for (let i = 0; i < count; i++) {
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5, 0.5);
      sprite.visible = false;
      sprite.alpha = 0;
      parent.addChild(sprite);

      target.push({
        sprite,
        active: false,
        layer: defaultLayer,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        vRot: 0,
        baseScale: 1,
        age: 0,
        life: 1,
        phase: (i * 1.37) % (Math.PI * 2),
        initialAlpha: 0.9,
        mode,
      });
    }
  }

  private claimSlot(pool: PooledSpriteParticle[]): PooledSpriteParticle | null {
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].active) return pool[i];
    }
    let oldest = pool[0] ?? null;
    for (let i = 1; i < pool.length; i++) {
      if (oldest && pool[i].age > oldest.age) {
        oldest = pool[i];
      }
    }
    return oldest;
  }

  private assignLayer(slot: PooledSpriteParticle, layer: 'far' | 'hero'): void {
    if (slot.layer === layer && slot.sprite.parent) return;
    const targetParent = layer === 'far' ? this.farContainer : this.heroContainer;
    if (slot.sprite.parent !== targetParent) {
      targetParent.addChild(slot.sprite);
    }
    slot.layer = layer;
  }

  spawnExhaustPuff(
    x: number,
    y: number,
    vx: number,
    vy: number,
    scale: number,
    layer: 'far' | 'hero',
  ): void {
    const slot = this.claimSlot(this.exhaustPool);
    if (!slot) return;
    this.assignLayer(slot, layer);
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.vx = vx;
    slot.vy = vy;
    slot.vRot = 0;
    slot.baseScale = Math.max(0.35, scale);
    slot.age = 0;
    slot.life = layer === 'far' ? 1.05 : 1.3;
    slot.initialAlpha = layer === 'far' ? 0.65 : 0.85;
    slot.sprite.tint = layer === 'far' ? 0xe5f5fc : 0xffffff;
    slot.sprite.rotation = (Math.random() - 0.5) * 0.25;
    slot.sprite.x = x;
    slot.sprite.y = y;
    slot.sprite.scale.set(slot.baseScale * 0.72);
    slot.sprite.alpha = slot.initialAlpha;
    slot.sprite.visible = true;
  }

  spawnCloudPunchBurst(
    x: number,
    y: number,
    count: number,
    scale: number,
    biasVx = 0,
  ): void {
    const clamped = Math.max(10, Math.min(14, Math.round(count)));
    for (let i = 0; i < clamped; i++) {
      const slot = this.claimSlot(this.burstPool);
      if (!slot) return;
      this.assignLayer(slot, 'far');

      const angle = (i / clamped) * Math.PI * 2 + (Math.random() - 0.5) * 0.38;
      const speed = 78 + Math.random() * 88;
      slot.active = true;
      slot.x = x + Math.cos(angle) * 6;
      slot.y = y + Math.sin(angle) * 6;
      slot.vx = Math.cos(angle) * speed + biasVx * 0.22;
      slot.vy = Math.sin(angle) * speed * 0.85 - 10;
      slot.vRot = (Math.random() - 0.5) * 2.4;
      slot.baseScale = Math.max(0.42, scale * (0.72 + Math.random() * 0.48));
      slot.age = 0;
      slot.life = 0.85 + Math.random() * 0.45;
      slot.initialAlpha = 0.94;
      slot.sprite.tint = 0xffffff;
      slot.sprite.rotation = (Math.random() - 0.5) * 0.5;
      slot.sprite.position.set(slot.x, slot.y);
      slot.sprite.scale.set(slot.baseScale * 0.55);
      slot.sprite.alpha = slot.initialAlpha;
      slot.sprite.visible = true;
    }
  }

  spawnFallingCloudFragment(
    x: number,
    y: number,
    planeVx: number,
    scale: number,
    rotation = 0,
    layer: 'far' | 'hero' = 'hero',
  ): void {
    const slot = this.claimSlot(this.fallingPool);
    if (!slot) return;
    this.assignLayer(slot, layer);

    const vel = computeShedFragmentInitialVelocity(planeVx, Math.random(), Math.random());
    slot.active = true;
    slot.x = x;
    slot.y = y;
    slot.vx = vel.vx;
    slot.vy = layer === 'far' ? vel.vy * 0.45 : vel.vy;
    slot.vRot = (Math.random() - 0.5) * 1.4;
    slot.baseScale = Math.max(0.32, scale * (0.85 + Math.random() * 0.35));
    slot.age = 0;
    slot.life = layer === 'far' ? 1.7 + Math.random() * 0.5 : 4.2 + Math.random() * 1.4;
    slot.phase = Math.random() * Math.PI * 2;
    slot.initialAlpha = layer === 'far' ? 0.78 : 0.95;
    slot.sprite.tint = layer === 'far' ? 0xe6f6fd : 0xffffff;
    slot.sprite.rotation = rotation;
    slot.sprite.position.set(x, y);
    slot.sprite.scale.set(slot.baseScale);
    slot.sprite.alpha = slot.initialAlpha;
    slot.sprite.visible = true;
  }

  spawnTapSparkles(x: number, y: number, scale = 1, count = 6): void {
    for (let i = 0; i < count; i++) {
      const slot = this.claimSlot(this.tapPool);
      if (!slot) return;
      this.assignLayer(slot, 'hero');
      slot.active = true;
      slot.x = x + (Math.random() - 0.5) * 32;
      slot.y = y + (Math.random() - 0.5) * 22;
      slot.vx = 25 + Math.random() * 70;
      slot.vy = -65 - Math.random() * 45;
      slot.vRot = (Math.random() - 0.5) * 7;
      slot.baseScale = Math.max(0.38, scale * (0.44 + Math.random() * 0.24));
      slot.age = 0;
      slot.life = 0.85 + Math.random() * 0.35;
      slot.initialAlpha = 1;
      slot.sprite.tint = 0xffffff;
      slot.sprite.position.set(slot.x, slot.y);
      slot.sprite.scale.set(slot.baseScale);
      slot.sprite.alpha = 1;
      slot.sprite.visible = true;
    }
  }

  update(dt: number, clock: AtmosphereClock, horizonY: number, viewportHeight: number): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    if (safeDt === 0) return;

    this.stepExhaustPool(safeDt, clock);
    this.stepBurstPool(safeDt);
    this.stepFallingPool(safeDt, clock, horizonY, viewportHeight);
    this.stepTapPool(safeDt);
  }

  private stepExhaustPool(dt: number, clock: AtmosphereClock): void {
    for (let i = 0; i < this.exhaustPool.length; i++) {
      const p = this.exhaustPool[i];
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vx *= Math.exp(-1.5 * dt);
      p.x += (p.vx + clock.windAt(p.x) * 14) * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.scale.set(p.baseScale * (0.75 + u * 0.72));
      p.sprite.alpha = p.initialAlpha * (1 - u);
    }
  }

  private stepBurstPool(dt: number): void {
    const drag = Math.exp(-3.4 * dt);
    for (let i = 0; i < this.burstPool.length; i++) {
      const p = this.burstPool[i];
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vx *= drag;
      p.vy *= drag;
      p.vy += 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation += p.vRot * dt;
      const popScale = u < 0.2 ? 0.55 + (u / 0.2) * 0.6 : 1.15 - (u - 0.2) * 0.35;
      p.sprite.scale.set(p.baseScale * popScale);
      p.sprite.alpha = p.initialAlpha * Math.max(0, 1 - u * u);
    }
  }

  private stepFallingPool(
    dt: number,
    clock: AtmosphereClock,
    horizonY: number,
    viewportHeight: number,
  ): void {
    const fadeBottomY = horizonY + Math.max(60, (viewportHeight - horizonY) * 0.38);
    const vxDrag = Math.exp(-1.35 * dt);

    for (let i = 0; i < this.fallingPool.length; i++) {
      const p = this.fallingPool[i];
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1 || p.y >= fadeBottomY + 24) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }

      // Feather-light downward drift + AtmosphereClock-synced lateral sine sway
      p.vx *= vxDrag;
      p.vy = Math.min(68, p.vy + (p.layer === 'far' ? 28 : 42) * dt);
      const sway = Math.sin(clock.time * 2.5 + p.phase) * 20;
      const windPush = clock.windAt(p.x) * 28;

      p.x += (p.vx + windPush + sway) * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation += p.vRot * dt;

      const lifeFade = u > 0.72 ? Math.max(0, (1 - u) / 0.28) : 1;
      const horizonFade =
        p.y > horizonY ? Math.max(0, 1 - (p.y - horizonY) / (fadeBottomY - horizonY)) : 1;
      p.sprite.alpha = p.initialAlpha * Math.min(lifeFade, horizonFade);
    }
  }

  private stepTapPool(dt: number): void {
    for (let i = 0; i < this.tapPool.length; i++) {
      const p = this.tapPool[i];
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vy += 115 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation += p.vRot * dt;
      p.sprite.alpha = Math.max(0, 1 - u);
    }
  }

  getActiveCounts(): { exhaust: number; burst: number; falling: number; tap: number } {
    return {
      exhaust: this.countActive(this.exhaustPool),
      burst: this.countActive(this.burstPool),
      falling: this.countActive(this.fallingPool),
      tap: this.countActive(this.tapPool),
    };
  }

  private countActive(pool: PooledSpriteParticle[]): number {
    let n = 0;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].active) n++;
    }
    return n;
  }

  clearAll(): void {
    const groups = [this.exhaustPool, this.burstPool, this.fallingPool, this.tapPool];
    for (const pool of groups) {
      for (let i = 0; i < pool.length; i++) {
        pool[i].active = false;
        pool[i].sprite.visible = false;
        pool[i].sprite.alpha = 0;
      }
    }
  }

  destroyPool(): void {
    this.clearAll();
  }
}
