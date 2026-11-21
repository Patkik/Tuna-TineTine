import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryStore } from '../src/store/useStoryStore';

describe('Story State Machine', () => {
  beforeEach(() => {
    useStoryStore.getState().reset();
  });

  it('should start in LOCKED state by default', () => {
    expect(useStoryStore.getState().currentAct).toBe('LOCKED');
  });

  it('should transition sequentially through story acts', () => {
    const store = useStoryStore.getState();
    store.setAct('INTRO');
    expect(useStoryStore.getState().currentAct).toBe('INTRO');
    store.setAct('DIGGING');
    expect(useStoryStore.getState().currentAct).toBe('DIGGING');
    store.unearthItem('starfish');
    expect(useStoryStore.getState().dugItems).toContain('starfish');
  });
});
