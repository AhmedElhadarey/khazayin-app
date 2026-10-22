/**
 * Recommendations for a surface (design §7.6). Selectors return stored
 * references only; indexing, signals and ranking happen in memos, never inside
 * a zustand selector. The deps are primitives and stable references.
 */
import { useMemo } from 'react';
import { RECOMMENDATIONS_ENABLED } from '@/constants/recommendations';
import { useNotesStore } from '@/store/notesStore';
import { useRecommendationInputsStore } from '@/store/recommendationInputsStore';
import { useRecommendationsStore } from '@/store/recommendationsStore';
import { useSavedStore } from '@/store/savedStore';
import { indexCatalogue, recommend } from './recommend';
import { toSignals } from './signals';
import type { CatalogueSnapshot, Recommendation } from './types';

const EMPTY_CATALOGUE: CatalogueSnapshot =
  Object.freeze({ scholars: [], lectures: [], books: [] });

export function useRecommendations(limit: number, contextSurah?: number) {
  const saved = useSavedStore((s) => s.items);
  const notes = useNotesStore((s) => s.notes);
  const dismissedRecord = useRecommendationsStore((s) => s.dismissed);
  const activity = useRecommendationInputsStore((s) => s.activity);
  const loaded = useRecommendationInputsStore((s) => s.catalogue);
  const nowMs = useRecommendationInputsStore((s) => s.nowMs);
  const catalogueStatus = useRecommendationInputsStore((s) => s.catalogueStatus);
  // Kill switch (§7.7): an empty catalogue and no signals keep every memo trivial.
  const catalogue = RECOMMENDATIONS_ENABLED && loaded ? loaded : EMPTY_CATALOGUE;
  const index = useMemo(() => indexCatalogue(catalogue), [catalogue]);
  const dismissed = useMemo(() => new Set(Object.keys(dismissedRecord)), [dismissedRecord]);
  const signals = useMemo(
    () => (RECOMMENDATIONS_ENABLED ? toSignals(saved, notes, activity, index) : []),
    [saved, notes, activity, index],
  );
  const items = useMemo<Recommendation[]>(
    () => (RECOMMENDATIONS_ENABLED ? recommend(signals, index, nowMs, dismissed, limit, contextSurah) : []),
    [signals, index, nowMs, dismissed, limit, contextSurah],
  );
  return { items, hasSignals: signals.length > 0, activityResolved: activity !== null, catalogueStatus };
}
