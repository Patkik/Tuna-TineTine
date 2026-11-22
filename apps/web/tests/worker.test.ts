import { describe, it, expect } from 'vitest';
import { handleStatusRequest, TARGET_DATE_MS } from '../../edge-gate/src/index';

describe('Cloudflare Worker Edge Gate', () => {
  it('returns unlocked=false and ZERO protected content before Feb 5, 2027 without valid token', () => {
    const res = handleStatusRequest(TARGET_DATE_MS - 5000, null, 'dev_preview_token_2027');
    expect(res.unlocked).toBe(false);
    expect(res.remainingMs).toBe(5000);
    expect(res.content).toBeUndefined();
  });

  it('returns unlocked=true with complete 10-beat content when preview token matches secret', () => {
    const res = handleStatusRequest(1700000000000, 'dev_preview_token_2027', 'dev_preview_token_2027');
    expect(res.unlocked).toBe(true);
    expect(res.content?.bannerMessage).toBe('Happy Birthday Tine Tine!');
    expect(res.content?.scratchTickets).toHaveLength(4);
    expect(res.content?.bearDialogue.lensIntro).toBe(
      "heyy Tine Tine it's me Josh in a bear form, I have something for you!",
    );
    expect(res.content?.bearDialogue.handsBack).toBe('I have something to give');
  });

  it('returns unlocked=true with verbatim Taglish letter at or after Feb 5, 2027', () => {
    const res = handleStatusRequest(TARGET_DATE_MS, null, 'secret');
    expect(res.unlocked).toBe(true);
    expect(res.remainingMs).toBe(0);
    expect(res.content?.letter.body.startsWith('heyy tinee, just want to say that I appreciate you')).toBe(
      true,
    );
    expect(res.content?.letter.body.endsWith('- Josh : ))')).toBe(true);
    expect(res.content?.letter.body).toContain('11/22/2026');
  });

  it('returns unlocked=true with content when testPassword matches case-insensitively and stays locked otherwise', () => {
    const unlocked = handleStatusRequest(1700000000000, ' Tuna ', 'secret', 'tuna');
    expect(unlocked.unlocked).toBe(true);
    expect(unlocked.content?.scratchTickets).toHaveLength(4);

    const denied = handleStatusRequest(1700000000000, 'salmon', 'secret', 'tuna');
    expect(denied.unlocked).toBe(false);
    expect(denied.content).toBeUndefined();
  });
});
