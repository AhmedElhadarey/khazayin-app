/**
 * The onboarding reciter step lists the reciters with a verified preview file
 * (ONBOARDING_POPULAR_RECITER_IDS) plus the user's current pick — Settings →
 * القارئ keeps the full catalogue. Pure.
 */
import type { Reciter } from '@/types/content';

const FALLBACK_COUNT = 6;

export function selectOnboardingReciters(
  all: readonly Reciter[],
  popularIds: readonly string[],
  selectedId: string,
): Reciter[] {
  const byId = new Map(all.map((r) => [r.id, r]));
  const picked = popularIds.map((id) => byId.get(id)).filter((r): r is Reciter => !!r);
  const base = picked.length > 0 ? picked : all.slice(0, FALLBACK_COUNT);
  const selected = byId.get(selectedId);
  return selected && !base.includes(selected) ? [...base, selected] : base;
}
