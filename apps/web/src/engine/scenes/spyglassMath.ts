/**
 * spyglassMath.ts — Pure optical spyglass math helpers (figure-8 handheld sway,
 * ±45px elastic peek leash, compass tick strip pan translation).
 */

export function computeFigure8Sway(timeSec: number): { x: number; y: number } {
  return {
    x: Math.sin(timeSec * 0.9) * 3,
    y: Math.sin(timeSec * 1.8) * 2,
  };
}

export function clampElasticPeek(
  dx: number,
  dy: number,
  maxRadius = 45,
): { x: number; y: number } {
  const limit = Math.max(1, maxRadius);
  const dist = Math.hypot(dx, dy);
  if (dist <= limit) {
    return { x: dx, y: dy };
  }
  const scale = limit / dist;
  return {
    x: dx * scale,
    y: dy * scale,
  };
}

export function computeCompassOffsetPx(panNormX: number, stripSpanPx = 56): number {
  const clamped = Math.max(-1, Math.min(1, panNormX));
  return -clamped * stripSpanPx;
}
