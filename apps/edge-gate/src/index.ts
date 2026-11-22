/**
 * Cloudflare Worker edge-gate
 * Authoritative Feb 5, 2027 (00:00 UTC+8 / Asia/Manila) time check.
 */
import { BIRTHDAY_CONTENT, type BirthdayContent } from './content';

export const TARGET_DATE_MS = 1801756800000;

export interface Env {
  PREVIEW_SECRET?: string;
  TEST_PASSWORD?: string;
}

export interface StatusResponse {
  unlocked: boolean;
  serverNow: number;
  unlockAt: number;
  remainingMs: number;
  content?: BirthdayContent;
}

export function handleStatusRequest(
  serverNow: number,
  previewToken?: string | null,
  secret?: string,
  testPassword?: string,
): StatusResponse {
  const isSecretValid = Boolean(previewToken && secret && previewToken === secret);
  const isPasswordValid = Boolean(
    previewToken &&
      testPassword &&
      previewToken.trim().toLowerCase() === testPassword.trim().toLowerCase(),
  );
  const unlocked = serverNow >= TARGET_DATE_MS || isSecretValid || isPasswordValid;
  const remainingMs = Math.max(0, TARGET_DATE_MS - serverNow);

  if (!unlocked) {
    return {
      unlocked: false,
      serverNow,
      unlockAt: TARGET_DATE_MS,
      remainingMs,
    };
  }

  return {
    unlocked: true,
    serverNow,
    unlockAt: TARGET_DATE_MS,
    remainingMs: 0,
    content: BIRTHDAY_CONTENT,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/status') {
      const serverNow = Date.now();
      const secret = env.PREVIEW_SECRET ?? 'dev_preview_token_2027';
      const testPassword = env.TEST_PASSWORD ?? 'tuna';
      let token: string | null = url.searchParams.get('preview');

      if (request.method === 'POST') {
        try {
          const body = (await request.json()) as { password?: unknown } | null;
          token = typeof body?.password === 'string' ? body.password : null;
        } catch {
          token = null;
        }
      }

      const status = handleStatusRequest(serverNow, token, secret, testPassword);
      return Response.json(status, { headers: corsHeaders });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
};
