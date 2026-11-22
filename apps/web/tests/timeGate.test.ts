import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  TARGET_DATE_MS,
  isUnlocked,
  isPreviewQueryPresent,
  calculateRemainingTime,
  isValidTestPassword,
  fetchAuthoritativeStatus,
  unlockWithPassword,
} from '../src/core/timeGate';

describe('TimeGate logic (Feb 5, 2027 00:00:00 UTC+8)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sets exact target epoch ms for 2027-02-05T00:00:00+08:00', () => {
    expect(TARGET_DATE_MS).toBe(1801756800000);
    expect(new Date('2027-02-05T00:00:00+08:00').getTime()).toBe(TARGET_DATE_MS);
  });

  it('stays locked before unlock and unlocks on/after unlock', () => {
    expect(isUnlocked(TARGET_DATE_MS - 1)).toBe(false);
    expect(isUnlocked(TARGET_DATE_MS)).toBe(true);
    expect(isUnlocked(TARGET_DATE_MS + 1000)).toBe(true);
  });

  it('detects ?preview=<token> query parameter presence', () => {
    expect(isPreviewQueryPresent('?preview=dev')).toBe(true);
    expect(isPreviewQueryPresent('?foo=1&preview=abc')).toBe(true);
    expect(isPreviewQueryPresent('')).toBe(false);
    expect(isPreviewQueryPresent('?preview=')).toBe(false);
  });

  it('calculates remaining days, hours, minutes, seconds accurately', () => {
    const diffMs = ((2 * 86400) + (3 * 3600) + (14 * 60) + 9) * 1000;
    const parts = calculateRemainingTime(TARGET_DATE_MS, TARGET_DATE_MS - diffMs);
    expect(parts).toEqual({
      days: 2,
      hours: 3,
      minutes: 14,
      seconds: 9,
      totalMs: diffMs,
    });
    expect(calculateRemainingTime(TARGET_DATE_MS, TARGET_DATE_MS + 5000).totalMs).toBe(0);
  });

  it('validates the test unlock password case-insensitively with trimming', () => {
    expect(isValidTestPassword('tuna')).toBe(true);
    expect(isValidTestPassword('Tuna')).toBe(true);
    expect(isValidTestPassword('  TUNA  ')).toBe(true);
    expect(isValidTestPassword('salmon')).toBe(false);
    expect(isValidTestPassword('')).toBe(false);
  });

  it('supports localhost ?preview=dev fallback when Worker is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const res = await fetchAuthoritativeStatus('/api', 'dev');
    expect(res.unlocked).toBe(true);

    const lockedRes = await fetchAuthoritativeStatus('/api', null);
    expect(lockedRes.unlocked).toBe(false);
  });

  it('falls back to local password check when Worker /api/status is unreachable or 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const okRes = await unlockWithPassword('tuna', '/api');
    expect(okRes.unlocked).toBe(true);
    expect(okRes.remainingMs).toBe(0);

    const badRes = await unlockWithPassword('wrong', '/api');
    expect(badRes.unlocked).toBe(false);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }),
    );
    const fallback404 = await unlockWithPassword('Tuna', '/api');
    expect(fallback404.unlocked).toBe(true);
  });

  it('respects authoritative Worker responses for unlockWithPassword', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          unlocked: true,
          serverNow: 1700000000000,
          unlockAt: TARGET_DATE_MS,
          remainingMs: 0,
          content: { bannerMessage: 'Happy Birthday Tine Tine!' },
        }),
      }),
    );

    const granted = await unlockWithPassword('tuna', '/api');
    expect(granted.unlocked).toBe(true);
    expect(granted.content?.bannerMessage).toBe('Happy Birthday Tine Tine!');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          unlocked: false,
          serverNow: 1700000000000,
          unlockAt: TARGET_DATE_MS,
          remainingMs: 1000,
        }),
      }),
    );

    const denied = await unlockWithPassword('tuna', '/api');
    expect(denied.unlocked).toBe(false);
  });
});
