import {
  indexCatalogue,
  recommend,
  surahLastPage,
  surahsRead,
} from '@/services/recommendations/recommend';
import type { CatalogueSnapshot, Signal } from '@/services/recommendations/types';
import { RECOMMENDATION_TOPICS, SCHOLAR_ONLY_SERIES, topicsForTitle } from '@/constants/recommendationTopics';
import { RECOMMENDATION_COPY, WEIGHTS } from '@/constants/recommendations';
import { catalogue } from './fixtures/recommendationCatalogue';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 22);
const index = indexCatalogue(catalogue);
const none = new Set<string>();

const saved = (id: string, label: string, ageDays = 0): Signal => ({
  kind: 'saved',
  target: { type: 'lecture', id },
  atMs: NOW - ageDays * DAY,
  label,
});
const savedScholar = (id: string, label: string): Signal => ({
  kind: 'saved',
  target: { type: 'scholar', id },
  atMs: NOW,
  label,
});
const savedBook = (id: string, label: string): Signal => ({
  kind: 'saved',
  target: { type: 'book', id },
  atMs: NOW,
  label,
});

const shuffleCatalogue = (c: CatalogueSnapshot): CatalogueSnapshot => ({
  scholars: [...c.scholars].reverse(),
  lectures: [...c.lectures].reverse(),
  books: [...c.books].reverse(),
});

const perScholar = (out: ReturnType<typeof recommend>) =>
  out.reduce<Record<string, number>>((m, r) => {
    const k = r.scholarId ?? r.entityId;
    m[k] = (m[k] ?? 0) + 1;
    return m;
  }, {});

describe('recommend', () => {
  it('returns nothing without signals', () => {
    expect(recommend([], index, NOW, none, 3)).toEqual([]);
  });

  it('a saved Riyad series surfaces other Riyad series and reserves a scholar slot', () => {
    const out = recommend([saved('sl5-2', 'شرح رياض الصالحين')], index, NOW, none, 3);
    expect(out[0].reason).toBe('لأنك حفظت «شرح رياض الصالحين»');
    expect(out.map((r) => r.key)).not.toContain('lecture:011_20210710'); // the signal target itself
    const scholar = out.find((r) => r.kind === 'scholar');
    expect(scholar?.reason).toBe('له دروس في رياض الصالحين');
    expect(scholar?.entityId).toBe('s9');
  });

  it('a saved scholar surfaces their series with the follow reason (Q5)', () => {
    const out = recommend([savedScholar('s4', 'ابن باز')], index, NOW, none, 6);
    const theirs = out.filter((r) => r.scholarId === 's4' && r.kind === 'lecture');
    expect(theirs.length).toBeGreaterThan(0);
    for (const r of theirs) expect(r.reason).toBe('لأنك تتابع ابن باز');
    expect(out.map((r) => r.key)).not.toContain('scholar:s4');
  });

  it('merges same-name scholars so a saved s2 counts as s1', () => {
    const out = recommend([savedScholar('s2', 'العباد')], index, NOW, none, 6);
    expect(out.map((r) => r.key)).not.toContain('scholar:s1');
    expect(out.some((r) => r.scholarId === 's1' && r.kind === 'lecture')).toBe(true);
  });

  it('reserves no scholar slot at n = 1', () => {
    expect(recommend([saved('sl5-2', 'شرح رياض الصالحين')], index, NOW, none, 1)[0].kind).not.toBe('scholar');
  });

  it('reserves the scholar slot at n >= 3 even when lectures outscore it', () => {
    for (const n of [3, 4, 5]) {
      const out = recommend([saved('sl5-2', 'a')], index, NOW, none, n);
      expect(out.some((r) => r.kind === 'scholar')).toBe(true);
      const sch = out.find((r) => r.kind === 'scholar');
      const lec = out.find((r) => r.kind === 'lecture');
      expect(lec && sch && lec.score >= sch.score).toBe(true);
    }
  });

  it('halves at 21 days and drops at 120', () => {
    const s0 = recommend([saved('sl5-2', 'x', 0)], index, NOW, none, 3)[0].score;
    const s21 = recommend([saved('sl5-2', 'x', 21)], index, NOW, none, 3)[0].score;
    expect(s21).toBeCloseTo(s0 / 2, 6);
    expect(recommend([saved('sl5-2', 'x', 121)], index, NOW, none, 3)).toEqual([]);
  });

  it('treats a future timestamp as age 0', () => {
    const s0 = recommend([saved('sl5-2', 'x', 0)], index, NOW, none, 3)[0].score;
    expect(recommend([saved('sl5-2', 'x', -5)], index, NOW, none, 3)[0].score).toBe(s0);
  });

  it('still excludes the target of a signal older than 120 days', () => {
    const out = recommend([saved('sl5-2', 'x', 200), saved('sl4-4', 'y')], index, NOW, none, 10);
    expect(out.map((r) => r.key)).not.toContain('lecture:011_20210710');
  });

  it('caps topic affinity at 8: twenty same-topic saves do not exceed it', () => {
    const sigs = Array.from({ length: 20 }, (_, i) => savedBook(`ghost${i}`, 'شرح رياض الصالحين'));
    const out = recommend(sigs, index, NOW, none, 6);
    expect(out.length).toBeGreaterThan(0);
    for (const r of out.filter((x) => x.kind !== 'scholar')) expect(r.score).toBeLessThanOrEqual(8);
    expect(Math.max(...out.map((r) => r.score))).toBe(8);
  });

  it('caps scholar affinity at 6', () => {
    // Three s5 saves sum to 9 for s5; sl5-1 (tafsir, no tafsir signal) gets 0.5 x 6.
    const out = recommend([saved('sl5-2', 'a'), saved('sl5-3', 'b'), saved('sl5-4', 'c')], index, NOW, none, 20);
    expect(out.find((r) => r.key === 'lecture:485_20210705')?.score).toBe(3);
  });

  it('scores a two-topic title by its best topic, not the sum (max, not sum)', () => {
    // bk3 "تفسير آيات الأحكام" is tafsir + fiqh; sl5-1 is tafsir, sl5-5 is fiqh.
    const both = recommend([saved('sl5-1', 'a'), saved('sl6-1', 'b')], index, NOW, none, 20);
    const bk3 = both.find((r) => r.key === 'book:bk3');
    expect(bk3?.score).toBe(3);
    const one = recommend([saved('sl5-1', 'a')], index, NOW, none, 20).find((r) => r.key === 'book:bk3');
    expect(one?.score).toBe(3);
  });

  it('is order-independent', () => {
    const sigs = [saved('sl5-2', 'a'), saved('sl4-4', 'b', 3), saved('sl6-4', 'c', 9)];
    const base = recommend(sigs, index, NOW, none, 4);
    // Fixed permutations: the reversal plus every rotation.
    const perms = [[...sigs].reverse(), ...sigs.map((_, k) => [...sigs.slice(k), ...sigs.slice(0, k)])];
    for (const perm of perms) {
      expect(recommend(perm, indexCatalogue(shuffleCatalogue(catalogue)), NOW, none, 4)).toEqual(base);
      expect(recommend(perm, index, NOW, none, 4)).toEqual(base);
    }
  });

  it('resolves score ties by kind, then key', () => {
    const out = recommend([saved('sl5-2', 'a')], index, NOW, none, 20);
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1];
      const b = out[i];
      expect(a.score).toBeGreaterThanOrEqual(b.score);
      if (a.score === b.score) {
        const rank = { lecture: 0, book: 1, scholar: 2 };
        expect(rank[a.kind] <= rank[b.kind]).toBe(true);
        if (a.kind === b.kind) expect(a.key < b.key).toBe(true);
      }
    }
  });

  it.each([3, 4, 6])('keeps within ceil(n/3) per scholar and of kind scholar at n = %i', (n) => {
    const out = recommend([saved('sl5-2', 'a'), saved('sl5-3', 'b'), saved('sl4-4', 'c')], index, NOW, none, n);
    const cap = Math.ceil(n / 3);
    expect(Math.max(...Object.values(perScholar(out)))).toBeLessThanOrEqual(cap);
    expect(out.filter((r) => r.kind === 'scholar').length).toBeLessThanOrEqual(cap);
    expect(out.length).toBeLessThanOrEqual(n);
  });

  it('keeps at most ceil(n/3) per scholar', () => {
    const out = recommend([saved('sl5-2', 'a'), saved('sl5-3', 'b')], index, NOW, none, 4);
    expect(Math.max(...Object.values(perScholar(out)))).toBeLessThanOrEqual(2);
  });

  it('keeps at most ceil(n/3) per primary topic', () => {
    const out = recommend([saved('sl5-2', 'a')], index, NOW, none, 3);
    const riyad = out.filter((r) => r.kind !== 'scholar' && r.title.includes('رياض الصالحين'));
    expect(riyad.length).toBeLessThanOrEqual(1);
  });

  it('keeps the reserved scholar within the per-scholar cap (sl8-3 + sl6-5 at n = 3)', () => {
    const out = recommend([saved('sl8-3', 'a'), saved('sl6-5', 'b')], index, NOW, none, 3);
    expect(Math.max(...Object.values(perScholar(out)))).toBeLessThanOrEqual(1);
  });

  it('holds all three caps over single and paired signals for n = 3..6', () => {
    const lectures = index.lectureCandidates.map((c) => c.lecture);
    const topicOrder = Object.keys(RECOMMENDATION_TOPICS);
    const violations: string[] = [];
    const check = (sigs: Signal[], n: number) => {
      const out = recommend(sigs, index, NOW, none, n);
      const cap = Math.ceil(n / 3);
      // Recompute the primary topic the engine uses: best affinity, ties by map order.
      const aff = new Map<string, number>();
      for (const s of sigs) {
        if (s.target.type !== 'lecture') continue;
        const l = index.byLectureId.get(s.target.id);
        const w = WEIGHTS[s.kind];
        for (const t of topicsForTitle(l?.title ?? '', l?.category)) aff.set(t, (aff.get(t) ?? 0) + w);
      }
      const primary = (topics: readonly string[]) =>
        [...topics].sort((a, b) => topicOrder.indexOf(a) - topicOrder.indexOf(b))
          .reduce<string | undefined>((best, t) => ((aff.get(t) ?? 0) > (aff.get(best ?? '') ?? 0) ? t : best), undefined);
      const perTopic: Record<string, number> = {};
      for (const r of out) {
        if (r.kind === 'scholar') continue;
        const topics = r.lecture ? topicsForTitle(r.title, r.lecture.category) : topicsForTitle(r.title);
        const p = primary(topics);
        if (p) perTopic[p] = (perTopic[p] ?? 0) + 1;
      }
      const worst = Math.max(
        0,
        ...Object.values(perScholar(out)),
        ...Object.values(perTopic),
        out.filter((r) => r.kind === 'scholar').length,
      );
      if (worst > cap || out.length > n) violations.push(`${sigs.map((s) => (s.target.type === 'lecture' ? s.target.id : ''))} n=${n}`);
    };
    for (const a of lectures) {
      for (const n of [3, 4, 5, 6]) {
        check([saved(a.id, 'x')], n);
        for (const b of lectures.slice(0, 40)) {
          check([saved(a.id, 'x'), { ...saved(b.id, 'y'), kind: 'listened' }], n);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('drops dismissed keys', () => {
    const first = recommend([saved('sl5-2', 'a')], index, NOW, none, 3)[0];
    expect(recommend([saved('sl5-2', 'a')], index, NOW, new Set([first.key]), 3).map((r) => r.key)).not.toContain(
      first.key,
    );
  });

  it('never recommends a book or scholar the user already has a signal on', () => {
    const out = recommend([savedBook('bk2', 'شرح رياض الصالحين'), savedScholar('s9', 'البدر')], index, NOW, none, 20);
    expect(out.map((r) => r.key)).not.toContain('book:bk2');
    expect(out.map((r) => r.key)).not.toContain('scholar:s9');
  });

  it('excludes an episode-id signal target by its series, and a listened series stays excluded', () => {
    const listened: Signal = {
      kind: 'listened',
      target: { type: 'lecture', id: '001_20210704_202107/003.mp3' },
      atMs: NOW,
      label: 'شرح رياض الصالحين',
    };
    const out = recommend([listened], index, NOW, none, 20);
    expect(out.map((r) => r.key)).not.toContain('lecture:001_20210704_202107');
    expect(out[0].reason).toBe('لأنك استمعت إلى «شرح رياض الصالحين»');
  });

  it('a session that is not a signal neither scores nor excludes (S6)', () => {
    const base = recommend([saved('sl5-2', 'a')], index, NOW, none, 20).map((r) => r.key);
    // sl4-3 is a Riyad series; with no listened signal on it, it stays eligible.
    expect(base).toContain('lecture:001_20210704_202107');
    const withListen = recommend(
      [saved('sl5-2', 'a'), { kind: 'listened', target: { type: 'lecture', id: 'sl4-3' }, atMs: NOW, label: 'b' }],
      index,
      NOW,
      none,
      20,
    ).map((r) => r.key);
    expect(withListen).not.toContain('lecture:001_20210704_202107');
  });

  it('uses the strongest contribution for the reason, ties by kind', () => {
    const note: Signal = { kind: 'note', target: { type: 'book', id: 'bk2' }, atMs: NOW, label: 'شرح رياض الصالحين' };
    const out = recommend([note], index, NOW, none, 20);
    expect(out[0].reason).toBe('لأنك دوّنت ملاحظة على «شرح رياض الصالحين»');
    const read: Signal = { kind: 'read', target: { type: 'surah', number: 2 }, atMs: NOW, label: 'سورة البقرة' };
    expect(recommend([read], index, NOW, none, 20)[0].reason).toBe('لقراءتك سورة البقرة');
  });

  it('quotes the signal that contributes most to the primary topic (bk3)', () => {
    const read = (n: number, label: string): Signal => ({
      kind: 'read',
      target: { type: 'surah', number: n },
      atMs: NOW,
      label,
    });
    const listen: Signal = { kind: 'listened', target: { type: 'lecture', id: 'sl5-5' }, atMs: NOW, label: 'شرح زاد المستقنع' };
    const out = recommend([read(2, 'سورة البقرة'), read(3, 'سورة آل عمران'), listen], index, NOW, none, 20);
    // bk3 is tafsir + fiqh; tafsir (two reads) is primary, so a read is quoted, not the heavier listen.
    expect(out.find((r) => r.key === 'book:bk3')?.reason).toMatch(/^لقراءتك سورة /);
  });

  it('exposes the book and scholar meta lines through RECOMMENDATION_COPY', () => {
    expect(RECOMMENDATION_COPY.metaBook).toBe('كتاب');
    expect(RECOMMENDATION_COPY.metaScholar).toBe('عالم');
  });

  it('cuts long labels to 32 characters plus an ellipsis', () => {
    const long = 'ا'.repeat(40);
    const out = recommend([saved('sl5-2', long)], index, NOW, none, 3);
    expect(out[0].reason).toBe(`لأنك حفظت «${'ا'.repeat(32)}…»`);
  });

  it('collapses whitespace in reason labels before cutting', () => {
    const out = recommend([saved('sl5-2', '1-\tعنوان  الكتاب')], index, NOW, none, 3);
    expect(out[0].reason).toBe('لأنك حفظت «1- عنوان الكتاب»');
    const padded = recommend([saved('sl5-2', `  ${'ا'.repeat(30)}\n\t ب  `)], index, NOW, none, 3);
    expect(padded[0].reason).toBe(`لأنك حفظت «${'ا'.repeat(30)} ب»`);
  });

  it('does not throw on unknown items', () => {
    const sigs: Signal[] = [
      saved('nope', 'غير موجود'),
      savedBook('nope', 'كتاب مجهول'),
      savedScholar('s999', 'مجهول'),
      { kind: 'note', target: { type: 'lecture', id: 'zzz/1.mp3' }, atMs: NOW, label: '' },
    ];
    expect(() => recommend(sigs, index, NOW, none, 3)).not.toThrow();
    expect(recommend(sigs, index, NOW, none, 3)).toEqual([]);
  });

  it('matches an unknown lecture by title keywords', () => {
    const sig: Signal = {
      kind: 'saved',
      target: { type: 'lecture', id: 'gone', title: 'شرح رياض الصالحين' },
      atMs: NOW,
      label: 'x',
    };
    const out = recommend([sig], index, NOW, none, 3);
    expect(out[0].reason).toBe('لأنك حفظت «x»');
    expect(out[0].score).toBe(3);
  });

  it('a topic-less series with a scholarId lifts that scholar and never scores -Infinity', () => {
    expect(SCHOLAR_ONLY_SERIES.has('0006_20231225')).toBe(true);
    const out = recommend([saved('sl4-1', 'محاضرات ابن باز')], index, NOW, none, 20);
    expect(out.every((r) => Number.isFinite(r.score) && r.score >= 0.3)).toBe(true);
    const fatawa = out.find((r) => r.key === 'lecture:973_20210629');
    expect(fatawa?.score).toBe(1.5); // max(∅) = 0, plus 0.5 × 3
    expect(out.map((r) => r.key)).not.toContain('lecture:0006_20231225');
  });

  it('returns nothing from an empty catalogue', () => {
    const empty = indexCatalogue({ scholars: [], lectures: [], books: [] });
    expect(recommend([saved('sl5-2', 'a')], empty, NOW, none, 3)).toEqual([]);
  });

  describe('contextSurah', () => {
    it('rotates the surah-context tafsir pick by surah mod k over key-sorted pools', () => {
      const a = recommend([], index, NOW, none, 1, 2)[0];
      const b = recommend([], index, NOW, none, 1, 3)[0];
      expect(a.reason).toBe('للاستزادة في تفسير ما قرأت');
      expect(a.key).not.toBe(b.key);
      expect(recommend([], index, NOW, none, 1, 2)).toEqual([a]);
    });

    it('offers tafsir series and books only', () => {
      for (let s = 1; s <= 20; s++) {
        const r = recommend([], index, NOW, none, 1, s)[0];
        expect(r.kind).not.toBe('scholar');
        expect(`${r.title}`).toMatch(/تفسير|التفسير/);
      }
    });

    it('prefers a qualifying tafsir candidate over the fallback', () => {
      const out = recommend([saved('sl5-1', 'تفسير القرآن الكريم')], index, NOW, none, 1, 2);
      expect(out).toHaveLength(1);
      expect(out[0].reason).toBe('لأنك حفظت «تفسير القرآن الكريم»');
    });

    it('skips dismissed candidates in the fallback', () => {
      const a = recommend([], index, NOW, none, 1, 2)[0];
      const next = recommend([], index, NOW, new Set([a.key]), 1, 2)[0];
      expect(next.key).not.toBe(a.key);
    });

    it('returns nothing when no tafsir candidate remains', () => {
      const empty = indexCatalogue({ scholars: [], lectures: [], books: [] });
      expect(recommend([], empty, NOW, none, 1, 2)).toEqual([]);
    });
  });
});

describe('surah derivation', () => {
  it('derives a surah last page from the static tables', () => {
    expect(surahLastPage(1)).toBe(1);
    expect(surahLastPage(2)).toBe(49);
    expect(surahLastPage(114)).toBe(604);
    expect(surahsRead([{ page: 604, atMs: NOW }]).map((s) => s.number)).toEqual([112, 113, 114]);
    expect(surahsRead([{ page: 49, atMs: NOW }])).toEqual([]); // al-Baqarah also needs page 2
  });

  it('shares a page when the next surah opens mid-page', () => {
    // Surah 111 ends on page 603 because 112 opens page 604; 112 ends on 604.
    expect(surahLastPage(111)).toBe(603);
    expect(surahLastPage(112)).toBe(604);
  });

  it('counts a multi-page surah only with both its start and last page', () => {
    expect(surahsRead([{ page: 2, atMs: NOW }, { page: 49, atMs: NOW - DAY }])).toEqual([
      { number: 2, atMs: NOW },
    ]);
  });
});
