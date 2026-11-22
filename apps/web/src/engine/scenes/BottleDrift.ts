/**
 * BottleDrift.ts — Beat 4 interactive message bottle resting on the central shore:
 * - Accompanied on the beach by the proud waving terracotta octopus (Frame 5 continuity)
 * - Generous Circle(0, -14, 78) hitArea + sparkling golden stars inviting tap/click
 * - Tap hops bottle to center -> corkscrew drops down, twists 3x with helical motion &
 *   corkTwist foley -> cork + corkscrew POP free -> pink-banded scroll emerges -> ScrollModal!
 * - playReverseClose() tucks scroll back in, re-corks ("plop!"), hides shore companion, and
 *   settles bottle gently onto wet sand for Beat 5's spyglass bear peek.
 */
import { Circle, Container, Sprite } from 'pixi.js';
import gsap from 'gsap';
import {
  createFoamRingTexture,
  createMoteTexture,
  type Stage2Textures,
} from '../assets/svgTextureFactory';
import type { SceneLayout } from '../layout/sceneLayout';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import { triggerHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

interface PooledFoamRing {
  sprite: Sprite;
  active: boolean;
  age: number;
  life: number;
}

interface PooledBubble {
  sprite: Sprite;
  active: boolean;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

export class BottleDrift extends Container {
  private readonly bottleGroup = new Container();
  private readonly bottleBody: Sprite;
  private readonly bottleCork: Sprite;
  private readonly corkscrewSprite: Sprite;
  private readonly rolledScroll: Sprite;

  private readonly proudOctopus = new Container();
  private readonly octopusBody: Sprite;
  private readonly octopusWaveArm: Sprite;

  private readonly shimmerStars: Sprite[] = [];
  private readonly foamPool: PooledFoamRing[] = [];
  private readonly bubblePool: PooledBubble[] = [];

  private shoreX = 510;
  private shoreY = 415;
  private baseScale = 1;
  private centerX = 512;
  private centerY = 288;

  private phase: 'idle' | 'drifting' | 'settled' | 'opening' | 'opened' | 'closing' = 'idle';
  private companionVisible = false;
  private hovered = false;
  private shimmerPhase = 0;

  private driftElapsed = 0;
  private driftDuration = 1.65;
  private foamCooldown = 0;
  private settledCb?: () => void;
  private openScrollCb: () => void;
  private activeTl: gsap.core.Timeline | null = null;

  constructor(textures: Stage2Textures, onOpenScroll: () => void) {
    super();
    this.openScrollCb = onOpenScroll;

    const foamTex = createFoamRingTexture();
    for (let i = 0; i < 8; i++) {
      const sp = new Sprite(foamTex);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.addChild(sp);
      this.foamPool.push({ sprite: sp, active: false, age: 0, life: 1.1 });
    }

    // Proud octopus seated beside the bottle after delivering it (Frame 5)
    this.octopusBody = new Sprite(textures.octopusHero);
    this.octopusBody.anchor.set(0.5, 0.68);
    this.octopusWaveArm = new Sprite(textures.octopusArmWave);
    this.octopusWaveArm.anchor.set(0.5, 0.88);
    this.octopusWaveArm.position.set(-40, 2);
    this.proudOctopus.addChild(this.octopusWaveArm, this.octopusBody);
    this.proudOctopus.visible = false;
    this.addChild(this.proudOctopus);

    this.rolledScroll = new Sprite(textures.bottleScrollRolled);
    this.rolledScroll.anchor.set(0.5, 0.85);
    this.rolledScroll.position.set(0, -14);
    this.rolledScroll.scale.set(0.55);
    this.rolledScroll.visible = false;

    this.bottleBody = new Sprite(textures.bottleBody);
    this.bottleBody.anchor.set(0.5, 0.55);

    this.bottleCork = new Sprite(textures.bottleCork);
    this.bottleCork.anchor.set(0.5, 0.85);
    this.bottleCork.position.set(0, -34);

    this.corkscrewSprite = new Sprite(textures.corkscrewTool);
    this.corkscrewSprite.anchor.set(0.5, 0.92);
    this.corkscrewSprite.position.set(0, -58);
    this.corkscrewSprite.visible = false;

    this.bottleGroup.addChild(
      this.rolledScroll,
      this.bottleBody,
      this.bottleCork,
      this.corkscrewSprite,
    );

    // Subtle twinkling diamond sparkles around the clickable bottle
    const starPositions = [
      { x: -46, y: -38 },
      { x: 48, y: -22 },
      { x: -42, y: 28 },
      { x: 42, y: 34 },
    ];
    for (let i = 0; i < starPositions.length; i++) {
      const star = new Sprite(textures.goldStar);
      star.anchor.set(0.5, 0.5);
      star.position.set(starPositions[i].x, starPositions[i].y);
      star.scale.set(0.42);
      star.visible = false;
      this.bottleGroup.addChild(star);
      this.shimmerStars.push(star);
    }

    this.bottleGroup.hitArea = new Circle(0, -14, 78);
    this.bottleGroup.eventMode = 'none';
    this.bottleGroup.cursor = 'pointer';
    this.bottleGroup.on('pointerover', () => {
      this.hovered = true;
    });
    this.bottleGroup.on('pointerout', () => {
      this.hovered = false;
    });
    this.bottleGroup.on('pointertap', () => {
      if (this.phase === 'settled') {
        this.triggerOpen();
      }
    });
    this.addChild(this.bottleGroup);

    const moteTex = createMoteTexture();
    for (let i = 0; i < 18; i++) {
      const sp = new Sprite(i % 3 === 0 ? textures.goldStar : moteTex);
      sp.anchor.set(0.5, 0.5);
      sp.visible = false;
      this.addChild(sp);
      this.bubblePool.push({ sprite: sp, active: false, vx: 0, vy: 0, age: 0, life: 0.7 });
    }
  }

  getShorePosition(): { x: number; y: number } {
    return { x: this.shoreX, y: this.shoreY };
  }

  setShoreCompanionVisible(visible: boolean): void {
    this.companionVisible = visible;
    if (!visible) {
      gsap.to(this.proudOctopus, {
        alpha: 0,
        duration: 0.28,
        ease: 'power2.out',
        onComplete: () => {
          if (!this.companionVisible) this.proudOctopus.visible = false;
        },
      });
    } else {
      this.proudOctopus.visible = true;
      this.proudOctopus.alpha = 1;
      this.proudOctopus.scale.set(this.baseScale * 0.72);
    }
  }

  applyLayout(layout: SceneLayout): void {
    this.baseScale = Math.max(0.72, layout.unitScale * 1.16);
    this.shoreX = layout.width * 0.52;
    this.shoreY = layout.dunes.oceanBottomY + 46 * layout.unitScale;
    this.centerX = layout.width * 0.5;
    this.centerY = layout.height * 0.54;

    this.proudOctopus.position.set(this.shoreX - 88 * this.baseScale, this.shoreY + 6 * this.baseScale);
    this.proudOctopus.scale.set(this.baseScale * 0.72);

    if (this.phase === 'settled' || this.phase === 'idle') {
      this.bottleGroup.position.set(this.shoreX, this.shoreY);
      this.bottleGroup.scale.set(this.baseScale);
      this.bottleGroup.rotation = -0.28;
    }
  }

  startDrift(layout: SceneLayout, onSettled: () => void): void {
    this.applyLayout(layout);
    this.settledCb = onSettled;
    this.phase = 'drifting';
    this.driftElapsed = 0;
    this.foamCooldown = 0.08;
    this.bottleGroup.eventMode = 'none';
    this.bottleGroup.rotation = -0.46;
    this.bottleGroup.scale.set(this.baseScale * 0.85);
    this.bottleGroup.position.set(layout.width * 0.78, layout.dunes.horizonY + 18);
  }

  snapSettled(layout: SceneLayout, showCompanion = false): void {
    this.applyLayout(layout);
    this.phase = 'settled';
    this.bottleGroup.eventMode = 'static';
    this.bottleGroup.position.set(this.shoreX, this.shoreY);
    this.bottleGroup.rotation = -0.28;
    this.bottleGroup.scale.set(this.baseScale);
    this.bottleCork.position.set(0, -34);
    this.bottleCork.scale.set(1);
    this.bottleCork.rotation = 0;
    this.bottleCork.alpha = 1;
    this.corkscrewSprite.visible = false;
    this.rolledScroll.visible = false;
    this.setShoreCompanionVisible(showCompanion);
    this.shimmerStars.forEach((s) => {
      s.visible = true;
    });
  }

  private spawnFoamRing(x: number, y: number): void {
    const slot = this.foamPool.find((f) => !f.active) ?? this.foamPool[0];
    if (!slot) return;
    slot.active = true;
    slot.age = 0;
    slot.life = 1.05;
    slot.sprite.position.set(x, y + 18 * this.baseScale);
    slot.sprite.scale.set(this.baseScale * 0.45);
    slot.sprite.alpha = 0.82;
    slot.sprite.visible = true;
  }

  private spawnPopBurst(cx: number, cy: number): void {
    for (let i = 0; i < this.bubblePool.length; i++) {
      const b = this.bubblePool[i];
      b.active = true;
      b.age = 0;
      b.life = 0.58 + Math.random() * 0.32;
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * 2.0;
      const spd = 85 + Math.random() * 120;
      b.vx = Math.cos(ang) * spd;
      b.vy = Math.sin(ang) * spd;
      b.sprite.position.set(cx, cy);
      b.sprite.tint = i % 3 === 0 ? 0xfacc15 : 0xa5f3fc;
      b.sprite.scale.set((i % 3 === 0 ? 0.38 : 0.78) * this.baseScale);
      b.sprite.alpha = 1;
      b.sprite.visible = true;
    }
  }

  triggerOpen(): void {
    if (this.phase !== 'settled') return;
    this.phase = 'opening';
    this.bottleGroup.eventMode = 'none';
    this.hovered = false;
    this.shimmerStars.forEach((s) => {
      s.visible = false;
    });
    this.activeTl?.kill();

    this.rolledScroll.visible = true;
    this.rolledScroll.position.set(0, -10);
    this.rolledScroll.scale.set(0.55);
    this.rolledScroll.alpha = 0;

    this.corkscrewSprite.visible = true;
    this.corkscrewSprite.position.set(0, -118);
    this.corkscrewSprite.rotation = 0;
    this.corkscrewSprite.scale.set(1, 1);
    this.corkscrewSprite.alpha = 0;

    this.activeTl = gsap.timeline({
      onComplete: () => {
        this.phase = 'opened';
        this.corkscrewSprite.visible = false;
        this.openScrollCb();
      },
    });

    this.activeTl
      // 1. Hop bottle cleanly to center view
      .to(this.bottleGroup, {
        x: this.centerX,
        y: this.centerY + 14 * this.baseScale,
        rotation: 0,
        duration: 0.36,
        ease: 'back.out(1.45)',
      })
      .to(
        this.bottleGroup.scale,
        {
          x: this.baseScale * 1.38,
          y: this.baseScale * 1.38,
          duration: 0.36,
          ease: 'power2.out',
        },
        '<',
      )
      // 2. Corkscrew drops cleanly above cork
      .to(this.corkscrewSprite, {
        y: -58,
        alpha: 1,
        duration: 0.24,
        ease: 'power2.out',
      })
      // 3. Three tactile corkscrew twists sinking into the cork!
      .add(() => {
        audioManager.playSfx('corkTwist');
        triggerHaptic(8);
      })
      .to(this.corkscrewSprite, { y: -52, duration: 0.14, ease: 'sine.inOut' })
      .to(this.corkscrewSprite.scale, { x: -0.92, duration: 0.14, ease: 'sine.inOut' }, '<')
      .to(this.bottleGroup, { rotation: 0.04, duration: 0.14 }, '<')
      .add(() => {
        audioManager.playSfx('corkTwist');
        triggerHaptic(8);
      })
      .to(this.corkscrewSprite, { y: -46, duration: 0.14, ease: 'sine.inOut' })
      .to(this.corkscrewSprite.scale, { x: 0.96, duration: 0.14, ease: 'sine.inOut' }, '<')
      .to(this.bottleGroup, { rotation: -0.04, duration: 0.14 }, '<')
      .add(() => {
        audioManager.playSfx('corkTwist');
        triggerHaptic(9);
      })
      .to(this.corkscrewSprite, { y: -41, duration: 0.14, ease: 'sine.inOut' })
      .to(this.corkscrewSprite.scale, { x: 1, duration: 0.14, ease: 'sine.inOut' }, '<')
      .to(this.bottleGroup, { rotation: 0, duration: 0.14 }, '<')
      // 4. Elastic upward pull & cork POP!
      .to(this.corkscrewSprite, { y: -50, duration: 0.14, ease: 'power1.in' })
      .to(this.bottleCork, { y: -43, duration: 0.14, ease: 'power1.in' }, '<')
      .add(() => {
        audioManager.playSfx('corkPop');
        triggerHaptic([14, 30, 18]);
        this.spawnPopBurst(this.bottleGroup.x, this.bottleGroup.y - 54 * this.baseScale);
      })
      .to(this.bottleCork, {
        y: -112,
        x: 26,
        rotation: 0.72,
        alpha: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
      .to(
        this.corkscrewSprite,
        {
          y: -148,
          x: 34,
          rotation: 0.45,
          alpha: 0,
          duration: 0.3,
          ease: 'power2.out',
        },
        '<',
      )
      // 5. Pink-banded scroll emerges smoothly out of neck
      .to(
        this.rolledScroll,
        {
          y: -78,
          alpha: 1,
          duration: 0.34,
          ease: 'back.out(1.5)',
        },
        '-=0.14',
      )
      .to(
        this.rolledScroll.scale,
        {
          x: 1.08,
          y: 1.08,
          duration: 0.34,
          ease: 'back.out(1.5)',
        },
        '<',
      );
  }

  playReverseClose(onClosed: () => void): void {
    this.phase = 'closing';
    this.corkscrewSprite.visible = false;
    this.shimmerStars.forEach((s) => {
      s.visible = false;
    });
    this.setShoreCompanionVisible(false);
    this.activeTl?.kill();

    this.activeTl = gsap.timeline({
      onComplete: () => {
        this.phase = 'settled';
        this.rolledScroll.visible = false;
        this.bottleGroup.eventMode = 'static';
        onClosed();
      },
    });

    this.activeTl
      .to(this.rolledScroll, {
        y: -12,
        alpha: 0,
        duration: 0.28,
        ease: 'power2.in',
      })
      .to(
        this.rolledScroll.scale,
        {
          x: 0.52,
          y: 0.52,
          duration: 0.28,
          ease: 'power2.in',
        },
        '<',
      )
      .to(this.bottleCork, {
        x: 0,
        y: -34,
        rotation: 0,
        alpha: 1,
        duration: 0.24,
        ease: 'power2.in',
      })
      .add(() => {
        audioManager.playSfx('corkPlop');
        triggerHaptic(10);
      })
      .fromTo(
        this.bottleCork.scale,
        { x: 1.24, y: 0.78 },
        { x: 1, y: 1, duration: 0.22, ease: 'elastic.out(1.2, 0.4)' },
      )
      .to(this.bottleGroup, {
        x: this.shoreX,
        y: this.shoreY,
        rotation: -0.28,
        duration: 0.4,
        ease: 'power2.inOut',
      })
      .to(
        this.bottleGroup.scale,
        {
          x: this.baseScale,
          y: this.baseScale,
          duration: 0.4,
          ease: 'power2.inOut',
        },
        '<',
      );
  }

  update(dt: number, clock: AtmosphereClock): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    this.shimmerPhase += safeDt;

    if (this.companionVisible && this.proudOctopus.visible) {
      this.proudOctopus.y =
        this.shoreY + 6 * this.baseScale + Math.sin(clock.time * 2.6) * 2.5 * this.baseScale;
      this.octopusWaveArm.rotation = -0.35 + Math.sin(clock.time * 9.5) * 0.28;
    }

    if (this.phase === 'drifting') {
      this.driftElapsed += safeDt;
      const u = Math.min(1, this.driftElapsed / this.driftDuration);
      const ease = 1 - Math.pow(1 - u, 2.2);

      const startX = (this.shoreX / 0.52) * 0.78;
      const startY = this.shoreY - 58;
      const nx = Math.max(0, Math.min(1, this.bottleGroup.x / Math.max(1, clock.screenWidth)));
      const waveBob = clock.waveHeightAt(nx) * 8 * (1 - u);

      this.bottleGroup.x = startX + (this.shoreX - startX) * ease;
      this.bottleGroup.y = startY + (this.shoreY - startY) * ease + waveBob;
      this.bottleGroup.rotation = -0.46 + 0.18 * ease + Math.sin(clock.time * 3.5) * 0.06 * (1 - u);
      this.bottleGroup.scale.set(this.baseScale * (0.85 + 0.15 * ease));

      this.foamCooldown -= safeDt;
      if (this.foamCooldown <= 0) {
        this.foamCooldown = 0.24;
        this.spawnFoamRing(this.bottleGroup.x, this.bottleGroup.y);
      }

      if (u >= 1) {
        this.phase = 'settled';
        this.bottleGroup.eventMode = 'static';
        this.settledCb?.();
        this.settledCb = undefined;
      }
    } else if (this.phase === 'settled') {
      const waveRest = clock.tidePhase() * 2.0;
      const hoverBoost = this.hovered ? 1.07 : 1 + Math.sin(this.shimmerPhase * 3.2) * 0.02;
      this.bottleGroup.y = this.shoreY + waveRest;
      this.bottleGroup.rotation = -0.28 + Math.sin(clock.time * 2.1) * 0.025;
      this.bottleGroup.scale.set(this.baseScale * hoverBoost);

      for (let i = 0; i < this.shimmerStars.length; i++) {
        const star = this.shimmerStars[i];
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.shimmerPhase * 3.1 + i * 1.4));
        star.alpha = tw;
        star.scale.set(0.3 + tw * 0.22);
        star.rotation = this.shimmerPhase * 1.2 + i;
      }
    }

    for (let i = 0; i < this.foamPool.length; i++) {
      const f = this.foamPool[i];
      if (!f.active) continue;
      f.age += safeDt;
      const u = f.age / f.life;
      if (u >= 1) {
        f.active = false;
        f.sprite.visible = false;
        continue;
      }
      f.sprite.scale.set(this.baseScale * (0.45 + u * 0.95));
      f.sprite.alpha = (1 - u) * 0.78;
    }

    for (let i = 0; i < this.bubblePool.length; i++) {
      const b = this.bubblePool[i];
      if (!b.active) continue;
      b.age += safeDt;
      const u = b.age / b.life;
      if (u >= 1) {
        b.active = false;
        b.sprite.visible = false;
        continue;
      }
      b.vy += 120 * safeDt;
      b.sprite.x += b.vx * safeDt;
      b.sprite.y += b.vy * safeDt;
      b.sprite.alpha = Math.max(0, 1 - u);
    }
  }

  destroyScene(): void {
    this.activeTl?.kill();
    gsap.killTweensOf(this.bottleGroup);
    gsap.killTweensOf(this.bottleGroup.scale);
    gsap.killTweensOf(this.bottleCork);
    gsap.killTweensOf(this.bottleCork.scale);
    gsap.killTweensOf(this.corkscrewSprite);
    gsap.killTweensOf(this.corkscrewSprite.scale);
    gsap.killTweensOf(this.rolledScroll);
    gsap.killTweensOf(this.rolledScroll.scale);
    gsap.killTweensOf(this.proudOctopus);
  }
}
