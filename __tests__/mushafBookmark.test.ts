jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo } from 'react-native';
import { useMushafBookmarkStore, coerceBookmark } from '@/store/mushafBookmarkStore';
import { useToastStore } from '@/store/toastStore';
import {
  BOOKMARK_COPY,
  bookmarkJumpAnnouncement,
  bookmarkTarget,
  readingPosition,
  saveMushafBookmark,
} from '@/services/mushafBookmark';
import { ayahMarker } from '@/services/mushafNavigation';

const ay = (number: number, text: string) => ({ surahId: '002', number, text });

describe('coerceBookmark', () => {
  const good = { surahId: '002', ayah: 255, page: 42, savedAt: 1000 };

  it('keeps a good record and is idempotent', () => {
    expect(coerceBookmark(good)).toEqual(good);
    expect(coerceBookmark(coerceBookmark(good))).toEqual(good);
  });

  it('normalises a bare surah number and keeps keys a newer build added', () => {
    expect(coerceBookmark({ ...good, surahId: '2', label: 'x' })).toEqual({ ...good, label: 'x' });
  });

  it('never throws and returns null for anything unusable', () => {
    for (const bad of [null, undefined, 5, 'x', [], {}, { ...good, surahId: '115' }, { ...good, ayah: 0 }, { ...good, ayah: 1.5 }, { ...good, page: 605 }]) {
      expect(coerceBookmark(bad)).toBeNull();
    }
  });

  it('defaults a missing savedAt to 0', () => {
    expect(coerceBookmark({ surahId: '002', ayah: 1, page: 2 })?.savedAt).toBe(0);
  });
});

describe('mushafBookmarkStore', () => {
  beforeEach(() => {
    useMushafBookmarkStore.setState({ bookmark: null });
    useToastStore.setState({ current: null });
    jest.restoreAllMocks();
  });

  it('persists under @khazain/mushaf-bookmark, declaring no version or migrate', async () => {
    useMushafBookmarkStore.getState().setBookmark({ surahId: '002', ayah: 5, page: 2, savedAt: 9 });
    await new Promise((r) => setTimeout(r, 0));
    const raw = await AsyncStorage.getItem('@khazain/mushaf-bookmark');
    expect(raw).toBeTruthy();
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../store/mushafBookmarkStore.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/^\s*(version|migrate)\s*[:(]/m);
    expect(JSON.parse(raw as string).state.bookmark.ayah).toBe(5);
  });

  it('saveMushafBookmark stores, toasts and announces', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    (AccessibilityInfo as any).announceForAccessibilityWithOptions = undefined;
    saveMushafBookmark({ surahId: '002', ayah: 255, page: 42 }, 123);
    expect(useMushafBookmarkStore.getState().bookmark).toEqual({ surahId: '002', ayah: 255, page: 42, savedAt: 123 });
    expect(useToastStore.getState().current?.message).toBe(BOOKMARK_COPY.saved);
    expect(announce).toHaveBeenCalledWith(BOOKMARK_COPY.saved);
  });

  it('undo restores the previous bookmark, or clears when there was none', () => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    saveMushafBookmark({ surahId: '002', ayah: 1, page: 2 }, 1);
    saveMushafBookmark({ surahId: '003', ayah: 9, page: 50 }, 2);
    useToastStore.getState().current?.action?.onPress();
    expect(useMushafBookmarkStore.getState().bookmark?.surahId).toBe('002');
    useToastStore.getState().show({ message: '' });
    // First save's undo clears.
    useMushafBookmarkStore.setState({ bookmark: null });
    saveMushafBookmark({ surahId: '004', ayah: 3, page: 77 }, 3);
    useToastStore.getState().current?.action?.onPress();
    expect(useMushafBookmarkStore.getState().bookmark).toBeNull();
  });
});

describe('mushafBookmarkStore hydration', () => {
  const KEY = '@khazain/mushaf-bookmark';
  const writeRaw = async (value: unknown) => {
    // Let the write the setState above queued land first, so it cannot
    // overwrite the record under test.
    await new Promise((r) => setTimeout(r, 0));
    await AsyncStorage.setItem(KEY, JSON.stringify(value));
  };

  beforeEach(async () => {
    useMushafBookmarkStore.setState({ bookmark: null });
    await new Promise((r) => setTimeout(r, 0));
    await AsyncStorage.clear();
  });

  it('normalises a bare surahId and keeps keys a newer build added', async () => {
    await writeRaw({
      state: { bookmark: { surahId: 2, ayah: 255, page: 42, savedAt: 5, label: 'x' } },
      version: 0,
    });
    await useMushafBookmarkStore.persist.rehydrate();
    expect(useMushafBookmarkStore.getState().bookmark).toEqual({
      surahId: '002',
      ayah: 255,
      page: 42,
      savedAt: 5,
      label: 'x',
    });
  });

  it('drops a corrupt record (page 605) to null without throwing', async () => {
    await writeRaw({ state: { bookmark: { surahId: '002', ayah: 1, page: 605, savedAt: 5 } }, version: 0 });
    await expect(useMushafBookmarkStore.persist.rehydrate()).resolves.toBeUndefined();
    expect(useMushafBookmarkStore.getState().bookmark).toBeNull();
  });

  it('leaves in-memory state alone for a non-object payload', async () => {
    const live = { surahId: '003', ayah: 9, page: 50, savedAt: 7 };
    for (const payload of [5, 'x', [1, 2], { state: 'x', version: 0 }, { state: [1], version: 0 }]) {
      useMushafBookmarkStore.setState({ bookmark: live });
      await writeRaw(payload);
      await useMushafBookmarkStore.persist.rehydrate();
      expect(useMushafBookmarkStore.getState().bookmark).toEqual(live);
    }
  });

  it('keeps whichever bookmark was saved later: memory over an older record', async () => {
    const live = { surahId: '003', ayah: 9, page: 50, savedAt: 200 };
    useMushafBookmarkStore.setState({ bookmark: live });
    await writeRaw({ state: { bookmark: { surahId: '002', ayah: 1, page: 2, savedAt: 100 } }, version: 0 });
    await useMushafBookmarkStore.persist.rehydrate();
    expect(useMushafBookmarkStore.getState().bookmark).toEqual(live);
  });

  it('keeps whichever bookmark was saved later: a newer record over memory', async () => {
    useMushafBookmarkStore.setState({ bookmark: { surahId: '003', ayah: 9, page: 50, savedAt: 100 } });
    const stored = { surahId: '002', ayah: 1, page: 2, savedAt: 200 };
    await writeRaw({ state: { bookmark: stored }, version: 0 });
    await useMushafBookmarkStore.persist.rehydrate();
    expect(useMushafBookmarkStore.getState().bookmark).toEqual(stored);
  });

  it('keeps the in-memory bookmark when the record has none or a corrupt one', async () => {
    const live = { surahId: '003', ayah: 9, page: 50, savedAt: 1 };
    for (const bookmark of [null, { surahId: '002', ayah: 1, page: 605, savedAt: 9 }]) {
      useMushafBookmarkStore.setState({ bookmark: live });
      await writeRaw({ state: { bookmark }, version: 0 });
      await useMushafBookmarkStore.persist.rehydrate();
      expect(useMushafBookmarkStore.getState().bookmark).toEqual(live);
    }
  });
});

describe('bookmark copy', () => {
  it('explains a disabled Go to bookmark', () => {
    expect(BOOKMARK_COPY.noBookmark).toBe('لا توجد علامة محفوظة');
  });

  it('announces the ayah a same-surah jump lands on, in Arabic-Indic digits', () => {
    expect(bookmarkJumpAnnouncement(255)).toBe('الآية ٢٥٥');
  });
});

describe('shared helpers', () => {
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '../services/mushafBookmark.ts'),
    'utf8',
  );
  it('reuses the navigation module length and tolerance instead of its own copies', () => {
    expect(src).not.toMatch(/const LINE_LENGTH_TOLERANCE/);
    expect(src).toMatch(/LINE_LENGTH_TOLERANCE/);
    expect(src).toMatch(/segmentCharLength\(segment\.ayat\)/);
  });
  it('documents ayahAtOffset as the span that contains the offset', () => {
    expect(src).toMatch(/The ayah whose rendered span contains `offset`/);
  });
});

describe('bookmarkTarget', () => {
  const bm = { surahId: '002', ayah: 255, page: 42, savedAt: 1 };
  it('is null with no bookmark', () => {
    expect(bookmarkTarget(null, '002')).toBeNull();
  });
  it('jumps within the open surah', () => {
    expect(bookmarkTarget(bm, '002')).toEqual({ kind: 'jump', ayah: 255 });
  });
  it('routes to another surah with the ayah', () => {
    expect(bookmarkTarget(bm, '003')).toEqual({ kind: 'route', surah: '002', ayah: 255 });
  });
});

describe('readingPosition', () => {
  // Two segments; the text counts as rendered (text + marker + separator).
  const segA = { page: 2, ayat: [ay(1, 'a'.repeat(10)), ay(2, 'b'.repeat(10)), ay(3, 'c'.repeat(10))] };
  const segB = { page: 3, ayat: [ay(4, 'd'.repeat(10)), ay(5, 'e'.repeat(10))] };
  const segments = [segA, segB];
  const layouts = new Map([
    [2, { y: 0, height: 300 }],
    [3, { y: 300, height: 200 }],
  ]);
  const base = { segments, layouts, bodyY: 100, topInset: 0 };

  it('is the first ayah while the reader is still above the text', () => {
    expect(readingPosition({ ...base, scrollY: 0 })).toEqual({ ayah: 1, page: 2 });
  });

  it('is null with nothing to read', () => {
    expect(readingPosition({ ...base, segments: [], scrollY: 0 })).toBeNull();
  });

  it('uses the page fraction when no line data is there', () => {
    // 5/6 through page 2: char 36 of 44 -> third ayah (spans start at 0, 15, 30).
    expect(readingPosition({ ...base, scrollY: 100 + 250 })?.page).toBe(2);
    expect(readingPosition({ ...base, scrollY: 100 + 250 })?.ayah).toBe(3);
    expect(readingPosition({ ...base, scrollY: 100 + 1 })?.ayah).toBe(1);
  });

  it('lands on the next page segment past the first', () => {
    expect(readingPosition({ ...base, scrollY: 100 + 300 })).toEqual({ ayah: 4, page: 3 });
  });

  it('counts the top inset as the viewport top', () => {
    expect(readingPosition({ ...base, scrollY: 100 + 300 - 80, topInset: 80 })).toEqual({ ayah: 4, page: 3 });
  });

  it('prefers the measured line when the lines add up', () => {
    const m = ayahMarker(1).length;
    const per = 10 + m + 1;
    // Line 1 holds ayah 1; line 2 starts exactly at ayah 2.
    const lines = [
      { text: 'x'.repeat(per), y: 0 },
      { text: 'x'.repeat(per), y: 100 },
      { text: 'x'.repeat(per - 1), y: 200 },
    ];
    const withLines = { ...base, lines: (p: number) => (p === 2 ? lines : undefined) };
    expect(readingPosition({ ...withLines, scrollY: 100 + 100 })?.ayah).toBe(2);
    expect(readingPosition({ ...withLines, scrollY: 100 + 99 })?.ayah).toBe(1);
  });
});
