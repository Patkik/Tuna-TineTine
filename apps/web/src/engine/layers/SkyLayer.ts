/**
 * SkyLayer.ts — Far sky: cerulean gradient, bear cloud, chick cloud, seagulls, contrail plane
 * All graphics faithful to Rilakkuma Beach Reference Art (San-X style)
 */
import {
  Container,
  Graphics,
  Text,
  TextStyle,
  Ticker,
} from 'pixi.js';
import gsap from 'gsap';

export class SkyLayer extends Container {
  private skyBg!: Graphics;
  private bearCloud!: Container;
  private chickCloud!: Container;
  private seagulls: Graphics[] = [];
  public plane!: Container;
  private contrailGraphics!: Graphics;
  private contrailText!: Text;
  private planeAnimating = false;

  constructor() {
    super();
    this.drawSkyGradient();
    this.drawBearCloud();
    this.drawChickCloud();
    this.drawSeagulls();
    this.buildPlane();
    this.startAmbientAnimations();
  }

  private drawSkyGradient(): void {
    this.skyBg = new Graphics();
    this.addChildAt(this.skyBg, 0);
    this.redrawGradient(375, 812);
  }

  redrawGradient(w: number, h: number): void {
    const skyH = h * 0.72;
    this.skyBg.clear();
    // Top cerulean to light cyan — matches #0EA5E9 → #67E8F9
    this.skyBg.rect(0, 0, w, skyH);
    this.skyBg.fill({ color: 0x0EA5E9 });
    // Soft horizon band
    this.skyBg.rect(0, skyH * 0.6, w, skyH * 0.4);
    this.skyBg.fill({ color: 0x7DD3FC });
  }

  /**
   * Giant smiling bear-shaped cloud (right side) — San-X style flat shapes
   */
  private drawBearCloud(): void {
    this.bearCloud = new Container();
    const g = new Graphics();

    // Bear head (large oval)
    g.ellipse(0, 0, 90, 75);
    g.fill({ color: 0xFFFFFF });

    // Left ear
    g.ellipse(-72, -60, 32, 28);
    g.fill({ color: 0xFFFFFF });

    // Right ear
    g.ellipse(72, -60, 32, 28);
    g.fill({ color: 0xFFFFFF });

    // Extra cloud puffs for volume
    g.ellipse(-50, 20, 55, 45);
    g.fill({ color: 0xFFFFFF });
    g.ellipse(50, 20, 55, 45);
    g.fill({ color: 0xFFFFFF });
    g.ellipse(0, 40, 70, 40);
    g.fill({ color: 0xFFFFFF });

    // Cute face — tiny dot eyes
    g.circle(-22, -10, 7);
    g.fill({ color: 0x4A2C1D });
    g.circle(22, -10, 7);
    g.fill({ color: 0x4A2C1D });

    // Nose
    g.ellipse(0, 10, 10, 7);
    g.fill({ color: 0xF472B6 });

    // Smile arc
    g.arc(0, 15, 15, 0.1, Math.PI - 0.1);
    g.stroke({ color: 0x4A2C1D, width: 3 });

    this.bearCloud.addChild(g);
    this.bearCloud.x = 280;
    this.bearCloud.y = 90;
    this.bearCloud.scale.set(1.2);
    this.addChild(this.bearCloud);
  }

  /**
   * Small chick-shaped cloud (left side)
   */
  private drawChickCloud(): void {
    this.chickCloud = new Container();
    const g = new Graphics();

    // Body
    g.ellipse(0, 0, 48, 38);
    g.fill({ color: 0xFFFFFF });

    // Head
    g.ellipse(0, -40, 32, 28);
    g.fill({ color: 0xFFFFFF });

    // Ear bumps
    g.ellipse(-20, -58, 14, 12);
    g.fill({ color: 0xFFFFFF });
    g.ellipse(20, -58, 14, 12);
    g.fill({ color: 0xFFFFFF });

    // Eyes
    g.circle(-8, -40, 4);
    g.fill({ color: 0x4A2C1D });
    g.circle(8, -40, 4);
    g.fill({ color: 0x4A2C1D });

    this.chickCloud.addChild(g);
    this.chickCloud.x = 55;
    this.chickCloud.y = 100;
    this.addChild(this.chickCloud);
  }

  private drawSeagulls(): void {
    const positions = [
      { x: 180, y: 55 },
      { x: 240, y: 40 },
      { x: 310, y: 70 },
    ];

    for (const pos of positions) {
      const g = new Graphics();
      // Simple M-shape seagull
      g.moveTo(-12, 0);
      g.quadraticCurveTo(-6, -8, 0, -4);
      g.quadraticCurveTo(6, -8, 12, 0);
      g.stroke({ color: 0x4A2C1D, width: 2.5 });
      g.x = pos.x;
      g.y = pos.y;
      this.seagulls.push(g);
      this.addChild(g);
    }
  }

  /**
   * Contrail airplane — used in Act 1 skywriting animation
   */
  private buildPlane(): void {
    this.plane = new Container();

    const body = new Graphics();
    // Fuselage
    body.rect(-18, -5, 36, 10);
    body.fill({ color: 0xFFFFFF });
    body.stroke({ color: 0x4A2C1D, width: 2 });

    // Wings
    body.moveTo(-8, -5);
    body.lineTo(-18, -18);
    body.lineTo(8, -5);
    body.fill({ color: 0xFFFFFF });
    body.stroke({ color: 0x4A2C1D, width: 2 });

    // Tail
    body.moveTo(-18, -5);
    body.lineTo(-26, -14);
    body.lineTo(-14, -5);
    body.fill({ color: 0xFFFFFF });
    body.stroke({ color: 0x4A2C1D, width: 2 });

    // Red stripe
    body.rect(-18, -1, 36, 4);
    body.fill({ color: 0xEF4444 });

    this.plane.addChild(body);
    this.plane.x = -60;
    this.plane.y = 50;
    this.plane.visible = false;
    this.addChild(this.plane);

    this.contrailGraphics = new Graphics();
    this.addChildAt(this.contrailGraphics, this.getChildIndex(this.plane));

    this.contrailText = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'Fredoka, sans-serif',
        fontSize: 20,
        fontWeight: '700',
        fill: 0xFFFFFF,
        stroke: { color: 0x4A2C1D, width: 3 },
        dropShadow: {
          alpha: 0.3,
          angle: Math.PI / 4,
          blur: 2,
          color: 0x000000,
          distance: 2,
        },
      }),
    });
    this.contrailText.x = 0;
    this.contrailText.y = 20;
    this.addChild(this.contrailText);
  }

  /**
   * Animate the contrail plane across the sky writing a message.
   * Returns a promise that resolves when the animation finishes.
   */
  async animatePlane(message: string, stageWidth: number): Promise<void> {
    if (this.planeAnimating) return;
    this.planeAnimating = true;

    this.plane.visible = true;
    this.plane.x = -60;
    this.plane.y = 55;
    this.contrailText.text = '';

    // Fly plane across the sky
    await new Promise<void>((resolve) => {
      gsap.to(this.plane, {
        x: stageWidth + 60,
        duration: 5,
        ease: 'none',
        onUpdate: () => {
          // Draw white contrail line behind plane
          this.contrailGraphics.clear();
          this.contrailGraphics.moveTo(0, 60);
          this.contrailGraphics.lineTo(this.plane.x, 60);
          this.contrailGraphics.stroke({ color: 0xFFFFFF, width: 3, alpha: 0.9 });

          // Write message character-by-character as plane passes
          const progress = this.plane.x / stageWidth;
          const charsToShow = Math.floor(progress * message.length);
          this.contrailText.text = message.slice(0, charsToShow);
        },
        onComplete: resolve,
      });
    });

    this.plane.visible = false;
    this.planeAnimating = false;
  }

  private startAmbientAnimations(): void {
    // Gentle cloud bob
    gsap.to(this.bearCloud, { y: '+=8', duration: 3.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to(this.chickCloud, { y: '+=6', duration: 2.7, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.6 });

    // Seagull bob
    this.seagulls.forEach((s, i) => {
      gsap.to(s, { y: `+=${4 + i * 2}`, duration: 2 + i * 0.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 0.3 });
    });
  }

  resize(w: number, h: number): void {
    this.redrawGradient(w, h);
    this.bearCloud.x = w * 0.75;
    this.chickCloud.x = w * 0.14;
  }
}
