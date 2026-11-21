import { describe, it, expect } from 'vitest';
import { useStoryStore } from '../src/store/useStoryStore';

describe('End-to-End Story Flow', () => {
  it('should progress through the full story without invalid states', () => {
    const acts = ['LOCKED', 'INTRO', 'DIGGING', 'BOTTLE', 'CAKE', 'LETTER', 'SANDBOX'] as const;
    acts.forEach((act) => {
      useStoryStore.getState().setAct(act);
      expect(useStoryStore.getState().currentAct).toBe(act);
    });
  });
});
