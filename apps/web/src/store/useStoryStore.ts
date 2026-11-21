/**
 * useStoryStore.ts — Vanilla Zustand store + Preact hook
 * Zero React dependency — 100% Preact-native and ultra-lean (<1 KB)
 */
import { createStore } from 'zustand/vanilla';
import { useSyncExternalStore } from 'preact/compat';

export type StoryAct = 'LOCKED' | 'INTRO' | 'DIGGING' | 'BOTTLE' | 'CAKE' | 'LETTER' | 'SANDBOX';

export type TreasureId = 'starfish' | 'octopus' | 'sailboat' | 'seashell';

export interface StoryState {
  currentAct: StoryAct;
  dugItems: TreasureId[];
  activeTreasureCard: TreasureId | null;
  isNight: boolean;
  candlesOut: boolean;
  audioUnlocked: boolean;
  keepsakeGenerated: boolean;

  // Actions
  setAct: (act: StoryAct) => void;
  unearthItem: (id: TreasureId) => void;
  dismissTreasureCard: () => void;
  setNight: (isNight: boolean) => void;
  blowOutCandles: () => void;
  unlockAudio: () => void;
  markKeepsake: () => void;
  reset: () => void;
}

const initialState = {
  currentAct: 'LOCKED' as StoryAct,
  dugItems: [] as TreasureId[],
  activeTreasureCard: null as TreasureId | null,
  isNight: false,
  candlesOut: false,
  audioUnlocked: false,
  keepsakeGenerated: false,
};

export const storyStore = createStore<StoryState>((set, get) => ({
  ...initialState,

  setAct: (act) => set({ currentAct: act }),

  unearthItem: (id) => {
    const { dugItems } = get();
    if (!dugItems.includes(id)) {
      set({ dugItems: [...dugItems, id], activeTreasureCard: id });
    }
  },

  dismissTreasureCard: () => {
    const { dugItems } = get();
    set({ activeTreasureCard: null });
    if (dugItems.length >= 4) {
      setTimeout(() => set({ currentAct: 'BOTTLE' }), 800);
    }
  },

  setNight: (isNight) => set({ isNight }),

  blowOutCandles: () => {
    set({ candlesOut: true });
    setTimeout(() => set({ currentAct: 'LETTER', isNight: true }), 2500);
  },

  unlockAudio: () => set({ audioUnlocked: true }),

  markKeepsake: () => set({ keepsakeGenerated: true }),

  reset: () => set({ ...initialState }),
}));

/**
 * Preact-compatible hook + static state accessors
 */
export function useStoryStore(): StoryState;
export function useStoryStore<T>(selector: (state: StoryState) => T): T;
export function useStoryStore<T>(selector?: (state: StoryState) => T): T | StoryState {
  return useSyncExternalStore(
    storyStore.subscribe,
    () => selector ? selector(storyStore.getState()) : storyStore.getState()
  );
}

useStoryStore.getState = storyStore.getState;
useStoryStore.setState = storyStore.setState;
useStoryStore.subscribe = storyStore.subscribe;
useStoryStore.getInitialState = storyStore.getInitialState;
