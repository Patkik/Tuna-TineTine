/**
 * OctopusBottleCinema.ts — Continuous 5-frame San-X kawaii cinema sequence:
 * Frame 1 (0.0–1.5s): Discovery — Octopus pops up from surf holding corked bottle high + ripples + waterPlop
 * Frame 2 (1.5–3.5s): Swimming In — Cradles bottle in arms, paddles toward diagonal speckled shore + splashes
 * Frame 3 (3.5–5.5s): Stepping Ashore — Waddles (±6 deg) out of surf leaving water drops; curious crab hops
 * Frame 4 (5.5–7.5s): Gentle Placement — Camera pushes in; leans to nestle diagonal bottle in sand + sparkles
 * Frame 5 (7.5–9.6s): Mission Complete — Smoothly zooms back out & melts seamlessly onto live BeachStage!
 */
import { Container, FillGradient, Graphics, Sprite, Texture } from 'pixi.js';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import type { SceneLayout } from '../layout/sceneLayout';
import {
  createFoamRingTexture,
  createMoteTexture,
  type Stage1Textures,
  type Stage2Textures,
} from '../assets/svgTextureFactory';
import { audioManager } from '../../core/audioManager';
import { triggerHaptic } from '../../core/haptics';
import { easeOutBack, getOctopusCinemaShot } from './octopusCinemaMath';

interface PooledEffect {
  sprite: Sprite;
  kind: 'ripple' | 'drop' | 'sparkle' | 'puff';
  active: boolean;
  vx: number;
  vy: number;
  gravity: number;
  age: number;
  life: number;
  baseScale: number;
}

export class OctopusBottleCinema extends Container {
  private readonly world = new Container();
  private readonly skyBg = new Graphics();
  private readonly seaBg = new Graphics();
  private readonly waveBars = new Graphics();
  private readonly shoreGfx = new Graphics();
  private readonly sandDimple = new Graphics();

  private readonly bearCloud: Sprite;
  private readonly chickCloud: Sprite;
  private readonly sailboat: Sprite;
  private readonly gulls: Sprite[] = [];
  private readonly crab: Sprite;

  private readonly actorRig = new Container();
  private readonly octopusBody: Sprite;
  private readonly bottleGroup = new Container();
  private readonly bottleBody: Sprite;
  private readonly bottleCork: Sprite;
  private readonly armHug: Sprite;
  private readonly armWave: Sprite;

  private readonly fxPool: PooledEffect[] = [];

  private viewW = 1024;
  private viewH = 576;
  private unitScale = 1;
  private elapsed = 0;
  private finished = false;
  private handoffTriggered = false;

  private cuePopPlayed = false;
  private cueCrabPlayed = false;
  private cuePlacePlayed = false;
  private splashTimer = 0;
  private dripTimer = 0;
  private sparkleTimer = 0;

  private onHandoffCb?: () => void;
  private onCompleteCb?: () => void;

  constructor(
    stage1: Stage1Textures,
    stage2: Stage2Textures,
    onHandoffToLiveShore?: () => void,
    onComplete?: () => void,
  ) {
    super();
    this.onHandoffCb = onHandoffToLiveShore;
    this.onCompleteCb = onComplete;
    this.alpha = 0;

    this.addChild(this.world);

    this.bearCloud = new Sprite(stage1.bearCloud);
    this.bearCloud.anchor.set(0.5, 1);

    this.chickCloud = new Sprite(stage1.chickCloud);
    this.chickCloud.anchor.set(0.5, 1);

    this.sailboat = new Sprite(stage1.sailboat);
    this.sailboat.anchor.set(0.5, 0.86);

    for (let i = 0; i < 3; i++) {
      const g = new Sprite(stage1.seagull);
      g.anchor.set(0.5, 0.5);
      this.gulls.push(g);
    }

    this.crab = new Sprite(stage2.crabCurious);
    this.crab.anchor.set(0.5, 0.7);
    this.crab.visible = false;

    this.world.addChild(
      this.skyBg,
      this.bearCloud,
      this.chickCloud,
      ...this.gulls,
      this.seaBg,
      this.waveBars,
      this.sailboat,
      this.shoreGfx,
      this.sandDimple,
      this.crab,
    );

    // Hero Octopus + Corked Sky-Blue Bottle + Layer-ordered Arms
    this.octopusBody = new Sprite(stage2.octopusHero);
    this.octopusBody.anchor.set(0.5, 0.65);

    this.bottleBody = new Sprite(stage2.bottleBody);
    this.bottleBody.anchor.set(0.5, 0.55);
    this.bottleCork = new Sprite(stage2.bottleCork);
    this.bottleCork.anchor.set(0.5, 0.85);
    this.bottleCork.position.set(0, -34);
    this.bottleGroup.addChild(this.bottleBody, this.bottleCork);

    this.armHug = new Sprite(stage2.octopusArmHug);
    this.armHug.anchor.set(0.25, 0.55);

    this.armWave = new Sprite(stage2.octopusArmWave);
    this.armWave.anchor.set(0.5, 0.88);
    this.armWave.visible = false;

    this.actorRig.addChild(
      this.armWave,
      this.octopusBody,
      this.bottleGroup,
      this.armHug,
    );
    this.world.addChild(this.actorRig);

    // Pre-allocated effect pool (ripples, droplets, sparkles, sand puffs)
    const foamTex = createFoamRingTexture();
    const moteTex = createMoteTexture();

    const addPoolSlot = (tex: Texture, kind: PooledEffect['kind']) => {
      const sp = new Sprite(tex);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.world.addChild(sp);
      this.fxPool.push({
        sprite: sp,
        kind,
        active: false,
        vx: 0,
        vy: 0,
        gravity: 0,
        age: 0,
        life: 0.8,
        baseScale: 1,
      });
    };

    for (let i = 0; i < 6; i++) addPoolSlot(foamTex, 'ripple');
    for (let i = 0; i < 12; i++) addPoolSlot(stage2.waterDrop, 'drop');
    for (let i = 0; i < 8; i++) addPoolSlot(stage2.goldStar, 'sparkle');
    for (let i = 0; i < 8; i++) addPoolSlot(moteTex, 'puff');
  }

  applyLayout(layout: SceneLayout): void {
    this.viewW = Math.max(320, layout.width);
    this.viewH = Math.max(180, layout.height);
    this.unitScale = Math.min(this.viewW / 1024, this.viewH / 576);
    this.redrawStaticBackdrops();
  }

  private redrawStaticBackdrops(): void {
    const w = this.viewW;
    const h = this.viewH;
    const horizonY = h * 0.54;

    this.skyBg.clear();
    const skyGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: horizonY },
      colorStops: [
        { offset: 0, color: 0x0ea5e9 },
        { offset: 0.62, color: 0x38bdf8 },
        { offset: 1, color: 0x67e8f9 },
      ],
      textureSpace: 'global',
    });
    this.skyBg.rect(-120, -120, w + 240, horizonY + 140);
    this.skyBg.fill(skyGrad);

    this.seaBg.clear();
    const seaGrad = new FillGradient({
      type: 'linear',
      start: { x: 0, y: horizonY },
      end: { x: 0, y: h + 120 },
      colorStops: [
        { offset: 0, color: 0x58c4f6 },
        { offset: 0.45, color: 0x7dd3fc },
        { offset: 1, color: 0xbae6fd },
      ],
      textureSpace: 'global',
    });
    this.seaBg.rect(-120, horizonY, w + 240, h - horizonY + 160);
    this.seaBg.fill(seaGrad);
  }

  private drawDiagonalShore(enterProgress: number, t: number): void {
    const w = this.viewW;
    const h = this.viewH;
    const u = this.unitScale;
    const sg = this.shoreGfx;
    sg.clear();
    if (enterProgress <= 0.005) return;

    // Diagonal sandy shoreline rises cleanly from lower-right corner
    const slideX = (1 - enterProgress) * w * 0.92;
    const slideY = (1 - enterProgress) * h * 0.48;

    const x0 = w * 0.24 + slideX;
    const y0 = h * 1.04 + slideY;
    const x1 = w * 1.08 + slideX * 0.4;
    const y1 = h * 0.56 + slideY;

    const wave1 = Math.sin(t * 2.4) * 6 * u;
    const wave2 = Math.cos(t * 2.1) * 5 * u;

    // White scalloped seafoam border
    sg.moveTo(x0 - 24 * u, y0 + 20 * u);
    sg.bezierCurveTo(
      w * 0.46 + slideX * 0.7,
      h * 0.84 + wave1 + slideY * 0.8,
      w * 0.72 + slideX * 0.5,
      h * 0.68 - wave2 + slideY * 0.6,
      x1,
      y1 - 12 * u,
    );
    sg.lineTo(x1 + 120, h + 140);
    sg.lineTo(x0 - 80, h + 140);
    sg.closePath();
    sg.fill({ color: 0xffffff, alpha: 0.94 });

    // Wet sand tint edge (#E8D69B)
    sg.moveTo(x0 - 4 * u, y0 + 24 * u);
    sg.bezierCurveTo(
      w * 0.48 + slideX * 0.7,
      h * 0.86 + wave1 * 0.7 + slideY * 0.8,
      w * 0.74 + slideX * 0.5,
      h * 0.7 - wave2 * 0.7 + slideY * 0.6,
      x1,
      y1,
    );
    sg.lineTo(x1 + 120, h + 140);
    sg.lineTo(x0 - 60, h + 140);
    sg.closePath();
    sg.fill({ color: 0xe8d69b });

    // Main speckled warm cream sand (#F3E5AB)
    sg.moveTo(x0 + 18 * u, y0 + 28 * u);
    sg.bezierCurveTo(
      w * 0.5 + slideX * 0.7,
      h * 0.89 + slideY * 0.8,
      w * 0.76 + slideX * 0.5,
      h * 0.73 + slideY * 0.6,
      x1,
      y1 + 14 * u,
    );
    sg.lineTo(x1 + 120, h + 140);
    sg.lineTo(x0 - 40, h + 140);
    sg.closePath();
    sg.fill({ color: 0xf3e5ab });

    // Subtle pastel sand speckles
    const specks = [
      [0.44, 0.92], [0.58, 0.86], [0.68, 0.91], [0.76, 0.8],
      [0.84, 0.89], [0.91, 0.74], [0.63, 0.79], [0.8, 0.69],
    ];
    for (let i = 0; i < specks.length; i++) {
      const sx = w * specks[i][0] + slideX * 0.65;
      const sy = h * specks[i][1] + slideY * 0.65;
      sg.circle(sx, sy, (2.2 + (i % 2)) * u);
      sg.fill({ color: i % 2 === 0 ? 0xd9be7d : 0xfffdf7, alpha: 0.78 });
    }
  }

  private spawnEffect(
    kind: PooledEffect['kind'],
    x: number,
    y: number,
    vx: number,
    vy: number,
    gravity: number,
    life: number,
    baseScale: number,
    tint = 0xffffff,
  ): void {
    const slot = this.fxPool.find((e) => !e.active && e.kind === kind);
    if (!slot) return;
    slot.active = true;
    slot.vx = vx;
    slot.vy = vy;
    slot.gravity = gravity;
    slot.age = 0;
    slot.life = life;
    slot.baseScale = baseScale;
    slot.sprite.position.set(x, y);
    slot.sprite.scale.set(baseScale);
    slot.sprite.tint = tint;
    slot.sprite.alpha = 1;
    slot.sprite.visible = true;
  }

  private spawnSplashBurst(x: number, y: number, count: number): void {
    const u = this.unitScale;
    this.spawnEffect('ripple', x, y + 18 * u, 0, 0, 0, 0.95, 0.55 * u);
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 1.9;
      const spd = (80 + Math.random() * 110) * u;
      this.spawnEffect(
        'drop',
        x + (Math.random() - 0.5) * 28 * u,
        y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 30 * u,
        360 * u,
        0.55 + Math.random() * 0.2,
        (0.55 + Math.random() * 0.3) * u,
      );
    }
  }

  private spawnPlacementSparkles(cx: number, cy: number): void {
    const u = this.unitScale;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + 0.3;
      const spd = (42 + Math.random() * 48) * u;
      this.spawnEffect(
        'sparkle',
        cx + Math.cos(ang) * 26 * u,
        cy + Math.sin(ang) * 26 * u,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 16 * u,
        24 * u,
        0.85,
        (0.45 + (i % 2) * 0.2) * u,
      );
    }
    for (let i = 0; i < 6; i++) {
      const ang = -Math.PI * (0.2 + Math.random() * 0.6);
      const spd = (45 + Math.random() * 55) * u;
      this.spawnEffect(
        'puff',
        cx + (Math.random() - 0.5) * 32 * u,
        cy + 28 * u,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        40 * u,
        0.6,
        (0.9 + Math.random() * 0.6) * u,
        0xf3e5ab,
      );
    }
  }

  update(dt: number, clock: AtmosphereClock): void {
    if (this.finished) return;
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    this.elapsed += safeDt;

    // Fade softly in over 0.38s at start
    if (this.elapsed < 0.38) {
      this.alpha = Math.min(1, this.elapsed / 0.38);
    } else if (this.elapsed >= 8.75) {
      this.alpha = Math.max(0, 1 - (this.elapsed - 8.75) / 0.85);
    } else {
      this.alpha = 1;
    }

    const w = this.viewW;
    const h = this.viewH;
    const u = this.unitScale;
    const horizonY = h * 0.54;
    const shot = getOctopusCinemaShot(this.elapsed);

    // Draw drifting horizontal white wave bars across turquoise sea
    const wg = this.waveBars;
    wg.clear();
    const spanW = w + 160;
    for (let i = 0; i < 12; i++) {
      const y = horizonY + 14 * u + i * ((h - horizonY - 24 * u) / 12);
      const drift = this.elapsed * (16 + (i % 4) * 5) * (shot.frame === 'swimming' ? 1.8 : 1);
      const x = -80 + ((i * 179 + drift) % spanW);
      const len = (38 + (i % 3) * 26) * u;
      wg.moveTo(x, y);
      wg.lineTo(x + len, y);
    }
    wg.stroke({ color: 0xffffff, alpha: 0.68, width: 2.6 * u, cap: 'round' });

    // Background parallax clouds + bobbing sailboat + gulls
    const cloudParallaxX =
      shot.frame === 'discovery'
        ? 0
        : shot.frame === 'swimming'
          ? -38 * u * shot.localProgress
          : -38 * u;
    const showHorizonClouds = shot.frame === 'discovery' || shot.frame === 'swimming';
    this.bearCloud.visible = showHorizonClouds;
    this.chickCloud.visible = showHorizonClouds;
    this.bearCloud.position.set(w * 0.82 + cloudParallaxX, horizonY + 4 * u);
    this.bearCloud.scale.set(u * 0.84);
    this.chickCloud.position.set(w * 0.1 + cloudParallaxX, horizonY + 4 * u);
    this.chickCloud.scale.set(u * 0.76);

    for (let i = 0; i < this.gulls.length; i++) {
      const g = this.gulls[i];
      g.visible = showHorizonClouds;
      g.position.set(
        w * (0.09 + i * 0.36) + Math.sin(clock.time * 0.6 + i) * 14 * u,
        h * (0.1 + (i % 2) * 0.12) + Math.cos(clock.time * 1.4 + i) * 5 * u,
      );
      g.scale.set(u * (0.72 - i * 0.08));
    }

    const boatX =
      shot.frame === 'placement'
        ? w * 0.18
        : w * 0.27 + cloudParallaxX * 0.7;
    this.sailboat.position.set(
      boatX,
      horizonY + 6 * u + Math.sin(clock.time * 2.2) * 2.5 * u,
    );
    this.sailboat.rotation = Math.sin(clock.time * 1.9) * 0.05;
    this.sailboat.scale.set(u * 0.84);

    // Camera zoom curve (push-in cleanly on Frame 4 placement, zoom out on Frame 5)
    let camZoom = 1;
    let camFocusX = w * 0.5;
    let camFocusY = h * 0.58;
    if (shot.frame === 'placement') {
      const k = Math.min(1, shot.localProgress / 0.45);
      const ease = 1 - Math.pow(1 - k, 2.5);
      camZoom = 1 + 0.36 * ease;
      camFocusX = w * 0.56;
      camFocusY = h * 0.62;
    } else if (shot.frame === 'mission_complete') {
      const k = Math.min(1, shot.localProgress / 0.55);
      const ease = 1 - Math.pow(1 - k, 2.2);
      camZoom = 1.36 - 0.36 * ease;
      camFocusX = w * 0.56 - 0.06 * w * ease;
      camFocusY = h * 0.62 - 0.04 * h * ease;
    }
    this.world.pivot.set(camFocusX, camFocusY);
    this.world.position.set(camFocusX, camFocusY);
    this.world.scale.set(camZoom);

    // Diagonal sandy shoreline visibility & motion
    let shoreEnter = 0;
    if (shot.frame === 'swimming') {
      shoreEnter = Math.max(0, (shot.localProgress - 0.15) / 0.85) * 0.65;
    } else if (shot.frame === 'ashore' || shot.frame === 'placement' || shot.frame === 'mission_complete') {
      shoreEnter = 1;
    }
    this.drawDiagonalShore(shoreEnter, this.elapsed);

    // Per-frame Hero Octopus & Bottle choreography
    this.sandDimple.clear();
    this.armWave.visible = false;

    if (shot.frame === 'discovery') {
      // Frame 1: Octopus pops up with bottle held high!
      this.crab.visible = false;
      this.armHug.visible = false;
      const popStart = 0.25;
      const popU = Math.max(0, Math.min(1, (shot.localProgress - popStart) / (1 - popStart)));
      const springY = popU > 0 ? easeOutBack(popU) : 0;

      if (!this.cuePopPlayed && popU > 0.08) {
        this.cuePopPlayed = true;
        audioManager.playSfx('waterPlop');
        triggerHaptic(12);
        this.spawnSplashBurst(w * 0.49, horizonY + 86 * u, 6);
      }

      const startY = horizonY + 210 * u;
      const restY = horizonY + 74 * u;
      this.actorRig.position.set(w * 0.49, startY + (restY - startY) * springY);
      this.actorRig.rotation = Math.sin(this.elapsed * 4) * 0.04;
      this.actorRig.scale.set(u * (0.85 + 0.18 * Math.min(1, popU * 1.4)));

      this.octopusBody.position.set(-14 * u, 0);
      this.bottleGroup.position.set(58 * u, -28 * u);
      this.bottleGroup.rotation = -0.22;
      this.bottleGroup.scale.set(0.95);
    } else if (shot.frame === 'swimming') {
      // Frame 2: Cradles bottle & swims smoothly toward shallows
      this.crab.visible = false;
      this.armHug.visible = true;
      const p = shot.localProgress;
      const bob = Math.sin(this.elapsed * 6.8) * 7 * u;

      this.actorRig.position.set(
        w * (0.49 + p * 0.03),
        horizonY + 74 * u + p * 26 * u + bob,
      );
      this.actorRig.rotation = Math.sin(this.elapsed * 3.4) * 0.06;
      this.actorRig.scale.set(u * (1.03 + 0.08 * p));

      this.octopusBody.position.set(-12 * u, 0);
      this.bottleGroup.position.set(44 * u, 6 * u);
      this.bottleGroup.rotation = -0.14;
      this.bottleGroup.scale.set(0.92);

      this.armHug.position.set(8 * u, 8 * u);
      this.armHug.rotation = 0.08 + Math.sin(this.elapsed * 8) * 0.1;

      this.splashTimer -= safeDt;
      if (this.splashTimer <= 0) {
        this.splashTimer = 0.34;
        this.spawnSplashBurst(this.actorRig.x - 16 * u, this.actorRig.y + 38 * u, 3);
      }
    } else if (shot.frame === 'ashore') {
      // Frame 3: Waddles onto speckled sand (+/-6 deg tilt) while curious red crab hops
      this.armHug.visible = true;
      this.crab.visible = true;
      const p = shot.localProgress;

      if (!this.cueCrabPlayed && p > 0.28) {
        this.cueCrabPlayed = true;
        audioManager.playSfx('crab');
      }

      const stepWaddle = Math.sin(this.elapsed * 9.5);
      const squash = 1 + Math.abs(stepWaddle) * 0.06;
      this.actorRig.position.set(
        w * (0.48 + p * 0.06),
        h * (0.72 + p * 0.04) - Math.abs(stepWaddle) * 7 * u,
      );
      this.actorRig.rotation = stepWaddle * 0.105; // +/- 6 deg tilt!
      this.actorRig.scale.set((u * 1.12) / squash, u * 1.12 * squash);

      this.octopusBody.position.set(-12 * u, 0);
      this.bottleGroup.position.set(42 * u, 4 * u);
      this.bottleGroup.rotation = -0.12;
      this.bottleGroup.scale.set(0.94);
      this.armHug.position.set(8 * u, 8 * u);
      this.armHug.rotation = 0.05;

      // Crab hops cheerfully on the right warm sand
      const crabHop = p > 0.28 && p < 0.68 ? Math.abs(Math.sin((p - 0.28) * Math.PI * 5)) * 18 * u : 0;
      this.crab.position.set(w * 0.82, h * 0.83 - crabHop);
      this.crab.scale.set(u * 0.92);

      this.dripTimer -= safeDt;
      if (this.dripTimer <= 0) {
        this.dripTimer = 0.3;
        this.spawnEffect(
          'drop',
          this.actorRig.x + (Math.random() - 0.5) * 32 * u,
          this.actorRig.y + 32 * u,
          (Math.random() - 0.5) * 18 * u,
          10 * u,
          280 * u,
          0.45,
          0.55 * u,
        );
      }
    } else if (shot.frame === 'placement') {
      // Frame 4: Leans forward, nestles diagonal bottle into warm sand + golden sparkles
      this.crab.visible = false;
      this.armHug.visible = true;
      const p = shot.localProgress;
      const nestle = Math.min(1, p / 0.55);
      const settle = 1 - Math.pow(1 - nestle, 2.4);

      if (!this.cuePlacePlayed && p >= 0.48) {
        this.cuePlacePlayed = true;
        audioManager.playSfx('chime');
        audioManager.playSfx('sandCrunch');
        triggerHaptic(14);
        this.spawnPlacementSparkles(w * 0.62, h * 0.72);
      }

      this.sandDimple.ellipse(w * 0.615, h * 0.79, 44 * u * settle, 12 * u * settle);
      this.sandDimple.fill({ color: 0xe6d395, alpha: 0.85 * settle });

      this.actorRig.position.set(w * 0.52, h * 0.72 + settle * 8 * u);
      this.actorRig.rotation = Math.sin(settle * Math.PI) * 0.08;
      this.actorRig.scale.set(u * 1.15);

      this.octopusBody.position.set(-48 * u, -6 * u);
      this.bottleGroup.position.set(66 * u, -6 * u + settle * 18 * u);
      this.bottleGroup.rotation = -0.14 - settle * 0.16;
      this.bottleGroup.scale.set(1.06);

      // Gentle tentacle pat after placement
      const pat = p > 0.55 ? Math.sin((p - 0.55) * 18) * 0.14 : 0;
      this.armHug.position.set(10 * u, -8 * u + settle * 10 * u);
      this.armHug.rotation = -0.15 + pat;

      this.sparkleTimer -= safeDt;
      if (p > 0.45 && this.sparkleTimer <= 0) {
        this.sparkleTimer = 0.42;
        this.spawnEffect(
          'sparkle',
          w * (0.56 + Math.random() * 0.12),
          h * (0.62 + Math.random() * 0.14),
          0,
          -14 * u,
          0,
          0.7,
          0.42 * u,
        );
      }
    } else {
      // Frame 5: Zoom out smoothly + octopus waves proudly beside settled sparkling bottle
      this.crab.visible = false;
      this.armHug.visible = false;
      this.armWave.visible = true;
      const p = shot.localProgress;

      if (!this.handoffTriggered && p >= 0.35) {
        this.handoffTriggered = true;
        this.onHandoffCb?.();
      }

      this.sandDimple.ellipse(w * 0.58, h * 0.78, 42 * u, 11 * u);
      this.sandDimple.fill({ color: 0xe6d395, alpha: 0.8 });

      this.actorRig.position.set(w * 0.52, h * 0.73);
      this.actorRig.rotation = 0;
      this.actorRig.scale.set(u * (1.15 - p * 0.25));

      this.octopusBody.position.set(-54 * u, -4 * u);
      this.armWave.position.set(-90 * u, -2 * u);
      this.armWave.rotation = -0.35 + Math.sin(this.elapsed * 10) * 0.28;

      this.bottleGroup.position.set(42 * u, 8 * u);
      this.bottleGroup.rotation = -0.28;
      this.bottleGroup.scale.set(1.0);
    }

    // Step pooled particles (zero allocations)
    for (let i = 0; i < this.fxPool.length; i++) {
      const fx = this.fxPool[i];
      if (!fx.active) continue;
      fx.age += safeDt;
      const frac = fx.age / fx.life;
      if (frac >= 1) {
        fx.active = false;
        fx.sprite.visible = false;
        continue;
      }
      if (fx.kind === 'ripple') {
        fx.sprite.scale.set(fx.baseScale * (0.5 + frac * 1.45));
        fx.sprite.alpha = (1 - frac) * 0.88;
      } else if (fx.kind === 'sparkle') {
        fx.sprite.x += fx.vx * safeDt;
        fx.sprite.y += fx.vy * safeDt;
        fx.sprite.rotation += safeDt * 2.2;
        const pulse = Math.sin(frac * Math.PI);
        fx.sprite.scale.set(fx.baseScale * (0.6 + 0.5 * pulse));
        fx.sprite.alpha = pulse;
      } else {
        fx.vy += fx.gravity * safeDt;
        fx.sprite.x += fx.vx * safeDt;
        fx.sprite.y += fx.vy * safeDt;
        fx.sprite.alpha = Math.max(0, 1 - frac);
      }
    }

    if (this.elapsed >= 9.6) {
      this.finished = true;
      this.onCompleteCb?.();
    }
  }

  destroyCinema(): void {
    this.finished = true;
  }
}
