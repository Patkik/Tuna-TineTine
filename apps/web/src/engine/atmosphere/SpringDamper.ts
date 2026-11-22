/**
 * SpringDamper.ts — Sub-stepped damped harmonic spring physics.
 * Produces identical motion across 60Hz and 120Hz displays without frame-rate drift.
 */

export class SpringDamper {
  public value: number;
  public velocity = 0;
  public stiffness: number;
  public damping: number;

  constructor(initialValue = 0, stiffness = 48, damping = 5.5) {
    this.value = initialValue;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(target: number, dt: number): number {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    if (safeDt === 0) return this.value;

    const maxStep = 1 / 120;
    let remaining = safeDt;
    while (remaining > 0) {
      const h = Math.min(remaining, maxStep);
      const accel = (target - this.value) * this.stiffness - this.velocity * this.damping;
      this.velocity += accel * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    return this.value;
  }

  impulse(deltaVelocity: number): void {
    this.velocity += deltaVelocity;
  }

  reset(value = 0): void {
    this.value = value;
    this.velocity = 0;
  }
}
