import { describe, it, expect } from 'vitest';
import { AtmosphereClock } from '../src/engine/atmosphere/AtmosphereClock';
import { SpringDamper } from '../src/engine/atmosphere/SpringDamper';
import { PARALLAX_DEPTHS, ParallaxController } from '../src/engine/atmosphere/ParallaxController';

describe('Unified AtmosphereClock & Wind/Tide Propagation', () => {
  it('propagates wind gusts left -> middle (+0.4s) -> right (+0.8s)', () => {
    const clock = new AtmosphereClock();
    clock.setViewport(400, 800);

    const sampleAtLeft = clock.windAt(0, 2.0);
    const sampleAtMidLater = clock.windAt(200, 2.4);
    const sampleAtRightLater = clock.windAt(400, 2.8);

    expect(sampleAtMidLater).toBeCloseTo(sampleAtLeft, 5);
    expect(sampleAtRightLater).toBeCloseTo(sampleAtLeft, 5);
  });

  it('injects directional swipe impulses and queues a swipe gust event', () => {
    const clock = new AtmosphereClock();
    clock.setViewport(390, 844);
    clock.update(0.1);

    const before = clock.windAt(180);
    clock.injectSwipeImpulse(180, 140, 120, 1.0);
    const after = clock.windAt(180);
    const events = clock.consumeGustEvents();

    expect(after).toBeGreaterThan(before);
    expect(events).toHaveLength(1);
    expect(events[0].fromSwipe).toBe(true);
    expect(events[0].direction).toBe(1);
  });

  it('cycles ocean tide breath cleanly on an 8-second period', () => {
    const clock = new AtmosphereClock();
    expect(clock.tidePhase(0)).toBeCloseTo(0, 5);
    expect(clock.tidePhase(2)).toBeCloseTo(1, 5);
    expect(clock.tidePhase(4)).toBeCloseTo(0, 5);
    expect(clock.tidePhase(6)).toBeCloseTo(-1, 5);
    expect(clock.tidePhase(8)).toBeCloseTo(0, 5);
  });
});

describe('SpringDamper & Diorama ParallaxController', () => {
  it('stays rate-independent between 60Hz and 120Hz frame deltas', () => {
    const spring60 = new SpringDamper(0, 48, 5.5);
    const spring120 = new SpringDamper(0, 48, 5.5);

    for (let i = 0; i < 60; i++) spring60.step(1, 1 / 60);
    for (let i = 0; i < 120; i++) spring120.step(1, 1 / 120);

    expect(spring60.value).toBeCloseTo(spring120.value, 5);
    expect(spring60.velocity).toBeCloseTo(spring120.velocity, 5);
  });

  it('smooths input and scales layers by 0.3x / 0.7x / 1.4x multipliers', () => {
    const parallax = new ParallaxController(false);
    parallax.targetX = 1;
    parallax.targetY = 0.5;
    parallax.update(0.05);

    const sky = parallax.offsetFor(PARALLAX_DEPTHS.sky);
    const ocean = parallax.offsetFor(PARALLAX_DEPTHS.ocean);
    const sand = parallax.offsetFor(PARALLAX_DEPTHS.sand);

    expect(sky.x).toBeGreaterThan(0);
    expect(ocean.x / sky.x).toBeCloseTo(0.7 / 0.3, 4);
    expect(sand.x / sky.x).toBeCloseTo(1.4 / 0.3, 4);
  });
});
