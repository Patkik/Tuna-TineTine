/**
 * Cloudflare Worker edge-gate
 * Authoritative Feb 5, 2027 time check
 */

export const TARGET_DATE_MS = 1801756800000;

export interface Env {
  PREVIEW_SECRET?: string;
}

export function handleStatusRequest(serverNow: number, previewToken?: string | null, secret?: string) {
  const isTokenValid = Boolean(previewToken && secret && previewToken === secret);
  const unlocked = serverNow >= TARGET_DATE_MS || isTokenValid;
  const remainingMs = Math.max(0, TARGET_DATE_MS - serverNow);

  return {
    unlocked,
    serverNow,
    unlockAt: TARGET_DATE_MS,
    remainingMs,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === '/api/status') {
      const serverNow = Date.now();
      const preview = url.searchParams.get('preview');
      const status = handleStatusRequest(serverNow, preview, env.PREVIEW_SECRET ?? 'dev_preview_token_2027');
      return Response.json(status, { headers: corsHeaders });
    }

    return new Response('Not found', { status: 404 });
  },
};
