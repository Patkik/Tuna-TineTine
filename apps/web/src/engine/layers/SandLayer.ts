/**
 * SandLayer.ts — Foreground: butter-cream dunes, Rilakkuma, Korilakkuma, crabs, props
 * All characters have chocolate-brown outlines (#4A2C1D) — San-X cel-shaded style
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import { triggerHaptic } from '../../core/haptics';

export class SandLayer extends Container {
  public rilakkuma!: Container;
  public korilakkuma!: Container;
  public umbrella!: Container;
  public crabs: Container[] = [];
  public sandMounds: Container[] = [];
  private dunesGraphics!: Graphics;

  constructor() {
    super();
    this.drawDunes(375, 812);
    this.buildRilakkuma();
    this.buildKorilakkuma();
    this.buildUmbrella();
    this.buildCrabs();
    this.buildBeachProps();
  }

  drawDunes(w: number, h: number): void {
    const sandY = h * 0.68;

    if (this.dunesGraphics) {
      this.dunesGraphics.clear();
    } else {
      this.dunesGraphics = new Graphics();
      this.addChildAt(this.dunesGraphics, 0);
    }

    // Main sand fill
    this.dunesGraphics.rect(0, sandY, w, h - sandY);
    this.dunesGraphics.fill({ color: 0xF3E5AB });

    // Dune mound — left-center
    this.dunesGraphics.ellipse(w * 0.28, sandY, w * 0.35, 60);
    this.dunesGraphics.fill({ color: 0xF3E5AB });

    // Dune mound — right (Rilakkuma's dune)
    this.dunesGraphics.ellipse(w * 0.75, sandY + 10, w * 0.3, 70);
    this.dunesGraphics.fill({ color: 0xF0DC9A });

    // Sand shadow troughs for depth
    this.dunesGraphics.rect(0, sandY + 55, w, 10);
    this.dunesGraphics.fill({ color: 0xE6D395, alpha: 0.5 });

    // Shells and decorations
    this.drawShells(w, sandY);
  }

  private drawShells(w: number, sandY: number): void {
    // Starfish
    this.drawStarfish(this.dunesGraphics, w * 0.52, sandY + 15, 10);
    // Small seashell
    this.drawSeashell(this.dunesGraphics, w * 0.6, sandY + 30, 8);
    // Bear-print sunglasses on the left (from ref art)
    this.drawSunglasses(this.dunesGraphics, w * 0.07, sandY + 40);
  }

  private drawStarfish(g: Graphics, x: number, y: number, r: number): void {
    g.star(x, y, 5, r, r * 0.4);
    g.fill({ color: 0xFACC15 });
    g.stroke({ color: 0x4A2C1D, width: 2 });
  }

  private drawSeashell(g: Graphics, x: number, y: number, r: number): void {
    g.ellipse(x, y, r, r * 1.3);
    g.fill({ color: 0xFDE68A });
    g.stroke({ color: 0x4A2C1D, width: 1.5 });
  }

  private drawSunglasses(g: Graphics, x: number, y: number): void {
    // Bear-shaped sunglasses from reference art
    g.circle(x, y, 10);
    g.fill({ color: 0x0EA5E9 });
    g.stroke({ color: 0x4A2C1D, width: 2 });
    g.circle(x + 24, y, 10);
    g.fill({ color: 0x0EA5E9 });
    g.stroke({ color: 0x4A2C1D, width: 2 });
    g.moveTo(x + 10, y);
    g.lineTo(x + 14, y);
    g.stroke({ color: 0x4A2C1D, width: 2 });
  }

  /**
   * Rilakkuma — buried up to his head, only face visible above dune.
   * Classic lazy Rilakkuma expression from reference art.
   */
  private buildRilakkuma(): void {
    this.rilakkuma = new Container();
    const g = new Graphics();

    // Head (brown round bear)
    g.circle(0, 0, 44);
    g.fill({ color: 0xC8923B });
    g.stroke({ color: 0x4A2C1D, width: 3 });

    // Ear left
    g.circle(-34, -34, 16);
    g.fill({ color: 0xC8923B });
    g.stroke({ color: 0x4A2C1D, width: 3 });

    // Ear inner left
    g.circle(-34, -34, 9);
    g.fill({ color: 0xF472B6, alpha: 0.6 });

    // Ear right
    g.circle(34, -34, 16);
    g.fill({ color: 0xC8923B });
    g.stroke({ color: 0x4A2C1D, width: 3 });

    // Ear inner right
    g.circle(34, -34, 9);
    g.fill({ color: 0xF472B6, alpha: 0.6 });

    // Face muzzle
    g.ellipse(0, 10, 24, 18);
    g.fill({ color: 0xE8C07A });
    g.stroke({ color: 0x4A2C1D, width: 2 });

    // Eyes (closed, sleepy ~)
    g.moveTo(-16, -5);
    g.bezierCurveTo(-13, -11, -10, -11, -8, -5);
    g.stroke({ color: 0x4A2C1D, width: 3 });
    g.moveTo(8, -5);
    g.bezierCurveTo(10, -11, 13, -11, 16, -5);
    g.stroke({ color: 0x4A2C1D, width: 3 });

    // Nose
    g.ellipse(0, 6, 7, 5);
    g.fill({ color: 0x4A2C1D });

    // Mouth
    g.arc(0, 10, 7, 0.1, Math.PI - 0.1);
    g.stroke({ color: 0x4A2C1D, width: 2 });

    // Red dot on head (Rilakkuma's signature mark)
    g.circle(0, -44, 5);
    g.fill({ color: 0xEF4444 });
    g.stroke({ color: 0x4A2C1D, width: 1.5 });

    this.rilakkuma.addChild(g);
    this.rilakkuma.eventMode = 'static';
    this.rilakkuma.cursor = 'pointer';
    this.rilakkuma.on('pointertap', () => this.wiggleRilakkuma());
    this.addChild(this.rilakkuma);

    this.startRilakkumaIdle();
  }

  private wiggleRilakkuma(): void {
    triggerHaptic(12);
    gsap.to(this.rilakkuma, {
      rotation: 0.08,
      duration: 0.1,
      yoyo: true,
      repeat: 5,
      ease: 'none',
      onComplete: () => { this.rilakkuma.rotation = 0; },
    });
  }

  private startRilakkumaIdle(): void {
    // Gentle snooze bob
    gsap.to(this.rilakkuma, {
      y: '+=4',
      duration: 2.5,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  /**
   * Korilakkuma — white bear with pink bow, straw hat, pink shovel
   */
  private buildKorilakkuma(): void {
    this.korilakkuma = new Container();
    const g = new Graphics();

    // Head (white bear)
    g.circle(0, 0, 36);
    g.fill({ color: 0xFFFBF5 });
    g.stroke({ color: 0x4A2C1D, width: 3 });

    // Ears
    g.circle(-28, -28, 13);
    g.fill({ color: 0xFFFBF5 });
    g.stroke({ color: 0x4A2C1D, width: 3 });
    g.circle(28, -28, 13);
    g.fill({ color: 0xFFFBF5 });
    g.stroke({ color: 0x4A2C1D, width: 3 });

    // Pink bow on right ear
    g.moveTo(20, -38);
    g.lineTo(36, -50);
    g.lineTo(36, -34);
    g.closePath();
    g.fill({ color: 0xF472B6 });
    g.stroke({ color: 0x4A2C1D, width: 2 });
    g.moveTo(36, -50);
    g.lineTo(50, -38);
    g.lineTo(36, -34);
    g.closePath();
    g.fill({ color: 0xF472B6 });
    g.stroke({ color: 0x4A2C1D, width: 2 });
    g.circle(36, -42, 5);
    g.fill({ color: 0xFF90C8 });
    g.stroke({ color: 0x4A2C1D, width: 1.5 });

    // Face muzzle
    g.ellipse(0, 10, 20, 15);
    g.fill({ color: 0xFFF0D8 });
    g.stroke({ color: 0x4A2C1D, width: 1.5 });

    // Eyes (dot eyes)
    g.circle(-12, -4, 5);
    g.fill({ color: 0x4A2C1D });
    g.circle(12, -4, 5);
    g.fill({ color: 0x4A2C1D });

    // Blush
    g.circle(-18, 8, 7);
    g.fill({ color: 0xF472B6, alpha: 0.35 });
    g.circle(18, 8, 7);
    g.fill({ color: 0xF472B6, alpha: 0.35 });

    // Nose
    g.circle(0, 6, 4);
    g.fill({ color: 0x4A2C1D });

    // Straw hat
    const hat = new Graphics();
    hat.ellipse(0, -44, 42, 10);
    hat.fill({ color: 0xF5DEB3 });
    hat.stroke({ color: 0x4A2C1D, width: 2.5 });
    hat.rect(-22, -72, 44, 32);
    hat.fill({ color: 0xF5DEB3 });
    hat.stroke({ color: 0x4A2C1D, width: 2.5 });
    // Hat band
    hat.rect(-22, -60, 44, 6);
    hat.fill({ color: 0xF472B6 });

    // Pink shovel (held in left hand)
    const shovel = new Graphics();
    shovel.rect(-6, -20, 12, 48);
    shovel.fill({ color: 0xF472B6 });
    shovel.stroke({ color: 0x4A2C1D, width: 2 });
    shovel.ellipse(0, -26, 14, 11);
    shovel.fill({ color: 0xF472B6 });
    shovel.stroke({ color: 0x4A2C1D, width: 2 });
    shovel.x = -52;
    shovel.y = -10;

    this.korilakkuma.addChild(g);
    this.korilakkuma.addChild(hat);
    this.korilakkuma.addChild(shovel);
    this.addChild(this.korilakkuma);

    // Start subtle idle animation
    gsap.to(this.korilakkuma, {
      y: '+=3',
      duration: 2,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  /**
   * Striped beach umbrella — teal and white, from reference art
   */
  private buildUmbrella(): void {
    this.umbrella = new Container();
    const g = new Graphics();

    // Pole
    g.rect(-2, 0, 4, 80);
    g.fill({ color: 0x4A2C1D });

    // Canopy — alternating teal/white/pink segments
    const colors = [0x06B6D4, 0xFFFFFF, 0xF472B6, 0xFFFFFF, 0x06B6D4, 0xFFFFFF];
    for (let i = 0; i < 6; i++) {
      const startAngle = (Math.PI / 6) * i - Math.PI;
      const endAngle = (Math.PI / 6) * (i + 1) - Math.PI;
      g.moveTo(0, 0);
      g.arc(0, 0, 50, startAngle, endAngle);
      g.closePath();
      g.fill({ color: colors[i] });
      g.stroke({ color: 0x4A2C1D, width: 1.5 });
    }

    this.umbrella.addChild(g);
    this.addChild(this.umbrella);

    gsap.to(this.umbrella, {
      rotation: 0.03,
      duration: 3,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  /**
   * Red scuttling crabs — from reference art
   */
  private buildCrabs(): void {
    const positions = [
      { x: 0.38, y: 0 },
      { x: 0.55, y: 0 },
    ];

    for (const pos of positions) {
      const crab = new Container();
      const g = new Graphics();

      // Body
      g.ellipse(0, 0, 16, 11);
      g.fill({ color: 0xEF4444 });
      g.stroke({ color: 0x4A2C1D, width: 2 });

      // Eyes (stalks)
      g.rect(-8, -14, 4, 10);
      g.fill({ color: 0xEF4444 });
      g.circle(-6, -15, 4);
      g.fill({ color: 0x4A2C1D });

      g.rect(4, -14, 4, 10);
      g.fill({ color: 0xEF4444 });
      g.circle(6, -15, 4);
      g.fill({ color: 0x4A2C1D });

      // Claws
      g.ellipse(-22, -4, 10, 7);
      g.fill({ color: 0xEF4444 });
      g.stroke({ color: 0x4A2C1D, width: 1.5 });
      g.ellipse(22, -4, 10, 7);
      g.fill({ color: 0xEF4444 });
      g.stroke({ color: 0x4A2C1D, width: 1.5 });

      // Legs
      for (let l = -1; l <= 1; l += 2) {
        for (let j = 0; j < 3; j++) {
          g.moveTo(l * 10, 0);
          g.lineTo(l * (22 + j * 4), 8 + j * 2);
          g.stroke({ color: 0x4A2C1D, width: 2 });
        }
      }

      crab.addChild(g);
      crab.eventMode = 'static';
      crab.cursor = 'pointer';

      const crabInstance = crab;
      crab.on('pointertap', () => {
        triggerHaptic(12);
        this.scuttleCrab(crabInstance);
      });

      this.crabs.push(crab);
      this.addChild(crab);

      // Idle pinch animation
      gsap.to(g.scale, {
        x: 1.05,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: Math.random() * 1,
      });
    }
  }

  private scuttleCrab(crab: Container): void {
    const dir = Math.random() > 0.5 ? 1 : -1;
    gsap.to(crab, {
      x: `+=${dir * 50}`,
      duration: 0.4,
      ease: 'back.out(2)',
      yoyo: true,
      repeat: 2,
    });
  }

  private buildBeachProps(): void {
    // Pink bucket (Korilakkuma's polka-dot bucket from reference art)
    const bucket = new Graphics();
    // Bucket body
    bucket.rect(-14, -26, 28, 26);
    bucket.fill({ color: 0xF472B6 });
    bucket.stroke({ color: 0x4A2C1D, width: 2.5 });
    // Polka dots
    for (let i = 0; i < 4; i++) {
      bucket.circle(-8 + (i % 2) * 16, -18 + Math.floor(i / 2) * 12, 3);
      bucket.fill({ color: 0xFFFFFF, alpha: 0.7 });
    }
    // Handle
    bucket.arc(0, -26, 14, Math.PI, 0);
    bucket.stroke({ color: 0x4A2C1D, width: 2.5 });
    this.addChild(bucket);

    // Red octopus (small prop) from reference art
    const octopus = new Graphics();
    octopus.circle(0, -8, 12);
    octopus.fill({ color: 0xEF4444 });
    octopus.stroke({ color: 0x4A2C1D, width: 2 });
    // Tentacles
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI / 4) * i;
      octopus.moveTo(Math.cos(angle) * 8, 4);
      octopus.quadraticCurveTo(
        Math.cos(angle) * 18,
        14,
        Math.cos(angle) * 14,
        24
      );
      octopus.stroke({ color: 0x4A2C1D, width: 2 });
    }
    // Eyes
    octopus.circle(-5, -10, 3);
    octopus.fill({ color: 0xFFFFFF });
    octopus.circle(5, -10, 3);
    octopus.fill({ color: 0xFFFFFF });
    octopus.circle(-5, -10, 1.5);
    octopus.fill({ color: 0x4A2C1D });
    octopus.circle(5, -10, 1.5);
    octopus.fill({ color: 0x4A2C1D });
    this.addChild(octopus);
  }

  resize(w: number, h: number): void {
    this.drawDunes(w, h);

    const sandY = h * 0.68;

    // Position characters based on stage dimensions
    if (this.rilakkuma) {
      this.rilakkuma.x = w * 0.78;
      this.rilakkuma.y = sandY + 10;
    }
    if (this.korilakkuma) {
      this.korilakkuma.x = w * 0.22;
      this.korilakkuma.y = sandY - 20;
    }
    if (this.umbrella) {
      this.umbrella.x = w * 0.5;
      this.umbrella.y = sandY - 50;
    }

    this.crabs.forEach((crab, i) => {
      crab.x = w * (0.38 + i * 0.17);
      crab.y = sandY + 25;
    });
  }
}
