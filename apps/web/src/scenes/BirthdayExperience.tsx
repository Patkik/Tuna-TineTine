/** @jsxImportSource preact */
/**
 * BirthdayExperience.tsx — Dynamically imported ONLY when unlocked (Feb 5, 2027 or ?preview=).
 * Orchestrates all 10 beats (16 FSM states) with on-demand dynamic chunk loading,
 * clean unmount/teardown of scenes, timers, camera streams, and filters.
 */
import type { ComponentType } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { BirthdayContent } from '../../../edge-gate/src/content';
import { storyStore, useStoryStore, type TimeOfDay } from '../store/storyFsm';
import { audioManager } from '../core/audioManager';
import { triggerHaptic } from '../core/haptics';
import { requestLandscapeFullscreen } from '../core/orientationGuard';
import {
  advanceExtinguishCharge,
  smoothBlowIntensity,
  type BlowDetectorStatus,
} from '../vision/blowMath';
import type { BlowFaceDetector } from '../vision/BlowFaceDetector';
import {
  preloadStage1Textures,
  preloadStage2Textures,
  type Stage2Textures,
} from '../engine/assets/svgTextureFactory';
import type { BeachStage } from '../engine/BeachStage';
import type { SkyLayer } from '../engine/layers/SkyLayer';
import type { SandLayer } from '../engine/layers/SandLayer';
import type { SceneLayout } from '../engine/layout/sceneLayout';
import type { SpyglassScope } from '../engine/scenes/SpyglassScope';
import type { BottleDrift } from '../engine/scenes/BottleDrift';
import type { BearRig } from '../engine/scenes/BearRig';
import type { CakeWishScene } from '../engine/scenes/CakeWishScene';
import type { OctopusBottleCinema } from '../engine/scenes/OctopusBottleCinema';
import type { StackedScratchDeckProps } from '../ui/StackedScratchDeck';
import type { ScrollModalProps } from '../ui/ScrollModal';
import type { BearChatCloudProps } from '../ui/BearChatCloud';

export interface BirthdayExperienceProps {
  stage: BeachStage;
  skyLayer: SkyLayer;
  sandLayer?: SandLayer;
  getLayout: () => SceneLayout;
}

export default function BirthdayExperience({
  stage,
  skyLayer,
  sandLayer,
  getLayout,
}: BirthdayExperienceProps) {
  const {
    currentState,
    scratchedTicketIds,
    swipedTicketIds,
    bottleScrollOpen,
    timeOfDay,
    sandboxPlay,
    unlockedContent,
    setState,
    unlockAudio,
    markTicketScratched,
    markTicketSwiped,
    setBottleScrollOpen,
    blowOutCandles,
    setTimeOfDay,
    setSandboxPlay,
    markKeepsakeSaved,
    setUnlockedContent,
  } = useStoryStore();

  const [fallbackContent, setFallbackContent] = useState<BirthdayContent | null>(null);
  const content = unlockedContent ?? fallbackContent;

  const [ScratchDeckComp, setScratchDeckComp] =
    useState<ComponentType<StackedScratchDeckProps> | null>(null);
  const [ScrollModalComp, setScrollModalComp] =
    useState<ComponentType<ScrollModalProps> | null>(null);
  const [BearChatComp, setBearChatComp] =
    useState<ComponentType<BearChatCloudProps> | null>(null);
  const [BlowPortholeComp, setBlowPortholeComp] = useState<ComponentType<any> | null>(null);
  const [KeepsakeComp, setKeepsakeComp] = useState<ComponentType<any> | null>(null);

  const [bearReadyToTap, setBearReadyToTap] = useState(false);
  const [blowProgress, setBlowProgress] = useState(0);
  const [blowIntensity, setBlowIntensity] = useState(0);
  const [cameraStatus, setCameraStatus] = useState<BlowDetectorStatus>('loading');
  const [faceDetected, setFaceDetected] = useState(false);
  const [showHoldFallback, setShowHoldFallback] = useState(false);

  const stage2Ref = useRef<Stage2Textures | null>(null);
  const cinemaRef = useRef<OctopusBottleCinema | null>(null);
  const spyglassRef = useRef<SpyglassScope | null>(null);
  const bottleRef = useRef<BottleDrift | null>(null);
  const bearRigRef = useRef<BearRig | null>(null);
  const cakeRef = useRef<CakeWishScene | null>(null);

  const blowingHoldRef = useRef(false);
  const preloadedDetectorRef = useRef<BlowFaceDetector | null>(null);
  const detectorRef = useRef<BlowFaceDetector | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const blownDoneRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load fallback content ONLY if server did not supply unlockedContent (local offline dev)
  useEffect(() => {
    if (unlockedContent) return;
    let cancelled = false;
    void import('../core/previewFallback').then(({ LOCAL_PREVIEW_FALLBACK }) => {
      if (!cancelled) {
        setFallbackContent(LOCAL_PREVIEW_FALLBACK);
        setUnlockedContent(LOCAL_PREVIEW_FALLBACK);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [unlockedContent, setUnlockedContent]);

  // Background Stage 2 atlas preload & cleanup of preloaded vision detector
  useEffect(() => {
    void preloadStage2Textures().then((tex) => {
      stage2Ref.current = tex;
    });
    return () => {
      preloadedDetectorRef.current?.destroy();
      preloadedDetectorRef.current = null;
    };
  }, []);

  // Preload StackedScratchDeck as soon as Beat 1 begins
  useEffect(() => {
    if (
      ScratchDeckComp ||
      (currentState !== 'PLANE_3_PASS' &&
        currentState !== 'WIND_INTRO' &&
        currentState !== 'STACKED_SCRATCH' &&
        currentState !== 'ALL_CARDS_FAN' &&
        currentState !== 'BLOW_AWAY')
    ) {
      return;
    }
    void import('../ui/StackedScratchDeck').then(({ StackedScratchDeck }) => {
      if (isMountedRef.current) setScratchDeckComp(() => StackedScratchDeck);
    });
  }, [currentState, ScratchDeckComp]);

  // Preload ScrollModal right before Beat 4b
  useEffect(() => {
    if (
      ScrollModalComp ||
      (currentState !== 'SCOPE_DRIFT' && currentState !== 'BOTTLE_OPEN_CLOSE')
    ) {
      return;
    }
    void import('../ui/ScrollModal').then(({ ScrollModal }) => {
      if (isMountedRef.current) setScrollModalComp(() => ScrollModal);
    });
  }, [currentState, ScrollModalComp]);

  // Preload BearChatCloud in Beat 7 and MediaPipe BlowFaceDetector in Beat 8
  useEffect(() => {
    if (
      !BearChatComp &&
      (currentState === 'BEAR_CAKE_REVEAL' || currentState === 'LANDSCAPE_SPLIT_LETTER')
    ) {
      void import('../ui/BearChatCloud').then(({ BearChatCloud }) => {
        if (isMountedRef.current) setBearChatComp(() => BearChatCloud);
      });
    }
    if (currentState === 'LANDSCAPE_SPLIT_LETTER' && !preloadedDetectorRef.current) {
      let cancelled = false;
      void import('../vision/BlowFaceDetector').then(async ({ BlowFaceDetector }) => {
        if (cancelled || !isMountedRef.current) return;
        const detector = new BlowFaceDetector();
        preloadedDetectorRef.current = detector;
        await detector.init();
      });
      return () => {
        cancelled = true;
      };
    }
  }, [currentState, BearChatComp]);

  // Step active Beat 4-9 Pixi scenes inside stage's synchronized ticker
  useEffect(() => {
    if (!stage.app?.ticker) return;
    const step = (ticker: { deltaMS: number }) => {
      const dt = Math.min(ticker.deltaMS / 1000, 0.05);
      cinemaRef.current?.update(dt, stage.atmosphere);
      spyglassRef.current?.update(dt, stage);
      bottleRef.current?.update(dt, stage.atmosphere);
      bearRigRef.current?.update(dt);
    };
    stage.app.ticker.add(step);

    const onResize = () => {
      const layout = getLayout();
      cinemaRef.current?.applyLayout(layout);
      spyglassRef.current?.applyLayout(layout.width, layout.height);
      bottleRef.current?.applyLayout(layout);
      bearRigRef.current?.applyLayout(layout);
      cakeRef.current?.applyLayout(layout);
    };
    window.addEventListener('beach-stage-resize', onResize);

    return () => {
      stage.app?.ticker?.remove(step);
      window.removeEventListener('beach-stage-resize', onResize);
    };
  }, [stage, getLayout]);

  const unmountCinema = useCallback(() => {
    if (cinemaRef.current) {
      cinemaRef.current.destroyCinema();
      stage.scopeLayer.removeChild(cinemaRef.current);
      cinemaRef.current.destroy({ children: true });
      cinemaRef.current = null;
    }
  }, [stage]);

  const unmountSpyglass = useCallback(() => {
    if (spyglassRef.current) {
      spyglassRef.current.destroyScope();
      stage.scopeLayer.removeChild(spyglassRef.current);
      spyglassRef.current.destroy({ children: true });
      spyglassRef.current = null;
    }
  }, [stage]);

  const unmountBottle = useCallback(() => {
    if (bottleRef.current) {
      bottleRef.current.destroyScene();
      stage.worldLayer.removeChild(bottleRef.current);
      bottleRef.current.destroy({ children: true });
      bottleRef.current = null;
    }
  }, [stage]);

  const unmountBearRig = useCallback(() => {
    if (bearRigRef.current) {
      bearRigRef.current.destroyRig();
      stage.actorLayer.removeChild(bearRigRef.current);
      bearRigRef.current.destroy({ children: true });
      bearRigRef.current = null;
    }
  }, [stage]);

  const unmountCake = useCallback(() => {
    if (cakeRef.current) {
      cakeRef.current.stop(stage.app.ticker);
      stage.actorLayer.removeChild(cakeRef.current);
      cakeRef.current.destroy({ children: true });
      cakeRef.current = null;
    }
  }, [stage]);

  useEffect(() => {
    return () => {
      unmountCinema();
      unmountSpyglass();
      unmountBottle();
      unmountBearRig();
      unmountCake();
      sandLayer?.setOctopusVisible(true);
      stage.setWorldBlurImmediate(0);
      stage.resetCamera(0);
    };
  }, [unmountCinema, unmountSpyglass, unmountBottle, unmountBearRig, unmountCake, sandLayer, stage]);

  const ensureStage2 = useCallback(async () => {
    const tex = stage2Ref.current ?? (await preloadStage2Textures());
    stage2Ref.current = tex;
    return tex;
  }, []);

  const ensureSpyglass = useCallback(async () => {
    if (spyglassRef.current) return spyglassRef.current;
    const { SpyglassScope } = await import('../engine/scenes/SpyglassScope');
    const layout = getLayout();
    const scope = new SpyglassScope();
    scope.applyLayout(layout.width, layout.height);
    stage.scopeLayer.addChild(scope);
    spyglassRef.current = scope;
    return scope;
  }, [stage, getLayout]);

  const ensureBottle = useCallback(async () => {
    if (bottleRef.current) return bottleRef.current;
    const [tex, { BottleDrift }] = await Promise.all([
      ensureStage2(),
      import('../engine/scenes/BottleDrift'),
    ]);
    const bottle = new BottleDrift(tex, () => {
      setBottleScrollOpen(true);
    });
    bottle.applyLayout(getLayout());
    stage.worldLayer.addChild(bottle);
    bottleRef.current = bottle;
    return bottle;
  }, [ensureStage2, stage, getLayout, setBottleScrollOpen]);

  const ensureBearRig = useCallback(async () => {
    if (bearRigRef.current) return bearRigRef.current;
    const [tex, { BearRig }] = await Promise.all([
      ensureStage2(),
      import('../engine/scenes/BearRig'),
    ]);
    const rig = new BearRig(tex);
    rig.applyLayout(getLayout());
    stage.actorLayer.addChild(rig);
    bearRigRef.current = rig;
    return rig;
  }, [ensureStage2, stage, getLayout]);

  // Beat 1: SKY_CUE -> PLANE_3_PASS -> WIND_INTRO
  useEffect(() => {
    if (currentState !== 'SKY_CUE' && currentState !== 'PLANE_3_PASS') return;

    const onCycleComplete = () => {
      if (storyStore.getState().currentState === 'PLANE_3_PASS') {
        setState('WIND_INTRO');
      }
    };

    if (currentState === 'SKY_CUE') {
      if (skyLayer.getFlightPhase() === 'IDLE') {
        void skyLayer.startBirthdayReveal(() => {
          if (storyStore.getState().currentState === 'SKY_CUE') {
            setState('PLANE_3_PASS');
          }
        }, onCycleComplete);
      }
    } else if (currentState === 'PLANE_3_PASS') {
      const phase = skyLayer.getFlightPhase();
      if (phase === 'IDLE' || phase === 'CUE') {
        void skyLayer.ensurePlaneLoopRunning(onCycleComplete);
      }
    }
  }, [currentState, skyLayer, setState]);

  // Beat 2a: WIND_INTRO — paper-physics tickets drift in & wait for user to catch them
  useEffect(() => {
    if (currentState !== 'WIND_INTRO') return;
    unmountCinema();
    unmountSpyglass();
    unmountBottle();
    unmountBearRig();
    unmountCake();
    sandLayer?.setOctopusVisible(true);
    stage.setWorldBlurImmediate(0);
    stage.resetCamera(0.35);

    stage.atmosphere.triggerStoryGust(1.85, 4);
    audioManager.playSfx('wind');
    audioManager.playSfx('paperWhoosh');
  }, [
    currentState,
    stage,
    sandLayer,
    unmountCinema,
    unmountSpyglass,
    unmountBottle,
    unmountBearRig,
    unmountCake,
  ]);

  // Beat 4a: SCOPE_DRIFT (Continuous 5-frame Octopus Bottle Retrieval Cinema -> live shore handoff)
  useEffect(() => {
    if (currentState !== 'SCOPE_DRIFT') return;
    let cancelled = false;
    unmountSpyglass();
    unmountBearRig();
    unmountCake();
    unmountCinema();
    sandLayer?.setOctopusVisible(false);
    stage.setWorldBlurImmediate(0);
    stage.setCamera(1.18, 0.5, 0.56, 0.55);

    const run = async () => {
      const [stage1, stage2, { OctopusBottleCinema }] = await Promise.all([
        preloadStage1Textures(),
        ensureStage2(),
        import('../engine/scenes/OctopusBottleCinema'),
      ]);
      if (cancelled) return;

      const cinema = new OctopusBottleCinema(
        stage1,
        stage2,
        () => {
          if (cancelled) return;
          void ensureBottle().then((bottle) => {
            if (cancelled) return;
            bottle.snapSettled(getLayout(), true);
            stage.resetCamera(0.85);
          });
        },
        () => {
          if (cancelled) return;
          unmountCinema();
          if (storyStore.getState().currentState === 'SCOPE_DRIFT') {
            setState('BOTTLE_OPEN_CLOSE');
          }
        },
      );
      cinema.applyLayout(getLayout());
      stage.scopeLayer.addChild(cinema);
      cinemaRef.current = cinema;
    };
    void run();

    return () => {
      cancelled = true;
      unmountCinema();
    };
  }, [
    currentState,
    ensureStage2,
    ensureBottle,
    getLayout,
    stage,
    sandLayer,
    setState,
    unmountCinema,
    unmountSpyglass,
    unmountBearRig,
    unmountCake,
  ]);

  // Beat 4b: BOTTLE_OPEN_CLOSE (Open-air bright beach view with clickable bottle + waving octopus)
  useEffect(() => {
    if (currentState !== 'BOTTLE_OPEN_CLOSE') return;
    let cancelled = false;
    unmountCinema();
    unmountSpyglass();
    unmountBearRig();
    unmountCake();
    sandLayer?.setOctopusVisible(false);
    stage.setWorldBlurImmediate(0);
    stage.resetCamera(0.45);

    const run = async () => {
      const bottle = await ensureBottle();
      if (cancelled) return;
      bottle.snapSettled(getLayout(), true);
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [
    currentState,
    ensureBottle,
    getLayout,
    stage,
    sandLayer,
    unmountCinema,
    unmountSpyglass,
    unmountBearRig,
    unmountCake,
  ]);

  // Beat 5: BEAR_LENS_PEEK & BEAR_CHAT_INTRO (remain inside zoomed spyglass!)
  useEffect(() => {
    if (currentState !== 'BEAR_LENS_PEEK' && currentState !== 'BEAR_CHAT_INTRO') return;
    let cancelled = false;
    unmountCake();
    setBearReadyToTap(currentState === 'BEAR_CHAT_INTRO');

    const run = async () => {
      const [scope, bottle, rig] = await Promise.all([
        ensureSpyglass(),
        ensureBottle(),
        ensureBearRig(),
      ]);
      if (cancelled) return;
      const layout = getLayout();
      scope.visible = true;
      scope.alpha = 1;
      scope.hideFocusTicks();
      bottle.snapSettled(layout);
      stage.setCamera(1.24, 0.52, 0.65, 0.25);

      const handleTapBear = () => {
        if (storyStore.getState().currentState === 'BEAR_LENS_PEEK') {
          setState('BEAR_CHAT_INTRO');
        }
      };

      if (currentState === 'BEAR_LENS_PEEK') {
        bottle.snapSettled(layout, false);
        rig.startLensPeek(layout, scope, stage, handleTapBear, () => {
          if (!cancelled) setBearReadyToTap(true);
        });
      } else {
        bottle.snapSettled(layout, false);
        rig.snapLensPeek(layout, stage, handleTapBear);
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [currentState, ensureSpyglass, ensureBottle, ensureBearRig, getLayout, stage, setState, unmountCake]);

  // Beat 6: BEAR_HANDS_BACK (spyglass expands & dissolves away -> shy full-body bear)
  useEffect(() => {
    if (currentState !== 'BEAR_HANDS_BACK') return;
    let cancelled = false;
    unmountCake();

    const run = async () => {
      const rig = await ensureBearRig();
      if (cancelled) return;
      const layout = getLayout();
      unmountBottle();
      sandLayer?.setOctopusVisible(true);

      if (spyglassRef.current && spyglassRef.current.visible) {
        spyglassRef.current.expandAndDissolve(stage, () => {
          if (!cancelled) unmountSpyglass();
        });
      } else {
        unmountSpyglass();
      }

      stage.setWorldBlur(0, 0.35);
      stage.resetCamera(0.55);
      rig.showHandsBack(layout, () => {
        if (storyStore.getState().currentState === 'BEAR_HANDS_BACK') {
          setState('BEAR_CAKE_REVEAL');
        }
      });
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [currentState, ensureBearRig, getLayout, stage, setState, unmountBottle, unmountSpyglass, unmountCake]);

  // Beat 7: BEAR_CAKE_REVEAL (1.0x -> 1.48x push-in, 160ms dip, arms swing cake forward)
  useEffect(() => {
    if (currentState !== 'BEAR_CAKE_REVEAL') return;
    let cancelled = false;
    unmountSpyglass();
    unmountBottle();
    unmountCake();
    stage.setWorldBlurImmediate(0);

    const run = async () => {
      const rig = await ensureBearRig();
      if (cancelled) return;
      rig.playCakeReveal(getLayout(), stage, () => {
        if (!cancelled && storyStore.getState().currentState === 'BEAR_CAKE_REVEAL') {
          setState('LANDSCAPE_SPLIT_LETTER');
        }
      });
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [currentState, ensureBearRig, getLayout, stage, setState, unmountSpyglass, unmountBottle, unmountCake]);

  // Beat 8: LANDSCAPE_SPLIT_LETTER (bear + cake left 38%, coral badge + chat cloud right 58%)
  useEffect(() => {
    if (currentState !== 'LANDSCAPE_SPLIT_LETTER') return;
    let cancelled = false;
    unmountSpyglass();
    unmountBottle();
    unmountCake();
    stage.setWorldBlurImmediate(0);

    const run = async () => {
      const rig = await ensureBearRig();
      if (cancelled) return;
      rig.moveToSplitLetter(getLayout(), stage);
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, [currentState, ensureBearRig, getLayout, stage, unmountSpyglass, unmountBottle, unmountCake]);

  // Beat 9a: CAKE_BLOW_FINALE (centered large cake + MediaPipe 15 FPS blow detection + fallback)
  useEffect(() => {
    if (currentState !== 'CAKE_BLOW_FINALE') {
      unmountCake();
      return;
    }

    let cancelled = false;
    unmountSpyglass();
    unmountBottle();
    unmountBearRig();
    stage.setWorldBlurImmediate(0);
    stage.resetCamera(0.55);

    blownDoneRef.current = false;
    setBlowProgress(0);
    setBlowIntensity(0);
    setCameraStatus('loading');
    setFaceDetected(false);
    setShowHoldFallback(false);

    let twilightTimer: ReturnType<typeof setTimeout> | undefined;
    let keepsakeTimer: ReturnType<typeof setTimeout> | undefined;
    let faceIntensityLocal = 0;
    let faceChargeLocal = 0;
    let holdIntensityLocal = 0;
    let holdChargeLocal = 0;

    void import('../ui/BlowCameraPorthole').then(({ BlowCameraPorthole }) => {
      if (!cancelled) setBlowPortholeComp(() => BlowCameraPorthole);
    });

    const mountCake = async () => {
      const [tex, { CakeWishScene }] = await Promise.all([
        ensureStage2(),
        import('../engine/scenes/CakeWishScene'),
      ]);
      if (cancelled) return;
      const scene = new CakeWishScene(tex);
      scene.start(getLayout(), stage.app.ticker, false);
      stage.actorLayer.addChild(scene);
      cakeRef.current = scene;
    };
    void mountCake();

    const completeCakeBlowOut = () => {
      if (blownDoneRef.current) return;
      blownDoneRef.current = true;
      clearInterval(holdInterval);

      detectorRef.current?.destroy();
      detectorRef.current = null;
      preloadedDetectorRef.current = null;

      setCameraStatus('extinguished');
      setBlowProgress(1);

      cakeRef.current?.extinguish();
      blowOutCandles();
      stage.transitionTimeOfDay('sunset', 1.3);
      skyLayer.setTwilightStars(0.45, 1.3);

      twilightTimer = setTimeout(() => {
        if (cancelled) return;
        setTimeOfDay('twilight');
        stage.transitionTimeOfDay('twilight', 1.5);
        skyLayer.setTwilightStars(0.95, 1.5);
      }, 1100);

      keepsakeTimer = setTimeout(() => {
        if (cancelled) return;
        setState('TWILIGHT_KEEPSAKE');
      }, 2400);
    };

    const startFaceDetector = async () => {
      const { BlowFaceDetector } = await import('../vision/BlowFaceDetector');
      if (cancelled || blownDoneRef.current) return;

      const detector = preloadedDetectorRef.current ?? new BlowFaceDetector();
      preloadedDetectorRef.current = null;
      detectorRef.current = detector;

      const ok = await detector.start(
        (update) => {
          if (cancelled || blownDoneRef.current) return;
          faceIntensityLocal = update.smoothedIntensity;
          faceChargeLocal = update.extinguishProgress;

          setFaceDetected(update.faceDetected);
          setCameraStatus(update.status);
          if (update.noFaceFallback) {
            setShowHoldFallback(true);
          }

          const effectiveIntensity = blowingHoldRef.current
            ? Math.max(faceIntensityLocal, holdIntensityLocal)
            : faceIntensityLocal;
          const effectiveProgress = Math.max(faceChargeLocal, holdChargeLocal);

          setBlowIntensity(effectiveIntensity);
          setBlowProgress(effectiveProgress);
          cakeRef.current?.setWindStrength(effectiveIntensity);

          if (update.smoothedIntensity > 0.45) {
            audioManager.playSfx('wind');
          }
        },
        () => {
          if (!cancelled) completeCakeBlowOut();
        },
        cameraVideoRef.current,
      );

      if (!ok && !cancelled && !blownDoneRef.current) {
        setCameraStatus('fallback');
        setShowHoldFallback(true);
      }
    };
    void startFaceDetector();

    const holdInterval = setInterval(() => {
      if (blownDoneRef.current) return;
      const shouldStep =
        blowingHoldRef.current || holdIntensityLocal > 0.01 || holdChargeLocal > 0.001;
      if (!shouldStep) return;

      const rawHold = blowingHoldRef.current ? 0.92 : 0;
      holdIntensityLocal = smoothBlowIntensity(holdIntensityLocal, rawHold, 0.35);
      holdChargeLocal = advanceExtinguishCharge(holdChargeLocal, holdIntensityLocal, 50);

      const effectiveIntensity = Math.max(faceIntensityLocal, holdIntensityLocal);
      const effectiveProgress = Math.max(faceChargeLocal, holdChargeLocal);

      setBlowIntensity(effectiveIntensity);
      setBlowProgress(effectiveProgress);
      cakeRef.current?.setWindStrength(effectiveIntensity);

      if (blowingHoldRef.current) {
        audioManager.playSfx('wind');
      }

      if (effectiveProgress >= 1) {
        completeCakeBlowOut();
      }
    }, 50);

    return () => {
      cancelled = true;
      clearInterval(holdInterval);
      clearTimeout(twilightTimer);
      clearTimeout(keepsakeTimer);
      blowingHoldRef.current = false;
      detectorRef.current?.destroy();
      detectorRef.current = null;
      unmountCake();
    };
  }, [
    currentState,
    ensureStage2,
    getLayout,
    stage,
    skyLayer,
    blowOutCandles,
    setTimeOfDay,
    setState,
    unmountSpyglass,
    unmountBottle,
    unmountBearRig,
    unmountCake,
  ]);

  // Beat 9b: TWILIGHT_KEEPSAKE (starry twilight + fireflies + happy bear + snuffed cake)
  useEffect(() => {
    if (currentState !== 'TWILIGHT_KEEPSAKE') return;
    let cancelled = false;
    unmountSpyglass();
    unmountBottle();
    stage.setWorldBlurImmediate(0);
    stage.resetCamera(0.5);
    stage.transitionTimeOfDay('twilight', 0.9);
    skyLayer.setTwilightStars(0.95, 0.9);

    void import('../ui/KeepsakeExporter').then(({ KeepsakeExporter }) => {
      if (!cancelled) setKeepsakeComp(() => KeepsakeExporter);
    });

    const mountFinalScene = async () => {
      const [tex, { CakeWishScene }, rig] = await Promise.all([
        ensureStage2(),
        import('../engine/scenes/CakeWishScene'),
        ensureBearRig(),
      ]);
      if (cancelled) return;
      const layout = getLayout();
      rig.showTwilightCompanion(layout);

      if (!cakeRef.current) {
        const cake = new CakeWishScene(tex);
        cake.start(layout, stage.app.ticker, true);
        stage.actorLayer.addChild(cake);
        cakeRef.current = cake;
      } else {
        cakeRef.current.setKeepsakeMode(true, layout);
      }
    };
    void mountFinalScene();

    return () => {
      cancelled = true;
    };
  }, [currentState, ensureStage2, ensureBearRig, getLayout, stage, skyLayer, unmountSpyglass, unmountBottle]);

  const handleWakeBeach = () => {
    void requestLandscapeFullscreen();
    audioManager.unlockAudioContext();
    unlockAudio();
    audioManager.startOceanAmbience();
    audioManager.startMusicBox();
    triggerHaptic(12);
    setState('SKY_CUE');
  };

  const handleTimeSwitch = (mode: TimeOfDay) => {
    setTimeOfDay(mode);
    stage.transitionTimeOfDay(mode, 1.2);
    skyLayer.setTwilightStars(mode === 'twilight' ? 0.95 : mode === 'sunset' ? 0.4 : 0, 1.2);
  };

  return (
    <>
      {/* Beat 0 Unlocked Prompt (legally unlocks Web Audio & enters fullscreen) */}
      {currentState === 'LOCKED_GATE' && (
        <div class="thumb-zone-anchor">
          <button
            type="button"
            class="beach-btn beach-btn--cream"
            onClick={handleWakeBeach}
          >
            🌊 Tap to Wake the Beach
          </button>
        </div>
      )}

      {/* Beat 2 & 3: Wind Intro + Stacked Scratch Deck + Fan & Blow Away */}
      {(currentState === 'WIND_INTRO' ||
        currentState === 'STACKED_SCRATCH' ||
        currentState === 'ALL_CARDS_FAN' ||
        currentState === 'BLOW_AWAY') &&
        content &&
        ScratchDeckComp && (
          <ScratchDeckComp
            tickets={content.scratchTickets}
            currentState={currentState}
            scratchedIds={scratchedTicketIds}
            swipedIds={swipedTicketIds}
            onTicketsCaught={() => setState('STACKED_SCRATCH')}
            onTicketScratched={markTicketScratched}
            onTicketSwiped={(id) => {
              markTicketSwiped(id);
              const nextLen = swipedTicketIds.includes(id)
                ? swipedTicketIds.length
                : swipedTicketIds.length + 1;
              if (nextLen >= content.scratchTickets.length) {
                setState('ALL_CARDS_FAN');
              }
            }}
            onBlowTicketsAway={() => {
              stage.atmosphere.triggerStoryGust(1.9, 3);
              audioManager.playSfx('paperWhoosh');
              audioManager.playSfx('wind');
              triggerHaptic(14);
              setState('BLOW_AWAY');
            }}
            onBlowAwayComplete={() => {
              if (storyStore.getState().currentState === 'BLOW_AWAY') {
                setState('SCOPE_DRIFT');
              }
            }}
          />
        )}

      {/* Beat 4: Bottle tap hint & Wide Landscape Parchment Scroll Modal */}
      {currentState === 'BOTTLE_OPEN_CLOSE' && !bottleScrollOpen && (
        <button
          type="button"
          class="top-banner interactive"
          style={{ cursor: 'pointer' }}
          onClick={() => bottleRef.current?.triggerOpen()}
        >
          🍾 Tap the bottle to uncork the message!
        </button>
      )}

      {currentState === 'BOTTLE_OPEN_CLOSE' &&
        bottleScrollOpen &&
        content &&
        ScrollModalComp && (
          <ScrollModalComp
            scroll={content.bottleScroll}
            onClose={() => {
              setBottleScrollOpen(false);
              if (bottleRef.current) {
                bottleRef.current.playReverseClose(() => {
                  void ensureSpyglass().then((scope) => {
                    scope.openIris(stage);
                    stage.setCamera(1.24, 0.52, 0.65, 0.45);
                    if (storyStore.getState().currentState === 'BOTTLE_OPEN_CLOSE') {
                      setState('BEAR_LENS_PEEK');
                    }
                  });
                });
              } else {
                setState('BEAR_LENS_PEEK');
              }
            }}
          />
        )}

      {/* Beat 5a: Subtle cue after tok-tok-tok! */}
      {currentState === 'BEAR_LENS_PEEK' && bearReadyToTap && (
        <div class="thumb-zone-anchor">
          <button
            type="button"
            class="beach-btn beach-btn--cream"
            onClick={() => setState('BEAR_CHAT_INTRO')}
          >
            🐻 Tap the Bear!
          </button>
        </div>
      )}

      {/* Beat 5b: Bear Intro Speech Bubble inside zoomed spyglass */}
      {currentState === 'BEAR_CHAT_INTRO' && content && (
        <div class="bear-bubble-anchor bear-bubble-anchor--scope interactive">
          <button
            type="button"
            class="bear-speech-bubble"
            onClick={() => setState('BEAR_HANDS_BACK')}
          >
            <span>{content.bearDialogue.lensIntro}</span>
          </button>
        </div>
      )}

      {/* Beat 6: Shy Hands Behind Back Speech Bubble */}
      {currentState === 'BEAR_HANDS_BACK' && content && (
        <div class="bear-bubble-anchor bear-bubble-anchor--beach interactive">
          <button
            type="button"
            class="bear-speech-bubble"
            onClick={() => setState('BEAR_CAKE_REVEAL')}
          >
            <span>{content.bearDialogue.handsBack}</span>
          </button>
        </div>
      )}

      {/* Beat 8: Widescreen Split Bear Badge + Scrollable Taglish Chat Cloud */}
      {currentState === 'LANDSCAPE_SPLIT_LETTER' && content && BearChatComp && (
        <BearChatComp
          letter={content.letter}
          onBlowCake={() => {
            audioManager.playSfx('chime');
            setState('CAKE_BLOW_FINALE');
          }}
        />
      )}

      {/* Beat 9a: MediaPipe 15 FPS Camera Porthole + Wind Meter + Tap & Hold Fallback */}
      {currentState === 'CAKE_BLOW_FINALE' && (
        <>
          {BlowPortholeComp && (
            <BlowPortholeComp
              videoRef={cameraVideoRef}
              charge={blowProgress}
              intensity={blowIntensity}
              status={cameraStatus}
              faceDetected={faceDetected}
            />
          )}
          <div class="thumb-zone-anchor">
            <div class="cake-card interactive">
              <h2 class="cake-card-title">🎂 Make a Birthday Wish!</h2>
              <p class="cake-card-sub">
                {cameraStatus === 'fallback'
                  ? 'Tap & hold below to blow out the candles ✨'
                  : 'Blow toward the camera to blow out the candles ✨'}
              </p>
              <div class="blow-progress-track" aria-hidden="true">
                <div
                  class="blow-progress-fill"
                  style={{ width: `${Math.round(blowProgress * 100)}%` }}
                />
              </div>
            </div>

            {showHoldFallback && (
              <div class="fallback-pill-wrap is-visible">
                <button
                  type="button"
                  class="beach-btn beach-btn--yellow"
                  onPointerDown={() => {
                    audioManager.unlockAudioContext();
                    blowingHoldRef.current = true;
                  }}
                  onPointerUp={() => {
                    blowingHoldRef.current = false;
                  }}
                  onPointerCancel={() => {
                    blowingHoldRef.current = false;
                  }}
                  onPointerLeave={() => {
                    blowingHoldRef.current = false;
                  }}
                >
                  🌬️ Tap & Hold to Blow
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Beat 9b: Twilight Keepsake Card + Play on the Beach Sandbox */}
      {currentState === 'TWILIGHT_KEEPSAKE' && !sandboxPlay && KeepsakeComp && (
        <KeepsakeComp
          onCaptureStage={() => stage.captureStageCanvas()}
          onEnterSandbox={() => setSandboxPlay(true)}
          onSaved={markKeepsakeSaved}
        />
      )}

      {currentState === 'TWILIGHT_KEEPSAKE' && sandboxPlay && (
        <div class="sandbox-dock interactive">
          {(['day', 'sunset', 'twilight'] as TimeOfDay[]).map((mode) => (
            <button
              key={mode}
              type="button"
              class={`sandbox-chip ${timeOfDay === mode ? 'active' : ''}`}
              onClick={() => handleTimeSwitch(mode)}
            >
              {mode === 'day' ? '☀️ Day' : mode === 'sunset' ? '🌅 Sunset' : '🌙 Twilight'}
            </button>
          ))}
          <button
            type="button"
            class="sandbox-chip"
            onClick={() => {
              void skyLayer.ensurePlaneLoopRunning();
            }}
          >
            ✈️ Plane
          </button>
          <button
            type="button"
            class="sandbox-chip"
            onClick={() => setSandboxPlay(false)}
          >
            📸 Keepsake
          </button>
        </div>
      )}
    </>
  );
}
