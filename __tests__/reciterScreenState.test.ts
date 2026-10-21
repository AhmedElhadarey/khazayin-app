import fs from 'fs';
import path from 'path';
import { RECITERS } from '@/data/content/quran';
import {
  RECITER_STATE_COPY,
  reciterDetailAsyncProps,
  reciterDetailState,
  reciterListView,
  retryTargets,
  type ReciterDetailInput,
} from '@/services/reciterScreenState';
import type { Reciter } from '@/types/content';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;
const r1 = RECITERS.find((r) => r.id === 'r1')!;

describe('RECITER_STATE_COPY', () => {
  it.each(Object.entries(RECITER_STATE_COPY))('%s is Arabic-only', (_k, v) => {
    expect(v).toMatch(ARABIC);
    expect(v).not.toMatch(LATIN);
  });
  it('keeps the not-found copy the screen already shipped', () => {
    expect(RECITER_STATE_COPY.notFound).toBe('لم يتم العثور على هذا القارئ');
  });
});

describe('reciterListView (audit gap 2)', () => {
  it.each(['idle', 'loading', 'empty', 'error'] as const)('%s → async (AsyncContent owns it)', (s) => {
    expect(reciterListView(s, RECITERS, 'tajweed')).toEqual({ kind: 'async' });
  });
  it('success with reciters in the tab → list filtered to that tab', () => {
    const v = reciterListView('success', RECITERS, 'murattal');
    expect(v.kind).toBe('list');
    const list = (v as { reciters: Reciter[] }).reciters;
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((r) => r.style === 'murattal')).toBe(true);
  });
  it('success but the active tab is empty → tabEmpty, not a blank list', () => {
    const onlyTajweed = RECITERS.filter((r) => r.style === 'tajweed');
    expect(reciterListView('success', onlyTajweed, 'muallam')).toEqual({ kind: 'tabEmpty' });
  });
});

const base: ReciterDetailInput = {
  id: 'r1', reciters: RECITERS, recitersStatus: 'success', recitersError: null,
  surahsStatus: 'success', surahsError: null,
};

describe('reciterDetailState (audit gap 1)', () => {
  it.each(['idle', 'loading'] as const)('reciters %s → loading, never notFound', (s) => {
    expect(reciterDetailState({ ...base, reciters: [], recitersStatus: s })).toEqual({ kind: 'loading' });
  });
  it('reciters error → error carrying that error', () => {
    const e = new Error('x');
    expect(reciterDetailState({ ...base, reciters: [], recitersStatus: 'error', recitersError: e }))
      .toEqual({ kind: 'error', error: e });
  });
  it('unknown id once reciters loaded → notFound', () => {
    expect(reciterDetailState({ ...base, id: 'nope' })).toEqual({ kind: 'notFound' });
  });
  it('missing id → notFound', () => {
    expect(reciterDetailState({ ...base, id: undefined })).toEqual({ kind: 'notFound' });
  });
  it('reciters store empty → notFound', () => {
    expect(reciterDetailState({ ...base, reciters: [], recitersStatus: 'empty' })).toEqual({ kind: 'notFound' });
  });
  it('notFound wins over a surahs failure (retry cannot fix a bad id)', () => {
    expect(reciterDetailState({ ...base, id: 'nope', surahsStatus: 'error', surahsError: new Error('s') }))
      .toEqual({ kind: 'notFound' });
  });
  it.each(['idle', 'loading'] as const)('surahs %s → loading', (s) => {
    expect(reciterDetailState({ ...base, surahsStatus: s })).toEqual({ kind: 'loading' });
  });
  it('surahs error → error carrying the surahs error', () => {
    const e = new Error('s');
    expect(reciterDetailState({ ...base, surahsStatus: 'error', surahsError: e })).toEqual({ kind: 'error', error: e });
  });
  it('surahs empty → surahsEmpty', () => {
    expect(reciterDetailState({ ...base, surahsStatus: 'empty' })).toEqual({ kind: 'surahsEmpty' });
  });
  it('all loaded → ready with the reciter', () => {
    expect(reciterDetailState(base)).toEqual({ kind: 'ready', reciter: r1 });
  });
});

describe('reciterDetailAsyncProps', () => {
  it('maps every non-ready state onto AsyncContent props', () => {
    const e = new Error('x');
    expect(reciterDetailAsyncProps({ kind: 'loading' })).toEqual({ status: 'loading' });
    expect(reciterDetailAsyncProps({ kind: 'error', error: e })).toEqual({ status: 'error', error: e });
    expect(reciterDetailAsyncProps({ kind: 'notFound' }))
      .toEqual({ status: 'empty', emptyMessage: RECITER_STATE_COPY.notFound });
    expect(reciterDetailAsyncProps({ kind: 'surahsEmpty' }))
      .toEqual({ status: 'empty', emptyMessage: RECITER_STATE_COPY.surahsEmpty });
  });
});

describe('retryTargets', () => {
  it('refreshes every failed store and only those', () => {
    expect(retryTargets('error', 'error')).toEqual(['reciters', 'surahs']);
    expect(retryTargets('error', 'success')).toEqual(['reciters']);
    expect(retryTargets('success', 'error')).toEqual(['surahs']);
    expect(retryTargets('success', 'loading')).toEqual([]);
  });
});

const readApp = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('reciter.tsx wiring (nodes 2031:6193 / 2102:3187)', () => {
  const src = readApp('app/(tabs)/sections/reciter.tsx');
  it('selects its body through reciterListView', () => {
    expect(src).toContain('reciterListView(status, data, active)');
    expect(src).not.toMatch(/data\.filter\(\(r\) => r\.style === active\)/);
  });
  it('renders the per-tab Arabic empty state', () => {
    expect(src).toContain('RECITER_STATE_COPY.tabEmpty');
    expect(src).toContain('RECITER_STATE_COPY.listEmpty');
  });
  it('keeps the loaded FlatList geometry untouched', () => {
    expect(src).toContain('contentContainerStyle={[styles.listContent, { paddingBottom: 24 }]}');
  });
});
