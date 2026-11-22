/**
 * SkyLayer.ts — Living sky powered by AtmosphereClock:
 * - Cerulean gradient (#0EA5E9 -> #67E8F9) + twinkling twilight stars
 * - Secondary soft cloud wisps drifting at 3-5 px/sec
 * - 4x4 MeshPlane vertex-breathing character clouds (bear cloud slow blink + tap-for-pooled-hearts)
 * - Lazy-loaded Beat 1 3-pass airplane + cloud-hole punch choreography (never bundled into Stage 1!)
 * - Two-tier glide-and-flap seagulls with barrel-roll & pooled drifting feathers on tap
 * - Swipe-to-create-wind sky gesture
 */
import {
  Container,
  FillGradient,
  Graphics,
  MeshPlane,
  Sprite,
  type Renderer,
} from 'pixi.js';
import gsap from 'gsap';
import type { Stage1Textures } from '../assets/svgTextureFactory';
import type { SceneLayout } from '../layout/sceneLayout';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import { SpringDamper } from '../atmosphere/SpringDamper';
import type { PlaneSequenceModule } from '../plane/PlaneSequenceModule';
import type { FlightPhase } from '../plane/PlaneFlightController';
import { triggerHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

const PARALLAX_OVERSCAN = 40;
const BEAR_CLOUD_W = 460;
const BEAR_CLOUD_H = 390;
const CHICK_CLOUD_W = 260;
const CHICK_CLOUD_H = 230;
const HEART_POOL_SIZE = 16;
const FEATHER_POOL_SIZE = 6;

interface GullAgent {
  sprite: Sprite;
  tier: 'fg' | 'horizon';
  baseX: number;
  baseY: number;
  baseScale: number;
  state: 'glide' | 'flap';
  stateTimer: number;
  beatStep: number;
  flapIndex: number;
  driftOffsetX: number;
  pathPhase: number;
  nudgeY: number;
  nudgeVy: number;
  rollAngle: number;
  rolling: boolean;
}

interface PooledFeather {
  sprite: Sprite;
  active: boolean;
  vy: number;
  phase: number;
  age: number;
  life: number;
}

interface PooledHeart {
  sprite: Sprite;
  active: boolean;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  targetScale: number;
  age: number;
  delay: number;
  life: number;
}

interface CloudWispAgent {
  sprite: Sprite;
  speed: number;
  baseY: number;
  baseScale: number;
}

export class SkyLayer extends Container {
  private textures: Stage1Textures;
  private rendererRef: Renderer | null;
  private skyBg = new Graphics();
  private skyGradient: FillGradient | null = null;
  private starsLayer = new Graphics();
  private wisps: CloudWispAgent[] = [];

  public chickCloudContainer = new Container();
  private chickCloudMesh!: MeshPlane;
  private chickBaseVerts!: Float32Array;
  private readonly chickRecoilX = new SpringDamper(0, 120, 6.5);
  private readonly chickRecoilY = new SpringDamper(0, 120, 6.5);

  public bearCloudContainer = new Container();
  public bearCloud!: MeshPlane;
  private bearBaseVerts!: Float32Array;
  private readonly bearRecoilX = new SpringDamper(0, 110, 6.2);
  private readonly bearRecoilY = new SpringDamper(0, 110, 6.2);
  private bearBlinkOverlay = new Graphics();
  private blinkTimer = 9.5;
  private blinkDurationLeft = 0;

  private readonly farEffectsLayer = new Container();
  private readonly farPlaneSlot = new Container();
  private readonly heroEffectsLayer = new Container();
  private readonly heroPlaneSlot = new Container();
  private readonly cueSlot = new Container();

  private planeSequence: PlaneSequenceModule | null = null;
  private planeMountPromise: Promise<PlaneSequenceModule> | null = null;

  public gulls: GullAgent[] = [];
  private feathersLayer = new Container();
  private readonly featherPool: PooledFeather[] = [];
  private heartsLayer = new Container();
  private readonly heartPool: PooledHeart[] = [];

  private layout: SceneLayout | null = null;
  private clockRef: AtmosphereClock | null = null;
  private swipeWindEnabled = true;
  private swipeStart: { x: number; y: number; time: number } | null = null;

  constructor(textures: Stage1Textures, clock?: AtmosphereClock, renderer?: Renderer) {
    super();
    this.textures = textures;
    this.clockRef = clock ?? null;
    this.rendererRef = renderer ?? null;

    this.skyBg.eventMode = 'static';
    this.skyBg.on('pointerdown', (e) => {
      if (this.planeSequence?.phase === 'CUE') {
        this.planeSequence.skipCue();
        triggerHaptic(8);
        return;
      }
      if (!this.swipeWindEnabled) return;
      this.swipeStart = { x: e.global.x, y: e.global.y, time: performance.now() };
    });
    this.skyBg.on('pointermove', (e) => {
      if (!this.swipeWindEnabled || !this.swipeStart) return;
      const dx = e.global.x - this.swipeStart.x;
      const dy = e.global.y - this.swipeStart.y;
      if (Math.hypot(dx, dy) >= 38) {
        const dtMs = Math.max(16, performance.now() - this.swipeStart.time);
        const speedNorm = Math.min(1.35, Math.max(0.65, Math.hypot(dx, dy) / (dtMs * 0.45)));
        this.clockRef?.injectSwipeImpulse(e.global.x, e.global.y, dx, speedNorm);
        this.nudgeSeagulls(e.global.x, e.global.y, speedNorm);
        audioManager.playSfx('wind');
        triggerHaptic(8);
        this.swipeStart = null;
      }
    });
    this.skyBg.on('pointerup', () => {
      this.swipeStart = null;
    });
    this.skyBg.on('pointerupoutside', () => {
      this.swipeStart = null;
    });
    this.addChild(this.skyBg);

    this.starsLayer.alpha = 0;
    this.addChild(this.starsLayer);

    const wispSpeeds = [3.2, 4.4, 3.8];
    for (let i = 0; i < 3; i++) {
      const sp = new Sprite(textures.cloudWisp);
      sp.anchor.set(0.5, 0.5);
      sp.alpha = 0.55;
      this.addChild(sp);
      this.wisps.push({
        sprite: sp,
        speed: wispSpeeds[i],
        baseY: 70 + i * 55,
        baseScale: 0.7 + i * 0.15,
      });
    }

    this.chickCloudMesh = new MeshPlane({
      texture: textures.chickCloud,
      verticesX: 5,
      verticesY: 5,
    });
    const chickBuf = this.chickCloudMesh.geometry.getBuffer('aPosition');
    this.chickBaseVerts = Float32Array.from(chickBuf.data as Float32Array);
    this.chickCloudContainer.pivot.set(0, CHICK_CLOUD_H);
    this.chickCloudContainer.addChild(this.chickCloudMesh);
    this.addChild(this.chickCloudContainer);

    this.bearCloud = new MeshPlane({
      texture: textures.bearCloud,
      verticesX: 5,
      verticesY: 5,
    });
    const bearBuf = this.bearCloud.geometry.getBuffer('aPosition');
    this.bearBaseVerts = Float32Array.from(bearBuf.data as Float32Array);
    this.bearCloudContainer.pivot.set(BEAR_CLOUD_W, BEAR_CLOUD_H);
    this.bearCloudContainer.addChild(this.bearCloud);
    this.bearBlinkOverlay.visible = false;
    this.bearCloudContainer.addChild(this.bearBlinkOverlay);
    this.bearCloudContainer.eventMode = 'static';
    this.bearCloudContainer.cursor = 'pointer';
    this.bearCloudContainer.on('pointertap', () => this.puffHearts());
    this.addChild(this.bearCloudContainer);

    this.addChild(this.farEffectsLayer);
    this.addChild(this.farPlaneSlot);

    for (let i = 0; i < 5; i++) {
      const sprite = new Sprite(textures.seagull);
      sprite.anchor.set(0.5, 0.5);
      sprite.eventMode = 'static';
      sprite.cursor = 'pointer';
      const agent: GullAgent = {
        sprite,
        tier: i < 3 ? 'fg' : 'horizon',
        baseX: 120,
        baseY: 60,
        baseScale: i < 3 ? 0.8 : 0.42,
        state: 'glide',
        stateTimer: 1.5 + i * 0.7,
        beatStep: 0,
        flapIndex: 0,
        driftOffsetX: 0,
        pathPhase: i * 1.4,
        nudgeY: 0,
        nudgeVy: 0,
        rollAngle: 0,
        rolling: false,
      };
      sprite.on('pointertap', () => this.triggerGullBarrelRoll(agent));
      this.gulls.push(agent);
      this.addChild(sprite);
    }

    this.addChild(this.feathersLayer);
    for (let i = 0; i < FEATHER_POOL_SIZE; i++) {
      const sp = new Sprite(textures.feather);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.feathersLayer.addChild(sp);
      this.featherPool.push({ sprite: sp, active: false, vy: 24, phase: 0, age: 0, life: 2.6 });
    }

    this.addChild(this.heartsLayer);
    for (let i = 0; i < HEART_POOL_SIZE; i++) {
      const sp = new Sprite(textures.heartPuff);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.heartsLayer.addChild(sp);
      this.heartPool.push({
        sprite: sp,
        active: false,
        startX: 0,
        startY: 0,
        vx: 0,
        vy: -55,
        targetScale: 0.8,
        age: 0,
        delay: 0,
        life: 1.3,
      });
    }

    this.addChild(this.heroEffectsLayer);
    this.addChild(this.heroPlaneSlot);
    this.addChild(this.cueSlot);
  }

  async mountPlaneSequence(): Promise<PlaneSequenceModule> {
    if (this.planeSequence) return this.planeSequence;
    if (this.planeMountPromise) return this.planeMountPromise;

    this.planeMountPromise = import('../plane/PlaneSequenceModule').then(
      ({ PlaneSequenceModule }) => {
        const mod = new PlaneSequenceModule({
          textures: this.textures,
          renderer: this.rendererRef,
          chickCloudMesh: this.chickCloudMesh,
          bearCloudMesh: this.bearCloud,
          farEffectsLayer: this.farEffectsLayer,
          farPlaneSlot: this.farPlaneSlot,
          heroEffectsLayer: this.heroEffectsLayer,
          heroPlaneSlot: this.heroPlaneSlot,
          cueSlot: this.cueSlot,
          chickW: CHICK_CLOUD_W,
          chickH: CHICK_CLOUD_H,
          bearW: BEAR_CLOUD_W,
          bearH: BEAR_CLOUD_H,
          onChickRecoil: (vx, vy) => {
            this.chickRecoilX.impulse(vx);
            this.chickRecoilY.impulse(vy);
          },
          onBearRecoil: (vx, vy) => {
            this.bearRecoilX.impulse(vx);
            this.bearRecoilY.impulse(vy);
          },
        });
        if (this.layout) {
          mod.applyLayout(this.layout);
        }
        this.planeSequence = mod;
        return mod;
      },
    );

    return this.planeMountPromise;
  }

  setAtmosphereClock(clock: AtmosphereClock): void {
    this.clockRef = clock;
  }

  setSwipeWindEnabled(enabled: boolean): void {
    this.swipeWindEnabled = enabled;
    if (!enabled) this.swipeStart = null;
  }

  async startBirthdayReveal(
    onHeroPassStart?: () => void,
    onFirstCycleComplete?: () => void,
  ): Promise<void> {
    const seq = await this.mountPlaneSequence();
    seq.startWithCue(onHeroPassStart, onFirstCycleComplete);
  }

  async ensurePlaneLoopRunning(onFirstCycleComplete?: () => void): Promise<void> {
    const seq = await this.mountPlaneSequence();
    seq.ensureRunning(onFirstCycleComplete);
  }

  skipCue(): void {
    this.planeSequence?.skipCue();
  }

  resetBirthdayReveal(): void {
    this.planeSequence?.reset();
  }

  getFlightPhase(): FlightPhase {
    return this.planeSequence?.phase ?? 'IDLE';
  }

  private drawStars(w: number, skyH: number): void {
    this.starsLayer.clear();
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };

    for (let i = 0; i < 44; i++) {
      const sx = -PARALLAX_OVERSCAN + rand() * (w + PARALLAX_OVERSCAN * 2);
      const sy = rand() * (skyH * 0.85);
      const r = 1.2 + rand() * 2.2;
      this.starsLayer.circle(sx, sy, r);
      this.starsLayer.fill({ color: 0xfffef2, alpha: 0.5 + rand() * 0.5 });
    }
  }

  setTwilightStars(alpha: number, durationSec = 1.8): void {
    gsap.to(this.starsLayer, {
      alpha: Math.max(0, Math.min(1, alpha)),
      duration: durationSec,
      ease: 'power2.inOut',
    });
  }

  private triggerGullBarrelRoll(gull: GullAgent): void {
    if (gull.rolling) return;
    gull.rolling = true;
    gull.rollAngle = 0;
    gull.nudgeVy = -38;
    triggerHaptic(10);
    audioManager.playSfx('heart');
    this.spawnFeather(gull.sprite.x, gull.sprite.y + 6);
  }

  private spawnFeather(x: number, y: number): void {
    const slot =
      this.featherPool.find((f) => !f.active) ??
      this.featherPool.reduce((old, cur) => (cur.age > old.age ? cur : old), this.featherPool[0]);
    if (!slot) return;

    slot.active = true;
    slot.age = 0;
    slot.life = 2.6;
    slot.vy = 24;
    slot.phase = Math.random() * Math.PI * 2;
    slot.sprite.x = x;
    slot.sprite.y = y;
    slot.sprite.alpha = 1;
    slot.sprite.scale.set(this.layout?.unitScale ? Math.max(0.65, this.layout.unitScale) : 0.85);
    slot.sprite.visible = true;
  }

  nudgeSeagulls(swipeX: number, swipeY: number, strength = 1): void {
    for (const gull of this.gulls) {
      const dist = Math.hypot(gull.sprite.x - swipeX, gull.sprite.y - swipeY);
      if (dist < (this.layout?.width ?? 390) * 0.6) {
        const proximity = Math.max(0.35, 1 - dist / ((this.layout?.width ?? 390) * 0.65));
        gull.nudgeVy -= 42 * strength * proximity;
        gull.state = 'flap';
        gull.stateTimer = 0.65;
      }
    }
  }

  puffHearts(): void {
    triggerHaptic(12);
    audioManager.playSfx('heart');

    const baseX = this.bearCloudContainer.x - BEAR_CLOUD_W * this.bearCloudContainer.scale.x * 0.48;
    const baseY = this.bearCloudContainer.y - BEAR_CLOUD_H * this.bearCloudContainer.scale.y * 0.58;

    gsap.killTweensOf(this.bearCloudContainer.scale);
    const s = this.layout?.bearCloud.scale ?? 1;
    gsap.fromTo(
      this.bearCloudContainer.scale,
      { x: s * 1.06, y: s * 0.94 },
      { x: s, y: s, duration: 0.45, ease: 'elastic.out(1.1, 0.5)' },
    );

    let spawned = 0;
    for (let i = 0; i < this.heartPool.length && spawned < 4; i++) {
      const slot = this.heartPool[i];
      if (slot.active) continue;
      slot.active = true;
      slot.age = 0;
      slot.delay = spawned * 0.06;
      slot.life = 1.2 + spawned * 0.12;
      slot.startX = baseX + (Math.random() - 0.5) * 90;
      slot.startY = baseY + (Math.random() - 0.5) * 35;
      slot.vx = (Math.random() - 0.5) * 30;
      slot.vy = -(52 + Math.random() * 34);
      slot.targetScale = 0.65 + Math.random() * 0.4;
      slot.sprite.position.set(slot.startX, slot.startY);
      slot.sprite.scale.set(0.1);
      slot.sprite.alpha = 0;
      slot.sprite.visible = true;
      spawned++;
    }
  }

  private drawBearBlink(openProgress: number): void {
    const g = this.bearBlinkOverlay;
    g.clear();
    if (openProgress <= 0) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.circle(192, 112, 10).fill({ color: 0xffffff });
    g.circle(270, 112, 10).fill({ color: 0xffffff });
    g.moveTo(183, 112).quadraticCurveTo(192, 117, 201, 112);
    g.stroke({ color: 0xaedef5, width: 4.5, cap: 'round' });
    g.moveTo(261, 112).quadraticCurveTo(270, 117, 279, 112);
    g.stroke({ color: 0xaedef5, width: 4.5, cap: 'round' });
  }

  private deformCloudMesh(
    mesh: MeshPlane,
    base: Float32Array,
    time: number,
    wind: number,
    phaseOffset: number,
  ): void {
    const buf = mesh.geometry.getBuffer('aPosition');
    const data = buf.data as Float32Array;
    const cols = 5;
    const rows = 5;

    for (let row = 0; row < rows; row++) {
      const weight = Math.pow(1 - row / (rows - 1), 1.35);
      for (let col = 0; col < cols; col++) {
        const idx = (row * cols + col) * 2;
        const bx = base[idx];
        const by = base[idx + 1];
        const waveX = Math.sin(time * 0.95 + col * 0.9 + row * 0.7 + phaseOffset) * 3.2;
        const waveY = Math.cos(time * 0.78 + col * 1.1 + phaseOffset) * 2.4;
        data[idx] = bx + (waveX + wind * 3.8) * weight;
        data[idx + 1] = by + waveY * weight;
      }
    }
    buf.update();
  }

  update(dt: number, clock: AtmosphereClock): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    const w = this.layout?.width ?? 960;
    const h = this.layout?.height ?? 540;
    const horizonY = this.layout?.dunes.horizonY ?? h * 0.548;

    const leftWind = clock.windAt(w * 0.14);
    const rightWind = clock.windAt(w * 0.84);
    this.deformCloudMesh(this.chickCloudMesh, this.chickBaseVerts, clock.time, leftWind, 0);
    this.deformCloudMesh(this.bearCloud, this.bearBaseVerts, clock.time, rightWind, 1.8);

    if (this.layout) {
      const crx = this.chickRecoilX.step(0, safeDt);
      const cry = this.chickRecoilY.step(0, safeDt);
      this.chickCloudContainer.x = this.layout.chickCloud.x + crx;
      this.chickCloudContainer.y = this.layout.chickCloud.y + cry;

      const brx = this.bearRecoilX.step(0, safeDt);
      const bry = this.bearRecoilY.step(0, safeDt);
      this.bearCloudContainer.x = this.layout.bearCloud.x + brx;
      this.bearCloudContainer.y = this.layout.bearCloud.y + bry;

      this.planeSequence?.syncCloudTransform(
        this.chickCloudContainer.x,
        this.chickCloudContainer.y,
        this.layout.chickCloud.scale,
        this.bearCloudContainer.x,
        this.bearCloudContainer.y,
        this.layout.bearCloud.scale,
      );
    }

    if (this.blinkDurationLeft > 0) {
      this.blinkDurationLeft -= safeDt;
      if (this.blinkDurationLeft <= 0) {
        this.drawBearBlink(0);
      }
    } else {
      this.blinkTimer -= safeDt;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = 8 + Math.random() * 6;
        this.blinkDurationLeft = 0.25;
        this.drawBearBlink(1);
      }
    }

    for (let i = 0; i < this.wisps.length; i++) {
      const wisp = this.wisps[i];
      const windPush = clock.windAt(wisp.sprite.x) * 2.2;
      wisp.sprite.x += (wisp.speed + Math.max(-1, windPush)) * safeDt;
      wisp.sprite.y = wisp.baseY + Math.sin(clock.time * 0.4 + i * 2) * 3;
      if (wisp.sprite.x > w + 160) {
        wisp.sprite.x = -160;
      }
    }

    const gullTwilightDim =
      clock.timeOfDayProgress > 0.6 ? Math.max(0.25, 1 - (clock.timeOfDayProgress - 0.6) * 1.6) : 1;
    for (let i = 0; i < this.gulls.length; i++) {
      const gull = this.gulls[i];
      gull.stateTimer -= safeDt;
      if (gull.state === 'glide') {
        if (gull.stateTimer <= 0) {
          gull.state = 'flap';
          gull.flapIndex = 0;
          gull.beatStep = 0;
          gull.stateTimer = 0.55 + Math.random() * 0.25;
        } else {
          gull.sprite.texture = this.textures.seagull;
        }
      } else {
        gull.beatStep += safeDt;
        if (gull.beatStep >= 0.13) {
          gull.beatStep = 0;
          gull.flapIndex = (gull.flapIndex + 1) % 3;
          gull.sprite.texture =
            gull.flapIndex === 0
              ? this.textures.seagullFlapUp
              : gull.flapIndex === 1
                ? this.textures.seagull
                : this.textures.seagullFlapDown;
        }
        if (gull.stateTimer <= 0) {
          gull.state = 'glide';
          gull.stateTimer = 2.4 + Math.random() * 0.6;
          gull.sprite.texture = this.textures.seagull;
        }
      }

      const gullWind = clock.windAt(gull.sprite.x);
      if (gull.tier === 'horizon') {
        gull.driftOffsetX += (8 + gullWind * 6) * safeDt;
        if (gull.baseX + gull.driftOffsetX > w + 50) {
          gull.driftOffsetX = -gull.baseX - 50;
        }
      } else {
        gull.driftOffsetX = Math.sin(clock.time * 0.38 + gull.pathPhase) * 16 + gullWind * 7;
      }

      gull.nudgeVy += (-gull.nudgeY * 18 - gull.nudgeVy * 5) * safeDt;
      gull.nudgeY += gull.nudgeVy * safeDt;

      if (gull.rolling) {
        gull.rollAngle += safeDt * 12.5;
        if (gull.rollAngle >= Math.PI * 2) {
          gull.rollAngle = 0;
          gull.rolling = false;
        }
      }

      const glideArcY = Math.sin(clock.time * 1.15 + gull.pathPhase) * (gull.tier === 'fg' ? 5 : 2.5);
      const bankAngle =
        (gull.state === 'glide' ? Math.cos(clock.time * 1.15 + gull.pathPhase) * 0.09 : 0) +
        gull.rollAngle;

      gull.sprite.x = gull.baseX + gull.driftOffsetX;
      gull.sprite.y = gull.baseY + glideArcY + gull.nudgeY;
      gull.sprite.rotation = bankAngle;
      gull.sprite.alpha = (gull.tier === 'horizon' ? 0.72 : 1) * gullTwilightDim;
    }

    for (let i = 0; i < this.featherPool.length; i++) {
      const f = this.featherPool[i];
      if (!f.active) continue;
      f.age += safeDt;
      if (f.age >= f.life) {
        f.active = false;
        f.sprite.visible = false;
        continue;
      }
      const wLocal = clock.windAt(f.sprite.x);
      f.sprite.x += (wLocal * 26 + Math.sin(f.age * 4 + f.phase) * 16) * safeDt;
      f.sprite.y += f.vy * safeDt;
      f.sprite.rotation = Math.sin(f.age * 3.5 + f.phase) * 0.45;
      f.sprite.alpha = Math.min(1, (1 - f.age / f.life) * 2.2);
    }

    for (let i = 0; i < this.heartPool.length; i++) {
      const hp = this.heartPool[i];
      if (!hp.active) continue;
      if (hp.delay > 0) {
        hp.delay -= safeDt;
        continue;
      }
      hp.age += safeDt;
      const u = hp.age / hp.life;
      if (u >= 1) {
        hp.active = false;
        hp.sprite.visible = false;
        continue;
      }
      const pop = Math.min(1, hp.age / 0.22);
      hp.sprite.scale.set(hp.targetScale * (0.15 + Math.sin(pop * Math.PI * 0.5) * 0.85));
      hp.sprite.x = hp.startX + hp.vx * hp.age;
      hp.sprite.y = hp.startY + hp.vy * hp.age;
      hp.sprite.alpha = u > 0.4 ? Math.max(0, 1 - (u - 0.4) / 0.6) : 1;
    }

    this.planeSequence?.update(safeDt, clock, horizonY, h);
  }

  applyLayout(layout: SceneLayout): void {
    this.layout = layout;
    const { width: w, dunes, unitScale: u } = layout;
    const skyH = dunes.horizonY + 6;

    this.skyGradient?.destroy();
    this.skyGradient = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: '#0EA5E9' },
        { offset: 0.58, color: '#38BDF8' },
        { offset: 1, color: '#67E8F9' },
      ],
      textureSpace: 'local',
    });

    this.skyBg.clear();
    this.skyBg.rect(-PARALLAX_OVERSCAN, -24, w + PARALLAX_OVERSCAN * 2, skyH + 24);
    this.skyBg.fill(this.skyGradient);

    this.drawStars(w, skyH);

    this.wisps.forEach((wisp, idx) => {
      wisp.baseY = skyH * (0.24 + idx * 0.22);
      wisp.baseScale = (0.65 + idx * 0.14) * u;
      wisp.sprite.x = w * (0.18 + idx * 0.34);
      wisp.sprite.y = wisp.baseY;
      wisp.sprite.scale.set(wisp.baseScale);
    });

    this.chickCloudContainer.x = layout.chickCloud.x;
    this.chickCloudContainer.y = layout.chickCloud.y;
    this.chickCloudContainer.scale.set(layout.chickCloud.scale);

    this.bearCloudContainer.x = layout.bearCloud.x;
    this.bearCloudContainer.y = layout.bearCloud.y;
    this.bearCloudContainer.scale.set(layout.bearCloud.scale);

    this.planeSequence?.applyLayout(layout);

    for (let i = 0; i < 3; i++) {
      const cfg = layout.seagulls[i];
      if (!cfg) continue;
      this.gulls[i].baseX = cfg.x;
      this.gulls[i].baseY = cfg.y;
      this.gulls[i].baseScale = cfg.scale;
      this.gulls[i].sprite.x = cfg.x;
      this.gulls[i].sprite.y = cfg.y;
      this.gulls[i].sprite.scale.set(cfg.scale);
    }

    const horizonSpots = [
      { x: w * 0.36, y: skyH * 0.78 },
      { x: w * 0.64, y: skyH * 0.84 },
    ];
    for (let j = 0; j < 2; j++) {
      const gull = this.gulls[3 + j];
      gull.baseX = horizonSpots[j].x;
      gull.baseY = horizonSpots[j].y;
      gull.baseScale = 0.42 * u;
      gull.sprite.x = gull.baseX;
      gull.sprite.y = gull.baseY;
      gull.sprite.scale.set(gull.baseScale);
    }
  }

  destroyLayer(): void {
    gsap.killTweensOf(this.bearCloudContainer.scale);
    gsap.killTweensOf(this.starsLayer);
    this.planeSequence?.destroy();
    this.planeSequence = null;
    this.skyGradient?.destroy();
  }
}
