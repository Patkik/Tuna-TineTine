/**
 * AtmosphereEffectsLayer.ts — Pooled MeshRope curly wind ribbons + 40-sprite GPU ParticleContainer
 * driving daytime gust sparkles/sand dust and sunset/twilight golden fireflies in 1 draw call.
 */
import { Container, MeshRope, Particle, ParticleContainer, Point, Texture } from 'pixi.js';
import type { AtmosphereClock, GustEvent } from '../atmosphere/AtmosphereClock';
import { createMoteTexture, createRibbonTexture } from '../assets/svgTextureFactory';
import type { SceneLayout } from '../layout/sceneLayout';

interface PooledRibbon {
  rope: MeshRope;
  points: Point[];
  active: boolean;
  age: number;
  duration: number;
  originX: number;
  originY: number;
  direction: number;
  strength: number;
  span: number;
  loopPhase: number;
}

interface PooledMote {
  particle: Particle;
  active: boolean;
  age: number;
  life: number;
  vx: number;
  vy: number;
  baseScale: number;
  kind: 'dust' | 'firefly';
  phase: number;
}

const RIBBON_POOL_SIZE = 4;
const RIBBON_POINTS = 18;
const MAX_MOTES = 40;

export class AtmosphereEffectsLayer extends Container {
  private readonly ribbonTexture: Texture;
  private readonly moteTexture: Texture;
  private readonly ribbons: PooledRibbon[] = [];
  private readonly moteContainer: ParticleContainer;
  private readonly motes: PooledMote[] = [];

  private layout: SceneLayout | null = null;
  private dustSpawnCooldown = 0;
  private fireflySpawnCooldown = 0;
  private readonly handleGustEvent: (ev: GustEvent) => void;

  constructor() {
    super();
    this.ribbonTexture = createRibbonTexture();
    this.moteTexture = createMoteTexture();

    this.handleGustEvent = (ev: GustEvent) => {
      this.spawnWindRibbon(ev.x, ev.y, ev.direction, ev.strength);
      if (!ev.fromSwipe) {
        this.spawnWindRibbon(
          ev.x + 28,
          Math.max(42, ev.y + 42),
          ev.direction,
          ev.strength * 0.85,
        );
      }
      this.spawnDustBurst(
        ev.fromSwipe ? ev.x : (this.layout?.width ?? 390) * 0.45,
        ev.fromSwipe ? 10 : 7,
      );
    };

    for (let i = 0; i < RIBBON_POOL_SIZE; i++) {
      const points = Array.from({ length: RIBBON_POINTS }, () => new Point(0, 0));
      const rope = new MeshRope({ texture: this.ribbonTexture, points });
      rope.visible = false;
      rope.alpha = 0;
      this.addChild(rope);

      this.ribbons.push({
        rope,
        points,
        active: false,
        age: 0,
        duration: 1.6,
        originX: 0,
        originY: 0,
        direction: 1,
        strength: 1,
        span: 140,
        loopPhase: i * 1.4,
      });
    }

    this.moteContainer = new ParticleContainer({
      texture: this.moteTexture,
      dynamicProperties: {
        position: true,
        vertex: true,
        rotation: false,
        uvs: false,
        color: true,
      },
    });
    this.addChild(this.moteContainer);

    for (let i = 0; i < MAX_MOTES; i++) {
      const p = new Particle({
        texture: this.moteTexture,
        x: -9999,
        y: -9999,
        anchorX: 0.5,
        anchorY: 0.5,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
      });
      this.moteContainer.addParticle(p);
      this.motes.push({
        particle: p,
        active: false,
        age: 0,
        life: 2,
        vx: 0,
        vy: 0,
        baseScale: 0.6,
        kind: 'dust',
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  applyLayout(layout: SceneLayout): void {
    this.layout = layout;
  }

  spawnWindRibbon(x: number, y: number, direction = 1, strength = 1): void {
    let slot = this.ribbons.find((r) => !r.active);
    if (!slot) {
      slot = this.ribbons.reduce(
        (oldest, cur) => (cur.age > oldest.age ? cur : oldest),
        this.ribbons[0],
      );
    }
    if (!slot) return;

    slot.active = true;
    slot.age = 0;
    slot.duration = 1.45 + Math.random() * 0.4;
    slot.originX = x;
    slot.originY = y;
    slot.direction = direction >= 0 ? 1 : -1;
    slot.strength = Math.max(0.5, Math.min(1.8, strength));
    slot.span = (this.layout?.isPortrait ? 130 : 250) * (0.85 + Math.min(1.4, strength) * 0.25);
    slot.loopPhase = Math.random() * Math.PI * 2;
    slot.rope.visible = true;
    slot.rope.alpha = 0;
  }

  spawnDustBurst(originX: number, count = 8): void {
    if (!this.layout) return;
    const { dunes, height: h, width: w } = this.layout;
    let spawned = 0;
    for (let i = 0; i < this.motes.length && spawned < count; i++) {
      const m = this.motes[i];
      if (m.active) continue;
      m.active = true;
      m.kind = 'dust';
      m.age = 0;
      m.life = 1.2 + Math.random() * 1.1;
      m.baseScale = (0.45 + Math.random() * 0.45) * (this.layout.isPortrait ? 0.9 : 1.0);
      m.vx = 28 + Math.random() * 48;
      m.vy = -(16 + Math.random() * 26);
      m.particle.x = Math.max(12, Math.min(w - 12, originX + (Math.random() - 0.5) * 110));
      m.particle.y =
        dunes.frontDunePoints.peakY +
        18 +
        Math.random() * Math.max(40, (h - dunes.frontDunePoints.peakY) * 0.45);
      m.particle.tint = Math.random() > 0.35 ? 0xfffdf7 : 0xfacc15;
      m.particle.alpha = 0;
      spawned++;
    }
  }

  private spawnFirefly(): void {
    if (!this.layout) return;
    const m = this.motes.find((item) => !item.active);
    if (!m) return;

    const { width: w, height: h, dunes } = this.layout;
    m.active = true;
    m.kind = 'firefly';
    m.age = 0;
    m.life = 2.6 + Math.random() * 2.0;
    m.baseScale = 0.55 + Math.random() * 0.55;
    m.vx = (Math.random() - 0.5) * 18;
    m.vy = -(8 + Math.random() * 14);
    m.phase = Math.random() * Math.PI * 2;
    m.particle.x = Math.random() * w;
    m.particle.y = dunes.horizonY + Math.random() * (h - dunes.horizonY - 30);
    m.particle.tint = Math.random() > 0.4 ? 0xfef08a : 0xfacc15;
    m.particle.alpha = 0;
  }

  update(dt: number, clock: AtmosphereClock): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));

    clock.forEachGustEvent(this.handleGustEvent);

    for (let i = 0; i < this.ribbons.length; i++) {
      const r = this.ribbons[i];
      if (!r.active) continue;

      r.age += safeDt;
      const tNorm = r.age / r.duration;
      if (tNorm >= 1) {
        r.active = false;
        r.rope.visible = false;
        r.rope.alpha = 0;
        continue;
      }

      const fadeIn = Math.min(1, tNorm * 4.5);
      const fadeOut = Math.max(0, Math.min(1, (1 - tNorm) * 2.6));
      r.rope.alpha = fadeIn * fadeOut * 0.82;

      const headTravel = tNorm * r.span * 1.45 * r.direction;
      const headX = r.originX + headTravel;
      const trailLen = r.span * (0.65 + 0.35 * Math.sin(tNorm * Math.PI));

      for (let pIdx = 0; pIdx < RIBBON_POINTS; pIdx++) {
        const s = pIdx / (RIBBON_POINTS - 1);
        const px = headX - r.direction * (1 - s) * trailLen;
        const curlAngle = (1 - s) * Math.PI * 2.1 + r.loopPhase + tNorm * 1.2;
        const curlAmp = Math.sin(s * Math.PI) * 14 * r.strength;
        const py =
          r.originY +
          Math.sin(curlAngle) * curlAmp -
          tNorm * 18 +
          Math.cos(s * 3.1415 + r.age * 3.0) * 4;
        r.points[pIdx].set(px, py);
      }
    }

    this.dustSpawnCooldown -= safeDt;
    if (this.dustSpawnCooldown <= 0 && this.layout) {
      this.dustSpawnCooldown = 0.28;
      if (clock.timeOfDayProgress < 0.55) {
        const midWind = clock.windAt(this.layout.width * 0.5);
        if (midWind > 0.58) {
          this.spawnDustBurst(this.layout.width * (0.25 + Math.random() * 0.5), 2);
        }
      }
    }

    this.fireflySpawnCooldown -= safeDt;
    if (this.fireflySpawnCooldown <= 0 && clock.timeOfDayProgress >= 0.45) {
      this.fireflySpawnCooldown = 0.22;
      this.spawnFirefly();
    }

    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      if (!m.active) continue;

      m.age += safeDt;
      const u = m.age / m.life;
      if (u >= 1) {
        m.active = false;
        m.particle.alpha = 0;
        m.particle.x = -9999;
        continue;
      }

      const localWind = clock.windAt(m.particle.x);
      if (m.kind === 'dust') {
        m.particle.x += (m.vx + localWind * 45) * safeDt;
        m.particle.y += m.vy * safeDt;
        const env = Math.sin(u * Math.PI);
        m.particle.alpha = env * 0.85;
        const sc = m.baseScale * (0.7 + env * 0.5);
        m.particle.scaleX = sc;
        m.particle.scaleY = sc;
      } else {
        m.particle.x +=
          (m.vx + localWind * 14 + Math.sin(clock.time * 2.2 + m.phase) * 10) * safeDt;
        m.particle.y += m.vy * safeDt;
        const pulse = 0.45 + 0.55 * Math.sin(clock.time * 5.0 + m.phase);
        const fade = Math.min(1, u * 4) * Math.min(1, (1 - u) * 3);
        m.particle.alpha = fade * pulse * 0.92;
        const sc = m.baseScale * (0.75 + pulse * 0.45);
        m.particle.scaleX = sc;
        m.particle.scaleY = sc;
      }
    }
  }

  destroyLayer(): void {
    this.ribbons.length = 0;
    this.motes.length = 0;
  }
}
