/**
 * BearRig.ts — Beats 5, 6, 7, 8 & 9b expressive brown bear actor on actorLayer:
 * - Beat 5a: 0.7s calm ocean beat -> 5px shallow DOF -> close-up lens peek, fading breath fog,
 *   3x paw knock ("tok-tok-tok!") with comic knock lines, 4px lens-rim jolt, hollow glass-tap SFX
 * - Beat 6: Full-body shy standing bear with ±2.2 deg sway, blinking eyes & hands behind back
 * - Beat 7: 160ms anticipation dip -> arms arc forward presenting glowing 3-candle birthday cake,
 *   pooled golden star burst & chime SFX
 * - Beat 8: Smoothly glides waist-up smiling bear + glowing cake to left ~38% split layout
 * - Beat 9b: Companions beside snuffed twilight cake in keepsake view
 */
import { Container, Graphics, Sprite } from 'pixi.js';
import gsap from 'gsap';
import { CAKE_CANDLE_OFFSETS } from '../assets/stage2Svgs';
import { createSoftGlowTexture, type Stage2Textures } from '../assets/svgTextureFactory';
import type { SceneLayout } from '../layout/sceneLayout';
import type { BeachStage } from '../BeachStage';
import type { SpyglassScope } from './SpyglassScope';
import { triggerHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

type BearRigMode =
  | 'hidden'
  | 'lens_peek'
  | 'hands_back'
  | 'cake_reveal'
  | 'split_letter'
  | 'twilight';

export class BearRig extends Container {
  private readonly peekGroup = new Container();
  private readonly peekHead: Sprite;
  private readonly peekPaw: Sprite;
  private readonly breathFog: Sprite;
  private readonly knockLines = new Graphics();

  private readonly shyGroup = new Container();
  private readonly shyBody: Sprite;
  private readonly shyEyes = new Graphics();

  private readonly waistGroup = new Container();
  private readonly waistBody: Sprite;
  private readonly waistEyes = new Graphics();
  private readonly armLeft: Sprite;
  private readonly armRight: Sprite;
  private readonly cakeGroup = new Container();
  private readonly cakeSprite: Sprite;
  private readonly cakeGlow: Sprite;
  private readonly flamesGfx = new Graphics();

  private readonly starPool: Sprite[] = [];
  private activeMode: BearRigMode = 'hidden';
  private animTime = 0;
  private blinkTimer = 3.2;
  private blinkLeft = 0;
  private flamesLit = true;
  private timeline: gsap.core.Timeline | null = null;
  private timers: Array<ReturnType<typeof setTimeout>> = [];
  private unitScale = 1;
  private viewW = 960;
  private viewH = 540;

  constructor(textures: Stage2Textures) {
    super();
    const glowTex = createSoftGlowTexture();

    // 1. Beat 5 Lens Peek group
    this.peekHead = new Sprite(textures.bearPeekHead);
    this.peekHead.anchor.set(0.5, 0.5);
    this.peekPaw = new Sprite(textures.bearPaw);
    this.peekPaw.anchor.set(0.5, 0.85);
    this.peekPaw.position.set(82, 92);
    this.peekPaw.rotation = -0.22;

    this.breathFog = new Sprite(glowTex);
    this.breathFog.anchor.set(0.5, 0.5);
    this.breathFog.position.set(4, 48);
    this.breathFog.scale.set(0.35);
    this.breathFog.alpha = 0;

    this.peekGroup.addChild(this.peekHead, this.breathFog, this.peekPaw, this.knockLines);
    this.peekGroup.visible = false;
    this.peekGroup.eventMode = 'static';
    this.peekGroup.cursor = 'pointer';
    this.addChild(this.peekGroup);

    // 2. Beat 6 Full-body shy hands-behind-back group
    this.shyBody = new Sprite(textures.bearShyBody);
    this.shyBody.anchor.set(0.5, 0.86);
    this.shyGroup.addChild(this.shyBody, this.shyEyes);
    this.shyGroup.visible = false;
    this.shyGroup.eventMode = 'static';
    this.shyGroup.cursor = 'pointer';
    this.drawShyEyes(false);
    this.addChild(this.shyGroup);

    // 3. Beat 7/8/9b Waist-up smiling bear + articulated arms + cake
    this.waistBody = new Sprite(textures.bearWaistUp);
    this.waistBody.anchor.set(0.5, 0.9);
    this.waistGroup.addChild(this.waistBody, this.waistEyes);
    this.drawWaistEyes(false);

    this.armLeft = new Sprite(textures.bearArmLeft);
    this.armLeft.anchor.set(0.32, 0.16);
    this.armLeft.position.set(-48, -58);

    this.armRight = new Sprite(textures.bearArmRight);
    this.armRight.anchor.set(0.68, 0.16);
    this.armRight.position.set(48, -58);

    this.cakeGlow = new Sprite(glowTex);
    this.cakeGlow.anchor.set(0.5, 0.5);
    this.cakeGlow.tint = 0xfef08a;
    this.cakeGlow.position.set(0, -110);
    this.cakeGlow.scale.set(1.9);
    this.cakeGlow.alpha = 0.55;

    this.cakeSprite = new Sprite(textures.birthdayCake);
    this.cakeSprite.anchor.set(0.5, 0.85);

    this.cakeGroup.addChild(this.cakeGlow, this.cakeSprite, this.flamesGfx);
    this.cakeGroup.position.set(0, 6);

    this.waistGroup.addChild(this.armLeft, this.armRight, this.cakeGroup);
    this.waistGroup.visible = false;
    this.waistGroup.eventMode = 'static';
    this.waistGroup.cursor = 'pointer';
    this.addChild(this.waistGroup);

    // 4. Pooled golden reveal stars
    for (let i = 0; i < 18; i++) {
      const sp = new Sprite(textures.goldStar);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.addChild(sp);
      this.starPool.push(sp);
    }
  }

  private drawShyEyes(closed: boolean): void {
    const g = this.shyEyes;
    g.clear();
    // Relative to bearShyBody 210x260 anchored at (0.5, 0.86) -> (105, 223.6)
    const lx = 73 - 105;
    const rx = 137 - 105;
    const ey = 85 - 223.6;

    if (closed) {
      g.moveTo(lx - 7, ey).quadraticCurveTo(lx, ey + 4, lx + 7, ey);
      g.stroke({ color: 0x4a2c1d, width: 3.8, cap: 'round' });
      g.moveTo(rx - 7, ey).quadraticCurveTo(rx, ey + 4, rx + 7, ey);
      g.stroke({ color: 0x4a2c1d, width: 3.8, cap: 'round' });
    } else {
      g.circle(lx, ey, 6.2).fill({ color: 0x4a2c1d });
      g.circle(lx - 2, ey - 2, 1.9).fill({ color: 0xfffdf7 });
      g.circle(rx, ey, 6.2).fill({ color: 0x4a2c1d });
      g.circle(rx - 2, ey - 2, 1.9).fill({ color: 0xfffdf7 });
    }
  }

  private drawWaistEyes(happyClosed: boolean): void {
    const g = this.waistEyes;
    g.clear();
    // Relative to bearWaistUp 240x210 anchored at (0.5, 0.9) -> (120, 189)
    const lx = 80 - 120;
    const rx = 160 - 120;
    const ey = 88 - 189;

    if (happyClosed) {
      g.moveTo(lx - 8, ey + 2).quadraticCurveTo(lx, ey - 6, lx + 8, ey + 2);
      g.stroke({ color: 0x4a2c1d, width: 4.2, cap: 'round' });
      g.moveTo(rx - 8, ey + 2).quadraticCurveTo(rx, ey - 6, rx + 8, ey + 2);
      g.stroke({ color: 0x4a2c1d, width: 4.2, cap: 'round' });
    } else {
      g.circle(lx, ey, 7.2).fill({ color: 0x4a2c1d });
      g.circle(lx - 2.2, ey - 2.2, 2.2).fill({ color: 0xfffdf7 });
      g.circle(rx, ey, 7.2).fill({ color: 0x4a2c1d });
      g.circle(rx - 2.2, ey - 2.2, 2.2).fill({ color: 0xfffdf7 });
    }
  }

  private drawKnockTicks(show: boolean): void {
    const g = this.knockLines;
    g.clear();
    if (!show) return;
    g.moveTo(96, -24).lineTo(116, -34);
    g.moveTo(102, -4).lineTo(124, -6);
    g.moveTo(94, 16).lineTo(114, 24);
    g.stroke({ color: 0xfffdf7, width: 4, cap: 'round' });
  }

  private clearAnimations(): void {
    this.timeline?.kill();
    this.timeline = null;
    for (const t of this.timers) clearTimeout(t);
    this.timers.length = 0;
    gsap.killTweensOf(this.peekGroup);
    gsap.killTweensOf(this.peekPaw);
    gsap.killTweensOf(this.breathFog);
    gsap.killTweensOf(this.breathFog.scale);
    gsap.killTweensOf(this.shyGroup);
    gsap.killTweensOf(this.shyGroup.scale);
    gsap.killTweensOf(this.waistGroup);
    gsap.killTweensOf(this.waistGroup.scale);
    gsap.killTweensOf(this.armLeft);
    gsap.killTweensOf(this.armRight);
    gsap.killTweensOf(this.cakeGroup);
    gsap.killTweensOf(this.cakeGroup.scale);
    for (const st of this.starPool) {
      gsap.killTweensOf(st);
      gsap.killTweensOf(st.scale);
      st.visible = false;
    }
  }

  applyLayout(layout: SceneLayout): void {
    this.viewW = layout.width;
    this.viewH = layout.height;
    this.unitScale = Math.max(0.45, layout.unitScale);

    if (this.activeMode === 'lens_peek') {
      const s = Math.min(this.viewW, this.viewH) / 360;
      this.peekGroup.position.set(this.viewW * 0.48, this.viewH * 0.56);
      this.peekGroup.scale.set(s);
    } else if (this.activeMode === 'hands_back') {
      this.shyGroup.position.set(this.viewW * 0.5, this.viewH * 0.87);
      this.shyGroup.scale.set(this.unitScale * 1.18);
    } else if (this.activeMode === 'cake_reveal') {
      this.waistGroup.position.set(this.viewW * 0.5, this.viewH * 0.88);
      this.waistGroup.scale.set(this.unitScale * 1.48);
    } else if (this.activeMode === 'split_letter') {
      this.waistGroup.position.set(this.viewW * 0.24, this.viewH * 0.88);
      this.waistGroup.scale.set(this.unitScale * 1.24);
    } else if (this.activeMode === 'twilight') {
      this.waistGroup.position.set(this.viewW * 0.64, this.viewH * 0.85);
      this.waistGroup.scale.set(this.unitScale * 1.15);
    }
  }

  startLensPeek(
    layout: SceneLayout,
    spyglass: SpyglassScope,
    stage: BeachStage,
    onTapBear: () => void,
    onKnockReady?: () => void,
  ): void {
    this.clearAnimations();
    this.activeMode = 'lens_peek';
    this.shyGroup.visible = false;
    this.waistGroup.visible = false;
    this.peekGroup.visible = true;
    this.peekGroup.removeAllListeners('pointertap');
    this.peekGroup.on('pointertap', onTapBear);
    this.drawKnockTicks(false);

    const s = Math.min(layout.width, layout.height) / 360;
    const targetX = layout.width * 0.48;
    const targetY = layout.height * 0.56;
    this.peekGroup.position.set(targetX, layout.height + 180);
    this.peekGroup.scale.set(s);
    this.peekGroup.alpha = 1;
    this.peekPaw.position.set(90, 120);
    this.peekPaw.rotation = -0.35;
    this.breathFog.alpha = 0;

    this.timeline = gsap.timeline();
    this.timeline
      // 0.7s calm wave beat inside scope, then 5px shallow DOF + bear peeks up
      .to({}, { duration: 0.7 })
      .add(() => {
        stage.setWorldBlur(5, 0.45);
      })
      .to(this.peekGroup, {
        y: targetY,
        duration: 0.55,
        ease: 'back.out(1.2)',
      })
      // Soft breath fog condensation bloom & fade (~1.8s)
      .add(() => {
        gsap.fromTo(
          this.breathFog,
          { alpha: 0.78 },
          { alpha: 0, duration: 1.8, ease: 'power1.out' },
        );
        gsap.fromTo(
          this.breathFog.scale,
          { x: 0.45, y: 0.35 },
          { x: 1.45, y: 1.05, duration: 1.8, ease: 'power1.out' },
        );
      })
      .to({}, { duration: 0.25 })
      // Raise paw & knock 3x ("tok-tok-tok!")
      .to(this.peekPaw, {
        x: 78,
        y: 12,
        rotation: -0.08,
        duration: 0.2,
        ease: 'power2.out',
      });

    for (let k = 0; k < 3; k++) {
      this.timeline
        .to(this.peekPaw, {
          scaleX: 1.12,
          scaleY: 1.12,
          y: 4,
          duration: 0.06,
        })
        .add(() => {
          this.drawKnockTicks(true);
          spyglass.triggerLensJolt(4);
          audioManager.playSfx('glassKnock');
          if (k === 0) {
            triggerHaptic([16, 75, 16, 75, 22]);
          }
        })
        .to(this.peekPaw, {
          scaleX: 1,
          scaleY: 1,
          y: 18,
          duration: 0.1,
        })
        .add(() => {
          this.drawKnockTicks(false);
        });
    }

    this.timeline.add(() => {
      onKnockReady?.();
    });
  }

  snapLensPeek(layout: SceneLayout, stage: BeachStage, onTapBear: () => void): void {
    this.clearAnimations();
    this.activeMode = 'lens_peek';
    this.shyGroup.visible = false;
    this.waistGroup.visible = false;
    this.peekGroup.visible = true;
    this.peekGroup.removeAllListeners('pointertap');
    this.peekGroup.on('pointertap', onTapBear);
    stage.setWorldBlurImmediate(5);
    this.applyLayout(layout);
    this.peekPaw.position.set(78, 16);
    this.breathFog.alpha = 0;
    this.drawKnockTicks(false);
  }

  showHandsBack(layout: SceneLayout, onTapBear: () => void): void {
    this.clearAnimations();
    this.activeMode = 'hands_back';
    this.peekGroup.visible = false;
    this.waistGroup.visible = false;
    this.shyGroup.visible = true;
    this.shyGroup.removeAllListeners('pointertap');
    this.shyGroup.on('pointertap', onTapBear);

    this.applyLayout(layout);
    gsap.fromTo(
      this.shyGroup.scale,
      { x: this.unitScale * 0.9, y: this.unitScale * 0.9 },
      { x: this.unitScale * 1.18, y: this.unitScale * 1.18, duration: 0.48, ease: 'back.out(1.4)' },
    );
  }

  playCakeReveal(
    layout: SceneLayout,
    stage: BeachStage,
    onRevealDone: () => void,
  ): void {
    this.clearAnimations();
    this.activeMode = 'cake_reveal';
    this.flamesLit = true;
    this.peekGroup.visible = false;
    this.shyGroup.visible = false;
    this.waistGroup.visible = true;
    this.waistGroup.removeAllListeners('pointertap');
    this.waistGroup.on('pointertap', onRevealDone);
    this.drawWaistEyes(false);

    this.viewW = layout.width;
    this.viewH = layout.height;
    this.unitScale = Math.max(0.45, layout.unitScale);

    // Start waist-up close-up with arms tucked behind back & cake hidden
    this.waistGroup.position.set(layout.width * 0.5, layout.height * 0.88);
    this.waistGroup.scale.set(this.unitScale * 1.18);
    this.armLeft.rotation = 0.85;
    this.armRight.rotation = -0.85;
    this.armLeft.position.set(-40, -54);
    this.armRight.position.set(40, -54);
    this.cakeGroup.visible = false;
    this.cakeGroup.scale.set(0.25);
    this.cakeGroup.position.set(0, 28);

    // Smooth camera push-in (1.0x -> 1.48x) framing waist-up medium close-up
    stage.setCamera(1.48, 0.5, 0.58, 0.72, 'power2.inOut');

    this.timeline = gsap.timeline();
    this.timeline
      .to(this.waistGroup.scale, {
        x: this.unitScale * 1.48,
        y: this.unitScale * 1.48,
        duration: 0.52,
        ease: 'power2.inOut',
      })
      // 160ms cute anticipation dip
      .to(this.waistGroup, {
        y: layout.height * 0.905,
        duration: 0.16,
        ease: 'sine.inOut',
      })
      .add(() => {
        this.cakeGroup.visible = true;
        this.drawWaistEyes(true);
        audioManager.playSfx('cakeRevealChime');
        triggerHaptic([14, 40, 24]);
        this.burstGoldStars(layout.width * 0.5, layout.height * 0.62);
      })
      // Swing arms fluidly forward in arc presenting the cake with elastic settle
      .to(this.waistGroup, {
        y: layout.height * 0.88,
        duration: 0.34,
        ease: 'back.out(1.7)',
      })
      .to(
        this.armLeft,
        { x: -58, y: -48, rotation: -0.25, duration: 0.42, ease: 'back.out(1.6)' },
        '<',
      )
      .to(
        this.armRight,
        { x: 58, y: -48, rotation: 0.25, duration: 0.42, ease: 'back.out(1.6)' },
        '<',
      )
      .to(
        this.cakeGroup,
        { y: 6, duration: 0.46, ease: 'back.out(1.6)' },
        '<',
      )
      .to(
        this.cakeGroup.scale,
        { x: 0.95, y: 0.95, duration: 0.46, ease: 'back.out(1.6)' },
        '<',
      );

    // Auto-advance after ~1.6s (or tap)
    const timer = setTimeout(() => {
      onRevealDone();
    }, 1600);
    this.timers.push(timer);
  }

  private burstGoldStars(cx: number, cy: number): void {
    for (let i = 0; i < this.starPool.length; i++) {
      const sp = this.starPool[i];
      const ang = (i / this.starPool.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const dist = (85 + Math.random() * 115) * this.unitScale;
      sp.position.set(cx, cy);
      sp.scale.set(0.2);
      sp.alpha = 1;
      sp.visible = true;

      gsap.to(sp, {
        x: cx + Math.cos(ang) * dist,
        y: cy + Math.sin(ang) * dist * 0.78 - 18,
        rotation: (Math.random() - 0.5) * 2.5,
        alpha: 0,
        duration: 0.9 + Math.random() * 0.3,
        ease: 'power2.out',
        onComplete: () => {
          sp.visible = false;
        },
      });
      gsap.to(sp.scale, {
        x: (0.65 + Math.random() * 0.45) * this.unitScale,
        y: (0.65 + Math.random() * 0.45) * this.unitScale,
        duration: 0.3,
        ease: 'back.out(2)',
      });
    }
  }

  moveToSplitLetter(layout: SceneLayout, stage: BeachStage): void {
    this.clearAnimations();
    this.activeMode = 'split_letter';
    this.flamesLit = true;
    this.peekGroup.visible = false;
    this.shyGroup.visible = false;
    this.waistGroup.visible = true;
    this.waistGroup.removeAllListeners('pointertap');
    this.drawWaistEyes(true);

    this.armLeft.position.set(-58, -48);
    this.armLeft.rotation = -0.25;
    this.armRight.position.set(58, -48);
    this.armRight.rotation = 0.25;
    this.cakeGroup.visible = true;
    this.cakeGroup.position.set(0, 6);
    this.cakeGroup.scale.set(0.95);

    this.viewW = layout.width;
    this.viewH = layout.height;
    this.unitScale = Math.max(0.45, layout.unitScale);

    stage.setCamera(1.12, 0.25, 0.65, 0.65, 'power2.out');

    gsap.to(this.waistGroup, {
      x: layout.width * 0.24,
      y: layout.height * 0.88,
      duration: 0.65,
      ease: 'power2.inOut',
    });
    gsap.to(this.waistGroup.scale, {
      x: this.unitScale * 1.24,
      y: this.unitScale * 1.24,
      duration: 0.65,
      ease: 'power2.inOut',
    });
  }

  showTwilightCompanion(layout: SceneLayout): void {
    this.clearAnimations();
    this.activeMode = 'twilight';
    this.flamesLit = false;
    this.peekGroup.visible = false;
    this.shyGroup.visible = false;
    this.waistGroup.visible = true;
    this.waistGroup.removeAllListeners('pointertap');
    this.drawWaistEyes(true);

    this.cakeGroup.visible = false;
    this.armLeft.position.set(-54, -48);
    this.armLeft.rotation = -0.2;
    this.armRight.position.set(54, -48);
    this.armRight.rotation = 0.2;

    this.applyLayout(layout);
    this.drawFlames();
  }

  hideAll(): void {
    this.clearAnimations();
    this.activeMode = 'hidden';
    this.peekGroup.visible = false;
    this.shyGroup.visible = false;
    this.waistGroup.visible = false;
  }

  private drawFlames(): void {
    const g = this.flamesGfx;
    g.clear();
    if (!this.cakeGroup.visible || !this.flamesLit) return;

    for (let i = 0; i < CAKE_CANDLE_OFFSETS.length; i++) {
      const c = CAKE_CANDLE_OFFSETS[i];
      const sway = Math.sin(this.animTime * 9 + i * 2.1) * 1.5;

      g.circle(c.x + sway * 0.4, c.y - 8, 12).fill({ color: 0xfacc15, alpha: 0.34 });
      g.moveTo(c.x - 4.5, c.y - 1)
        .bezierCurveTo(c.x - 5.5, c.y - 10, c.x + sway - 2, c.y - 17, c.x + sway, c.y - 19)
        .bezierCurveTo(c.x + sway + 3, c.y - 13, c.x + 5.5, c.y - 8, c.x + 4.5, c.y - 1)
        .closePath()
        .fill({ color: 0xf97316 });
      g.ellipse(c.x + sway * 0.35, c.y - 6, 2.6, 5).fill({ color: 0xfef08a });
    }
  }

  update(dt: number): void {
    if (this.activeMode === 'hidden') return;
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    this.animTime += safeDt;

    if (this.activeMode === 'hands_back') {
      // Shy ±2.2 deg (~0.0384 rad) side-to-side sway & blinking eyes
      this.shyGroup.rotation = Math.sin(this.animTime * 2.1) * 0.0384;
      if (this.blinkLeft > 0) {
        this.blinkLeft -= safeDt;
        if (this.blinkLeft <= 0) this.drawShyEyes(false);
      } else {
        this.blinkTimer -= safeDt;
        if (this.blinkTimer <= 0) {
          this.blinkTimer = 3.2 + Math.random() * 2.8;
          this.blinkLeft = 0.14;
          this.drawShyEyes(true);
        }
      }
    }

    if (this.cakeGroup.visible && this.flamesLit) {
      this.drawFlames();
      this.cakeGlow.alpha = 0.48 + Math.sin(this.animTime * 4.5) * 0.1;
    }
  }

  destroyRig(): void {
    this.clearAnimations();
  }
}
