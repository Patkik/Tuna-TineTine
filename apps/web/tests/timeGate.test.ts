import { describe, it, expect } from 'vitest';
import { calculateRemainingTime, isUnlocked, TARGET_DATE_MS } from '../src/core/timeGate';

describe('Time Gate Engine', () => {
  it('should lock when server time is before February 5, 2027 00:00:00 UTC+8', () => {
    const beforeLock = TARGET_DATE_MS - 5000000;
    expect(isUnlocked(beforeLock)).toBe(false);
  });

  it('should unlock when server time equals or exceeds February 5, 2027 00:00:00 UTC+8', () => {
    const atLock = TARGET_DATE_MS;
    const afterLock = TARGET_DATE_MS + 1000;
    expect(isUnlocked(atLock)).toBe(true);
    expect(isUnlocked(afterLock)).toBe(true);
  });

  it('should accurately compute countdown days, hours, minutes, seconds', () => {
    const now = TARGET_DATE_MS - (2 * 86400000 + 3 * 3600000 + 4 * 60000 + 5 * 1000);
    const countdown = calculateRemainingTime(TARGET_DATE_MS, now);
    expect(countdown.days).toBe(2);
    expect(countdown.hours).toBe(3);
    expect(countdown.minutes).toBe(4);
    expect(countdown.seconds).toBe(5);
  });
});
