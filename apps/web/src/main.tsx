/** @jsxImportSource preact */
import { h, render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BeachStage } from './engine/BeachStage';
import { SkyLayer } from './engine/layers/SkyLayer';
import { OceanLayer } from './engine/layers/OceanLayer';
import { SandLayer } from './engine/layers/SandLayer';
import { DigScene } from './engine/scenes/DigScene';
import type { Treasure } from './engine/scenes/DigScene';
import { useStoryStore } from './store/useStoryStore';
import { audioManager } from './core/audioManager';
import { fetchAuthoritativeStatus } from './core/timeGate';
import { CountdownSign } from './ui/CountdownSign';
import { TreasureCard } from './ui/TreasureCard';
import { PolaroidStack } from './ui/PolaroidStack';
import type { PolaroidData } from './ui/PolaroidStack';
import { BirthdayLetter } from './ui/BirthdayLetter';
import { KeepsakeExporter } from './ui/KeepsakeExporter';
import './styles/shell.css';

const POLAROIDS: PolaroidData[] = [
  { emoji: '🌊', caption: 'That day at the beach when everything felt perfect 🌊' },
  { emoji: '🍵', caption: 'Tea time and endless conversations ☕' },
  { emoji: '🌸', caption: 'Your laugh that makes everyone smile 🌸' },
  { emoji: '⭐', caption: 'All the moments I\'m grateful for — especially you ⭐' },
];

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<BeachStage | null>(null);
  const skyRef = useRef<SkyLayer | null>(null);
  const sandRef = useRef<SandLayer | null>(null);
  const digRef = useRef<DigScene | null>(null);
  const [serverNow, setServerNow] = useState(Date.now());
  const [initialized, setInitialized] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  const {
    currentAct,
    setAct,
    unearthItem,
    activeTreasureCard,
    dugItems,
    dismissTreasureCard,
    blowOutCandles,
    unlockAudio,
    markKeepsake,
  } = useStoryStore();

  // --- Initialize PixiJS engine ---
  useEffect(() => {
    if (!canvasRef.current || initialized) return;
    setInitialized(true);

    const stage = new BeachStage(canvasRef.current);
    stageRef.current = stage;

    stage.init().then(() => {
      const sky = new SkyLayer();
      const ocean = new OceanLayer();
      const sand = new SandLayer();
      skyRef.current = sky;
      sandRef.current = sand;

      stage.stage.addChild(sky);
      stage.stage.addChild(ocean);
      stage.stage.addChild(sand);

      // Initial layout
      const w = window.innerWidth;
      const h = window.innerHeight;
      sky.resize(w, h);
      ocean.resize(w, h);
      sand.resize(w, h);

      // Resize observer
      const ro = new ResizeObserver(() => {
        const nw = window.innerWidth;
        const nh = window.innerHeight;
        sky.resize(nw, nh);
        ocean.resize(nw, nh);
        sand.resize(nw, nh);
        digRef.current?.resize(nw, nh);
      });
      ro.observe(document.documentElement);

      // Check time gate
      const previewToken = new URLSearchParams(window.location.search).get('preview');
      fetchAuthoritativeStatus('/api', previewToken).then((status) => {
        setServerNow(status.serverNow);
        if (status.unlocked) {
          // Slight delay to show the beach before transitioning
          setTimeout(() => setAct('INTRO'), 400);
        }
      });

      audioManager.init();
    });

    return () => {
      stageRef.current?.destroy();
    };
  }, []);

  // --- Act-based scene changes ---
  useEffect(() => {
    if (currentAct === 'INTRO' && skyRef.current && stageRef.current) {
      const w = window.innerWidth;
      skyRef.current.animatePlane('Happy Birthday, Kristine! 🎉', w).then(() => {
        setTimeout(() => setAct('DIGGING'), 500);
      });
    }

    if (currentAct === 'DIGGING' && stageRef.current && !digRef.current) {
      const dig = new DigScene();
      dig.resize(window.innerWidth, window.innerHeight);
      dig.onTreasureFound = (treasure: Treasure) => {
        unearthItem(treasure.id);
      };
      stageRef.current.stage.addChild(dig);
      digRef.current = dig;
    }
  }, [currentAct]);

  // All 4 items dug → auto-advance to BOTTLE
  useEffect(() => {
    if (currentAct === 'DIGGING' && dugItems.length >= 4) {
      setTimeout(() => setAct('BOTTLE'), 1200);
    }
  }, [dugItems, currentAct]);

  // First user tap → unlock Web Audio
  const handleFirstTap = () => {
    audioManager.unlockAudioContext();
    unlockAudio();
    if (currentAct === 'INTRO') {
      audioManager.fadeIn('waves', 2000);
      audioManager.fadeIn('musicBox', 3000);
    }
  };

  const getActiveTreasureData = (): Treasure | null => {
    if (!activeTreasureCard) return null;
    const { TREASURES } = require('./engine/scenes/DigScene');
    return TREASURES?.find?.((t: Treasure) => t.id === activeTreasureCard) ?? null;
  };

  return (
    <div id="app" onClick={handleFirstTap}>
      {/* PixiJS canvas — single WebGL2 context, full-bleed */}
      <canvas id="beach-canvas" ref={canvasRef} />

      {/* HUD Overlay */}
      <div id="ui-overlay">

        {/* Act 0: Countdown sign */}
        {currentAct === 'LOCKED' && (
          <div style={{
            position: 'absolute',
            bottom: '28%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <CountdownSign serverNowMs={serverNow} />
          </div>
        )}

        {/* Act 1: Wake prompt */}
        {currentAct === 'INTRO' && (
          <div
            style={{
              position: 'absolute',
              bottom: '25%',
              left: '50%',
              transform: 'translateX(-50%)',
              textAlign: 'center',
              animation: 'float-up 0.6s ease forwards',
              pointerEvents: 'auto',
            }}
          >
            <div style={{
              background: 'rgba(255,251,245,0.9)',
              border: '3px solid #4A2C1D',
              borderRadius: '50px',
              padding: '0.75rem 2rem',
              fontFamily: 'Fredoka, sans-serif',
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#4A2C1D',
              boxShadow: '4px 4px 0 #4A2C1D',
            }}>
              🌊 Tap to Wake the Beach
            </div>
          </div>
        )}

        {/* Act 2: Treasure card reveal */}
        {currentAct === 'DIGGING' && activeTreasureCard && (() => {
          // Inline treasure data lookup
          const treasures: Treasure[] = [
            { id: 'starfish', emoji: '⭐', label: 'Golden Starfish', message: 'Your warmth lights up every room you walk into, Kristine.' },
            { id: 'octopus', emoji: '🐙', label: 'Little Red Octopus', message: 'You have so many amazing talents — and I love watching every one of them.' },
            { id: 'sailboat', emoji: '⛵', label: 'Tiny Sailboat', message: 'You make every adventure worth having. Here\'s to many more.' },
            { id: 'seashell', emoji: '🐚', label: 'Pink Seashell', message: 'Like the sound of the ocean in this shell — you\'re always with me.' },
          ];
          const t = treasures.find(x => x.id === activeTreasureCard);
          return t ? <TreasureCard treasure={t} onDismiss={dismissTreasureCard} /> : null;
        })()}

        {/* Act 2: Progress hint */}
        {currentAct === 'DIGGING' && !activeTreasureCard && (
          <div style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 1rem)',
            left: 0, right: 0,
            textAlign: 'center',
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '0.9rem',
            color: '#4A2C1D',
            background: 'rgba(255,251,245,0.8)',
            padding: '0.4rem 0',
          }}>
            🏖️ Rub the glowing mounds to find buried treasures! ({dugItems.length}/4)
          </div>
        )}

        {/* Act 3: Polaroid bottle memories */}
        {currentAct === 'BOTTLE' && !showSandbox && (
          <PolaroidStack
            cards={POLAROIDS}
            onAllSeen={() => setTimeout(() => setAct('CAKE'), 800)}
          />
        )}

        {/* Act 4: Cake wish */}
        {currentAct === 'CAKE' && !showSandbox && (
          <div style={{
            position: 'absolute',
            bottom: '15%',
            left: 0, right: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            pointerEvents: 'auto',
          }}>
            <div style={{
              background: 'rgba(255,251,245,0.9)',
              border: '3px solid #4A2C1D',
              borderRadius: '20px',
              padding: '1rem 1.5rem',
              textAlign: 'center',
              maxWidth: '300px',
              fontFamily: 'Fredoka, sans-serif',
              color: '#4A2C1D',
              boxShadow: '4px 4px 0 #4A2C1D',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎂</div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', marginBottom: '0.5rem' }}>Make a Wish!</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                Hold the button to blow out the candles ✨
              </div>
            </div>
            <button
              class="keepsake-btn interactive"
              style={{ background: '#FACC15' }}
              onPointerDown={() => {
                const holdStart = Date.now();
                const checkHold = setInterval(() => {
                  if (Date.now() - holdStart >= 1500) {
                    clearInterval(checkHold);
                    blowOutCandles();
                    audioManager.play('sparkle');
                  }
                }, 100);
                window.addEventListener('pointerup', () => clearInterval(checkHold), { once: true });
              }}
            >
              🌬️ Hold to Blow Out Candles
            </button>
          </div>
        )}

        {/* Act 5: Letter */}
        {currentAct === 'LETTER' && !showSandbox && (
          <BirthdayLetter onComplete={() => setAct('SANDBOX')} />
        )}

        {/* Act 6: Keepsake + Sandbox */}
        {currentAct === 'SANDBOX' && !showSandbox && (
          <KeepsakeExporter
            stageCanvas={canvasRef.current}
            onToggleSandbox={() => setShowSandbox(true)}
          />
        )}

        {/* Sandbox mode: minimal UI */}
        {showSandbox && (
          <div class="sandbox-controls">
            <button class="sandbox-btn interactive" onClick={() => setShowSandbox(false)}>
              ← Back
            </button>
            <button class="sandbox-btn interactive" onClick={() => audioManager.play('musicBox')}>
              🎵 Music
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

render(<App />, document.getElementById('app')!);
