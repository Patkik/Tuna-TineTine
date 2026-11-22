import { describe, it, expect, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { AtmosphereClock } from '../src/engine/atmosphere/AtmosphereClock';
import { computeSceneLayout } from '../src/engine/layout/sceneLayout';
import {
  CloudHoleMaskController,
  computeEffectiveHoleRadius,
} from '../src/engine/plane/CloudHoleMaskController';
import { computeShedFragmentInitialVelocity } from '../src/engine/plane/CloudFragmentPool';
import {
  PlaneFlightController,
  computeFlightTrajectories,
  type CloudTargetDescriptor,
  type FlightPhase,
  type PlaneActorAdapter,
} from '../src/engine/plane/PlaneFlightController';
import type { DetachedCloudPoint } from '../src/engine/layers/BannerPlane';

function createMockPlane(): {
  adapter: PlaneActorAdapter;
  getDepthSlot: () => 'far' | 'hero';
  getScaleX: () => number;
  getTint: () => number;
  getTuftCount: () => number;
  isHaloActive: () => boolean;
} {
  let depthSlot: 'far' | 'hero' = 'hero';
  let scaleX = 1;
  let tint = 0xffffff;
  let tufts = 0;
  let haloActive = false;

  const adapter: PlaneActorAdapter = {
    totalSpanX: 415,
    x: 0,
    y: 0,
    visible: false,
    setDepthSlot(slot) {
      depthSlot = slot;
    },
    setVisualStyle(sx, _sy, t) {
      scaleX = sx;
      tint = t;
    },
    resetVisuals() {
      tufts = 0;
      haloActive = false;
    },
    attachClingingTufts(count) {
      tufts = count;
    },
    setSlipstreamHaloActive(active) {
      haloActive = active;
    },
    getNoseWorldPoint(out) {
      out.x = adapter.x + -69 * scaleX;
      out.y = adapter.y;
    },
    getTailWorldPoint(out) {
      out.x = adapter.x + 77 * scaleX;
      out.y = adapter.y;
    },
    consumeSpeedBoostFactor() {
      return 0;
    },
    triggerWingShakeAndCollectDetached(outList: DetachedCloudPoint[]) {
      let count = 0;
      for (let i = 0; i < tufts && count < outList.length; i++) {
        outList[count].x = adapter.x + i * 6;
        outList[count].y = adapter.y - 4;
        outList[count].scale = 0.7;
        outList[count].rotation = 0;
        count++;
      }
      if (haloActive) {
        for (let i = 0; i < 6 && count < outList.length; i++) {
          outList[count].x = adapter.x + 40 + i * 22;
          outList[count].y = adapter.y + 6;
          outList[count].scale = 0.42;
          outList[count].rotation = 0;
          count++;
        }
      }
      tufts = 0;
      haloActive = false;
      return count;
    },
    updateVisuals(_dt, _t, _w, baseY) {
      adapter.y = baseY;
    },
  };

  return {
    adapter,
    getDepthSlot: () => depthSlot,
    getScaleX: () => scaleX,
    getTint: () => tint,
    getTuftCount: () => tufts,
    isHaloActive: () => haloActive,
  };
}

describe('CloudHoleMaskController & 12-second healing', () => {
  it('punches scalloped holes, holds briefly, and heals smoothly to 0 over ~12s with rate parity', () => {
    const mask60 = new CloudHoleMaskController(Texture.WHITE, 460, 390, 1.5, 12.0);
    const mask120 = new CloudHoleMaskController(Texture.WHITE, 460, 390, 1.5, 12.0);

    expect(mask60.isInsideSilhouette(230, 220)).toBe(true);
    expect(mask60.isInsideSilhouette(2, 2)).toBe(false);

    expect(mask60.punchHole(230, 220, 38)).toBe(true);
    mask120.punchHole(230, 220, 38);
    expect(mask60.getActiveHoleCount()).toBe(1);

    // Holds cutout steady early, shrinks smoothly at midpoint, and finishes healing at 12s
    expect(
      computeEffectiveHoleRadius({
        active: true,
        localX: 230,
        localY: 220,
        radius: 38,
        age: 1.0,
        healDuration: 12,
        seed: 0,
      }),
    ).toBeCloseTo(38, 4);

    const midR = computeEffectiveHoleRadius({
      active: true,
      localX: 230,
      localY: 220,
      radius: 38,
      age: 7.2,
      healDuration: 12,
      seed: 0,
    });
    expect(midR).toBeGreaterThan(5);
    expect(midR).toBeLessThan(32);

    for (let i = 0; i < 360; i++) mask60.update(1 / 60);
    for (let i = 0; i < 720; i++) mask120.update(1 / 120);
    expect(mask60.getActiveHoleCount()).toBe(1);
    expect(mask120.getActiveHoleCount()).toBe(1);

    for (let i = 0; i < 380; i++) mask60.update(1 / 60);
    expect(mask60.getActiveHoleCount()).toBe(0);
  });
});

describe('Plane trajectories across 16:9 and 20:9 Android screens', () => {
  it('places hero lane around 22-28% height and aims Phase 2 straight through fluffy clouds', () => {
    const viewports = [
      { w: 390, h: 219 }, // Portrait phone fixed 16:9 stage
      { w: 693, h: 390 }, // Android landscape 16:9 stage
      { w: 390, h: 844 }, // Legacy 19.5:9 portrait
      { w: 360, h: 800 }, // Legacy 20:9 portrait
      { w: 1024, h: 576 }, // Reference 16:9 desktop
    ];

    for (const vp of viewports) {
      const layout = computeSceneLayout(vp.w, vp.h);
      const traj = computeFlightTrajectories(layout);

      const yPct = traj.heroLaneY / vp.h;
      expect(yPct).toBeGreaterThanOrEqual(0.21);
      expect(yPct).toBeLessThanOrEqual(0.29);

      // Phase 2 line at bear chest x falls right inside bear cloud vertical span
      const bearTargetX = layout.bearCloud.x - 460 * 0.56 * layout.bearCloud.scale;
      const tNorm = Math.max(0, Math.min(1, bearTargetX / layout.width));
      const yAtBear = traj.farStartY + (traj.farEndY - traj.farStartY) * tNorm;
      const bearTop = layout.bearCloud.y - 390 * layout.bearCloud.scale;
      expect(yAtBear).toBeGreaterThan(bearTop + 40 * layout.bearCloud.scale);
      expect(yAtBear).toBeLessThan(layout.bearCloud.y);
    }
  });
});

describe('PlaneFlightController 5-state choreography FSM', () => {
  it('completes CUE -> PASS_1_HERO -> PASS_2_FAR_CLOUD_PUNCH -> PASS_3_HERO_CLOUD_SHED -> LOOP_COOLDOWN -> PASS_1_HERO', () => {
    const layout = computeSceneLayout(390, 844);
    const clock = new AtmosphereClock();
    clock.setViewport(390, 844);

    const planeMock = createMockPlane();
    const chickMask = new CloudHoleMaskController(Texture.WHITE, 260, 230, 1.5, 12);
    const bearMask = new CloudHoleMaskController(Texture.WHITE, 460, 390, 1.5, 12);
    const recoils: string[] = [];
    const sfx: string[] = [];
    const bursts: number[] = [];
    const shedFragments: Array<{ x: number; y: number; planeVx: number; layer: string }> = [];

    const cue = { show: vi.fn(), beginFadeOut: vi.fn(), hide: vi.fn() };
    const clouds: CloudTargetDescriptor[] = [
      {
        id: 'chick',
        worldX: layout.chickCloud.x,
        worldY: layout.chickCloud.y,
        worldScale: layout.chickCloud.scale,
        pivotX: 0,
        pivotY: 230,
        logicalWidth: 260,
        logicalHeight: 230,
        mask: chickMask,
        onRecoilImpulse: () => recoils.push('chick'),
      },
      {
        id: 'bear',
        worldX: layout.bearCloud.x,
        worldY: layout.bearCloud.y,
        worldScale: layout.bearCloud.scale,
        pivotX: 460,
        pivotY: 390,
        logicalWidth: 460,
        logicalHeight: 390,
        mask: bearMask,
        onRecoilImpulse: () => recoils.push('bear'),
      },
    ];

    const controller = new PlaneFlightController({
      plane: planeMock.adapter,
      cue,
      particles: {
        spawnExhaustPuff: () => {},
        spawnCloudPunchBurst: (_x, _y, count) => bursts.push(count),
        spawnFallingCloudFragment: (x, y, planeVx, _scale, _rot, layer) => {
          if (layer === 'hero') shedFragments.push({ x, y, planeVx, layer });
        },
      },
      clouds,
      onPlaySfx: (name) => sfx.push(name),
      onHaptic: () => {},
    });
    controller.applyLayout(layout);

    const onHeroStart = vi.fn();
    const onFirstCycleComplete = vi.fn();
    controller.startWithCue(onHeroStart, onFirstCycleComplete);
    expect(controller.phase).toBe('CUE');
    expect(cue.show).toHaveBeenCalledTimes(1);

    // Track unique phases visited while advancing at 60fps
    const visited = new Set<FlightPhase>([controller.phase]);
    let farScaleObserved = 0;
    let farSlotObserved = '';
    let farTintObserved = 0xffffff;
    let bearHolesDuringPunch = 0;
    let tuftsAtExitCount = 0;
    let sawShedTrigger = false;

    const dt = 1 / 60;
    for (let step = 0; step < 3600; step++) {
      clock.update(dt);
      chickMask.update(dt);
      bearMask.update(dt);
      controller.update(dt, clock);
      visited.add(controller.phase);

      if (controller.phase === 'PASS_2_FAR_CLOUD_PUNCH' && planeMock.adapter.visible) {
        farScaleObserved = planeMock.getScaleX();
        farSlotObserved = planeMock.getDepthSlot();
        farTintObserved = planeMock.getTint();
        bearHolesDuringPunch = Math.max(bearHolesDuringPunch, bearMask.getActiveHoleCount());
        tuftsAtExitCount = Math.max(tuftsAtExitCount, planeMock.getTuftCount());
      }

      if (controller.phase === 'PASS_3_HERO_CLOUD_SHED' && controller.shedTriggeredInPass3) {
        sawShedTrigger = true;
      }

      if (visited.has('LOOP_COOLDOWN') && controller.phase === 'PASS_1_HERO') {
        break;
      }
    }

    expect(onHeroStart).toHaveBeenCalledTimes(1);
    expect(onFirstCycleComplete).toHaveBeenCalledTimes(1);
    expect([...visited]).toEqual([
      'CUE',
      'PASS_1_HERO',
      'PASS_2_FAR_CLOUD_PUNCH',
      'PASS_3_HERO_CLOUD_SHED',
      'LOOP_COOLDOWN',
    ]);
    expect(controller.phase).toBe('PASS_1_HERO');

    // Phase 2 distant perspective & cloud reactions
    expect(farSlotObserved).toBe('far');
    expect(farScaleObserved).toBeLessThan(0);
    expect(Math.abs(farScaleObserved)).toBeLessThan(0.55);
    expect(farTintObserved).not.toBe(0xffffff);
    expect(recoils.length).toBeGreaterThanOrEqual(2);
    expect(bursts.length).toBeGreaterThanOrEqual(2);
    for (const b of bursts) {
      expect(b).toBeGreaterThanOrEqual(10);
      expect(b).toBeLessThanOrEqual(14);
    }
    expect(bearHolesDuringPunch).toBeGreaterThan(0);
    // By the time Phase 3 + 6.5s cooldown finish (> 12s), the cloud has softly healed back closed
    expect(bearMask.getActiveHoleCount()).toBe(0);
    expect(tuftsAtExitCount).toBe(6);

    // Phase 3 shedding & ~30% horizontal momentum inheritance
    expect(sawShedTrigger).toBe(true);
    expect(sfx).toContain('poof');
    expect(sfx).toContain('cloudPunch');
    expect(shedFragments.length).toBeGreaterThanOrEqual(10);

    const velCheck = computeShedFragmentInitialVelocity(-100, 0.5, 0.5);
    expect(velCheck.vx).toBeCloseTo(-30, 5);
    expect(velCheck.vy).toBeLessThan(0);
  });

  it('skips the "Look at the sky..." cue immediately when tapped', () => {
    const layout = computeSceneLayout(390, 844);
    const clock = new AtmosphereClock();
    const planeMock = createMockPlane();
    const cue = { show: vi.fn(), beginFadeOut: vi.fn(), hide: vi.fn() };

    const controller = new PlaneFlightController({
      plane: planeMock.adapter,
      cue,
      particles: {
        spawnExhaustPuff: () => {},
        spawnCloudPunchBurst: () => {},
        spawnFallingCloudFragment: () => {},
      },
      clouds: [],
    });
    controller.applyLayout(layout);

    const onHeroStart = vi.fn();
    controller.startWithCue(onHeroStart);
    expect(controller.phase).toBe('CUE');

    controller.skipCue();
    expect(cue.beginFadeOut).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 35; i++) {
      controller.update(1 / 60, clock);
    }
    expect(controller.phase).toBe('PASS_1_HERO');
    expect(onHeroStart).toHaveBeenCalledTimes(1);
  });
});
