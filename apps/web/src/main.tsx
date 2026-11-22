/** @jsxImportSource preact */
/**
 * main.tsx — Stage 1 Entry Shell (<100 KB).
 * Initializes single PixiJS v8 BeachStage locked to fixed 16:9 widescreen landscape with
 * Unified AtmosphereClock & ParallaxController, shows LandscapeGuardOverlay in portrait,
 * enforces Feb 5, 2027 time gate, and lazily loads BirthdayExperience ONLY after unlock.
 */
import { render, type ComponentType } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { BeachStage } from './engine/BeachStage';
import {
  computeFixedStageSize,
  computeSceneLayout,
  type SceneLayout,
} from './engine/layout/sceneLayout';
import { preloadStage1Textures } from './engine/assets/svgTextureFactory';
import { SkyLayer } from './engine/layers/SkyLayer';
import { OceanLayer } from './engine/layers/OceanLayer';
import { SandLayer } from './engine/layers/SandLayer';
import { AtmosphereEffectsLayer } from './engine/layers/AtmosphereEffectsLayer';
import {
  fetchAuthoritativeStatus,
  isPreviewQueryPresent,
  unlockWithPassword,
  type TimeGateStatus,
} from './core/timeGate';
import { audioManager } from './core/audioManager';
import { storyStore, useStoryStore } from './store/storyFsm';
import { CountdownSign } from './ui/CountdownSign';
import { LandscapeGuardOverlay } from './ui/LandscapeGuardOverlay';
import { toggleBrowserFullscreen } from './core/orientationGuard';
import type { BirthdayExperienceProps } from './scenes/BirthdayExperience';
import './styles/shell.css';

function computeInitialMetrics() {
  return computeFixedStageSize(window.innerWidth, window.innerHeight);
}

function App() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<BeachStage | null>(null);
  const skyRef = useRef<SkyLayer | null>(null);
  const oceanRef = useRef<OceanLayer | null>(null);
  const sandRef = useRef<SandLayer | null>(null);
  const effectsRef = useRef<AtmosphereEffectsLayer | null>(null);
  const initialFrame = computeInitialMetrics();
  const layoutRef = useRef<SceneLayout>(
    computeSceneLayout(initialFrame.width, initialFrame.height),
  );

  const [ready, setReady] = useState(false);
  const [serverNow, setServerNow] = useState(Date.now());
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [PasswordComp, setPasswordComp] = useState<ComponentType<{
    onClose: () => void;
    onSubmitPassword: (pw: string) => Promise<boolean>;
  }> | null>(null);
  const [isPortraitViewport, setIsPortraitViewport] = useState(initialFrame.isPortraitViewport);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement),
  );
  const [ExperienceComp, setExperienceComp] =
    useState<ComponentType<BirthdayExperienceProps> | null>(null);

  const {
    currentState,
    unlocked,
    muted,
    toggleMute,
    setUnlocked,
    setUnlockedContent,
    unlockAudio,
  } = useStoryStore();

  const getLayout = useCallback(() => layoutRef.current, []);

  // Track viewport orientation cleanly so portrait triggers LandscapeGuardOverlay
  useEffect(() => {
    const updateOrientationState = () => {
      const next = computeFixedStageSize(window.innerWidth, window.innerHeight);
      setIsPortraitViewport(next.isPortraitViewport);
      if (!next.isPortraitViewport) {
        setPromptDismissed(false);
      }
    };

    const updateFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    const mql = window.matchMedia?.('(orientation: portrait)');
    window.addEventListener('resize', updateOrientationState);
    window.addEventListener('orientationchange', updateOrientationState);
    document.addEventListener('fullscreenchange', updateFullscreenState);
    mql?.addEventListener?.('change', updateOrientationState);
    return () => {
      window.removeEventListener('resize', updateOrientationState);
      window.removeEventListener('orientationchange', updateOrientationState);
      document.removeEventListener('fullscreenchange', updateFullscreenState);
      mql?.removeEventListener?.('change', updateOrientationState);
    };
  }, []);

  // Lazy-load PasswordDialog ONLY if the secret octopus is tapped while locked
  useEffect(() => {
    if (!passwordModalOpen || PasswordComp) return;
    void import('./ui/PasswordDialog').then(({ PasswordDialog }) => {
      setPasswordComp(() => PasswordDialog);
    });
  }, [passwordModalOpen, PasswordComp]);

  const activateUnlockedShell = useCallback(
    async (status: TimeGateStatus, previewMode: boolean, isDisposed?: () => boolean) => {
      setServerNow(status.serverNow);
      if (status.content) {
        setUnlockedContent(status.content);
      }
      setUnlocked(true, previewMode);
      // Dynamically chunk unlocked experience ONLY after authoritative unlock
      const mod = await import('./scenes/BirthdayExperience');
      if (isDisposed?.()) return;
      setExperienceComp(() => mod.default);
    },
    [setUnlocked, setUnlockedContent],
  );

  // Enable open-sky swipe wind on Beat 0, Beat 1 & Sandbox play; keep background plane gentle later
  useEffect(() => {
    const sky = skyRef.current;
    const stage = stageRef.current;
    if (sky) {
      sky.setSwipeWindEnabled(
        currentState === 'LOCKED_GATE' ||
          currentState === 'SKY_CUE' ||
          currentState === 'PLANE_3_PASS' ||
          currentState === 'TWILIGHT_KEEPSAKE',
      );
      if (currentState === 'LOCKED_GATE') {
        sky.resetBirthdayReveal();
      }
    }
    if (stage) {
      stage.setAmbientBreathEnabled(currentState !== 'LOCKED_GATE');
    }
  }, [currentState, ready]);

  useEffect(() => {
    if (!canvasRef.current) return;
    let disposed = false;

    const stage = new BeachStage(canvasRef.current);
    stageRef.current = stage;

    const applyAllLayouts = (w: number, h: number) => {
      const next = computeSceneLayout(w, h);
      layoutRef.current = next;
      skyRef.current?.applyLayout(next);
      oceanRef.current?.applyLayout(next);
      sandRef.current?.applyLayout(next);
      effectsRef.current?.applyLayout(next);
      window.dispatchEvent(new Event('beach-stage-resize'));
    };

    const boot = async () => {
      audioManager.init();

      const [textures] = await Promise.all([
        preloadStage1Textures(),
        stage.init((w, h) => applyAllLayouts(w, h)),
      ]);
      if (disposed) return;

      const sky = new SkyLayer(textures, stage.atmosphere, stage.app.renderer);
      const ocean = new OceanLayer();
      const sand = new SandLayer(textures, {
        onOctopusTap: () => {
          const st = storyStore.getState();
          if (!st.unlocked && st.currentState === 'LOCKED_GATE') {
            setPasswordModalOpen(true);
          }
        },
      });
      const effects = new AtmosphereEffectsLayer();

      skyRef.current = sky;
      oceanRef.current = ocean;
      sandRef.current = sand;
      effectsRef.current = effects;

      stage.worldLayer.addChild(sky);
      stage.worldLayer.addChild(ocean);
      stage.worldLayer.addChild(sand);
      stage.worldLayer.addChild(effects);
      stage.registerParallaxLayers(sky, ocean, sand, effects);

      const stageSize = stage.getStageSize();
      applyAllLayouts(stageSize.width, stageSize.height);
      stage.app.render();
      setReady(true);

      const search = window.location.search;
      const previewToken = new URLSearchParams(search).get('preview');
      const previewPresent = isPreviewQueryPresent(search);
      const status = await fetchAuthoritativeStatus('/api', previewToken);
      if (disposed) return;

      if (status.unlocked) {
        await activateUnlockedShell(status, previewPresent, () => disposed);
      } else {
        setServerNow(status.serverNow);
        if (status.content) {
          setUnlockedContent(status.content);
        }
      }
    };

    void boot();

    return () => {
      disposed = true;
      audioManager.stopAll();
      stage.destroy();
    };
  }, [activateUnlockedShell, setUnlockedContent]);

  const handlePasswordSubmit = useCallback(
    async (password: string): Promise<boolean> => {
      const status = await unlockWithPassword(password, '/api');
      if (!status.unlocked) {
        return false;
      }
      audioManager.unlockAudioContext();
      audioManager.playSfx('chime');
      await activateUnlockedShell(status, true);
      return true;
    },
    [activateUnlockedShell],
  );

  const handleMuteToggle = () => {
    audioManager.unlockAudioContext();
    unlockAudio();
    const nextMuted = !muted;
    audioManager.setMuted(nextMuted);
    toggleMute();
  };

  return (
    <div id="app">
      <div
        class="stage-frame"
        ref={frameRef}
        onPointerDown={(e) => {
          const rect = frameRef.current?.getBoundingClientRect();
          if (rect) {
            sandRef.current?.setGazeTarget(e.clientX - rect.left, e.clientY - rect.top);
          } else {
            sandRef.current?.setGazeTarget(e.clientX, e.clientY);
          }
        }}
      >
        <canvas id="beach-canvas" ref={canvasRef} />

        <div id="ui-overlay">
          {ready && (
            <div class="hud-top-left">
              {unlocked && (
                <button
                  type="button"
                  class="mute-chip"
                  aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                  onClick={handleMuteToggle}
                >
                  {muted ? '🔇' : '🎵'}
                </button>
              )}
              <button
                type="button"
                class="fullscreen-chip"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={() => {
                  void toggleBrowserFullscreen();
                }}
              >
                {isFullscreen ? '🗗' : '⛶'}
              </button>
            </div>
          )}

          {ready && !unlocked && currentState === 'LOCKED_GATE' && (
            <CountdownSign serverNowMs={serverNow} />
          )}

          {ready && !unlocked && passwordModalOpen && PasswordComp && (
            <PasswordComp
              onClose={() => setPasswordModalOpen(false)}
              onSubmitPassword={handlePasswordSubmit}
            />
          )}

          {ready &&
            unlocked &&
            ExperienceComp &&
            stageRef.current &&
            skyRef.current && (
              <ExperienceComp
                stage={stageRef.current}
                skyLayer={skyRef.current}
                sandLayer={sandRef.current ?? undefined}
                getLayout={getLayout}
              />
            )}
        </div>
      </div>

      <LandscapeGuardOverlay
        visible={isPortraitViewport && !promptDismissed}
        onDismiss={() => setPromptDismissed(true)}
      />
    </div>
  );
}

const mountEl = document.getElementById('app');
if (mountEl) {
  render(<App />, mountEl);
}
