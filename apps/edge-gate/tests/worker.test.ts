import { describe, it, expect } from 'vitest';
import { handleStatusRequest } from '../src/index';

describe('Edge Gate Worker API', () => {
  it('should return unlocked=false before Feb 5, 2027 without preview token', () => {
    const res = handleStatusRequest(1700000000000, null, 'dev_preview_token_2027');
    expect(res.unlocked).toBe(false);
  });

  it('should return unlocked=true if valid preview token is provided', () => {
    const res = handleStatusRequest(1700000000000, 'dev_preview_token_2027', 'dev_preview_token_2027');
    expect(res.unlocked).toBe(true);
  });

  it('should return unlocked=true at or after Feb 5, 2027 regardless of preview token', () => {
    const res = handleStatusRequest(1801756800000, null);
    expect(res.unlocked).toBe(true);
  });
});
