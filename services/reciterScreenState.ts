/**
 * services/reciterScreenState.ts
 * ------------------------------
 * Pure state selection for the reciters list (/sections/reciter, nodes
 * 2031:6193 / 2102:3187) and a reciter's surah list (/sections/reciter/[id],
 * node 2207:5270). The loaded states are Figma frames. The states below have
 * no frame: they follow constants/layout.ts and the shared state primitives.
 */
import type { LoadState, Reciter } from '@/types/content';

export const RECITER_STATE_COPY = Object.freeze({
  /** The store holds no reciters at all. */
  listEmpty: 'لا يوجد قراء حالياً',
  /** Reciters loaded, but none in the active tab. */
  tabEmpty: 'لا يوجد قراء في هذا التصنيف',
  /** The route's id matches no reciter. */
  notFound: 'لم يتم العثور على هذا القارئ',
  /** The reciter exists but there are no surahs to list. */
  surahsEmpty: 'لا توجد سور متاحة لهذا القارئ',
});

export type ReciterListView =
  | { kind: 'async' }
  | { kind: 'tabEmpty' }
  | { kind: 'list'; reciters: Reciter[] };

/** The store's `empty` is computed on the whole dataset; a tab can still be empty. */
export function reciterListView(
  status: LoadState,
  data: readonly Reciter[],
  tab: string,
): ReciterListView {
  if (status !== 'success') return { kind: 'async' };
  const reciters = data.filter((r) => r.style === tab);
  return reciters.length === 0 ? { kind: 'tabEmpty' } : { kind: 'list', reciters };
}

export type ReciterDetailInput = {
  id: string | undefined;
  reciters: readonly Reciter[];
  recitersStatus: LoadState;
  recitersError: Error | null;
  surahsStatus: LoadState;
  surahsError: Error | null;
};

export type ReciterDetailState =
  | { kind: 'loading' }
  | { kind: 'error'; error: Error | null }
  | { kind: 'notFound' }
  | { kind: 'surahsEmpty' }
  | { kind: 'ready'; reciter: Reciter };

const pending = (s: LoadState) => s === 'idle' || s === 'loading';

/** First match wins. See design §3.3 for why notFound outranks a surahs error. */
export function reciterDetailState(i: ReciterDetailInput): ReciterDetailState {
  if (pending(i.recitersStatus)) return { kind: 'loading' };
  if (i.recitersStatus === 'error') return { kind: 'error', error: i.recitersError };
  const reciter = i.id ? i.reciters.find((r) => r.id === i.id) : undefined;
  if (!reciter) return { kind: 'notFound' };
  if (pending(i.surahsStatus)) return { kind: 'loading' };
  if (i.surahsStatus === 'error') return { kind: 'error', error: i.surahsError };
  if (i.surahsStatus === 'empty') return { kind: 'surahsEmpty' };
  return { kind: 'ready', reciter };
}

export type ReciterDetailAsyncProps = {
  status: LoadState;
  error?: Error | null;
  emptyMessage?: string;
};

export function reciterDetailAsyncProps(
  state: Exclude<ReciterDetailState, { kind: 'ready' }>,
): ReciterDetailAsyncProps {
  switch (state.kind) {
    case 'loading':
      return { status: 'loading' };
    case 'error':
      return { status: 'error', error: state.error };
    case 'notFound':
      return { status: 'empty', emptyMessage: RECITER_STATE_COPY.notFound };
    case 'surahsEmpty':
      return { status: 'empty', emptyMessage: RECITER_STATE_COPY.surahsEmpty };
  }
}

export type ReciterDetailSource = 'reciters' | 'surahs';

/** One retry tap refreshes every failed store, and nothing that succeeded. */
export function retryTargets(
  recitersStatus: LoadState,
  surahsStatus: LoadState,
): ReciterDetailSource[] {
  const out: ReciterDetailSource[] = [];
  if (recitersStatus === 'error') out.push('reciters');
  if (surahsStatus === 'error') out.push('surahs');
  return out;
}
