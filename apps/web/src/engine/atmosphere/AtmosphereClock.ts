/**
 * AtmosphereClock.ts — Unified dt-normalized clock driving phase-delayed wind gusts,
 * 8-second ocean tide breath, wave height curves, ambient lighting breath,
 * and pooled directional swipe/story wind impulses across all scene layers.
 */

export interface WindImpulse {
  originX: number;
  originY: number;
  bornAt: number;
  direction: number;
  strength: number;
  active: boolean;
}

export interface GustEvent {
  x: number;
  y: number;
  direction: number;
  strength: number;
  fromSwipe: boolean;
}

export class AtmosphereClock {
  public time = 0;
  public screenWidth = 390;
  public screenHeight = 844;
  public timeOfDayProgress = 0;

  private readonly impulses: WindImpulse[] = Array.from({ length: 6 }, () => ({
    originX: 0,
    originY: 0,
    bornAt: -10,
    direction: 1,
    strength: 0,
    active: false,
  }));
  private nextImpulseSlot = 0;
  private pendingEvents: GustEvent[] = [];
  private prevLeftGust = 0;
  private lastAutoRibbonAt = -10;

  setViewport(width: number, height: number): void {
    this.screenWidth = Math.max(1, width);
    this.screenHeight = Math.max(1, height);
  }

  setScreenWidth(width: number): void {
    this.screenWidth = Math.max(1, width);
  }

  setTimeOfDayProgress(progress: number): void {
    this.timeOfDayProgress = Math.max(0, Math.min(1, progress));
  }

  update(dt: number): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    this.time += safeDt;

    for (let i = 0; i < this.impulses.length; i++) {
      const imp = this.impulses[i];
      if (imp.active && this.time - imp.bornAt > 2.4) {
        imp.active = false;
      }
    }

    const leftGust = this.windAt(this.screenWidth * 0.1);
    if (
      this.prevLeftGust < 0.78 &&
      leftGust >= 0.78 &&
      this.time - this.lastAutoRibbonAt > 5.5
    ) {
      this.lastAutoRibbonAt = this.time;
      this.pendingEvents.push({
        x: this.screenWidth * 0.08,
        y: this.screenHeight * (0.14 + Math.random() * 0.2),
        direction: 1,
        strength: Math.min(1.2, leftGust),
        fromSwipe: false,
      });
    }
    this.prevLeftGust = leftGust;
  }

  /**
   * Computes wind strength at horizontal screen coordinate x.
   * Includes 0.8s left-to-right phase propagation across the screen width
   * plus any traveling swipe/story wind impulses.
   */
  windAt(x: number, atTime = this.time): number {
    const w = Math.max(1, this.screenWidth);
    const nx = Math.max(0, Math.min(1, x / w));
    const tLag = atTime - nx * 0.8;

    const ambient =
      0.24 +
      0.2 * Math.sin(tLag * 0.85) +
      0.11 * Math.sin(tLag * 1.95 + 1.2);
    const gustPhase = Math.max(0, Math.sin(tLag * 0.6 - 0.7));
    const naturalGust = Math.pow(gustPhase, 6) * 0.65;

    let swipeContribution = 0;
    for (let i = 0; i < this.impulses.length; i++) {
      const imp = this.impulses[i];
      if (!imp.active) continue;
      const age = atTime - imp.bornAt;
      if (age < 0 || age > 2.4) continue;

      const travelSpeed = w / 0.8;
      const frontX = imp.originX + imp.direction * age * travelSpeed;
      const dist = (x - frontX) / Math.max(1, w * 0.28);
      const envelope = Math.exp(-dist * dist) * Math.exp(-age * 1.25);
      swipeContribution += imp.direction * imp.strength * envelope;
    }

    return Math.max(-1.6, Math.min(2.2, ambient + naturalGust + swipeContribution));
  }

  injectSwipeImpulse(x: number, y: number, vx: number, strength = 1.0): WindImpulse {
    const slot = this.impulses[this.nextImpulseSlot];
    this.nextImpulseSlot = (this.nextImpulseSlot + 1) % this.impulses.length;

    const dir = vx >= 0 ? 1 : -1;
    const clampedStrength = Math.max(0.35, Math.min(2.0, strength));

    slot.originX = x;
    slot.originY = y;
    slot.bornAt = this.time;
    slot.direction = dir;
    slot.strength = clampedStrength;
    slot.active = true;

    this.pendingEvents.push({
      x,
      y,
      direction: dir,
      strength: clampedStrength,
      fromSwipe: true,
    });

    return slot;
  }

  /**
   * Fires a sweeping coastal L->R gust across the beach (used in Beats 2 & 3).
   */
  triggerStoryGust(strength = 1.7, ribbonCount = 3): void {
    const clamped = Math.max(0.8, Math.min(2.0, strength));
    const slot = this.impulses[this.nextImpulseSlot];
    this.nextImpulseSlot = (this.nextImpulseSlot + 1) % this.impulses.length;

    slot.originX = this.screenWidth * 0.04;
    slot.originY = this.screenHeight * 0.45;
    slot.bornAt = this.time;
    slot.direction = 1;
    slot.strength = clamped;
    slot.active = true;

    const count = Math.max(1, Math.min(4, ribbonCount));
    for (let i = 0; i < count; i++) {
      this.pendingEvents.push({
        x: this.screenWidth * (0.04 + i * 0.08),
        y: this.screenHeight * (0.18 + i * 0.16),
        direction: 1,
        strength: clamped,
        fromSwipe: true,
      });
    }
  }

  forEachGustEvent(cb: (ev: GustEvent) => void): void {
    const len = this.pendingEvents.length;
    if (len === 0) return;
    for (let i = 0; i < len; i++) {
      cb(this.pendingEvents[i]);
    }
    this.pendingEvents.length = 0;
  }

  consumeGustEvents(): GustEvent[] {
    if (this.pendingEvents.length === 0) return [];
    const copy = this.pendingEvents.slice();
    this.pendingEvents.length = 0;
    return copy;
  }

  /**
   * 8-second smooth tide breath cycle in [-1, 1].
   */
  tidePhase(atTime = this.time): number {
    return Math.sin((atTime * Math.PI * 2) / 8.0);
  }

  waveHeightAt(nx: number, atTime = this.time): number {
    return (
      Math.sin(nx * 6.283185 + atTime * 1.4) * 0.35 +
      this.tidePhase(atTime) * 0.65
    );
  }

  waveSlopeAt(nx: number, atTime = this.time): number {
    return Math.cos(nx * 6.283185 + atTime * 1.4) * 0.6;
  }

  ambientLightBreath(): number {
    return Math.sin(this.time * 0.45) * 0.025;
  }
}
