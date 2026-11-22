/**
 * SpyglassScope.ts — Beat 4 & 5 optical chocolate-and-brass riveted spyglass lens:
 * - Feathered dark chocolate (#4A2C1D) outer mask & brass bezel baked to a single Sprite
 * - Curved upper compass degree strip (W · NW · N · NE · E) shifting on pan/tilt
 * - 2 diagonal white lens glare arcs + 4 fixed dust specks anchored to glass
 * - Handheld figure-8 sway (±3px X, ±2px Y) + ±45px elastic drag/gyroscope peek
 * - Realistic 0.45s rack-focus blur hunt (4.5 -> 0.8 -> 1.8 -> 0px) + brass click SFX
 * - Auto-lock pulsing cream corner focus ticks + 4px rim jolt for bear knocks
 */
import {
  Container,
  Graphics,
  ImageSource,
  Sprite,
  Text,
  Texture,
} from 'pixi.js';
import gsap from 'gsap';
import type { BeachStage } from '../BeachStage';
import { audioManager } from '../../core/audioManager';
import {
  clampElasticPeek,
  computeCompassOffsetPx,
  computeFigure8Sway,
} from './spyglassMath';

export class SpyglassScope extends Container {
  private readonly rimGroup = new Container();
  private readonly maskSprite = new Sprite(Texture.WHITE);
  private maskTexture: Texture | null = null;
  private readonly glassGlare = new Graphics();
  private readonly glassDust = new Graphics();
  private readonly compassMask = new Graphics();
  private readonly compassStrip = new Container();
  private readonly lockBrackets = new Graphics();

  private viewW = 960;
  private viewH = 540;
  private lensRadius = 210;

  private swayTime = 0;
  private dragStart: { x: number; y: number } | null = null;
  private peekTarget = { x: 0, y: 0 };
  private peekCurrent = { x: 0, y: 0 };
  private joltOffset = { x: 0, y: 0 };
  private bracketsActive = false;
  private bracketPulse = 0;

  private focusTl: gsap.core.Timeline | null = null;
  private joltTween: gsap.core.Tween | null = null;
  private windowListenersBound = false;
  private onWinPointerDown?: (e: PointerEvent) => void;
  private onWinPointerMove?: (e: PointerEvent) => void;
  private onWinPointerUp?: () => void;

  constructor() {
    super();
    // Never intercept canvas pointer taps meant for actors/props underneath the lens!
    this.eventMode = 'none';

    this.rimGroup.addChild(this.maskSprite);
    this.maskSprite.anchor.set(0.5, 0.5);

    this.rimGroup.addChild(this.glassGlare);
    this.rimGroup.addChild(this.glassDust);
    this.rimGroup.addChild(this.compassMask);
    this.compassStrip.mask = this.compassMask;
    this.rimGroup.addChild(this.compassStrip);
    this.rimGroup.addChild(this.lockBrackets);
    this.lockBrackets.visible = false;

    this.buildCompassStrip();
    this.addChild(this.rimGroup);

    if (typeof window !== 'undefined' && !this.windowListenersBound) {
      this.windowListenersBound = true;
      this.onWinPointerDown = (e: PointerEvent) => {
        if (!this.visible || this.alpha < 0.5) return;
        this.dragStart = { x: e.clientX, y: e.clientY };
      };
      this.onWinPointerMove = (e: PointerEvent) => {
        if (!this.dragStart || !this.visible) return;
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        if (Math.hypot(dx, dy) < 8) return;
        const clamped = clampElasticPeek(dx * 0.45, dy * 0.45, 45);
        this.peekTarget.x = clamped.x;
        this.peekTarget.y = clamped.y;
      };
      this.onWinPointerUp = () => {
        this.dragStart = null;
        this.peekTarget.x = 0;
        this.peekTarget.y = 0;
      };
      window.addEventListener('pointerdown', this.onWinPointerDown, { passive: true });
      window.addEventListener('pointermove', this.onWinPointerMove, { passive: true });
      window.addEventListener('pointerup', this.onWinPointerUp, { passive: true });
      window.addEventListener('pointercancel', this.onWinPointerUp, { passive: true });
    }
  }

  private buildCompassStrip(): void {
    const g = new Graphics();
    const marks = ['W', 'NW', 'N', 'NE', 'E'];
    const spacing = 54;
    const total = (marks.length - 1) * spacing;

    for (let i = -10; i <= 10; i++) {
      const tx = i * (spacing * 0.25);
      const isMajor = i % 4 === 0;
      g.moveTo(tx, isMajor ? 0 : 4);
      g.lineTo(tx, 10);
    }
    g.stroke({ color: 0xfffdf7, width: 2, alpha: 0.75, cap: 'round' });
    this.compassStrip.addChild(g);

    marks.forEach((label, idx) => {
      const txt = new Text({
        text: label,
        style: {
          fontFamily: 'Fredoka, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: '700',
          fill: '#FFFDF7',
          stroke: { color: '#4A2C1D', width: 2.5, join: 'round' },
        },
      });
      txt.anchor.set(0.5, 0);
      txt.x = idx * spacing - total * 0.5;
      txt.y = 12;
      this.compassStrip.addChild(txt);
    });
  }

  private bakeBezelTexture(w: number, h: number, r: number): void {
    if (typeof document === 'undefined') return;
    const scale = 1.5;
    const pad = 120;
    const cw = w + pad * 2;
    const ch = h + pad * 2;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cw * scale));
    canvas.height = Math.max(1, Math.round(ch * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(scale, scale);
    const cx = cw / 2;
    const cy = ch / 2;

    // Warm chocolate-brown outer blackout with feathered inner edge
    const outerGrad = ctx.createRadialGradient(cx, cy, r * 0.94, cx, cy, r + 18);
    outerGrad.addColorStop(0, 'rgba(74, 44, 29, 0)');
    outerGrad.addColorStop(0.55, 'rgba(74, 44, 29, 0.72)');
    outerGrad.addColorStop(1, 'rgba(54, 30, 18, 0.96)');

    ctx.fillStyle = outerGrad;
    ctx.fillRect(0, 0, cw, ch);

    // Cut clear circular glass window
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Chocolate-and-brass riveted ring bezel
    ctx.beginPath();
    ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
    ctx.arc(cx, cy, r - 3, 0, Math.PI * 2, true);
    ctx.fillStyle = '#B87B48';
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.strokeStyle = '#4A2C1D';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Brass rivets around the bezel
    const rivetCount = 12;
    for (let i = 0; i < rivetCount; i++) {
      const ang = (i / rivetCount) * Math.PI * 2;
      const rx = cx + Math.cos(ang) * (r + 4.5);
      const ry = cy + Math.sin(ang) * (r + 4.5);
      ctx.beginPath();
      ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#4A2C1D';
      ctx.stroke();
    }

    const old = this.maskTexture;
    this.maskTexture = new Texture({
      source: new ImageSource({
        resource: canvas,
        resolution: scale,
        alphaMode: 'premultiply-alpha-on-upload',
        label: 'spyglass-bezel',
      }),
    });
    this.maskSprite.texture = this.maskTexture;
    if (old && old !== Texture.WHITE && !old.destroyed) {
      old.destroy(true);
    }
  }

  applyLayout(width: number, height: number): void {
    this.viewW = Math.max(160, width);
    this.viewH = Math.max(90, height);
    this.lensRadius = Math.min(this.viewW, this.viewH) * 0.43;

    this.rimGroup.position.set(this.viewW * 0.5, this.viewH * 0.5);
    this.bakeBezelTexture(this.viewW, this.viewH, this.lensRadius);

    // Subtle diagonal glass glare arcs
    this.glassGlare.clear();
    const r = this.lensRadius;
    this.glassGlare
      .moveTo(-r * 0.58, -r * 0.25)
      .quadraticCurveTo(-r * 0.35, -r * 0.52, -r * 0.08, -r * 0.62)
      .stroke({ color: 0xffffff, width: 6, alpha: 0.16, cap: 'round' })
      .moveTo(r * 0.28, r * 0.54)
      .quadraticCurveTo(r * 0.46, r * 0.4, r * 0.56, r * 0.2)
      .stroke({ color: 0xffffff, width: 4, alpha: 0.12, cap: 'round' });

    // 4 tiny dust specks anchored cleanly on glass plane
    this.glassDust.clear();
    const specks = [
      { x: -r * 0.42, y: r * 0.16, s: 1.5 },
      { x: r * 0.34, y: -r * 0.28, s: 1.3 },
      { x: -r * 0.14, y: r * 0.48, s: 1.6 },
      { x: r * 0.52, y: r * 0.08, s: 1.2 },
    ];
    for (const sp of specks) {
      this.glassDust.circle(sp.x, sp.y, sp.s).fill({ color: 0xfffdf7, alpha: 0.34 });
    }

    // Upper inner compass strip window
    this.compassMask.clear();
    this.compassMask.roundRect(-r * 0.46, -r + 12, r * 0.92, 34, 12);
    this.compassMask.fill({ color: 0xffffff });
    this.compassStrip.y = -r + 14;
  }

  openIris(stage: BeachStage): void {
    this.alpha = 1;
    this.visible = true;
    gsap.killTweensOf(this.rimGroup.scale);
    gsap.fromTo(
      this.rimGroup.scale,
      { x: 2.3, y: 2.3 },
      { x: 1, y: 1, duration: 0.55, ease: 'power3.out' },
    );
    this.runRackFocus(stage);
  }

  runRackFocus(stage: BeachStage): void {
    this.focusTl?.kill();
    audioManager.playSfx('brassClick');
    const proxy = { blur: 4.5 };
    stage.setWorldBlurImmediate(4.5);

    this.focusTl = gsap.timeline();
    this.focusTl
      .to(proxy, {
        blur: 0.8,
        duration: 0.16,
        ease: 'power2.out',
        onUpdate: () => stage.setWorldBlurImmediate(proxy.blur),
      })
      .to(proxy, {
        blur: 1.8,
        duration: 0.12,
        ease: 'sine.inOut',
        onUpdate: () => stage.setWorldBlurImmediate(proxy.blur),
      })
      .to(proxy, {
        blur: 0,
        duration: 0.17,
        ease: 'power2.out',
        onUpdate: () => stage.setWorldBlurImmediate(proxy.blur),
      });
  }

  showFocusTicks(localX: number, localY: number, size = 46): void {
    this.bracketsActive = true;
    this.bracketPulse = 0;
    const g = this.lockBrackets;
    g.clear();
    const bx = localX - this.viewW * 0.5;
    const by = localY - this.viewH * 0.5;
    const d = size;
    const arm = 12;

    // 4 cream optical focus corner brackets
    g.moveTo(bx - d, by - d + arm).lineTo(bx - d, by - d).lineTo(bx - d + arm, by - d);
    g.moveTo(bx + d - arm, by - d).lineTo(bx + d, by - d).lineTo(bx + d, by - d + arm);
    g.moveTo(bx - d, by + d - arm).lineTo(bx - d, by + d).lineTo(bx - d + arm, by + d);
    g.moveTo(bx + d - arm, by + d).lineTo(bx + d, by + d).lineTo(bx + d, by + d - arm);
    g.stroke({ color: 0xfffdf7, width: 3.2, cap: 'round', join: 'round' });
    g.visible = true;
  }

  hideFocusTicks(): void {
    this.bracketsActive = false;
    this.lockBrackets.visible = false;
  }

  triggerLensJolt(px = 4): void {
    this.joltTween?.kill();
    this.joltOffset.x = (Math.random() > 0.5 ? 1 : -1) * px * 0.65;
    this.joltOffset.y = px;
    this.joltTween = gsap.to(this.joltOffset, {
      x: 0,
      y: 0,
      duration: 0.24,
      ease: 'elastic.out(1.4, 0.35)',
    });
  }

  expandAndDissolve(stage: BeachStage, onComplete?: () => void): void {
    this.hideFocusTicks();
    stage.setWorldBlur(0, 0.35);
    gsap.killTweensOf(this.rimGroup.scale);
    gsap.killTweensOf(this);
    gsap.to(this.rimGroup.scale, {
      x: 2.75,
      y: 2.75,
      duration: 0.55,
      ease: 'power2.in',
    });
    gsap.to(this, {
      alpha: 0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        this.visible = false;
        onComplete?.();
      },
    });
  }

  update(dt: number, stage: BeachStage): void {
    if (!this.visible) return;
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    this.swayTime += safeDt;

    const k = 1 - Math.exp(-safeDt * 12);
    this.peekCurrent.x += (this.peekTarget.x - this.peekCurrent.x) * k;
    this.peekCurrent.y += (this.peekTarget.y - this.peekCurrent.y) * k;

    const sway = computeFigure8Sway(this.swayTime);
    const gyroPan = stage.parallax.x * 18;
    const gyroTilt = stage.parallax.y * 10;

    stage.setCameraOffset(
      sway.x - this.peekCurrent.x - gyroPan,
      sway.y - this.peekCurrent.y - gyroTilt,
    );

    this.rimGroup.position.set(
      this.viewW * 0.5 + this.joltOffset.x,
      this.viewH * 0.5 + this.joltOffset.y,
    );

    const panNorm = (this.peekCurrent.x + gyroPan) / 45;
    this.compassStrip.x = computeCompassOffsetPx(panNorm, 56);

    if (this.bracketsActive) {
      this.bracketPulse += safeDt * 6;
      const pulseScale = 1 + Math.sin(this.bracketPulse) * 0.06;
      this.lockBrackets.scale.set(pulseScale);
    }
  }

  destroyScope(): void {
    this.focusTl?.kill();
    this.joltTween?.kill();
    gsap.killTweensOf(this.rimGroup.scale);
    gsap.killTweensOf(this);
    if (typeof window !== 'undefined') {
      if (this.onWinPointerDown) window.removeEventListener('pointerdown', this.onWinPointerDown);
      if (this.onWinPointerMove) window.removeEventListener('pointermove', this.onWinPointerMove);
      if (this.onWinPointerUp) {
        window.removeEventListener('pointerup', this.onWinPointerUp);
        window.removeEventListener('pointercancel', this.onWinPointerUp);
      }
    }
    if (this.maskTexture && this.maskTexture !== Texture.WHITE && !this.maskTexture.destroyed) {
      this.maskTexture.destroy(true);
      this.maskTexture = null;
    }
  }
}
