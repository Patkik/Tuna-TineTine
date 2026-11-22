/**
 * PlaneSequenceModule.ts — Dynamically imported Beat 1 3-pass airplane + cloud-hole mask
 * runtime so Stage 1 locked bundle contains zero unlocked banner/plane choreography code.
 */
import type { Container, MeshPlane, Renderer } from 'pixi.js';
import type { AtmosphereClock } from '../atmosphere/AtmosphereClock';
import type { SceneLayout } from '../layout/sceneLayout';
import type { Stage1Textures } from '../assets/svgTextureFactory';
import { BannerPlane } from '../layers/BannerPlane';
import { CloudHoleMaskController } from './CloudHoleMaskController';
import { CloudFragmentPool } from './CloudFragmentPool';
import { SkyCuePrompt } from './SkyCuePrompt';
import {
  PlaneFlightController,
  type CloudTargetDescriptor,
  type FlightPhase,
} from './PlaneFlightController';
import { triggerHaptic } from '../../core/haptics';
import { audioManager } from '../../core/audioManager';

export interface PlaneSequenceHost {
  textures: Stage1Textures;
  renderer: Renderer | null;
  chickCloudMesh: MeshPlane;
  bearCloudMesh: MeshPlane;
  farEffectsLayer: Container;
  farPlaneSlot: Container;
  heroEffectsLayer: Container;
  heroPlaneSlot: Container;
  cueSlot: Container;
  chickW: number;
  chickH: number;
  bearW: number;
  bearH: number;
  onChickRecoil: (vx: number, vy: number) => void;
  onBearRecoil: (vx: number, vy: number) => void;
}

export class PlaneSequenceModule {
  public readonly chickHoleMask: CloudHoleMaskController;
  public readonly bearHoleMask: CloudHoleMaskController;
  public readonly bannerPlane: BannerPlane;
  public readonly fragmentPool: CloudFragmentPool;
  public readonly skyCuePrompt: SkyCuePrompt;
  public readonly flightController: PlaneFlightController;
  public readonly cloudDescriptors: [CloudTargetDescriptor, CloudTargetDescriptor];

  private readonly chickMesh: MeshPlane;
  private readonly bearMesh: MeshPlane;
  private readonly chickOrigTex;
  private readonly bearOrigTex;

  constructor(host: PlaneSequenceHost) {
    this.chickMesh = host.chickCloudMesh;
    this.bearMesh = host.bearCloudMesh;
    this.chickOrigTex = host.textures.chickCloud;
    this.bearOrigTex = host.textures.bearCloud;

    this.chickHoleMask = new CloudHoleMaskController(
      host.textures.chickCloud,
      host.chickW,
      host.chickH,
      1.5,
      12.0,
    );
    this.bearHoleMask = new CloudHoleMaskController(
      host.textures.bearCloud,
      host.bearW,
      host.bearH,
      1.5,
      12.0,
    );
    this.chickMesh.texture = this.chickHoleMask.texture;
    this.bearMesh.texture = this.bearHoleMask.texture;

    this.fragmentPool = new CloudFragmentPool(host.farEffectsLayer, host.heroEffectsLayer, {
      heart: host.textures.heartPuff,
      starfish: host.textures.starfish,
    });

    this.bannerPlane = new BannerPlane(
      host.renderer,
      typeof window !== 'undefined' ? window.innerWidth : 960,
      120,
      { bearIcon: host.textures.bearBadge },
      (burstX, burstY, scale) => {
        this.fragmentPool.spawnTapSparkles(burstX, burstY, scale, 6);
      },
    );
    this.bannerPlane.visible = false;
    host.heroPlaneSlot.addChild(this.bannerPlane);

    this.skyCuePrompt = new SkyCuePrompt(() => {
      this.flightController.skipCue();
      triggerHaptic(8);
    });
    host.cueSlot.addChild(this.skyCuePrompt);

    this.cloudDescriptors = [
      {
        id: 'chick',
        worldX: 0,
        worldY: 0,
        worldScale: 0.86,
        pivotX: 0,
        pivotY: host.chickH,
        logicalWidth: host.chickW,
        logicalHeight: host.chickH,
        mask: this.chickHoleMask,
        onRecoilImpulse: host.onChickRecoil,
      },
      {
        id: 'bear',
        worldX: 0,
        worldY: 0,
        worldScale: 0.9,
        pivotX: host.bearW,
        pivotY: host.bearH,
        logicalWidth: host.bearW,
        logicalHeight: host.bearH,
        mask: this.bearHoleMask,
        onRecoilImpulse: host.onBearRecoil,
      },
    ];

    const planeRef = this.bannerPlane;
    this.flightController = new PlaneFlightController({
      plane: {
        totalSpanX: planeRef.totalSpanX,
        get x() {
          return planeRef.x;
        },
        set x(v: number) {
          planeRef.x = v;
        },
        get y() {
          return planeRef.y;
        },
        set y(v: number) {
          planeRef.y = v;
        },
        get visible() {
          return planeRef.visible;
        },
        set visible(v: boolean) {
          planeRef.visible = v;
        },
        setDepthSlot: (slot) => {
          const target = slot === 'far' ? host.farPlaneSlot : host.heroPlaneSlot;
          if (planeRef.parent !== target) {
            target.addChild(planeRef);
          }
        },
        setVisualStyle: (sx, sy, tint, alpha, interactive) =>
          planeRef.setVisualStyle(sx, sy, tint, alpha, interactive),
        resetVisuals: () => planeRef.resetVisuals(),
        attachClingingTufts: (count) => planeRef.attachClingingTufts(count),
        setSlipstreamHaloActive: (active) => planeRef.setSlipstreamHaloActive(active),
        getNoseWorldPoint: (out) => planeRef.getNoseWorldPoint(out),
        getTailWorldPoint: (out) => planeRef.getTailWorldPoint(out),
        consumeSpeedBoostFactor: (dt) => planeRef.consumeSpeedBoostFactor(dt),
        triggerWingShakeAndCollectDetached: (outList) =>
          planeRef.triggerWingShakeAndCollectDetached(outList),
        updateVisuals: (dt, t, wStr, by, angle) =>
          planeRef.updateVisuals(dt, t, wStr, by, angle),
      },
      cue: this.skyCuePrompt,
      particles: this.fragmentPool,
      clouds: this.cloudDescriptors,
      onPlaySfx: (name) => audioManager.playSfx(name),
      onHaptic: (ms) => triggerHaptic(ms),
    });
  }

  get phase(): FlightPhase {
    return this.flightController.phase;
  }

  startWithCue(onHeroPassStart?: () => void, onFirstCycleComplete?: () => void): void {
    this.flightController.startWithCue(onHeroPassStart, onFirstCycleComplete);
  }

  ensureRunning(onFirstCycleComplete?: () => void): void {
    this.flightController.ensureRunning(onFirstCycleComplete);
  }

  skipCue(): void {
    this.flightController.skipCue();
  }

  reset(): void {
    this.flightController.reset();
    this.fragmentPool.clearAll();
    this.chickHoleMask.clearAllHoles();
    this.bearHoleMask.clearAllHoles();
  }

  syncCloudTransform(
    chickX: number,
    chickY: number,
    chickScale: number,
    bearX: number,
    bearY: number,
    bearScale: number,
  ): void {
    this.cloudDescriptors[0].worldX = chickX;
    this.cloudDescriptors[0].worldY = chickY;
    this.cloudDescriptors[0].worldScale = chickScale;

    this.cloudDescriptors[1].worldX = bearX;
    this.cloudDescriptors[1].worldY = bearY;
    this.cloudDescriptors[1].worldScale = bearScale;
  }

  applyLayout(layout: SceneLayout): void {
    this.skyCuePrompt.applyLayout(layout.width, layout.height, layout.isPortrait, layout.unitScale);
    this.flightController.applyLayout(layout);
    this.syncCloudTransform(
      layout.chickCloud.x,
      layout.chickCloud.y,
      layout.chickCloud.scale,
      layout.bearCloud.x,
      layout.bearCloud.y,
      layout.bearCloud.scale,
    );
  }

  update(dt: number, clock: AtmosphereClock, horizonY: number, viewportHeight: number): void {
    this.chickHoleMask.update(dt);
    this.bearHoleMask.update(dt);
    this.skyCuePrompt.update(dt, clock);
    this.flightController.update(dt, clock);
    this.fragmentPool.update(dt, clock, horizonY, viewportHeight);
  }

  destroy(): void {
    this.flightController.reset();
    this.fragmentPool.destroyPool();
    if (!this.chickMesh.destroyed) {
      this.chickMesh.texture = this.chickOrigTex;
    }
    if (!this.bearMesh.destroyed) {
      this.bearMesh.texture = this.bearOrigTex;
    }
    this.chickHoleMask.destroy();
    this.bearHoleMask.destroy();
    this.skyCuePrompt.destroyPrompt();
    this.bannerPlane.destroyBannerPlane();
  }
}
