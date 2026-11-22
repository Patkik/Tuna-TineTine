/**
 * storyFsm.ts — Strict 16-state Zustand finite state machine orchestrating all 10 beats
 * (Beats 0 through 9) with clean preview state-jump support and Preact bridge.
 */
import { createStore } from 'zustand/vanilla';
import { useSyncExternalStore } from 'preact/compat';
import type { BirthdayContent } from '../../../edge-gate/src/content';

export type StoryStateId =
  | 'LOCKED_GATE'
  | 'SKY_CUE'
  | 'PLANE_3_PASS'
  | 'WIND_INTRO'
  | 'STACKED_SCRATCH'
  | 'ALL_CARDS_FAN'
  | 'BLOW_AWAY'
  | 'SCOPE_DRIFT'
  | 'BOTTLE_OPEN_CLOSE'
  | 'BEAR_LENS_PEEK'
  | 'BEAR_CHAT_INTRO'
  | 'BEAR_HANDS_BACK'
  | 'BEAR_CAKE_REVEAL'
  | 'LANDSCAPE_SPLIT_LETTER'
  | 'CAKE_BLOW_FINALE'
  | 'TWILIGHT_KEEPSAKE';

export type TimeOfDay = 'day' | 'sunset' | 'twilight';

export const STORY_BEAT_ORDER: readonly StoryStateId[] = [
  'LOCKED_GATE',
  'SKY_CUE',
  'PLANE_3_PASS',
  'WIND_INTRO',
  'STACKED_SCRATCH',
  'ALL_CARDS_FAN',
  'BLOW_AWAY',
  'SCOPE_DRIFT',
  'BOTTLE_OPEN_CLOSE',
  'BEAR_LENS_PEEK',
  'BEAR_CHAT_INTRO',
  'BEAR_HANDS_BACK',
  'BEAR_CAKE_REVEAL',
  'LANDSCAPE_SPLIT_LETTER',
  'CAKE_BLOW_FINALE',
  'TWILIGHT_KEEPSAKE',
];

export interface DebugBeatItem {
  beat: string;
  label: string;
  state: StoryStateId;
}

export const DEBUG_BEAT_ITEMS: readonly DebugBeatItem[] = [
  { beat: '0', label: 'Gate', state: 'LOCKED_GATE' },
  { beat: '1a', label: 'Sky Cue', state: 'SKY_CUE' },
  { beat: '1b', label: 'Plane 3x', state: 'PLANE_3_PASS' },
  { beat: '2a', label: 'Wind', state: 'WIND_INTRO' },
  { beat: '2b', label: 'Scratch', state: 'STACKED_SCRATCH' },
  { beat: '3a', label: 'Fan 4', state: 'ALL_CARDS_FAN' },
  { beat: '3b', label: 'Blow Cards', state: 'BLOW_AWAY' },
  { beat: '4a', label: 'Scope Drift', state: 'SCOPE_DRIFT' },
  { beat: '4b', label: 'Bottle', state: 'BOTTLE_OPEN_CLOSE' },
  { beat: '5a', label: 'Lens Peek', state: 'BEAR_LENS_PEEK' },
  { beat: '5b', label: 'Bear Chat', state: 'BEAR_CHAT_INTRO' },
  { beat: '6', label: 'Hands Back', state: 'BEAR_HANDS_BACK' },
  { beat: '7', label: 'Cake Reveal', state: 'BEAR_CAKE_REVEAL' },
  { beat: '8', label: 'Letter', state: 'LANDSCAPE_SPLIT_LETTER' },
  { beat: '9a', label: 'Blow Cake', state: 'CAKE_BLOW_FINALE' },
  { beat: '9b', label: 'Keepsake', state: 'TWILIGHT_KEEPSAKE' },
];

export interface StoryState {
  currentState: StoryStateId;
  unlocked: boolean;
  previewMode: boolean;
  audioUnlocked: boolean;
  muted: boolean;
  scratchedTicketIds: string[];
  swipedTicketIds: string[];
  bottleScrollOpen: boolean;
  candlesBlown: boolean;
  timeOfDay: TimeOfDay;
  sandboxPlay: boolean;
  keepsakeSaved: boolean;
  unlockedContent: BirthdayContent | null;

  setState: (state: StoryStateId) => void;
  setUnlocked: (unlocked: boolean, previewMode?: boolean) => void;
  jumpToState: (state: StoryStateId) => void;
  unlockAudio: () => void;
  toggleMute: () => void;
  markTicketScratched: (id: string) => void;
  markTicketSwiped: (id: string) => void;
  setBottleScrollOpen: (open: boolean) => void;
  blowOutCandles: () => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  setSandboxPlay: (playing: boolean) => void;
  markKeepsakeSaved: () => void;
  setUnlockedContent: (content: BirthdayContent) => void;
  reset: () => void;
}

export const storyStore = createStore<StoryState>((set) => ({
  currentState: 'LOCKED_GATE',
  unlocked: false,
  previewMode: false,
  audioUnlocked: false,
  muted: false,
  scratchedTicketIds: [],
  swipedTicketIds: [],
  bottleScrollOpen: false,
  candlesBlown: false,
  timeOfDay: 'day',
  sandboxPlay: false,
  keepsakeSaved: false,
  unlockedContent: null,

  setState: (currentState) => set({ currentState }),
  setUnlocked: (unlocked, previewMode) =>
    set((s) => ({
      unlocked,
      previewMode: previewMode ?? s.previewMode,
    })),
  jumpToState: (target) =>
    set((s) => {
      const allIds = s.unlockedContent?.scratchTickets.map((t) => t.id) ?? [
        'ticket-1',
        'ticket-2',
        'ticket-3',
        'ticket-4',
      ];
      const idx = STORY_BEAT_ORDER.indexOf(target);
      const fanOrLater = idx >= STORY_BEAT_ORDER.indexOf('ALL_CARDS_FAN');
      const isTwilight = target === 'TWILIGHT_KEEPSAKE';

      return {
        currentState: target,
        unlocked: target === 'LOCKED_GATE' ? s.unlocked : true,
        scratchedTicketIds: fanOrLater ? allIds : [],
        swipedTicketIds: fanOrLater ? allIds : [],
        bottleScrollOpen: false,
        candlesBlown: isTwilight,
        timeOfDay: isTwilight ? 'twilight' : 'day',
        sandboxPlay: false,
      };
    }),
  unlockAudio: () => set({ audioUnlocked: true }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  markTicketScratched: (id) =>
    set((s) => ({
      scratchedTicketIds: s.scratchedTicketIds.includes(id)
        ? s.scratchedTicketIds
        : [...s.scratchedTicketIds, id],
    })),
  markTicketSwiped: (id) =>
    set((s) => ({
      swipedTicketIds: s.swipedTicketIds.includes(id)
        ? s.swipedTicketIds
        : [...s.swipedTicketIds, id],
    })),
  setBottleScrollOpen: (bottleScrollOpen) => set({ bottleScrollOpen }),
  blowOutCandles: () => set({ candlesBlown: true, timeOfDay: 'sunset' }),
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setSandboxPlay: (sandboxPlay) => set({ sandboxPlay }),
  markKeepsakeSaved: () => set({ keepsakeSaved: true }),
  setUnlockedContent: (unlockedContent) => set({ unlockedContent }),
  reset: () =>
    set({
      currentState: 'LOCKED_GATE',
      unlocked: false,
      previewMode: false,
      audioUnlocked: false,
      muted: false,
      scratchedTicketIds: [],
      swipedTicketIds: [],
      bottleScrollOpen: false,
      candlesBlown: false,
      timeOfDay: 'day',
      sandboxPlay: false,
      keepsakeSaved: false,
      unlockedContent: null,
    }),
}));

export function useStoryStore<T = StoryState>(
  selector?: (state: StoryState) => T,
): T {
  const select = selector ?? ((s: StoryState) => s as unknown as T);
  return useSyncExternalStore(
    storyStore.subscribe,
    () => select(storyStore.getState()),
  );
}
