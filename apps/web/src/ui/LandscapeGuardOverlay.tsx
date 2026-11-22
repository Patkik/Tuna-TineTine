/** @jsxImportSource preact */
/**
 * LandscapeGuardOverlay.tsx — Fullscreen warm-cream cel-shaded portrait-to-landscape guard
 * with gently rotating phone illustration and optional fullscreen landscape orientation lock.
 */
import { useEffect, useState } from 'preact/hooks';
import { requestLandscapeFullscreen } from '../core/orientationGuard';

export interface LandscapeGuardOverlayProps {
  visible: boolean;
  onDismiss: () => void;
}

export function LandscapeGuardOverlay({ visible, onDismiss }: LandscapeGuardOverlayProps) {
  const [rotateHint, setRotateHint] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setRotateHint(null);
    }
  }, [visible]);

  if (!visible) return null;

  const handleRequestLandscape = async () => {
    setRotateHint(null);
    const locked = await requestLandscapeFullscreen();
    if (!locked) {
      setRotateHint('Turn your phone sideways to visit the beach! ✨');
    }
  };

  return (
    <aside
      class="landscape-guard-overlay interactive"
      role="status"
      aria-live="polite"
      aria-label="Rotate device to landscape"
    >
      <div class="landscape-prompt">
        <div class="landscape-prompt-header">
          <svg
            class="landscape-phone-icon"
            viewBox="0 0 56 56"
            width="52"
            height="52"
            aria-hidden="true"
          >
            <rect
              x="16"
              y="8"
              width="24"
              height="40"
              rx="5"
              fill="#FFFDF7"
              stroke="#4A2C1D"
              strokeWidth="3.2"
            />
            <rect
              x="20"
              y="13"
              width="16"
              height="26"
              rx="2"
              fill="#7DD3FC"
              stroke="#4A2C1D"
              strokeWidth="2"
            />
            <circle cx="28" cy="43.5" r="2" fill="#4A2C1D" />
            <path
              d="M44 17 A 16 16 0 0 1 46 34 M46 34 L41 32 M46 34 L49 30"
              fill="none"
              stroke="#E87A45"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div class="landscape-prompt-text">
            <h2 class="landscape-prompt-title">Rotate to Landscape</h2>
            <p class="landscape-prompt-copy">
              Turn your phone sideways to visit the beach!
            </p>
          </div>
        </div>

        {rotateHint && <p class="landscape-prompt-hint">{rotateHint}</p>}

        <div class="landscape-prompt-actions">
          <button
            type="button"
            class="beach-btn beach-btn--yellow landscape-btn"
            onClick={() => {
              void handleRequestLandscape();
            }}
          >
            🔄 Enter Landscape
          </button>
          <button
            type="button"
            class="beach-btn beach-btn--cream landscape-btn"
            onClick={onDismiss}
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </aside>
  );
}
