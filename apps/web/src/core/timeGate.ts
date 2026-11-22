/**
 * timeGate.ts — Authoritative Feb 5, 2027 (00:00 UTC+8 / Asia/Manila) gate.
 * Zero birthday copy lives in this Stage 1 module.
 */
import type { BirthdayContent } from '../../../edge-gate/src/content';

/** 2027-02-05T00:00:00+08:00 in Unix epoch milliseconds. */
export const TARGET_DATE_MS = 1801756800000;

const TEST_UNLOCK_PASSWORD = 'tuna';

export function isValidTestPassword(input: string): boolean {
  return input.trim().toLowerCase() === TEST_UNLOCK_PASSWORD;
}

export function isPreviewQueryPresent(search?: string): boolean {
  const query =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
        ? window.location.search
        : '';
  const token = new URLSearchParams(query).get('preview');
  return Boolean(token && token.trim().length > 0);
}

export interface RemainingTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export interface TimeGateStatus {
  unlocked: boolean;
  serverNow: number;
  unlockAt: number;
  remainingMs: number;
  content?: BirthdayContent;
}

export function isUnlocked(nowMs: number): boolean {
  return nowMs >= TARGET_DATE_MS;
}

export function calculateRemainingTime(targetMs: number, nowMs: number): RemainingTime {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalMs: diff };
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function isLocalDevBypassToken(previewToken?: string | null): boolean {
  if (!previewToken) return false;
  const trimmed = previewToken.trim();
  const isDevEnv = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  if (!isLocalhost() && !isDevEnv) return false;
  return trimmed === 'dev' || trimmed === 'dev_preview_token_2027';
}

/**
 * Fetch authoritative unlock state from Cloudflare Worker /api/status.
 * Falls back safely to locked client countdown on network errors unless
 * running locally on localhost/127.0.0.1 (or Vite dev) with ?preview=dev / dev_preview_token_2027.
 */
export async function fetchAuthoritativeStatus(
  apiBase = '/api',
  previewToken?: string | null,
): Promise<TimeGateStatus> {
  const query = previewToken ? `?preview=${encodeURIComponent(previewToken)}` : '';
  const url = `${apiBase}/status${query}`;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) {
      const data = (await res.json()) as TimeGateStatus;
      if (typeof data.unlocked === 'boolean' && typeof data.serverNow === 'number') {
        return data;
      }
    }
  } catch {
    // Worker unreachable (e.g., local Vite dev server without wrangler dev)
  }

  const now = Date.now();
  if (isLocalDevBypassToken(previewToken)) {
    return {
      unlocked: true,
      serverNow: now,
      unlockAt: TARGET_DATE_MS,
      remainingMs: 0,
    };
  }

  return {
    unlocked: false,
    serverNow: now,
    unlockAt: TARGET_DATE_MS,
    remainingMs: Math.max(0, TARGET_DATE_MS - now),
  };
}

/**
 * Unlock the experience with the test password (`tuna`), querying the authoritative
 * Cloudflare Worker when available and falling back locally/offline when unreachable.
 */
export async function unlockWithPassword(
  password: string,
  apiBase = '/api',
): Promise<TimeGateStatus> {
  const normalized = password.trim().toLowerCase();

  try {
    const res = await fetch(`${apiBase}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: normalized }),
      cache: 'no-store',
    });
    if (res.ok) {
      const data = (await res.json()) as TimeGateStatus;
      if (typeof data.unlocked === 'boolean' && typeof data.serverNow === 'number') {
        return data;
      }
    }
  } catch {
    // Worker unreachable (e.g., local Vite dev server or static hosting without Worker)
  }

  const now = Date.now();
  if (isValidTestPassword(normalized)) {
    return {
      unlocked: true,
      serverNow: now,
      unlockAt: TARGET_DATE_MS,
      remainingMs: 0,
    };
  }

  return {
    unlocked: false,
    serverNow: now,
    unlockAt: TARGET_DATE_MS,
    remainingMs: Math.max(0, TARGET_DATE_MS - now),
  };
}
