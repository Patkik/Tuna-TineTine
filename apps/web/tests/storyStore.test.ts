import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEBUG_BEAT_ITEMS,
  STORY_BEAT_ORDER,
  storyStore,
} from '../src/store/storyFsm';

describe('Story 16-state finite state machine store', () => {
  beforeEach(() => {
    storyStore.getState().reset();
  });

  it('defines all 16 ordered FSM states covering Beats 0 through 9b', () => {
    expect(STORY_BEAT_ORDER).toHaveLength(16);
    expect(STORY_BEAT_ORDER[0]).toBe('LOCKED_GATE');
    expect(STORY_BEAT_ORDER[15]).toBe('TWILIGHT_KEEPSAKE');
    expect(DEBUG_BEAT_ITEMS).toHaveLength(16);
  });

  it('tracks ticket scratching, swiping, and bottle scroll state cleanly', () => {
    expect(storyStore.getState().currentState).toBe('LOCKED_GATE');

    storyStore.getState().setUnlocked(true, true);
    storyStore.getState().setState('STACKED_SCRATCH');
    storyStore.getState().markTicketScratched('ticket-1');
    storyStore.getState().markTicketSwiped('ticket-1');

    expect(storyStore.getState().scratchedTicketIds).toEqual(['ticket-1']);
    expect(storyStore.getState().swipedTicketIds).toEqual(['ticket-1']);

    storyStore.getState().setBottleScrollOpen(true);
    expect(storyStore.getState().bottleScrollOpen).toBe(true);
  });

  it('supports coherent debug jumps and updates timeOfDay on candle blow-out', () => {
    storyStore.getState().jumpToState('ALL_CARDS_FAN');
    expect(storyStore.getState().currentState).toBe('ALL_CARDS_FAN');
    expect(storyStore.getState().scratchedTicketIds).toHaveLength(4);
    expect(storyStore.getState().swipedTicketIds).toHaveLength(4);
    expect(storyStore.getState().timeOfDay).toBe('day');

    storyStore.getState().blowOutCandles();
    expect(storyStore.getState().candlesBlown).toBe(true);
    expect(storyStore.getState().timeOfDay).toBe('sunset');

    storyStore.getState().jumpToState('TWILIGHT_KEEPSAKE');
    expect(storyStore.getState().candlesBlown).toBe(true);
    expect(storyStore.getState().timeOfDay).toBe('twilight');
  });
});
