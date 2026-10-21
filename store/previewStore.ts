/**
 * Reciter-preview UI state (onboarding). Driven ONLY by services/audioEngine.ts,
 * one-directionally, like playerStore. Not persisted. A preview never writes
 * playerStore — queue ownership lives in the engine (`_queueOwner`).
 */
import { create } from 'zustand';

export type PreviewStatus = 'idle' | 'loading' | 'playing';

export type PreviewState = {
  reciterId: string | null;
  status: PreviewStatus;
  begin: (reciterId: string) => void;
  markPlaying: (reciterId: string) => void;
  clear: () => void;
};

export const usePreviewStore = create<PreviewState>((set, get) => ({
  reciterId: null,
  status: 'idle',
  begin: (reciterId) => set({ reciterId, status: 'loading' }),
  markPlaying: (reciterId) => {
    if (get().reciterId === reciterId) set({ status: 'playing' });
  },
  clear: () => set({ reciterId: null, status: 'idle' }),
}));
