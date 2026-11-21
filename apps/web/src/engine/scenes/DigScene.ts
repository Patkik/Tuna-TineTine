/**
 * DigScene.ts — Interactive sand digging mechanic (Act 2)
 * Uses a WebGL render texture + pointer events to simulate GPU alpha-erase
 */
import { Container, Graphics, RenderTexture, Sprite, Text, TextStyle } from 'pixi.js';
import gsap from 'gsap';
import { triggerHaptic, triggerTreasureHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

export type TreasureId = 'starfish' | 'octopus' | 'sailboat' | 'seashell';

export interface Treasure {
  id: TreasureId;
  emoji: string;
  label: string;
  message: string;
}

const TREASURES: Treasure[] = [
  {
    id: 'starfish',
    emoji: '⭐',
    label: 'Golden Starfish',
    message: 'Your warmth lights up every room you walk into, Kristine.',
  },
  {
    id: 'octopus',
    emoji: '🐙',
    label: 'Little Red Octopus',
    message: 'You have so many amazing talents — and I love watching every one of them.',
  },
  {
    id: 'sailboat',
    emoji: '⛵',
    label: 'Tiny Sailboat',
    message: 'You make every adventure worth having. Here\'s to many more.',
  },
  {
    id: 'seashell',
    emoji: '🐚',
    label: 'Pink Seashell',
    message: 'Like the sound of the ocean in this shell — you\'re always with me.',
  },
];

export function calculateScratchProgress(scratchedPixels: number, totalPixels: number): number {
  if (totalPixels <= 0) return 0;
  return scratchedPixels / totalPixels;
}

export class DigScene extends Container {
  private mounds: Container[] = [];
  private scratchProgress: number[] = [0, 0, 0, 0];
  private scratchCounts: number[] = [0, 0, 0, 0];
  private readonly TOTAL_SCRATCH_PIXELS = 100;
  private readonly UNEARTH_THRESHOLD = 0.65;
  public onTreasureFound?: (treasure: Treasure) => void;

  constructor() {
    super();
    this.buildMounds();
  }

  private buildMounds(): void {
    const positions = [
      { x: 0.2, label: 'starfish' },
      { x: 0.4, label: 'octopus' },
      { x: 0.6, label: 'sailboat' },
      { x: 0.8, label: 'seashell' },
    ];

    for (let i = 0; i < 4; i++) {
      const mound = this.buildSingleMound(i, TREASURES[i]);
      this.mounds.push(mound);
      this.addChild(mound);
    }
  }

  private buildSingleMound(index: number, treasure: Treasure): Container {
    const mound = new Container();
    mound.eventMode = 'static';

    const g = new Graphics();

    // Sand mound shape
    g.ellipse(0, 0, 50, 30);
    g.fill({ color: 0xF0DC9A });
    g.stroke({ color: 0x4A2C1D, width: 2 });

    // Glowing hint particles
    for (let p = 0; p < 4; p++) {
      const px = (Math.random() - 0.5) * 70;
      const py = (Math.random() - 0.5) * 40;
      g.circle(px, py, 2.5);
      g.fill({ color: 0xFACC15, alpha: 0.7 });
    }

    // Label (treasure hint)
    const hint = new Text({
      text: '✨',
      style: new TextStyle({ fontSize: 18 }),
    });
    hint.anchor.set(0.5);
    hint.y = -38;
    gsap.to(hint, { y: -44, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: index * 0.2 });

    mound.addChild(g);
    mound.addChild(hint);

    // Scratching listener
    let isPointerDown = false;
    mound.on('pointerdown', () => { isPointerDown = true; });
    mound.on('pointerup', () => { isPointerDown = false; });
    mound.on('pointerupoutside', () => { isPointerDown = false; });

    mound.on('pointermove', () => {
      if (!isPointerDown) return;
      this.scratchMound(index, mound, treasure, g);
    });

    // Also respond to tap-scratch
    mound.on('pointertap', () => {
      this.scratchMound(index, mound, treasure, g);
    });

    return mound;
  }

  private scratchMound(index: number, mound: Container, treasure: Treasure, g: Graphics): void {
    if (this.scratchProgress[index] >= 1) return;

    this.scratchCounts[index] += 5;
    this.scratchProgress[index] = calculateScratchProgress(
      this.scratchCounts[index],
      this.TOTAL_SCRATCH_PIXELS
    );

    triggerHaptic(12);
    audioManager.play('sandCrunch');

    // Visual: erode the mound
    const scale = 1 - this.scratchProgress[index] * 0.4;
    gsap.to(mound.scale, { x: scale, y: scale, duration: 0.1, ease: 'none' });

    if (this.scratchProgress[index] >= this.UNEARTH_THRESHOLD) {
      this.scratchProgress[index] = 1;
      this.unearth(index, mound, treasure);
    }
  }

  private unearth(index: number, mound: Container, treasure: Treasure): void {
    triggerTreasureHaptic();
    audioManager.play('chime');

    // Spring mound up and fade
    gsap.to(mound, {
      y: mound.y - 60,
      alpha: 0,
      duration: 0.5,
      ease: 'back.out(2)',
      onComplete: () => {
        mound.visible = false;
        this.showTreasureSpring(mound.x, mound.y, treasure);
        this.onTreasureFound?.(treasure);
      },
    });
  }

  private showTreasureSpring(x: number, y: number, treasure: Treasure): void {
    const icon = new Text({
      text: treasure.emoji,
      style: new TextStyle({ fontSize: 48 }),
    });
    icon.anchor.set(0.5);
    icon.x = x;
    icon.y = y;
    icon.scale.set(0);
    this.addChild(icon);

    gsap.to(icon.scale, {
      x: 1,
      y: 1,
      duration: 0.4,
      ease: 'back.out(2)',
    });
    gsap.to(icon, {
      y: y - 30,
      duration: 1.5,
      ease: 'sine.out',
    });
  }

  resize(w: number, h: number): void {
    const sandY = h * 0.72;
    const positions = [0.15, 0.37, 0.62, 0.84];
    this.mounds.forEach((m, i) => {
      m.x = w * positions[i];
      m.y = sandY + 20;
    });
  }
}
