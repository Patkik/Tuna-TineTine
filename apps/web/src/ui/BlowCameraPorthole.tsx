/** @jsxImportSource preact */
/**
 * BlowCameraPorthole.tsx — Compact circular chocolate-bordered front-camera porthole
 * in the top-right safe area with live radial wind-charge ring.
 */
import type { RefObject } from 'preact';
import type { BlowDetectorStatus } from '../vision/blowMath';

export type BlowCameraStatus = BlowDetectorStatus;

interface BlowCameraPortholeProps {
  videoRef: RefObject<HTMLVideoElement>;
  charge: number;
  intensity: number;
  status: BlowCameraStatus;
  faceDetected: boolean;
}

const RING_RADIUS = 47;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function BlowCameraPorthole({
  videoRef,
  charge,
  intensity,
  status,
  faceDetected,
}: BlowCameraPortholeProps) {
  if (status === 'fallback' || status === 'extinguished') {
    return null;
  }

  const clampedCharge = Math.max(0, Math.min(1, charge));
  const dashOffset = RING_CIRCUMFERENCE * (1 - clampedCharge);
  const ringColor = intensity > 0.45 ? '#F472B6' : '#0EA5E9';
  const badgeText =
    status === 'loading'
      ? '✨ Starting…'
      : faceDetected
        ? intensity > 0.45
          ? '💨 Keep blowing!'
          : '🌬️ Blow!'
        : '👀 Center face';

  return (
    <div class="camera-porthole" aria-live="polite">
      <div class="camera-porthole-frame">
        <svg
          class="camera-porthole-ring"
          viewBox="0 0 104 104"
          aria-hidden="true"
        >
          <circle
            cx="52"
            cy="52"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(243, 229, 171, 0.85)"
            strokeWidth="7"
          />
          <circle
            cx="52"
            cy="52"
            r={RING_RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <video
          ref={videoRef}
          class="camera-porthole-video"
          muted
          playsInline
          autoPlay
          aria-label="Front camera blow detection preview"
        />
      </div>
      <div class="camera-porthole-badge">{badgeText}</div>
    </div>
  );
}
