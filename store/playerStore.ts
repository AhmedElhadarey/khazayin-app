import { create } from 'zustand';
import { useProgressStore } from './progressStore';

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
 *   PROGRESS-TRACKING INTEGRATION (added by 001-progress-tracking)
 *     This store now forwards meaningful playback events to `progressStore`
 *     so the SQLite-backed lecture-session row stays in sync with playback.
 *     - `setProgress`     → computes forward-only delta vs prior progress,
 *                            calls `progressStore.noteLectureTick(...)`.
 *     - `togglePlay`      → on transition-to-paused, persists current position
 *                            via `noteLectureTick` (don't wait for next tick —
 *                            user could background the app).
 *     - `setTrack(null)`  → flushes a final tick at progress=1 so the lecture
 *                            session latches `completed=1` when finished.
 *
 *     The forwarding only runs when the track has a `durationSec`; mock
 *     tracks without a duration don't generate progress events.
 *
 *   MiniPlayer visibility:
 *     `isVisible` is controlled entirely from UI (e.g. MushafScreen hides it
 *     on focus). The audio engine should NOT write to it.
 *
 *   Persistence:
 *     Intentionally none for UI state. Position persistence is handled by
 *     `progressStore` → SQLite (see above).
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

function clampProgress(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.max(0, Math.min(1, p));
}

function emitLectureTick(
  track: PlayerTrack,
  newProgress: number,
  prevProgress: number,
): void {
  if (typeof track.durationSec !== 'number' || track.durationSec <= 0) return;
  const newPos = newProgress * track.durationSec;
  const prevPos = prevProgress * track.durationSec;
  const delta = newPos > prevPos ? newPos - prevPos : 0;
  useProgressStore
    .getState()
    .noteLectureTick({
      lectureId: track.id,
      title: track.title,
      author: track.reciter,
      durationSec: track.durationSec,
      positionSec: newPos,
      forwardListenedDelta: delta,
    })
    .catch(() => undefined);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track: MOCK_TRACK,
  isPlaying: false,
  progress: 0.35,
  isVisible: true,
  setTrack: (track) => {
    const prev = get();
    if (track === null && prev.track && typeof prev.track.durationSec === 'number') {
      // Track-ended flush: emit a final tick at the end of the previous track
      // so the session row latches `completed = 1`.
      emitLectureTick(prev.track, 1, prev.progress);
    }
    set({ track, progress: 0 });
  },
  togglePlay: () =>
    set((state) => {
      const next = !state.isPlaying;
      // Transition → paused: persist position immediately. The forward delta
      // since the last tick was already emitted by the player's last
      // `setProgress` call, so we pass 0 here to avoid double-counting.
      if (!next && state.track && typeof state.track.durationSec === 'number') {
        useProgressStore
          .getState()
          .noteLectureTick({
            lectureId: state.track.id,
            title: state.track.title,
            author: state.track.reciter,
            durationSec: state.track.durationSec,
            positionSec: state.progress * state.track.durationSec,
            forwardListenedDelta: 0,
          })
          .catch(() => undefined);
      }
      return { isPlaying: next };
    }),
  setProgress: (p) => {
    const clamped = clampProgress(p);
    set((state) => {
      if (state.track) emitLectureTick(state.track, clamped, state.progress);
      return { progress: clamped };
    });
  },
  setVisible: (v) => set({ isVisible: v }),
}));
