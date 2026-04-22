import { create } from 'zustand';

/**
 * AUDIO INTEGRATION BOUNDARY
 *
 * This store models the UI state of the persistent MiniPlayer. It does NOT
 * actually play audio — every field is UI truth that a future audio engine
 * has to sync with. When wiring a real player:
 *
 *   Candidate libraries:
 *     - `expo-av` (simplest, single-track, usually enough for dua/surah playback)
 *     - `react-native-track-player` (lock-screen controls, background audio, queues)
 *
 *   What the engine must drive on this store:
 *     - On "track changed"  → call `setTrack(track)`
 *     - On play/pause       → keep `isPlaying` in sync; `togglePlay` must reflect
 *                              the real engine state, not just flip a boolean.
 *     - On progress tick    → call `setProgress(played / duration)` every ~1s
 *     - On track ended      → either advance to next or `setTrack(null)`
 *
 *   What the UI calls into the engine (TODO):
 *     - `togglePlay` — currently a local toggle. Replace with `engine.play() / pause()`.
 *     - Seek / skip / queue — not modeled yet; add as needed when the first real
 *       play/pause controls ship.
 *
 *   MiniPlayer visibility:
 *     `isVisible` is controlled entirely from UI (e.g. MushafScreen hides it
 *     on focus). The audio engine should NOT write to it.
 *
 *   Persistence:
 *     Intentionally none. Resume-on-relaunch requires persisting `{ trackId,
 *     progress }` to AsyncStorage and re-hydrating from the engine's native
 *     cache — defer until the engine choice is made.
 */

export type PlayerTrack = {
  id: string;
  title: string;
  reciter: string;
  coverUri?: string;
  durationSec?: number;
};

type PlayerState = {
  track: PlayerTrack | null;
  isPlaying: boolean;
  progress: number; // 0..1
  isVisible: boolean;
  setTrack: (track: PlayerTrack | null) => void;
  togglePlay: () => void;
  setProgress: (p: number) => void;
  setVisible: (v: boolean) => void;
};

// Mock track while real audio engine (Track 7) isn't wired up.
const MOCK_TRACK: PlayerTrack = {
  id: 'mock-fatiha-abdulbasit',
  title: 'سورة الفاتحة',
  reciter: 'الشيخ عبد الباسط عبد الصمد',
};

export const usePlayerStore = create<PlayerState>((set) => ({
  track: MOCK_TRACK,
  isPlaying: false,
  progress: 0.35,
  isVisible: true,
  setTrack: (track) => set({ track }),
  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setProgress: (p) => set({ progress: Math.max(0, Math.min(1, p)) }),
  setVisible: (v) => set({ isVisible: v }),
}));
