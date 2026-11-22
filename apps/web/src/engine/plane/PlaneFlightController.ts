/**
 * PlaneFlightController.ts — Explicit 5-state FSM orchestrating the multi-pass cel-shaded
 * airplane choreography:
 *   CUE -> PASS_1_HERO -> PASS_2_FAR_CLOUD_PUNCH -> PASS_3_HERO_CLOUD_SHED -> LOOP_COOLDOWN
 *
 * Computes aspect-adaptive cloud-piercing paths across 16:9 through 20:9 Android screens,
 * drives CloudHoleMaskController + elastic cloud recoil + radial cloud-punch bursts,
 * attaches clinging cloud tufts, and triggers mid-screen shedding at x <= viewportWidth * 0.52.
 */
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import type { SceneLayout } from '../layout/sceneLayout';
import type { DetachedCloudPoint } from '../layers/BannerPlane';
import type { CloudHoleMaskController } from './CloudHoleMaskController';

export type FlightPhase =
  | 'IDLE'
  | 'CUE'
  | 'PASS_1_HERO'
  | 'PASS_2_FAR_CLOUD_PUNCH'
  | 'PASS_3_HERO_CLOUD_SHED'
  | 'LOOP_COOLDOWN';

export interface FlightConfig {
  cueHoldSec: number;
  cueFadeSec: number;
  pauseAfterPass1Sec: number;
  pauseAfterPass2Sec: number;
  loopCooldownSec: number;
  farScaleRatio: number;
  farSpeedRatio: number;
  farTint: number;
  farAlpha: number;
  shedThresholdXRatio: number;
  exhaustIntervalHeroSec: number;
  exhaustIntervalFarSec: number;
  wakeSpeckIntervalSec: number;
  punchStepLocalPx: number;
  clingingTuftTargetCount: number;
}

export const DEFAULT_FLIGHT_CONFIG: FlightConfig = {
  cueHoldSec: 1.8,
  cueFadeSec: 0.45,
  pauseAfterPass1Sec: 1.2,
  pauseAfterPass2Sec: 1.0,
  loopCooldownSec: 6.5,
  farScaleRatio: 0.52,
  farSpeedRatio: 0.7,
  farTint: 0xd9f1fc,
  farAlpha: 0.89,
  shedThresholdXRatio: 0.52,
  exhaustIntervalHeroSec: 0.34,
  exhaustIntervalFarSec: 0.42,
  wakeSpeckIntervalSec: 0.14,
  punchStepLocalPx: 14,
  clingingTuftTargetCount: 6,
};

export interface CloudTargetDescriptor {
  id: 'chick' | 'bear';
  worldX: number;
  worldY: number;
  worldScale: number;
  pivotX: number;
  pivotY: number;
  logicalWidth: number;
  logicalHeight: number;
  mask: CloudHoleMaskController;
  onRecoilImpulse: (vx: number, vy: number) => void;
}

export interface FlightTrajectories {
  heroScale: number;
  heroLaneY: number;
  farScale: number;
  farStartY: number;
  farEndY: number;
  farClimbAngle: number;
}

export interface PlaneActorAdapter {
  readonly totalSpanX: number;
  x: number;
  y: number;
  visible: boolean;
  setDepthSlot: (slot: 'far' | 'hero') => void;
  setVisualStyle: (
    scaleX: number,
    scaleY: number,
    tint: number,
    alpha: number,
    interactive: boolean,
  ) => void;
  resetVisuals: () => void;
  attachClingingTufts: (count: number) => void;
  setSlipstreamHaloActive: (active: boolean) => void;
  getNoseWorldPoint: (out: { x: number; y: number }) => void;
  getTailWorldPoint: (out: { x: number; y: number }) => void;
  consumeSpeedBoostFactor: (dtSec: number) => number;
  triggerWingShakeAndCollectDetached: (outList: DetachedCloudPoint[]) => number;
  updateVisuals: (
    dtSec: number,
    windClockTime: number,
    windStrength: number,
    baseY: number,
    baseClimbAngle: number,
  ) => void;
}

export interface CueAdapter {
  show: () => void;
  beginFadeOut: (durationSec: number) => void;
  hide: () => void;
}

export interface ParticleAdapter {
  spawnExhaustPuff: (
    x: number,
    y: number,
    vx: number,
    vy: number,
    scale: number,
    layer: 'far' | 'hero',
  ) => void;
  spawnCloudPunchBurst: (
    x: number,
    y: number,
    count: number,
    scale: number,
    biasVx: number,
  ) => void;
  spawnFallingCloudFragment: (
    x: number,
    y: number,
    planeVx: number,
    scale: number,
    rotation: number,
    layer: 'far' | 'hero',
  ) => void;
}

export interface FlightHostCallbacks {
  plane: PlaneActorAdapter;
  cue: CueAdapter;
  particles: ParticleAdapter;
  clouds: CloudTargetDescriptor[];
  onPlaySfx?: (name: 'poof' | 'cloudPunch') => void;
  onHaptic?: (ms: number) => void;
  onFirstCycleComplete?: () => void;
}

const BEAR_LOGICAL_W = 460;
const BEAR_LOGICAL_H = 390;
const CHICK_LOGICAL_W = 260;
const CHICK_LOGICAL_H = 230;
const DETACHED_BUFFER_SIZE = 16;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Dynamically computes Phase 1 hero lane (~22-28% viewport height) and Phase 2 cloud-punch
 * entry/exit trajectory so the plane always pierces through the fluffy sky clouds cleanly
 * across Android 16:9 through 20:9 aspect ratios.
 */
export function computeFlightTrajectories(
  layout: SceneLayout,
  config: FlightConfig = DEFAULT_FLIGHT_CONFIG,
): FlightTrajectories {
  const u = Math.max(0.2, layout.unitScale);
  const heroScale = layout.isPortrait ? layout.unitScale * 0.72 : layout.unitScale * 0.92;
  const heroLaneMinY = (layout.isPortrait ? 92 : 68) * u;
  const heroLaneMaxY = Math.max(heroLaneMinY, layout.dunes.horizonY * 0.72);
  const rawHeroY = layout.height * (layout.isPortrait ? 0.24 : 0.25);
  const heroLaneY = clamp(rawHeroY, heroLaneMinY, heroLaneMaxY);

  const farScale = heroScale * config.farScaleRatio;

  // Target center of left Kiiroitori chick cloud dome (pivot at 0, H)
  const chickTargetX = layout.chickCloud.x + CHICK_LOGICAL_W * 0.5 * layout.chickCloud.scale;
  const chickTargetY = layout.chickCloud.y - CHICK_LOGICAL_H * 0.44 * layout.chickCloud.scale;

  // Target fluffy torso of right Rilakkuma bear cloud safely inside viewport (pivot at W, H)
  const bearTargetX = clamp(
    layout.bearCloud.x - BEAR_LOGICAL_W * 0.56 * layout.bearCloud.scale,
    layout.width * 0.58,
    layout.width * 0.88,
  );
  const bearTargetY = layout.bearCloud.y - BEAR_LOGICAL_H * 0.43 * layout.bearCloud.scale;

  const dx = Math.max(40 * u, bearTargetX - chickTargetX);
  const rawSlope = (bearTargetY - chickTargetY) / dx;
  const clampedSlope = clamp(rawSlope, -0.22, 0.22);

  const farMinY = Math.max(18, 42 * u);
  const farMaxStartY = Math.max(farMinY, layout.dunes.horizonY - 22 * u);
  const farMaxEndY = Math.max(farMinY, layout.dunes.horizonY - 18 * u);

  // Anchor line on bear cloud core so both giant bear cloud and chick cloud are pierced
  const farStartY = clamp(bearTargetY - bearTargetX * clampedSlope, farMinY, farMaxStartY);
  const farEndY = clamp(farStartY + layout.width * clampedSlope, farMinY, farMaxEndY);
  const farClimbAngle = Math.atan2(farEndY - farStartY, layout.width);

  return {
    heroScale,
    heroLaneY,
    farScale,
    farStartY,
    farEndY,
    farClimbAngle,
  };
}

interface CloudPassState {
  inside: boolean;
  enteredOnce: boolean;
  exitedOnce: boolean;
  lastPunchLocalX: number;
  lastPunchLocalY: number;
}

export class PlaneFlightController {
  public phase: FlightPhase = 'IDLE';
  public shedTriggeredInPass3 = false;

  private readonly config: FlightConfig;
  private readonly host: FlightHostCallbacks;
  private layout: SceneLayout | null = null;
  private trajectories: FlightTrajectories | null = null;

  private cueElapsed = 0;
  private cueSkipping = false;
  private pauseTimer = 0;
  private waitingTransition = false;
  private entranceSurge = 0;
  private currentVx = 0;
  private exhaustCooldown = 0;
  private wakeSpeckCooldown = 0;
  private onHeroStartCallback?: () => void;
  private onFirstCycleCallback?: () => void;
  private firstCycleCompleted = false;

  private readonly noseWorld = { x: 0, y: 0 };
  private readonly tailWorld = { x: 0, y: 0 };
  private readonly detachedBuffer: DetachedCloudPoint[] = Array.from(
    { length: DETACHED_BUFFER_SIZE },
    () => ({ x: 0, y: 0, scale: 1, rotation: 0 }),
  );
  private readonly cloudStates: CloudPassState[] = [];

  constructor(host: FlightHostCallbacks, config: Partial<FlightConfig> = {}) {
    this.host = host;
    this.config = { ...DEFAULT_FLIGHT_CONFIG, ...config };
    for (let i = 0; i < host.clouds.length; i++) {
      this.cloudStates.push({
        inside: false,
        enteredOnce: false,
        exitedOnce: false,
        lastPunchLocalX: -9999,
        lastPunchLocalY: -9999,
      });
    }
  }

  applyLayout(layout: SceneLayout): void {
    const prevWidth = this.layout?.width ?? layout.width;
    this.layout = layout;
    this.trajectories = computeFlightTrajectories(layout, this.config);

    if (
      prevWidth > 0 &&
      Math.abs(prevWidth - layout.width) > 4 &&
      this.phase !== 'IDLE' &&
      this.phase !== 'CUE' &&
      this.phase !== 'LOOP_COOLDOWN'
    ) {
      const ratio = this.host.plane.x / prevWidth;
      this.host.plane.x = clamp(
        ratio * layout.width,
        -(this.host.plane.totalSpanX * this.trajectories.heroScale + 90),
        layout.width + this.host.plane.totalSpanX * this.trajectories.heroScale + 90,
      );
    }

    if (this.phase === 'PASS_1_HERO' || this.phase === 'PASS_3_HERO_CLOUD_SHED') {
      this.host.plane.setVisualStyle(
        this.trajectories.heroScale,
        this.trajectories.heroScale,
        0xffffff,
        1,
        true,
      );
    } else if (this.phase === 'PASS_2_FAR_CLOUD_PUNCH') {
      this.host.plane.setVisualStyle(
        -this.trajectories.farScale,
        this.trajectories.farScale,
        this.config.farTint,
        this.config.farAlpha,
        false,
      );
    }
  }

  startWithCue(onHeroPassStart?: () => void, onFirstCycleComplete?: () => void): void {
    this.onHeroStartCallback = onHeroPassStart;
    this.onFirstCycleCallback = onFirstCycleComplete;
    this.firstCycleCompleted = false;
    this.phase = 'CUE';
    this.cueElapsed = 0;
    this.cueSkipping = false;
    this.waitingTransition = false;
    this.host.plane.visible = false;
    this.host.plane.resetVisuals();
    this.host.cue.show();
  }

  skipCue(): void {
    if (this.phase !== 'CUE' || this.cueSkipping) return;
    this.cueSkipping = true;
    this.cueElapsed = this.config.cueHoldSec;
    this.host.cue.beginFadeOut(this.config.cueFadeSec);
  }

  ensureRunning(onFirstCycleComplete?: () => void): void {
    if (onFirstCycleComplete) {
      this.onFirstCycleCallback = onFirstCycleComplete;
      this.firstCycleCompleted = false;
    }
    if (this.phase === 'IDLE' || this.phase === 'CUE') {
      this.enterPass1Hero();
    }
  }

  reset(): void {
    this.phase = 'IDLE';
    this.waitingTransition = false;
    this.cueElapsed = 0;
    this.cueSkipping = false;
    this.pauseTimer = 0;
    this.shedTriggeredInPass3 = false;
    this.firstCycleCompleted = false;
    this.onHeroStartCallback = undefined;
    this.onFirstCycleCallback = undefined;
    this.host.cue.hide();
    this.host.plane.visible = false;
    this.host.plane.resetVisuals();
  }

  private resetCloudStates(): void {
    for (let i = 0; i < this.cloudStates.length; i++) {
      const s = this.cloudStates[i];
      s.inside = false;
      s.enteredOnce = false;
      s.exitedOnce = false;
      s.lastPunchLocalX = -9999;
      s.lastPunchLocalY = -9999;
    }
  }

  private enterPass1Hero(): void {
    if (!this.layout || !this.trajectories) return;
    this.host.cue.hide();
    this.phase = 'PASS_1_HERO';
    this.waitingTransition = false;
    this.pauseTimer = 0;
    this.entranceSurge = 0.9;
    this.exhaustCooldown = 0.08;
    this.shedTriggeredInPass3 = false;

    const { plane } = this.host;
    plane.setDepthSlot('hero');
    plane.setVisualStyle(
      this.trajectories.heroScale,
      this.trajectories.heroScale,
      0xffffff,
      1,
      true,
    );
    plane.resetVisuals();
    plane.attachClingingTufts(0);
    plane.setSlipstreamHaloActive(false);
    plane.x = this.layout.width + 95 * this.trajectories.heroScale;
    plane.y = this.trajectories.heroLaneY;
    plane.visible = true;

    const cb = this.onHeroStartCallback;
    this.onHeroStartCallback = undefined;
    cb?.();
  }

  private enterPass2FarCloudPunch(): void {
    if (!this.layout || !this.trajectories) return;
    this.phase = 'PASS_2_FAR_CLOUD_PUNCH';
    this.waitingTransition = false;
    this.pauseTimer = 0;
    this.entranceSurge = 0.35;
    this.exhaustCooldown = 0.1;
    this.wakeSpeckCooldown = 0.08;
    this.resetCloudStates();

    const { plane } = this.host;
    plane.setDepthSlot('far');
    plane.setVisualStyle(
      -this.trajectories.farScale,
      this.trajectories.farScale,
      this.config.farTint,
      this.config.farAlpha,
      false,
    );
    plane.resetVisuals();
    plane.attachClingingTufts(0);
    plane.setSlipstreamHaloActive(false);
    // Start just off-screen left so plane & nose clear entrance cleanly while flipped left-to-right
    plane.x = -105 * this.trajectories.farScale;
    plane.y = this.trajectories.farStartY;
    plane.visible = true;
  }

  private enterPass3HeroCloudShed(): void {
    if (!this.layout || !this.trajectories) return;
    this.phase = 'PASS_3_HERO_CLOUD_SHED';
    this.waitingTransition = false;
    this.pauseTimer = 0;
    this.entranceSurge = 0.8;
    this.exhaustCooldown = 0.08;
    this.shedTriggeredInPass3 = false;

    const { plane } = this.host;
    plane.setDepthSlot('hero');
    plane.setVisualStyle(
      this.trajectories.heroScale,
      this.trajectories.heroScale,
      0xffffff,
      1,
      true,
    );
    plane.resetVisuals();
    plane.attachClingingTufts(this.config.clingingTuftTargetCount);
    plane.setSlipstreamHaloActive(true);
    plane.x = this.layout.width + 95 * this.trajectories.heroScale;
    plane.y = this.trajectories.heroLaneY;
    plane.visible = true;
  }

  private enterLoopCooldown(): void {
    this.phase = 'LOOP_COOLDOWN';
    this.waitingTransition = false;
    this.pauseTimer = this.config.loopCooldownSec;
    this.host.plane.visible = false;
    this.host.plane.resetVisuals();
    if (!this.firstCycleCompleted) {
      this.firstCycleCompleted = true;
      this.host.onFirstCycleComplete?.();
      const cb = this.onFirstCycleCallback;
      this.onFirstCycleCallback = undefined;
      cb?.();
    }
  }

  private advanceHeroCruise(dt: number, clock: AtmosphereClock, heroScale: number, laneY: number): void {
    if (!this.layout) return;
    const { plane } = this.host;
    const scale = Math.max(0.28, heroScale);
    this.entranceSurge *= Math.exp(-1.5 * dt);
    const tapBoost = plane.consumeSpeedBoostFactor(dt);
    const speed = (158 + this.entranceSurge * 64 + tapBoost * 95) * scale;
    this.currentVx = -speed;
    plane.x += this.currentVx * dt;

    const windStrength = 1 + Math.min(1.1, Math.abs(clock.windAt(plane.x)) * 0.55);
    plane.updateVisuals(dt, clock.time, windStrength, laneY, 0);
    this.emitExhaustPuffs(dt, 'hero', scale, 48);
  }

  private stepPass1Hero(dt: number, clock: AtmosphereClock): void {
    if (!this.layout || !this.trajectories) return;
    const { plane } = this.host;

    if (this.waitingTransition) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.enterPass2FarCloudPunch();
      }
      return;
    }

    this.advanceHeroCruise(dt, clock, this.trajectories.heroScale, this.trajectories.heroLaneY);

    const exitEdgeX = -(plane.totalSpanX + 65) * this.trajectories.heroScale;
    if (plane.x < exitEdgeX) {
      plane.visible = false;
      this.waitingTransition = true;
      this.pauseTimer = this.config.pauseAfterPass1Sec;
    }
  }

  private stepPass2FarCloudPunch(dt: number, clock: AtmosphereClock): void {
    if (!this.layout || !this.trajectories) return;
    const { plane } = this.host;

    if (this.waitingTransition) {
      this.pauseTimer -= dt;
      if (this.pauseTimer <= 0) {
        this.enterPass3HeroCloudShed();
      }
      return;
    }

    const heroScaleRef = Math.max(0.28, this.trajectories.heroScale);
    this.entranceSurge *= Math.exp(-1.4 * dt);
    // ~70% apparent cruise speed for distant parallax feel (proportional to stage scale)
    const heroBaseSpeed = 158 * heroScaleRef;
    const farSpeed =
      heroBaseSpeed * this.config.farSpeedRatio + this.entranceSurge * 28 * heroScaleRef;
    this.currentVx = farSpeed;
    plane.x += this.currentVx * dt;

    const xNorm = clamp(plane.x / Math.max(1, this.layout.width), -0.35, 1.35);
    const baseY =
      this.trajectories.farStartY +
      (this.trajectories.farEndY - this.trajectories.farStartY) * xNorm;

    const windStrength = 0.85 + Math.min(0.85, Math.abs(clock.windAt(plane.x)) * 0.45);
    plane.updateVisuals(
      dt,
      clock.time,
      windStrength,
      baseY,
      this.trajectories.farClimbAngle,
    );

    this.emitExhaustPuffs(dt, 'far', this.trajectories.farScale, -36);
    this.processCloudIntersections(dt);

    // Clear off-screen right once banner tail leaves the viewport
    const exitRightX =
      this.layout.width + (plane.totalSpanX + 85) * this.trajectories.farScale;
    if (plane.x > exitRightX) {
      plane.visible = false;
      this.waitingTransition = true;
      this.pauseTimer = this.config.pauseAfterPass2Sec;
    }
  }

  private processCloudIntersections(dt: number): void {
    const { plane, clouds, particles } = this.host;
    plane.getNoseWorldPoint(this.noseWorld);
    const farScale = this.trajectories?.farScale ?? 0.5;

    let anyExited = false;
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      const st = this.cloudStates[i];
      if (c.worldScale <= 0) continue;

      const localX = (this.noseWorld.x - c.worldX) / c.worldScale + c.pivotX;
      const localY = (this.noseWorld.y - c.worldY) / c.worldScale + c.pivotY;
      const insideNow = c.mask.isInsideSilhouette(localX, localY);

      if (insideNow) {
        if (!st.inside) {
          st.inside = true;
          if (!st.enteredOnce) {
            st.enteredOnce = true;
            // Elastic cloud jiggle + radial entry burst of 10-14 puff fragments
            c.onRecoilImpulse(42, -16);
            this.host.onPlaySfx?.('cloudPunch');
            particles.spawnCloudPunchBurst(
              this.noseWorld.x,
              this.noseWorld.y,
              12,
              farScale * 1.15,
              -Math.abs(this.currentVx),
            );
          }
          const holeR = clamp((42 * farScale) / c.worldScale, 32, 48);
          c.mask.punchHole(localX, localY, holeR);
          st.lastPunchLocalX = localX;
          st.lastPunchLocalY = localY;
        } else {
          const dist = Math.hypot(localX - st.lastPunchLocalX, localY - st.lastPunchLocalY);
          if (dist >= this.config.punchStepLocalPx) {
            const holeR = clamp((44 * farScale) / c.worldScale, 32, 48);
            c.mask.punchHole(localX, localY, holeR);
            st.lastPunchLocalX = localX;
            st.lastPunchLocalY = localY;
          }
        }
      } else if (st.inside) {
        st.inside = false;
        if (!st.exitedOnce) {
          st.exitedOnce = true;
          c.onRecoilImpulse(58, -22);
          this.host.onPlaySfx?.('cloudPunch');
          particles.spawnCloudPunchBurst(
            this.noseWorld.x,
            this.noseWorld.y,
            12,
            farScale * 1.2,
            this.currentVx,
          );
          // Attach 2 tufts on first cloud, all 6 on bear cloud exit
          const tuftGoal =
            c.id === 'chick' ? 2 : this.config.clingingTuftTargetCount;
          plane.attachClingingTufts(tuftGoal);
        }
      }

      if (st.exitedOnce) anyExited = true;
    }

    // Gentle wake of loose drifting cloud specks after exiting cloud
    if (anyExited) {
      this.wakeSpeckCooldown -= dt;
      if (this.wakeSpeckCooldown <= 0) {
        this.wakeSpeckCooldown = this.config.wakeSpeckIntervalSec;
        plane.getTailWorldPoint(this.tailWorld);
        particles.spawnFallingCloudFragment(
          this.tailWorld.x + (Math.random() - 0.5) * 16,
          this.tailWorld.y + (Math.random() - 0.5) * 14,
          this.currentVx,
          farScale * 0.72,
          (Math.random() - 0.5) * 0.6,
          'far',
        );
      }
    }
  }

  private stepPass3HeroCloudShed(dt: number, clock: AtmosphereClock): void {
    if (!this.layout || !this.trajectories) return;
    const { plane, particles } = this.host;

    this.advanceHeroCruise(dt, clock, this.trajectories.heroScale, this.trajectories.heroLaneY);

    // Mid-screen shedding trigger (x <= viewportWidth * 0.52)
    if (!this.shedTriggeredInPass3 && plane.x <= this.layout.width * this.config.shedThresholdXRatio) {
      this.shedTriggeredInPass3 = true;
      const shedCount = plane.triggerWingShakeAndCollectDetached(this.detachedBuffer);
      this.host.onPlaySfx?.('poof');
      this.host.onHaptic?.(10);

      for (let i = 0; i < shedCount; i++) {
        const pt = this.detachedBuffer[i];
        particles.spawnFallingCloudFragment(
          pt.x,
          pt.y,
          this.currentVx,
          pt.scale,
          pt.rotation,
          'hero',
        );
      }
    }

    this.emitExhaustPuffs(dt, 'hero', Math.max(0.28, this.trajectories.heroScale), 48);

    const exitEdgeX = -(plane.totalSpanX + 65) * this.trajectories.heroScale;
    if (plane.x < exitEdgeX) {
      this.enterLoopCooldown();
    }
  }

  private emitExhaustPuffs(
    dt: number,
    layer: 'far' | 'hero',
    scale: number,
    driftVx: number,
  ): void {
    this.exhaustCooldown -= dt;
    const interval =
      layer === 'far' ? this.config.exhaustIntervalFarSec : this.config.exhaustIntervalHeroSec;
    if (this.exhaustCooldown > 0) return;

    this.exhaustCooldown = interval;
    this.host.plane.getTailWorldPoint(this.tailWorld);
    this.host.particles.spawnExhaustPuff(
      this.tailWorld.x + (Math.random() - 0.5) * 6,
      this.tailWorld.y - 4 + (Math.random() - 0.5) * 10,
      driftVx + (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 7,
      scale * (layer === 'far' ? 0.85 : 0.95),
      layer,
    );
  }

  update(dt: number, clock: AtmosphereClock): void {
    const safeDt = Math.max(0, Math.min(dt, 0.05));
    if (safeDt === 0) return;

    switch (this.phase) {
      case 'IDLE':
        return;

      case 'CUE': {
        this.cueElapsed += safeDt;
        if (!this.cueSkipping && this.cueElapsed >= this.config.cueHoldSec) {
          this.cueSkipping = true;
          this.host.cue.beginFadeOut(this.config.cueFadeSec);
        }
        if (this.cueElapsed >= this.config.cueHoldSec + this.config.cueFadeSec) {
          this.enterPass1Hero();
        }
        return;
      }

      case 'PASS_1_HERO':
        this.stepPass1Hero(safeDt, clock);
        return;

      case 'PASS_2_FAR_CLOUD_PUNCH':
        this.stepPass2FarCloudPunch(safeDt, clock);
        return;

      case 'PASS_3_HERO_CLOUD_SHED':
        this.stepPass3HeroCloudShed(safeDt, clock);
        return;

      case 'LOOP_COOLDOWN': {
        this.pauseTimer -= safeDt;
        if (this.pauseTimer <= 0) {
          this.enterPass1Hero();
        }
        return;
      }
    }
  }
}
