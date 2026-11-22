/**
 * BannerPlane.ts — Cel-shaded flat 2D propeller plane towing a forked cloth-wave banner
 * ("Happy Birthday Tine Tine!") with velocity-driven nose pitch, 18-column anchored cloth mesh,
 * pre-allocated clinging cloud tuft sockets, orbiting slipstream halo, and spring-damped tap swoop.
 */
import {
  Container,
  Graphics,
  MeshSimple,
  Rectangle,
  Sprite,
  Text,
  Texture,
  type Renderer,
} from 'pixi.js';
import { SpringDamper } from '../atmosphere/SpringDamper';
import { createCloudTuftTexture } from '../assets/svgTextureFactory';
import { triggerHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

export const BANNER_SEGS = 18;
const BANNER_W = 284;
const BANNER_H = 88;
const BANNER_OFFSET_X = 131;
export const TOTAL_SPAN_X = BANNER_OFFSET_X + BANNER_W;

// Reference image pixel-space anchor mapping (plane center 105, 72 -> 0, 0)
const X = (px: number): number => px - 105;
const Y = (py: number): number => py - 72;

// S-curve arch matching the reference banner silhouette
const bannerArchY = (u: number): number => 11 + 16 * u - 10 * Math.sin(u * Math.PI * 2);

export interface BannerPlaneTextures {
  bearIcon?: Texture;
}

export interface DetachedCloudPoint {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface ClingingTuftSocket {
  sprite: Sprite;
  inPlaneGroup: boolean;
  localX: number;
  localY: number;
  targetScale: number;
  growProgress: number;
  active: boolean;
  baseRot: number;
}

interface SlipstreamHaloParticle {
  sprite: Sprite;
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  phase: number;
  targetScale: number;
  active: boolean;
}

export function computeBannerWaveOffset(
  u: number,
  timeSec: number,
  amplitude: number,
): number {
  return amplitude * (u * u) * Math.sin(u * 7.5 - timeSec * 6.5);
}

export function computePlaneBob(timeSec: number): number {
  return Math.sin(timeSec * 2.2) * 7;
}

export function computePlanePitch(timeSec: number, boostVel = 0): number {
  return Math.cos(timeSec * 2.2) * 0.045 + boostVel * 0.05;
}

export class BannerPlane extends Container {
  public readonly totalSpanX = TOTAL_SPAN_X;

  private readonly rendererRef: Renderer | null;
  private readonly bearIconTexture?: Texture;
  private readonly cloudTuftTexture: Texture;

  private readonly towRopes = new Graphics();
  private readonly planeGroup = new Container();
  private readonly propeller = new Container();
  private readonly haloLayer = new Container();
  private bannerMesh!: MeshSimple;
  private bannerTexture: Texture = Texture.WHITE;
  private baseVertices!: Float32Array;

  private readonly swoopYSpring = new SpringDamper(0, 74, 6.8);
  private readonly shakeRotSpring = new SpringDamper(0, 145, 7.0);

  private readonly tuftSockets: ClingingTuftSocket[] = [];
  private readonly slipstreamHalo: SlipstreamHaloParticle[] = [];

  private animTime = 0;
  private speedBoost = 0;
  private interactiveEnabled = true;
  private onTapBurst?: (worldX: number, worldY: number, scale: number) => void;

  constructor(
    renderer: Renderer | null,
    screenWidth: number,
    baseY: number,
    textures: BannerPlaneTextures = {},
    onTapBurst?: (worldX: number, worldY: number, scale: number) => void,
  ) {
    super();
    this.rendererRef = renderer;
    this.bearIconTexture = textures.bearIcon;
    this.cloudTuftTexture = createCloudTuftTexture();
    this.onTapBurst = onTapBurst;

    this.x = screenWidth + 95;
    this.y = baseY;

    this.buildPlaneGraphic();
    this.buildBannerMesh();
    this.buildClingingTuftSockets();
    this.buildSlipstreamHalo();

    this.addChild(this.haloLayer);
    this.addChild(this.towRopes);
    this.addChild(this.bannerMesh);
    this.addChild(this.planeGroup);

    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointerdown', (e) => {
      if (!this.interactiveEnabled) return;
      e.stopPropagation();
      this.triggerTapSwoop();
    });

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (this.destroyed || !this.rendererRef) return;
        const nextTex = this.bakeBannerTexture(this.rendererRef);
        const oldTex = this.bannerTexture;
        this.bannerTexture = nextTex;
        this.bannerMesh.texture = nextTex;
        if (oldTex !== Texture.WHITE && !oldTex.destroyed) {
          oldTex.destroy(true);
        }
      });
    }
  }

  private buildPlaneGraphic(): void {
    const ink = { width: 3.6, color: 0x4a2c1d, join: 'round' as const, cap: 'round' as const };

    // 1. Soft sky-blue (#9BE7F5) cockpit dome behind yellow collar
    const windshield = new Graphics()
      .moveTo(X(80), Y(50))
      .bezierCurveTo(X(81), Y(40), X(86), Y(38), X(91), Y(38))
      .bezierCurveTo(X(96), Y(38), X(99), Y(45), X(99), Y(56))
      .lineTo(X(80), Y(52))
      .closePath()
      .fill(0x9be7f5)
      .stroke(ink)
      .moveTo(X(89), Y(42))
      .quadraticCurveTo(X(94), Y(45), X(93), Y(52))
      .stroke({ width: 2.3, color: 0xffffff, alpha: 0.78, cap: 'round' });

    // 2. Coral-orange (#E87A45) fuselage + swept vertical tail fin
    const fuselage = new Graphics()
      .moveTo(X(68), Y(49))
      .bezierCurveTo(X(72), Y(49), X(76), Y(49), X(78), Y(50))
      .bezierCurveTo(X(86), Y(57), X(96), Y(62), X(105), Y(62))
      .bezierCurveTo(X(115), Y(62), X(122), Y(59), X(127), Y(56))
      .bezierCurveTo(X(136), Y(59), X(145), Y(60), X(151), Y(60))
      .bezierCurveTo(X(156), Y(52), X(161), Y(47), X(166), Y(47))
      .bezierCurveTo(X(173), Y(47), X(176), Y(56), X(176), Y(72))
      .bezierCurveTo(X(175), Y(80), X(165), Y(88), X(147), Y(92))
      .bezierCurveTo(X(126), Y(96), X(88), Y(95), X(67), Y(91))
      .closePath()
      .fill(0xe87a45)
      .stroke({ width: 3.8, color: 0x4a2c1d, join: 'round' });

    // 3. Butter-yellow (#FACC15) vertical tail rudder strip
    const tailRudder = new Graphics()
      .moveTo(X(166), Y(48))
      .bezierCurveTo(X(165), Y(56), X(165), Y(65), X(167), Y(72))
      .bezierCurveTo(X(173), Y(72), X(176), Y(66), X(176), Y(58))
      .bezierCurveTo(X(175), Y(51), X(171), Y(48), X(166), Y(48))
      .closePath()
      .fill(0xfacc15)
      .stroke(ink);

    // 4. Warm cream (#F5EAD8) rounded nose cowling
    const cowling = new Graphics()
      .moveTo(X(68), Y(49))
      .bezierCurveTo(X(58), Y(50), X(50), Y(55), X(47), Y(62))
      .lineTo(X(46), Y(76))
      .bezierCurveTo(X(49), Y(84), X(56), Y(89), X(67), Y(91))
      .bezierCurveTo(X(70), Y(78), X(70), Y(62), X(68), Y(49))
      .closePath()
      .fill(0xf5ead8)
      .stroke({ width: 3.8, color: 0x4a2c1d, join: 'round' });

    // 5. U-shaped butter-yellow (#FACC15) cockpit collar
    const cockpitRim = new Graphics()
      .moveTo(X(75), Y(49))
      .bezierCurveTo(X(78), Y(57), X(90), Y(64), X(105), Y(64))
      .bezierCurveTo(X(116), Y(64), X(124), Y(61), X(127), Y(56))
      .bezierCurveTo(X(128), Y(52), X(123), Y(49), X(119), Y(51))
      .bezierCurveTo(X(115), Y(57), X(108), Y(59), X(101), Y(58))
      .bezierCurveTo(X(91), Y(57), X(84), Y(53), X(80), Y(48))
      .bezierCurveTo(X(78), Y(47), X(76), Y(48), X(75), Y(49))
      .closePath()
      .fill(0xfacc15)
      .stroke(ink);

    // 6. Butter-yellow (#FACC15) horizontal tail stabilizer
    const tailElevator = new Graphics()
      .moveTo(X(149), Y(77))
      .bezierCurveTo(X(158), Y(76), X(168), Y(77), X(174), Y(80))
      .bezierCurveTo(X(177), Y(83), X(176), Y(90), X(168), Y(93))
      .bezierCurveTo(X(160), Y(93), X(151), Y(86), X(149), Y(77))
      .closePath()
      .fill(0xfacc15)
      .stroke(ink);

    // 7. Coral-orange swept wing with butter-yellow trailing accent
    const wing = new Graphics()
      .moveTo(X(85), Y(76))
      .bezierCurveTo(X(96), Y(75), X(106), Y(76), X(114), Y(78))
      .bezierCurveTo(X(125), Y(84), X(134), Y(93), X(134), Y(101))
      .bezierCurveTo(X(133), Y(110), X(124), Y(115), X(114), Y(115))
      .bezierCurveTo(X(101), Y(114), X(89), Y(102), X(85), Y(92))
      .bezierCurveTo(X(82), Y(85), X(82), Y(78), X(85), Y(76))
      .closePath()
      .fill(0xe87a45)
      .stroke({ width: 3.8, color: 0x4a2c1d, join: 'round' })
      .moveTo(X(114), Y(78))
      .bezierCurveTo(X(125), Y(84), X(134), Y(93), X(134), Y(101))
      .bezierCurveTo(X(133), Y(104), X(125), Y(104), X(118), Y(103))
      .bezierCurveTo(X(116), Y(94), X(115), Y(86), X(114), Y(78))
      .closePath()
      .fill(0xfacc15)
      .stroke(ink);

    // 8. Warm-cream propeller blades + translucent white fluttering motion blur
    const blades = new Graphics()
      .moveTo(0, -4)
      .bezierCurveTo(-3.8, -16, -2.5, -37, 2, -37)
      .bezierCurveTo(5.8, -37, 5.2, -16, 2.2, -4)
      .closePath()
      .fill(0xf5ead8)
      .stroke(ink)
      .moveTo(-2, 4)
      .bezierCurveTo(-5.5, 16, -5.8, 36, -1.8, 36)
      .bezierCurveTo(2.4, 36, 3.5, 16, 0.8, 4)
      .closePath()
      .fill(0xf5ead8)
      .stroke(ink);

    const spinBlur = new Graphics()
      .moveTo(-17, -31)
      .quadraticCurveTo(-21, -22, -17, -13)
      .moveTo(-12, -29)
      .quadraticCurveTo(-15, -21, -12, -14)
      .moveTo(-17, 11)
      .quadraticCurveTo(-21, 21, -14, 30)
      .moveTo(-12, 12)
      .quadraticCurveTo(-15, 20, -10, 27)
      .moveTo(10, -29)
      .quadraticCurveTo(14, -21, 12, -13)
      .moveTo(9, 12)
      .quadraticCurveTo(13, 19, 9, 27)
      .stroke({ width: 2.2, color: 0xffffff, alpha: 0.78, cap: 'round' });

    this.propeller.position.set(X(42), Y(69));
    this.propeller.addChild(spinBlur, blades);

    const spinnerCone = new Graphics()
      .moveTo(X(47), Y(63))
      .bezierCurveTo(X(39), Y(63), X(34), Y(66), X(34), Y(69))
      .bezierCurveTo(X(34), Y(73), X(39), Y(76), X(47), Y(76))
      .bezierCurveTo(X(48), Y(72), X(48), Y(67), X(47), Y(63))
      .closePath()
      .fill(0xe87a45)
      .stroke(ink);

    this.planeGroup.addChild(
      windshield,
      fuselage,
      tailRudder,
      cowling,
      cockpitRim,
      tailElevator,
      wing,
      this.propeller,
      spinnerCone,
    );
  }

  private bakeBannerTexture(renderer: Renderer): Texture {
    const temp = new Container();

    const cloth = new Graphics()
      // Coral-orange (#E87A45) forked swallowtail trim + thick chocolate-brown (#4A2C1D) outline
      .poly([
        9,
        4,
        BANNER_W - 4,
        4,
        BANNER_W - 22,
        BANNER_H / 2,
        BANNER_W - 4,
        BANNER_H - 4,
        4,
        BANNER_H - 4,
      ])
      .fill(0xe87a45)
      .stroke({ width: 4.5, color: 0x4a2c1d, join: 'round' })
      // Warm cream (#F5EAD8) interior cloth panel
      .poly([
        16,
        12,
        BANNER_W - 17,
        12,
        BANNER_W - 32,
        BANNER_H / 2,
        BANNER_W - 17,
        BANNER_H - 12,
        12,
        BANNER_H - 12,
      ])
      .fill(0xf5ead8)
      .stroke({ width: 1.5, color: 0xd96b43, join: 'round' });

    temp.addChild(cloth);

    let textCenterX = (BANNER_W - 22) * 0.52;
    if (this.bearIconTexture) {
      const icon = new Sprite(this.bearIconTexture);
      icon.width = 30;
      icon.height = 30;
      icon.position.set(22, (BANNER_H - 30) / 2);
      temp.addChild(icon);
      textCenterX = 56 + (BANNER_W - 82) * 0.5;
    }

    const label = new Text({
      text: 'Happy Birthday\nTine Tine!',
      style: {
        fontFamily: 'Fredoka, M PLUS Rounded 1c, sans-serif',
        fontSize: 23,
        lineHeight: 26,
        fontWeight: '700',
        fill: '#4A2C1D',
        align: 'center',
      },
    });
    label.anchor.set(0.5, 0.5);
    label.position.set(textCenterX, BANNER_H / 2);
    temp.addChild(label);

    const texture = renderer.generateTexture({
      target: temp,
      frame: new Rectangle(0, 0, BANNER_W, BANNER_H),
      resolution: 2,
      antialias: true,
    });
    temp.destroy({ children: true });
    return texture;
  }

  private buildBannerMesh(): void {
    if (this.rendererRef) {
      this.bannerTexture = this.bakeBannerTexture(this.rendererRef);
    }

    const vertices = new Float32Array((BANNER_SEGS + 1) * 2 * 2);
    const uvs = new Float32Array((BANNER_SEGS + 1) * 2 * 2);
    const indices: number[] = [];

    for (let i = 0; i <= BANNER_SEGS; i++) {
      const u = i / BANNER_SEGS;
      const vx = BANNER_OFFSET_X + u * BANNER_W;
      const arch = bannerArchY(u);
      const idx = i * 4;

      vertices[idx] = vx;
      vertices[idx + 1] = arch - BANNER_H / 2;
      vertices[idx + 2] = vx;
      vertices[idx + 3] = arch + BANNER_H / 2;

      uvs[idx] = u;
      uvs[idx + 1] = 0;
      uvs[idx + 2] = u;
      uvs[idx + 3] = 1;

      if (i < BANNER_SEGS) {
        const v = i * 2;
        indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }

    this.baseVertices = new Float32Array(vertices);
    this.bannerMesh = new MeshSimple({
      texture: this.bannerTexture,
      vertices,
      uvs,
      indices: new Uint32Array(indices),
    });
    this.bannerMesh.autoUpdate = false;
  }

  private buildClingingTuftSockets(): void {
    const specs = [
      { inPlane: true, x: X(46), y: Y(56), scale: 0.72, rot: -0.18 }, // nose tip
      { inPlane: true, x: X(92), y: Y(40), scale: 0.64, rot: 0.08 }, // cockpit rim
      { inPlane: true, x: X(108), y: Y(80), scale: 0.82, rot: -0.1 }, // top wing edge
      { inPlane: true, x: X(138), y: Y(56), scale: 0.58, rot: 0.14 }, // dorsal hull
      { inPlane: true, x: X(167), y: Y(46), scale: 0.74, rot: 0.12 }, // tail fin
      { inPlane: false, x: BANNER_OFFSET_X + 16, y: bannerArchY(0) - 24, scale: 0.76, rot: -0.06 }, // banner leading edge
    ];

    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      const sprite = new Sprite(this.cloudTuftTexture);
      sprite.anchor.set(0.5, 0.5);
      sprite.position.set(s.x, s.y);
      sprite.rotation = s.rot;
      sprite.visible = false;
      sprite.scale.set(0);

      if (s.inPlane) {
        this.planeGroup.addChild(sprite);
      } else {
        this.addChild(sprite);
      }

      this.tuftSockets.push({
        sprite,
        inPlaneGroup: s.inPlane,
        localX: s.x,
        localY: s.y,
        targetScale: s.scale,
        growProgress: 0,
        active: false,
        baseRot: s.rot,
      });
    }
  }

  private buildSlipstreamHalo(): void {
    const orbits = [
      { cx: 52, cy: -22, rx: 14, ry: 7, speed: 2.8, phase: 0.0, scale: 0.44 },
      { cx: 92, cy: 20, rx: 18, ry: 8, speed: 2.3, phase: 1.1, scale: 0.4 },
      { cx: 148, cy: -16, rx: 20, ry: 9, speed: 2.6, phase: 2.2, scale: 0.46 },
      { cx: 215, cy: 18, rx: 22, ry: 10, speed: 2.1, phase: 3.4, scale: 0.42 },
      { cx: 295, cy: -12, rx: 24, ry: 9, speed: 2.4, phase: 4.5, scale: 0.45 },
      { cx: 365, cy: 14, rx: 20, ry: 8, speed: 2.7, phase: 5.4, scale: 0.38 },
    ];

    for (let i = 0; i < orbits.length; i++) {
      const o = orbits[i];
      const sprite = new Sprite(this.cloudTuftTexture);
      sprite.anchor.set(0.5, 0.5);
      sprite.visible = false;
      sprite.alpha = 0.85;
      sprite.scale.set(o.scale);
      this.haloLayer.addChild(sprite);

      this.slipstreamHalo.push({
        sprite,
        centerX: o.cx,
        centerY: o.cy,
        radiusX: o.rx,
        radiusY: o.ry,
        speed: o.speed,
        phase: o.phase,
        targetScale: o.scale,
        active: false,
      });
    }
  }

  private triggerTapSwoop(): void {
    this.swoopYSpring.impulse(-150);
    this.speedBoost = 1.0;
    triggerHaptic(14);
    audioManager.playSfx('chime');

    const sx = this.scale.x || 1;
    const sy = Math.abs(this.scale.y) || 1;
    const burstX = this.x + (BANNER_OFFSET_X + BANNER_W * 0.42) * sx;
    const burstY = this.y + bannerArchY(0.45) * sy;
    this.onTapBurst?.(burstX, burstY, Math.abs(sx));
  }

  setVisualStyle(
    scaleX: number,
    scaleY: number,
    tint: number,
    alpha: number,
    interactive: boolean,
  ): void {
    this.scale.set(scaleX, scaleY);
    this.tint = tint;
    this.alpha = alpha;
    this.interactiveEnabled = interactive;
    this.eventMode = interactive ? 'static' : 'none';
    this.cursor = interactive ? 'pointer' : 'default';
  }

  attachClingingTufts(count: number): void {
    const target = Math.max(0, Math.min(this.tuftSockets.length, count));
    for (let i = 0; i < this.tuftSockets.length; i++) {
      const t = this.tuftSockets[i];
      if (i < target) {
        if (!t.active) {
          t.growProgress = 0.1;
        }
        t.active = true;
        t.sprite.visible = true;
      } else {
        t.active = false;
        t.growProgress = 0;
        t.sprite.visible = false;
      }
    }
  }

  setSlipstreamHaloActive(active: boolean): void {
    for (let i = 0; i < this.slipstreamHalo.length; i++) {
      const h = this.slipstreamHalo[i];
      h.active = active;
      h.sprite.visible = active;
    }
  }

  getActiveTuftCount(): number {
    let n = 0;
    for (let i = 0; i < this.tuftSockets.length; i++) {
      if (this.tuftSockets[i].active) n++;
    }
    return n;
  }

  /**
   * Triggers a cute air-pocket wing shake & transfers all clinging cloud tufts + slipstream
   * halo positions into pre-allocated world-space output records before detaching them.
   */
  triggerWingShakeAndCollectDetached(outList: DetachedCloudPoint[]): number {
    this.swoopYSpring.impulse(-88);
    this.shakeRotSpring.impulse(5.4);

    const rot = this.planeGroup.rotation;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);
    const sx = this.scale.x || 1;
    const sy = Math.abs(this.scale.y) || 1;
    let count = 0;

    for (let i = 0; i < this.tuftSockets.length && count < outList.length; i++) {
      const t = this.tuftSockets[i];
      if (!t.active) continue;

      let localX = t.localX;
      let localY = t.localY;
      if (t.inPlaneGroup) {
        const rx = localX * cosR - localY * sinR;
        const ry = localX * sinR + localY * cosR;
        localX = rx;
        localY = ry;
      }

      const pt = outList[count++];
      pt.x = this.x + localX * sx;
      pt.y = this.y + localY * sy;
      pt.scale = t.targetScale * Math.abs(sx);
      pt.rotation = t.baseRot + rot;

      t.active = false;
      t.growProgress = 0;
      t.sprite.visible = false;
    }

    for (let i = 0; i < this.slipstreamHalo.length && count < outList.length; i++) {
      const h = this.slipstreamHalo[i];
      if (!h.active) continue;
      const pt = outList[count++];
      pt.x = this.x + h.sprite.x * sx;
      pt.y = this.y + h.sprite.y * sy;
      pt.scale = h.targetScale * Math.abs(sx);
      pt.rotation = h.sprite.rotation;

      h.active = false;
      h.sprite.visible = false;
    }

    return count;
  }

  getNoseWorldPoint(out: { x: number; y: number }): void {
    const rot = this.planeGroup.rotation;
    const nx = X(36);
    const ny = Y(69);
    const rx = nx * Math.cos(rot) - ny * Math.sin(rot);
    const ry = nx * Math.sin(rot) + ny * Math.cos(rot);
    out.x = this.x + rx * (this.scale.x || 1);
    out.y = this.y + ry * (this.scale.y || 1);
  }

  getTailWorldPoint(out: { x: number; y: number }): void {
    const rot = this.planeGroup.rotation;
    const tx = X(182);
    const ty = Y(68);
    const rx = tx * Math.cos(rot) - ty * Math.sin(rot);
    const ry = tx * Math.sin(rot) + ty * Math.cos(rot);
    out.x = this.x + rx * (this.scale.x || 1);
    out.y = this.y + ry * (this.scale.y || 1);
  }

  consumeSpeedBoostFactor(dtSec: number): number {
    this.speedBoost *= Math.exp(-2.8 * dtSec);
    return this.speedBoost;
  }

  resetVisuals(): void {
    this.swoopYSpring.reset(0);
    this.shakeRotSpring.reset(0);
    this.speedBoost = 0;
    this.attachClingingTufts(0);
    this.setSlipstreamHaloActive(false);
  }

  updateVisuals(
    dtSec: number,
    windClockTime: number,
    windStrength: number,
    baseY: number,
    baseClimbAngle = 0,
  ): void {
    const safeDt = Math.max(0, Math.min(dtSec, 0.05));
    this.animTime += safeDt;

    const swoopY = this.swoopYSpring.step(0, safeDt);
    const shakeRot = this.shakeRotSpring.step(0, safeDt);
    const absScale = Math.max(0.24, Math.abs(this.scale.y) || 1);

    this.y = baseY + computePlaneBob(this.animTime) * absScale + swoopY * absScale;
    this.planeGroup.rotation =
      baseClimbAngle +
      computePlanePitch(this.animTime, this.swoopYSpring.velocity * 0.028) +
      shakeRot;

    // Propeller spin blur flutter
    this.propeller.scale.y = 0.55 + Math.abs(Math.sin(this.animTime * 42)) * 0.5;

    // Anchored 18-column cloth wave mesh driven by unified wind clock (front tow bar pinned at u=0)
    const verts = this.bannerMesh.vertices;
    const waveAmp = 7.5 * windStrength;
    for (let i = 0; i < verts.length; i += 4) {
      const u = i / 4 / BANNER_SEGS;
      const wave = computeBannerWaveOffset(u, windClockTime, waveAmp);
      verts[i + 1] = this.baseVertices[i + 1] + wave;
      verts[i + 3] = this.baseVertices[i + 3] + wave;
    }
    this.bannerMesh.geometry.getBuffer('aPosition').update();

    // Taut V-shaped tow ropes anchored directly to rotated plane tail hook
    const rot = this.planeGroup.rotation;
    const hookX = X(176);
    const hookY = Y(73);
    const tailX = hookX * Math.cos(rot) - hookY * Math.sin(rot);
    const tailY = hookX * Math.sin(rot) + hookY * Math.cos(rot);
    const frontCenterY = bannerArchY(0);
    this.towRopes
      .clear()
      .moveTo(tailX, tailY)
      .lineTo(BANNER_OFFSET_X + 10, frontCenterY - BANNER_H / 2 + 6)
      .moveTo(tailX, tailY)
      .lineTo(BANNER_OFFSET_X + 5, frontCenterY + BANNER_H / 2 - 5)
      .stroke({ width: 2.5, color: 0x4a2c1d, alpha: 0.92 });

    // Pop-in animation on attached cloud tufts
    for (let i = 0; i < this.tuftSockets.length; i++) {
      const t = this.tuftSockets[i];
      if (!t.active) continue;
      t.growProgress = Math.min(1, t.growProgress + safeDt * 6.5);
      const pop = Math.sin(t.growProgress * Math.PI * 0.5);
      t.sprite.scale.set(t.targetScale * pop);
      t.sprite.rotation = t.baseRot + Math.sin(this.animTime * 4.2 + i) * 0.08;
    }

    // Orbiting slipstream halo specks behind fuselage & banner during Phase 3 pre-shed
    for (let i = 0; i < this.slipstreamHalo.length; i++) {
      const h = this.slipstreamHalo[i];
      if (!h.active) continue;
      const a = this.animTime * h.speed + h.phase;
      h.sprite.x = h.centerX + Math.cos(a) * h.radiusX;
      h.sprite.y = h.centerY + Math.sin(a) * h.radiusY;
      h.sprite.rotation = Math.sin(a) * 0.3;
    }
  }

  destroyBannerPlane(): void {
    if (this.bannerTexture !== Texture.WHITE && !this.bannerTexture.destroyed) {
      this.bannerTexture.destroy(true);
    }
  }
}
