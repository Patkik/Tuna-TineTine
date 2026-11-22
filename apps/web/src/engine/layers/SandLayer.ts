/**
 * SandLayer.ts — Clean foreground dunes & living coastal characters powered by AtmosphereClock:
 * - Zero sand mounds on the beach (scratched tickets replace sand mounds)
 * - Over-scanned organic sand dunes for 1.4x parallax without edge gaps
 * - Spring-damper striped beach umbrella (~26 deg peak bend on strong wind gusts)
 * - Korilakkuma: natural blinking, tap gaze tracking & spring-fluttering bow
 * - Rilakkuma: sleepy breathing bounce & occasional wiggling yellow-soled feet
 * - Sailboat bobbing & tilting directly from Ocean's shared wave height formula
 * - 3 red crabs with randomized idle/scuttle/wiggle/duck state machines
 */
import { Circle, Container, Graphics, Sprite } from 'pixi.js';
import gsap from 'gsap';
import type { Stage1Textures } from '../assets/svgTextureFactory';
import type { PlacedItem, SceneLayout } from '../layout/sceneLayout';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import { SpringDamper } from '../atmosphere/SpringDamper';
import { triggerHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

const PARALLAX_OVERSCAN = 40;

interface CrabAgent {
  sprite: Sprite;
  homeX: number;
  homeY: number;
  baseScale: number;
  baseRot: number;
  offsetX: number;
  offsetY: number;
  targetOffsetX: number;
  state: 'idle' | 'scuttle' | 'wiggle' | 'duck';
  timer: number;
  phase: number;
}

export class SandLayer extends Container {
  private backSand = new Graphics();
  private behindDuneLayer = new Container();
  private frontSand = new Graphics();
  private propsLayer = new Container();

  public korilakkuma!: Container;
  private korilakkumaBody!: Sprite;
  private korilakkumaEyes = new Graphics();
  private korilakkumaBow!: Sprite;

  public rilakkumaHead!: Sprite;
  public umbrella!: Sprite;
  private umbrellaShadow = new Graphics();
  public bucket!: Sprite;
  public kiiroitoriBuried!: Sprite;
  public sailboat!: Sprite;
  public chickToy!: Sprite;
  public octopus!: Sprite;
  public bearBeachToy!: Sprite;
  public rilakkumaFeet: [Sprite, Sprite];
  public crabs: Sprite[] = [];
  private crabAgents: CrabAgent[] = [];
  public starfishMain!: Sprite;
  public whiteShellMain!: Sprite;
  public pinkShells: Sprite[] = [];
  public coralTwigs: Sprite[] = [];
  public flipFlops: [Sprite, Sprite];

  private layout: SceneLayout | null = null;
  private koriBaseY = 0;
  private rilaBaseY = 0;
  private rilaBaseRot = 0.6;
  private umbBaseRot = -0.22;
  private boatBaseY = 0;
  private boatBaseRot = -0.06;

  private readonly umbrellaSpring = new SpringDamper(-0.22, 42, 4.8);
  private readonly bowSpring = new SpringDamper(0.384, 65, 5.0);
  private readonly boatBobSpring = new SpringDamper(0, 32, 4.8);
  private readonly boatRotSpring = new SpringDamper(-0.06, 36, 5.0);
  private readonly footSprings = [
    new SpringDamper(0, 85, 6.2),
    new SpringDamper(0, 85, 6.2),
  ];

  private koriBlinkTimer = 4.2;
  private koriBlinkLeft = 0;
  private gazeTarget = { x: 0, y: 0, hasTarget: false };
  private gazeOffset = { x: 0, y: 0 };
  private lastDrawnGaze = { x: 0, y: 0 };
  private footWiggleTimer = 5.5;
  private footWiggleDuration = 0;
  private onOctopusTap?: () => void;

  constructor(textures: Stage1Textures, options?: { onOctopusTap?: () => void }) {
    super();
    this.onOctopusTap = options?.onOctopusTap;

    this.addChild(this.backSand);
    this.addChild(this.behindDuneLayer);
    this.addChild(this.frontSand);
    this.addChild(this.propsLayer);

    this.korilakkuma = new Container();
    this.korilakkumaBody = new Sprite(textures.korilakkuma);
    this.korilakkumaBody.anchor.set(0.5, 0.72);
    this.korilakkuma.addChild(this.korilakkumaBody);

    this.drawKorilakkumaEyes(false, 0, 0);
    this.korilakkuma.addChild(this.korilakkumaEyes);

    this.korilakkumaBow = new Sprite(textures.korilakkumaBow);
    this.korilakkumaBow.anchor.set(0.5, 0.5);
    this.korilakkumaBow.x = 39;
    this.korilakkumaBow.y = -127.6;
    this.korilakkumaBow.rotation = 0.384;
    this.korilakkuma.addChild(this.korilakkumaBow);

    this.korilakkuma.eventMode = 'static';
    this.korilakkuma.cursor = 'pointer';
    this.korilakkuma.on('pointertap', () => {
      this.bowSpring.impulse(4.2);
      this.bounceSprite(this.korilakkuma, this.koriBaseY, 'wiggle');
    });
    this.behindDuneLayer.addChild(this.korilakkuma);

    this.rilakkumaHead = new Sprite(textures.rilakkumaHead);
    this.rilakkumaHead.anchor.set(0.5, 0.56);
    this.rilakkumaHead.eventMode = 'static';
    this.rilakkumaHead.cursor = 'pointer';
    this.rilakkumaHead.on('pointertap', () => this.wiggleRilakkuma());
    this.behindDuneLayer.addChild(this.rilakkumaHead);

    this.sailboat = new Sprite(textures.sailboat);
    this.sailboat.anchor.set(0.5, 0.85);
    this.behindDuneLayer.addChild(this.sailboat);

    this.propsLayer.addChild(this.umbrellaShadow);
    this.umbrella = new Sprite(textures.umbrella);
    this.umbrella.anchor.set(0.5, 0.96);
    this.propsLayer.addChild(this.umbrella);

    this.bucket = new Sprite(textures.bucket);
    this.bucket.anchor.set(0.5, 0.6);
    this.propsLayer.addChild(this.bucket);

    this.kiiroitoriBuried = new Sprite(textures.kiiroitoriBuried);
    this.kiiroitoriBuried.anchor.set(0.5, 0.55);
    this.kiiroitoriBuried.eventMode = 'static';
    this.kiiroitoriBuried.cursor = 'pointer';
    this.kiiroitoriBuried.on('pointertap', () =>
      this.bounceSprite(
        this.kiiroitoriBuried,
        this.layout?.kiiroitoriBuried.y ?? this.kiiroitoriBuried.y,
        'heart',
      ),
    );
    this.propsLayer.addChild(this.kiiroitoriBuried);

    this.chickToy = new Sprite(textures.chickToy);
    this.chickToy.anchor.set(0.5, 0.55);
    this.propsLayer.addChild(this.chickToy);

    this.octopus = new Sprite(textures.octopus);
    this.octopus.anchor.set(0.5, 0.55);
    this.octopus.hitArea = new Circle(0, 0, 48);
    this.octopus.eventMode = 'static';
    this.octopus.cursor = 'pointer';
    this.octopus.on('pointertap', () => {
      this.bounceSprite(this.octopus, this.layout?.octopus.y ?? this.octopus.y, 'wiggle');
      this.onOctopusTap?.();
    });
    this.propsLayer.addChild(this.octopus);

    this.bearBeachToy = new Sprite(textures.bearBeachToy);
    this.bearBeachToy.anchor.set(0.5, 0.55);
    this.propsLayer.addChild(this.bearBeachToy);

    this.rilakkumaFeet = [
      new Sprite(textures.rilakkumaFoot),
      new Sprite(textures.rilakkumaFoot),
    ];
    this.rilakkumaFeet.forEach((f) => {
      f.anchor.set(0.5, 0.5);
      this.propsLayer.addChild(f);
    });

    this.starfishMain = new Sprite(textures.starfish);
    this.starfishMain.anchor.set(0.5, 0.5);
    this.propsLayer.addChild(this.starfishMain);

    this.whiteShellMain = new Sprite(textures.whiteShell);
    this.whiteShellMain.anchor.set(0.5, 0.5);
    this.propsLayer.addChild(this.whiteShellMain);

    for (let i = 0; i < 3; i++) {
      const ps = new Sprite(textures.pinkShell);
      ps.anchor.set(0.5, 0.5);
      this.pinkShells.push(ps);
      this.propsLayer.addChild(ps);
    }

    for (let i = 0; i < 2; i++) {
      const twig = new Sprite(textures.coralTwig);
      twig.anchor.set(0.5, 0.6);
      this.coralTwigs.push(twig);
      this.propsLayer.addChild(twig);
    }

    this.flipFlops = [
      new Sprite(textures.flipFlop),
      new Sprite(textures.flipFlop),
    ];
    this.flipFlops.forEach((ff) => {
      ff.anchor.set(0.5, 0.5);
      this.propsLayer.addChild(ff);
    });

    for (let i = 0; i < 3; i++) {
      const crab = new Sprite(textures.crab);
      crab.anchor.set(0.5, 0.55);
      crab.eventMode = 'static';
      crab.cursor = 'pointer';
      const agent: CrabAgent = {
        sprite: crab,
        homeX: 120,
        homeY: 500,
        baseScale: 0.7,
        baseRot: 0,
        offsetX: 0,
        offsetY: 0,
        targetOffsetX: 0,
        state: 'idle',
        timer: 1.5 + i * 1.4,
        phase: i * 2.1,
      };
      crab.on('pointertap', () => this.pokeCrab(agent));
      this.crabs.push(crab);
      this.crabAgents.push(agent);
      this.propsLayer.addChild(crab);
    }
  }

  setGazeTarget(globalX: number, globalY: number): void {
    this.gazeTarget.x = globalX;
    this.gazeTarget.y = globalY;
    this.gazeTarget.hasTarget = true;
  }

  setOctopusVisible(visible: boolean): void {
    this.octopus.visible = visible;
  }

  private drawKorilakkumaEyes(closed: boolean, dx: number, dy: number): void {
    const g = this.korilakkumaEyes;
    g.clear();
    const lx = -37 + dx;
    const rx = 27 + dx;
    const ey = -61.6 + dy;

    if (closed) {
      g.moveTo(lx - 6.5, ey).quadraticCurveTo(lx, ey + 4, lx + 6.5, ey);
      g.stroke({ color: 0x4a2c1d, width: 4, cap: 'round' });
      g.moveTo(rx - 6.5, ey).quadraticCurveTo(rx, ey + 4, rx + 6.5, ey);
      g.stroke({ color: 0x4a2c1d, width: 4, cap: 'round' });
    } else {
      g.ellipse(lx, ey, 6.5, 7).fill({ color: 0x4a2c1d });
      g.ellipse(rx, ey, 6.5, 7).fill({ color: 0x4a2c1d });
    }
  }

  private drawDunes(layout: SceneLayout): void {
    const { width: w, height: h, dunes, unitScale: u } = layout;
    const { backSandY, frontDunePoints: p } = dunes;

    this.backSand.clear();
    this.backSand.rect(
      -PARALLAX_OVERSCAN,
      backSandY + 46 * u,
      w + PARALLAX_OVERSCAN * 2,
      h - backSandY,
    );
    this.backSand.fill({ color: 0xf3e5ab });

    const span = layout.isPortrait ? w * 0.18 : 62 * u;
    this.frontSand.clear();
    this.frontSand.moveTo(-PARALLAX_OVERSCAN, h + 20);
    this.frontSand.lineTo(-PARALLAX_OVERSCAN, p.startY + 4 * u);
    this.frontSand.bezierCurveTo(
      w * 0.1,
      p.leftCrestY + 10 * u,
      p.leftCrestX - span * 0.7,
      p.leftCrestY - 12 * u,
      p.leftCrestX,
      p.leftCrestY,
    );
    this.frontSand.bezierCurveTo(
      p.leftCrestX + span * 0.85,
      p.leftCrestY + 20 * u,
      p.valleyX - span * 0.7,
      p.valleyY + 12 * u,
      p.valleyX,
      p.valleyY,
    );
    this.frontSand.bezierCurveTo(
      p.valleyX + span * 0.8,
      p.valleyY - 16 * u,
      p.peakX - span * 1.05,
      p.peakY,
      p.peakX,
      p.peakY,
    );
    this.frontSand.bezierCurveTo(
      p.peakX + span * 0.95,
      p.peakY,
      p.rilakkumaClipX - span * 0.4,
      p.rilakkumaClipY - 22 * u,
      p.rilakkumaClipX,
      p.rilakkumaClipY,
    );
    this.frontSand.bezierCurveTo(
      p.rilakkumaClipX + span * 0.5,
      p.rilakkumaClipY + 32 * u,
      p.endX - span * 0.35,
      p.endY - 10 * u,
      p.endX,
      p.endY,
    );
    this.frontSand.bezierCurveTo(
      p.endX + span * 0.7,
      p.endY + 14 * u,
      w * 0.94,
      p.rightEdgeY,
      w + PARALLAX_OVERSCAN,
      p.rightEdgeY - 6 * u,
    );
    this.frontSand.lineTo(w + PARALLAX_OVERSCAN, h + 20);
    this.frontSand.closePath();
    this.frontSand.fill({ color: 0xf3e5ab });

    for (const foot of layout.rilakkumaFeet) {
      this.frontSand.ellipse(foot.x + 14 * u, foot.y + 8 * u, 20 * u, 16 * u);
      this.frontSand.fill({ color: 0xe6d395, alpha: 0.7 });
    }

    let seed = 109;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const dotColors = [0xdfc88e, 0xd9be7d, 0xfaf2d6, 0xfffdf7];
    for (let i = 0; i < 60; i++) {
      const gx = -PARALLAX_OVERSCAN + rand() * (w + PARALLAX_OVERSCAN * 2);
      const gy = p.peakY + 24 * u + rand() * (h - p.peakY - 28 * u);
      const gr = (1.5 + rand() * 3.2) * u;
      const col = dotColors[i % dotColors.length];
      this.frontSand.circle(gx, gy, gr);
      this.frontSand.fill({ color: col, alpha: i % 4 === 3 ? 0.55 : 0.72 });
    }

    this.umbrellaShadow.clear();
    this.umbrellaShadow.ellipse(0, 0, 15 * u, 4.5 * u);
    this.umbrellaShadow.fill({ color: 0xe4d29e, alpha: 0.55 });
  }

  private placeSprite(sprite: Sprite | Container, spec: PlacedItem): void {
    sprite.x = spec.x;
    sprite.y = spec.y;
    sprite.scale.set(spec.scale);
    sprite.rotation = spec.rotation ?? 0;
  }

  private bounceSprite(sprite: Container, restY: number, sfx: 'wiggle' | 'heart'): void {
    triggerHaptic(12);
    audioManager.playSfx(sfx);
    gsap.killTweensOf(sprite, 'y');
    gsap.fromTo(
      sprite,
      { y: restY - 12 },
      { y: restY, duration: 0.5, ease: 'bounce.out' },
    );
  }

  private wiggleRilakkuma(): void {
    triggerHaptic(12);
    audioManager.playSfx('wiggle');
    this.footSprings[0].impulse(5.5);
    this.footSprings[1].impulse(-5.5);
    this.footWiggleDuration = 0.9;
    gsap.killTweensOf(this.rilakkumaHead, 'rotation');
    gsap.fromTo(
      this.rilakkumaHead,
      { rotation: this.rilaBaseRot - 0.1 },
      {
        rotation: this.rilaBaseRot + 0.08,
        duration: 0.1,
        yoyo: true,
        repeat: 4,
        ease: 'sine.inOut',
        onComplete: () => {
          this.rilakkumaHead.rotation = this.rilaBaseRot;
        },
      },
    );
  }

  private pokeCrab(agent: CrabAgent): void {
    triggerHaptic(12);
    audioManager.playSfx('crab');
    const dir = agent.offsetX > 0 ? -1 : agent.offsetX < 0 ? 1 : Math.random() > 0.5 ? 1 : -1;
    const range = 34 * (this.layout?.unitScale ?? 1);
    agent.state = 'scuttle';
    agent.targetOffsetX = Math.max(-range, Math.min(range, agent.offsetX + dir * range));
    agent.timer = 0.85;
    agent.offsetY = 0;
  }

  update(dt: number, clock: AtmosphereClock): void {
    if (!this.layout) return;
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    const u = this.layout.unitScale;
    const w = Math.max(1, this.layout.width);

    // 1. Striped Umbrella (~26 deg peak bend during story wind gusts) + shadow
    const umbWind = clock.windAt(this.umbrella.x);
    const windDeflect = Math.max(-0.3, Math.min(0.46, umbWind * 0.24));
    const umbTilt = this.umbrellaSpring.step(this.umbBaseRot + windDeflect, safeDt);
    this.umbrella.rotation = umbTilt;
    this.umbrellaShadow.x = this.umbrella.x + (umbTilt - this.umbBaseRot) * 58 * u;
    this.umbrellaShadow.y = this.umbrella.y + 4 * u;

    // 2. Korilakkuma: hat bow spring + natural blink + quantized tap gaze
    const koriWind = clock.windAt(this.korilakkuma.x);
    this.korilakkumaBow.rotation = this.bowSpring.step(0.384 + koriWind * 0.24, safeDt);
    this.korilakkuma.y = this.koriBaseY + Math.sin(clock.time * 1.65) * 2 * u;

    let gazeX = 0;
    let gazeY = 0;
    if (this.gazeTarget.hasTarget) {
      const dx = this.gazeTarget.x - this.korilakkuma.x;
      const dy = this.gazeTarget.y - (this.korilakkuma.y - 60 * u);
      const len = Math.max(1, Math.hypot(dx, dy));
      gazeX = (dx / len) * 2.2;
      gazeY = (dy / len) * 1.6;
    }
    const gk = 1 - Math.exp(-safeDt * 10);
    this.gazeOffset.x += (gazeX - this.gazeOffset.x) * gk;
    this.gazeOffset.y += (gazeY - this.gazeOffset.y) * gk;

    const eyesNeedRedraw =
      Math.abs(this.lastDrawnGaze.x - this.gazeOffset.x) > 0.18 ||
      Math.abs(this.lastDrawnGaze.y - this.gazeOffset.y) > 0.18;

    if (this.koriBlinkLeft > 0) {
      this.koriBlinkLeft -= safeDt;
      if (this.koriBlinkLeft <= 0) {
        this.drawKorilakkumaEyes(false, this.gazeOffset.x, this.gazeOffset.y);
        this.lastDrawnGaze.x = this.gazeOffset.x;
        this.lastDrawnGaze.y = this.gazeOffset.y;
      }
    } else {
      this.koriBlinkTimer -= safeDt;
      if (this.koriBlinkTimer <= 0) {
        this.koriBlinkTimer = 3.5 + Math.random() * 3.0;
        this.koriBlinkLeft = 0.14;
        this.drawKorilakkumaEyes(true, this.gazeOffset.x, this.gazeOffset.y);
      } else if (eyesNeedRedraw) {
        this.drawKorilakkumaEyes(false, this.gazeOffset.x, this.gazeOffset.y);
        this.lastDrawnGaze.x = this.gazeOffset.x;
        this.lastDrawnGaze.y = this.gazeOffset.y;
      }
    }

    // 3. Rilakkuma sleepy breathing & occasional yellow-soled foot wiggles
    this.rilakkumaHead.y = this.rilaBaseY + Math.sin(clock.time * 1.15) * 3 * u;

    if (this.footWiggleDuration > 0) {
      this.footWiggleDuration -= safeDt;
    } else {
      this.footWiggleTimer -= safeDt;
      if (this.footWiggleTimer <= 0) {
        this.footWiggleTimer = 5.5 + Math.random() * 3.5;
        this.footWiggleDuration = 1.1;
      }
    }
    for (let idx = 0; idx < 2; idx++) {
      const foot = this.rilakkumaFeet[idx];
      const base = this.layout.rilakkumaFeet[idx];
      if (!base) continue;
      const targetAngle =
        this.footWiggleDuration > 0
          ? Math.sin(clock.time * 11 + idx * 1.8) * 0.16
          : 0;
      const delta = this.footSprings[idx].step(targetAngle, safeDt);
      foot.rotation = (base.rotation ?? 0) + delta;
    }

    // 4. Toy Sailboat riding OceanLayer's shared wave formula via spring-dampers
    const nx = Math.max(0, Math.min(1, this.sailboat.x / w));
    const waveBob = this.boatBobSpring.step(clock.waveHeightAt(nx) * 4.5 * u, safeDt);
    const waveTilt = this.boatRotSpring.step(
      this.boatBaseRot + clock.waveSlopeAt(nx) * 0.08 + clock.windAt(this.sailboat.x) * 0.07,
      safeDt,
    );
    this.sailboat.y = this.boatBaseY + waveBob;
    this.sailboat.rotation = waveTilt;

    // 5. Randomized Crab Critters
    const maxRange = 32 * u;
    for (let i = 0; i < this.crabAgents.length; i++) {
      const agent = this.crabAgents[i];
      agent.timer -= safeDt;
      if (agent.timer <= 0) {
        const roll = Math.random();
        if (agent.state !== 'idle' && roll < 0.45) {
          agent.state = 'idle';
          agent.timer = 1.6 + Math.random() * 2.4;
          agent.offsetY = 0;
        } else if (roll < 0.75) {
          agent.state = 'scuttle';
          agent.targetOffsetX = (Math.random() * 2 - 1) * maxRange;
          agent.timer = 0.9 + Math.random() * 0.6;
          agent.offsetY = 0;
        } else if (roll < 0.9) {
          agent.state = 'wiggle';
          agent.timer = 0.85;
          agent.offsetY = 0;
        } else {
          agent.state = 'duck';
          agent.timer = 1.4 + Math.random() * 0.9;
        }
      }

      if (agent.state === 'scuttle') {
        const stepK = 1 - Math.exp(-safeDt * 4.5);
        agent.offsetX += (agent.targetOffsetX - agent.offsetX) * stepK;
        agent.sprite.rotation = agent.baseRot + Math.sin(clock.time * 18 + agent.phase) * 0.09;
      } else if (agent.state === 'wiggle') {
        agent.sprite.rotation = agent.baseRot + Math.sin(clock.time * 16 + agent.phase) * 0.14;
      } else {
        agent.sprite.rotation = agent.baseRot;
      }

      const targetDuckY = agent.state === 'duck' ? 6.5 * u : 0;
      agent.offsetY += (targetDuckY - agent.offsetY) * (1 - Math.exp(-safeDt * 7));
      const duckScale = agent.state === 'duck' ? 0.92 : 1;

      agent.sprite.x = agent.homeX + agent.offsetX;
      agent.sprite.y = agent.homeY + agent.offsetY;
      agent.sprite.scale.set(agent.baseScale * duckScale);
    }
  }

  applyLayout(layout: SceneLayout): void {
    this.layout = layout;
    this.drawDunes(layout);

    this.koriBaseY = layout.korilakkuma.y;
    this.rilaBaseY = layout.rilakkumaHead.y;
    this.rilaBaseRot = layout.rilakkumaHead.rotation ?? 0.62;
    this.umbBaseRot = layout.umbrella.rotation ?? -0.22;
    this.boatBaseY = layout.sailboat.y;
    this.boatBaseRot = layout.sailboat.rotation ?? -0.06;

    this.umbrellaSpring.reset(this.umbBaseRot);
    this.boatRotSpring.reset(this.boatBaseRot);
    this.boatBobSpring.reset(0);

    this.placeSprite(this.korilakkuma, layout.korilakkuma);
    this.placeSprite(this.rilakkumaHead, layout.rilakkumaHead);
    this.placeSprite(this.umbrella, layout.umbrella);
    this.umbrellaShadow.x = layout.umbrella.x;
    this.umbrellaShadow.y = layout.umbrella.y + 4 * layout.unitScale;

    this.placeSprite(this.bucket, layout.bucket);
    this.placeSprite(this.kiiroitoriBuried, layout.kiiroitoriBuried);
    this.placeSprite(this.sailboat, layout.sailboat);
    this.placeSprite(this.chickToy, layout.chickToy);
    this.placeSprite(this.octopus, layout.octopus);
    this.placeSprite(this.bearBeachToy, layout.bearBeachToy);
    this.placeSprite(this.starfishMain, layout.starfishMain);
    this.placeSprite(this.whiteShellMain, layout.whiteShellMain);

    this.rilakkumaFeet.forEach((f, i) => {
      if (layout.rilakkumaFeet[i]) this.placeSprite(f, layout.rilakkumaFeet[i]);
    });
    this.crabAgents.forEach((agent, i) => {
      const cfg = layout.crabs[i];
      if (!cfg) return;
      agent.homeX = cfg.x;
      agent.homeY = cfg.y;
      agent.baseScale = cfg.scale;
      agent.baseRot = cfg.rotation ?? 0;
      agent.offsetX = 0;
      agent.offsetY = 0;
      this.placeSprite(agent.sprite, cfg);
    });
    this.pinkShells.forEach((ps, i) => {
      if (layout.pinkShells[i]) this.placeSprite(ps, layout.pinkShells[i]);
    });
    this.coralTwigs.forEach((t, i) => {
      if (layout.coralTwigs[i]) this.placeSprite(t, layout.coralTwigs[i]);
    });
    this.flipFlops.forEach((ff, i) => {
      if (layout.flipFlops[i]) this.placeSprite(ff, layout.flipFlops[i]);
    });
  }

  destroyLayer(): void {
    gsap.killTweensOf(this.korilakkuma);
    gsap.killTweensOf(this.rilakkumaHead);
    gsap.killTweensOf(this.kiiroitoriBuried);
    gsap.killTweensOf(this.octopus);
  }
}
