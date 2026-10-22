import { topicsForTitle, RECOMMENDATION_TOPICS, SCHOLAR_ONLY_SERIES } from '@/constants/recommendationTopics';
import * as C from '@/constants/recommendations';
import { normalize } from '@/services/search/normalize';
import { LECTURES_BY_SCHOLAR } from '@/data/content/scholars';

describe('topicsForTitle', () => {
  it('matches full phrases through normalize()', () => {
    expect(topicsForTitle('شرح رياض الصالحين')).toEqual(['riyad']);
    expect(topicsForTitle('شَرْحُ رِيَاضِ الصَّالِحِينَ')).toEqual(['riyad']);
    expect(topicsForTitle('تفسير آيات الأحكام')).toEqual(['tafsir', 'fiqh']);
    expect(topicsForTitle('تفسير ايات الاحكام')).toEqual(['tafsir', 'fiqh']);
  });
  it('keeps the two زاد titles apart', () => {
    expect(topicsForTitle('شرح زاد المستقنع')).toEqual(['fiqh']);
    expect(topicsForTitle('مختصر زاد المعاد')).toEqual(['seerah']);
  });
  it('uses the category only when no keyword matched', () => {
    expect(topicsForTitle('غزوة بدر', 'prophet')).toEqual(['seerah']);
    expect(topicsForTitle('تفسير القرآن الكريم', 'prophet')).toEqual(['tafsir']);
    expect(topicsForTitle('درس عام', 'radio')).toEqual([]);
  });
  it('maps every archive-backed scholar lecture to a topic, bar the scholar-only series', () => {
    const unmapped = Object.values(LECTURES_BY_SCHOLAR).flat()
      .filter((l) => l.archiveId && !SCHOLAR_ONLY_SERIES.has(l.archiveId)
        && topicsForTitle(l.title, l.category).length === 0)
      .map((l) => l.title);
    expect(unmapped).toEqual([]);
  });
  it('lists only real scholar series that map to no topic', () => {
    expect([...SCHOLAR_ONLY_SERIES].sort()).toEqual(
      ['0001_20230715', '012_20230905', '0006_20231225', '169_20210628', '361_20250211'].sort(),
    );
    const all = Object.values(LECTURES_BY_SCHOLAR).flat();
    for (const id of SCHOLAR_ONLY_SERIES) {
      const lecture = all.find((l) => l.archiveId === id);
      expect(lecture).toBeDefined();
      expect(lecture?.scholarId).toBeTruthy();
      expect(topicsForTitle(lecture!.title, lecture!.category)).toEqual([]);
    }
  });
  it('has no keyword that normalises to empty', () => {
    for (const t of Object.values(RECOMMENDATION_TOPICS)) {
      for (const k of t.keywords) expect(normalize(k)).not.toBe('');
    }
  });
  it('deep-freezes the topic map', () => {
    expect(Object.isFrozen(RECOMMENDATION_TOPICS)).toBe(true);
    for (const t of Object.values(RECOMMENDATION_TOPICS)) {
      expect(Object.isFrozen(t)).toBe(true);
      expect(Object.isFrozen(t.keywords)).toBe(true);
    }
  });
  it('never uses a bare زاد keyword', () => {
    for (const t of Object.values(RECOMMENDATION_TOPICS)) expect(t.keywords).not.toContain('زاد');
  });
});

describe('recommendation constants', () => {
  it('are frozen and on', () => {
    expect(Object.isFrozen(C.WEIGHTS)).toBe(true);
    expect(Object.isFrozen(C.RECOMMENDATION_COPY)).toBe(true);
    expect(C.RECOMMENDATIONS_ENABLED).toBe(true);
    expect(C.PAGE_READ_LIMIT).toBe(604);
  });
  it('carries the exact section copy', () => {
    expect(C.RECOMMENDATION_COPY.sectionTitle).toBe('مقترح لك');
    expect(C.RECOMMENDATION_COPY.hint).toBe('احفظ درسًا أو استمع إليه لتظهر هنا اقتراحات تناسبك');
    expect(C.RECOMMENDATION_COPY.empty).toBe('لا توجد اقتراحات جديدة الآن');
    expect(C.RECOMMENDATION_COPY.nextSurah('البقرة')).toBe('السورة التالية: سورة البقرة');
  });
});
