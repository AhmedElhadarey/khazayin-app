/**
 * services/reciterScreenState.ts
 * ------------------------------
 * Pure state selection for the reciters list (/sections/reciter, nodes
 * 2031:6193 / 2102:3187) and a reciter's surah list (/sections/reciter/[id],
 * node 2207:5270). The loaded states are Figma frames. The states below have
 * no frame: they follow constants/layout.ts and the shared state primitives.
 */
import type { AsyncContentProps } from '@/components/khazain/state/AsyncContent';
import type { LoadState, Reciter, Surah } from '@/types/content';

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
  surahs: readonly Surah[];
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

/**
 * First match wins. Data a store still holds outranks its in-flight or failed
 * refresh, so a loaded list never flips back to a skeleton or an error card.
 *
 * 1. Reciter not in data: reciters pending → loading; reciters error → error;
 *    otherwise → notFound (a retry cannot fix a bad id, so it outranks any
 *    surahs failure — design §3.3).
 * 2. Surahs in data (and the store not `empty`) → ready.
 * 3. Surahs pending → loading; error → error; empty → surahsEmpty.
 * 4. Otherwise → ready.
 */
export function reciterDetailState(i: ReciterDetailInput): ReciterDetailState {
  const reciter = i.id ? i.reciters.find((r) => r.id === i.id) : undefined;
  if (!reciter) {
    if (pending(i.recitersStatus)) return { kind: 'loading' };
    if (i.recitersStatus === 'error') return { kind: 'error', error: i.recitersError };
    return { kind: 'notFound' };
  }
  if (i.surahs.length > 0 && i.surahsStatus !== 'empty') return { kind: 'ready', reciter };
  if (pending(i.surahsStatus)) return { kind: 'loading' };
  if (i.surahsStatus === 'error') return { kind: 'error', error: i.surahsError };
  if (i.surahsStatus === 'empty') return { kind: 'surahsEmpty' };
  return { kind: 'ready', reciter };
}

export type ReciterDetailAsyncProps = Pick<AsyncContentProps, 'status' | 'error' | 'emptyMessage'>;

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
