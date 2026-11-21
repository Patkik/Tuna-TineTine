/**
 * OceanLayer.ts — Mid-ocean: turquoise water, foam lines, bobbing sailboats
 */
import { Container, Graphics, Ticker } from 'pixi.js';
import gsap from 'gsap';

export class OceanLayer extends Container {
  private oceanBg!: Graphics;
  private foamLines: Graphics[] = [];
  private sailboats: Container[] = [];
  private waveOffset = 0;

  constructor() {
    super();
    this.drawOcean(375, 812);
    this.drawSailboats();
  }

  drawOcean(w: number, h: number): void {
    const oceanY = h * 0.52;
    const oceanH = h * 0.2;

    if (this.oceanBg) {
      this.oceanBg.clear();
    } else {
      this.oceanBg = new Graphics();
      this.addChildAt(this.oceanBg, 0);
    }

    // Ocean band
    this.oceanBg.rect(0, oceanY, w, oceanH);
    this.oceanBg.fill({ color: 0x7DD3FC });

    // Foam/wave stripes
    for (let i = 0; i < 3; i++) {
      const fy = oceanY + (oceanH / 4) * (i + 0.5);
      this.oceanBg.rect(0, fy, w, 3);
      this.oceanBg.fill({ color: 0xFFFFFF, alpha: 0.5 });
    }
  }

  private drawSailboats(): void {
    const positions = [
      { x: 120, y: 0 },
      { x: 260, y: 0 },
    ];

    for (const pos of positions) {
      const boat = new Container();

      const hull = new Graphics();
      hull.ellipse(0, 6, 22, 8);
      hull.fill({ color: 0x4A2C1D });

      const sail = new Graphics();
      sail.moveTo(0, -24);
      sail.lineTo(16, 6);
      sail.lineTo(-16, 6);
      sail.closePath();
      sail.fill({ color: 0xEF4444 });
      sail.stroke({ color: 0x4A2C1D, width: 2 });

      boat.addChild(hull);
      boat.addChild(sail);
      boat.x = pos.x;
      this.sailboats.push(boat);
      this.addChild(boat);
    }

    this.startSailboatBobbing();
  }

  private startSailboatBobbing(): void {
    this.sailboats.forEach((boat, i) => {
      gsap.to(boat, {
        y: 5,
        duration: 1.8 + i * 0.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: i * 0.7,
      });
      gsap.to(boat, {
        rotation: 0.06,
        duration: 2.1 + i * 0.3,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: i * 0.4,
      });
    });
  }

  resize(w: number, h: number): void {
    this.drawOcean(w, h);

    // Reposition sailboats relative to new width and ocean band
    const oceanY = h * 0.52;
    const baseBoatY = oceanY - 15;

    this.sailboats.forEach((boat, i) => {
      boat.x = w * (i === 0 ? 0.3 : 0.65);
      boat.y = baseBoatY;
    });
  }
}
