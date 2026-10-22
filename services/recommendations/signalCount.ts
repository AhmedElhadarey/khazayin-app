/**
 * Signals as they stand now, read at call time (design §7.4). The catalogue is
 * not loaded yet, so they resolve against an empty index and the count may run
 * high; only whether any signal exists matters (the gate is `signalCount > 0`).
 * One source for its two callers: the Home screen and the Mushaf screen.
 */
import { useNotesStore } from '@/store/notesStore';
import { useRecommendationInputsStore } from '@/store/recommendationInputsStore';
import { useSavedStore } from '@/store/savedStore';
import { indexCatalogue } from './recommend';
import { toSignals } from './signals';

const EMPTY_INDEX = indexCatalogue({ scholars: [], lectures: [], books: [] });

export function signalCountNow(): number {
  return toSignals(
    useSavedStore.getState().items,
    useNotesStore.getState().notes,
    useRecommendationInputsStore.getState().activity,
    EMPTY_INDEX,
  ).length;
}
