/**
 * haptics.ts — Safe Android navigator.vibrate feedback wrappers.
 */

export function triggerHaptic(pattern: number | number[] = 12): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore permission or platform restrictions
    }
  }
}

export function triggerTreasureHaptic(): void {
  triggerHaptic([15, 35, 25]);
}

export function triggerExtinguishHaptic(): void {
  triggerHaptic([20, 40, 60]);
}
