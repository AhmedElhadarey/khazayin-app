import { pageForAyah } from '@/constants/quranPages';
import {
  ayahRefLabel,
  bookRefLabel,
  coerceNoteRef,
  formatPlaybackTime,
  isEpisodeId,
  lectureRefLabel,
  makeAyahRef,
  makeBookRef,
  makeLectureRef,
  noteRefFromParams,
  noteRefToParams,
} from '@/services/noteRefs';

describe('labels', () => {
  it('formatPlaybackTime renders m:ss in Arabic-Indic digits', () => {
    expect(formatPlaybackTime(754)).toBe('١٢:٣٤');
    expect(formatPlaybackTime(65)).toBe('١:٠٥');
    expect(formatPlaybackTime(5)).toBe('٠:٠٥');
  });
  it('formatPlaybackTime switches to h:mm:ss at one hour', () => {
    expect(formatPlaybackTime(3600)).toBe('١:٠٠:٠٠');
    expect(formatPlaybackTime(3723)).toBe('١:٠٢:٠٣');
  });
  it('formatPlaybackTime floors and clamps junk', () => {
    expect(formatPlaybackTime(754.9)).toBe('١٢:٣٤');
    expect(formatPlaybackTime(-3)).toBe('٠:٠٠');
    expect(formatPlaybackTime(NaN)).toBe('٠:٠٠');
    expect(formatPlaybackTime(Infinity)).toBe('٠:٠٠');
  });
  it('ayahRefLabel', () => {
    expect(ayahRefLabel(2, 255)).toBe('البقرة: ٢٥٥');
    expect(ayahRefLabel(1, 7)).toBe('الفاتحة: ٧');
    expect(ayahRefLabel(2)).toBe('سورة البقرة');
  });
  it('lectureRefLabel leads with the title', () => {
    expect(lectureRefLabel('آداب الدعاء', 'الشيخ عبد المحسن العباد', 754)).toBe(
      'محاضرة آداب الدعاء — ١٢:٣٤',
    );
  });
  it('lectureRefLabel falls back to the speaker', () => {
    expect(lectureRefLabel('  ', 'الشيخ ابن عثيمين', 754)).toBe(
      'محاضرة الشيخ ابن عثيمين — ١٢:٣٤',
    );
  });
  it('lectureRefLabel without a position', () => {
    expect(lectureRefLabel('آداب الدعاء', 'x')).toBe('محاضرة آداب الدعاء');
  });
  it('bookRefLabel', () => {
    expect(bookRefLabel('الأصول الثلاثة')).toBe('كتاب الأصول الثلاثة');
    expect(bookRefLabel('الأصول الثلاثة', 12)).toBe('كتاب الأصول الثلاثة — صفحة ١٢');
  });
});

describe('builders', () => {
  it('makeAyahRef pads the id and records ayah and page', () => {
    expect(makeAyahRef('2', 255)).toEqual({
      type: 'ayah',
      id: '002',
      position: 255,
      page: pageForAyah(2, 255),
      label: 'البقرة: ٢٥٥',
      context: 'mushaf',
    });
  });
  it('makeAyahRef surah-level', () => {
    const r = makeAyahRef('002');
    expect('position' in r).toBe(false);
    expect('page' in r).toBe(false);
    expect(r.label).toBe('سورة البقرة');
  });
  it('isEpisodeId', () => {
    expect(isEpisodeId('ABC/002.mp3')).toBe(true);
    expect(isEpisodeId('ABC/sub/x.mp3')).toBe(true);
    for (const bad of ['sl5-1', '/x', 'ABC/', '']) expect(isEpisodeId(bad)).toBe(false);
  });
  it('makeLectureRef rounds the position', () => {
    const r = makeLectureRef(
      { id: 'ABC/002.mp3', title: 'ح2', speaker: 'الشيخ', positionSec: 754.6 },
      'mini-player',
    );
    expect(r).toMatchObject({
      type: 'lecture',
      id: 'ABC/002.mp3',
      position: 755,
      label: 'محاضرة ح2 — ١٢:٣٥',
      title: 'ح2',
      speaker: 'الشيخ',
      context: 'mini-player',
    });
  });
  it('makeLectureRef refuses a non-episode id', () => {
    expect(
      makeLectureRef({ id: 'sl5-1', title: 't', speaker: 's', positionSec: 3 }, 'mini-player'),
    ).toBeUndefined();
  });
  it('makeBookRef', () => {
    expect(makeBookRef({ id: 'bk2', title: 'الأصول الثلاثة' })).toEqual({
      type: 'book',
      id: 'bk2',
      label: 'كتاب الأصول الثلاثة',
      context: 'book-detail',
    });
  });
});

describe('coerceNoteRef (lenient)', () => {
  const builders = () => [
    makeAyahRef('2', 255),
    makeAyahRef('002'),
    makeLectureRef(
      { id: 'ABC/002.mp3', title: 'ح2', speaker: 'الشيخ', positionSec: 10 },
      'library-progress',
    )!,
    makeBookRef({ id: 'bk2', title: 't' }),
  ];
  it('round-trips every builder output', () => {
    for (const x of builders()) expect(coerceNoteRef(x)).toEqual(x);
  });
  it('keeps an unknown type and context (newer build)', () => {
    const r = { type: 'video', id: 'v1', label: 'فيديو', context: 'tv' };
    expect(coerceNoteRef(r)).toEqual(r);
  });
  it('keeps unknown keys', () => {
    const r = { ...makeBookRef({ id: 'b', title: 't' }), extra: { a: 1 } };
    expect(coerceNoteRef(r)).toEqual(r);
  });
  it('drops structurally malformed refs', () => {
    const base = { type: 'ayah', id: 'a', label: 'l' };
    const bad: unknown[] = [
      null,
      'x',
      [],
      {},
      { type: '', id: 'a', label: 'l' },
      { type: 'ayah', id: 5, label: 'l' },
      { type: 'ayah', id: 'a' },
      { ...base, position: NaN },
      { ...base, position: -1 },
      { ...base, position: '3' },
      { ...base, page: 1.5 },
    ];
    for (const b of bad) expect(coerceNoteRef(b)).toBeUndefined();
  });
  it('never throws', () => {
    const junk: unknown[] = [
      undefined, null, 0, 1, -1, NaN, '', 'x', true, false, [], [1, 2], {}, { a: { b: 1 } },
      [[]], [null], () => 1, Symbol('s'), { type: {}, id: [], label: null }, new Date(),
    ];
    for (const v of junk) expect(() => coerceNoteRef(v)).not.toThrow();
  });
});

describe('route params', () => {
  it('noteRefToParams emits string values under ref* keys', () => {
    expect(noteRefToParams(makeAyahRef('2', 255))).toEqual({
      refType: 'ayah',
      refId: '002',
      refPos: '255',
      refPage: String(pageForAyah(2, 255)),
      refLabel: 'البقرة: ٢٥٥',
      refContext: 'mushaf',
    });
  });
  it('omits absent optional fields', () => {
    const p = noteRefToParams(makeBookRef({ id: 'b', title: 't' }));
    for (const k of ['refPos', 'refPage', 'refTitle', 'refSpeaker']) expect(k in p).toBe(false);
  });
  it('noteRefFromParams round-trips every builder', () => {
    for (const x of [
      makeAyahRef('2', 255),
      makeAyahRef('002'),
      makeLectureRef(
        { id: 'ABC/002.mp3', title: 'ح2', speaker: 'الشيخ', positionSec: 10 },
        'mini-player',
      )!,
      makeBookRef({ id: 'bk2', title: 't' }),
    ]) {
      expect(noteRefFromParams(noteRefToParams(x))).toEqual(x);
    }
  });
  it('reads expo-router string[] params', () => {
    expect(
      noteRefFromParams({ refType: ['ayah'], refId: ['002'], refLabel: ['سورة البقرة'] }),
    ).toEqual({ type: 'ayah', id: '002', label: 'سورة البقرة' });
  });
  it('no ref params → undefined', () => {
    expect(noteRefFromParams({ id: 'n1' })).toBeUndefined();
  });
  it('tampered numeric params → undefined', () => {
    expect(
      noteRefFromParams({ refType: 'ayah', refId: '002', refLabel: 'l', refPos: 'abc' }),
    ).toBeUndefined();
  });
});
