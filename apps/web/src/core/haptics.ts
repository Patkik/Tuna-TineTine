/**
 * haptics.ts — Safe Android navigator.vibrate wrapper
 * Silently no-ops on devices without haptics support.
 */

/** Trigger a short haptic tap. Safe to call on any device. */
export function triggerHaptic(durationMs: number = 12): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(durationMs);
  } catch {
    // Some browsers throw in strict contexts — silently ignore
  }
}

/** Multi-pulse pattern for treasure unearthing */
export function triggerTreasureHaptic(): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    // Three quick taps
    navigator.vibrate([20, 60, 20, 60, 40]);
  } catch {
    /* silent */
  }
}

/** Long rumble for candle extinguish */
export function triggerExtinguishHaptic(): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate([80, 40, 80]);
  } catch {
    /* silent */
  }
}
