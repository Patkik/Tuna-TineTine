/**
 * timeGate.ts — Authoritative time-lock engine
 * Never check new Date() alone — always validate against Cloudflare Worker edge time.
 * Target: February 5, 2027, 00:00:00 UTC+8 (Asia/Manila)
 */

/** Feb 5, 2027, 00:00:00 UTC+8 → 1801756800 * 1000ms */
export const TARGET_DATE_MS = 1801756800000;

/** PREVIEW_TOKEN — set via Cloudflare Worker secret, never hardcoded here */
const VALID_PREVIEW_TOKEN = import.meta.env.VITE_PREVIEW_TOKEN ?? '';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export interface TimeStatus {
  unlocked: boolean;
  serverNow: number;
  unlockAt: number;
  remainingMs: number;
}

/**
 * Returns true if the given epoch is at or past the unlock date,
 * OR if a matching preview token is supplied.
 */
export function isUnlocked(serverNowMs: number, previewToken?: string | null): boolean {
  if (previewToken && previewToken === VALID_PREVIEW_TOKEN && VALID_PREVIEW_TOKEN !== '') {
    return true;
  }
  return serverNowMs >= TARGET_DATE_MS;
}

/**
 * Calculates countdown parts from now to the target epoch.
 */
export function calculateRemainingTime(targetMs: number, currentMs: number): CountdownParts {
  const totalMs = Math.max(0, targetMs - currentMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);

  return { days, hours, minutes, seconds, totalMs };
}

/**
 * Fetches authoritative time status from Cloudflare Worker edge.
 * Falls back gracefully to { unlocked: false } on network error.
 */
export async function fetchAuthoritativeStatus(
  apiUrl: string,
  previewToken?: string | null
): Promise<TimeStatus> {
  try {
    const url = new URL(`${apiUrl}/api/status`);
    if (previewToken) url.searchParams.set('preview', previewToken);

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as TimeStatus;
  } catch {
    // Network unavailable — conservative: stay locked, use client countdown only
    const clientNow = Date.now();
    return {
      unlocked: false,
      serverNow: clientNow,
      unlockAt: TARGET_DATE_MS,
      remainingMs: Math.max(0, TARGET_DATE_MS - clientNow),
    };
  }
}
