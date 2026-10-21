import { groupSavedItems, SAVED_EMPTY_COPY, SAVED_GROUP_TITLES } from '../constants/savedPresentation';
import type { SavedItem, SavedSnapshot, SavedType } from '../types/content';

const SNAP: Record<SavedType, SavedSnapshot> = {
  surah: { type: 'surah', name: 'الفاتحة', displayNumber: '١', meta: 'مكية' },
  scholar: { type: 'scholar', name: 'ابن باز' },
  book: { type: 'book', title: 'رياض الصالحين' },
  lecture: { type: 'lecture', title: 'غزوة بدر', scholar: 'العباد', duration: '', category: 'prophet' },
  dawah: { type: 'dawah', title: 'رمضان', body: '', tone: 'navy' },
};
const item = (type: SavedType, entityId: string, savedAt: number): SavedItem =>
  ({ id: `${type}:${entityId}`, type, entityId, savedAt, snapshot: SNAP[type] });

describe('groupSavedItems', () => {
  it('returns no groups for an empty library', () => {
    expect(groupSavedItems([])).toEqual([]);
  });

  it('groups by type with Arabic titles and counts', () => {
    const groups = groupSavedItems([item('lecture', 'p1', 3), item('surah', '001', 2), item('lecture', 'p2', 1)]);
    expect(groups.map((g) => [g.type, g.title, g.count])).toEqual([
      ['lecture', 'محاضرات', 2],
      ['surah', 'سور', 1],
    ]);
  });

  it('orders groups by their most recent save, not a fixed type order', () => {
    // Fixed order used to be surah, scholar, book, lecture, dawah.
    const groups = groupSavedItems([item('dawah', 'd1', 30), item('surah', '001', 20), item('dawah', 'd2', 10)]);
    expect(groups.map((g) => g.type)).toEqual(['dawah', 'surah']);
  });

  it('keeps entries newest-first inside a group even if the input is unsorted', () => {
    const groups = groupSavedItems([item('book', 'b1', 1), item('book', 'b3', 3), item('book', 'b2', 2)]);
    expect(groups[0].entries.map((e) => e.entityId)).toEqual(['b3', 'b2', 'b1']);
  });

  it('does not mutate its input', () => {
    const input = [item('book', 'b1', 1), item('book', 'b2', 2)];
    const copy = [...input];
    groupSavedItems(input);
    expect(input).toEqual(copy);
  });
});

describe('saved presentation copy', () => {
  it('titles every saved type in Arabic', () => {
    expect(Object.keys(SAVED_GROUP_TITLES).sort()).toEqual(['book', 'dawah', 'lecture', 'scholar', 'surah']);
  });

  it('empty state is encouraging and teaches the lecture long-press', () => {
    expect(SAVED_EMPTY_COPY.title).toBe('ابدأ مكتبتك الشخصية');
    expect(SAVED_EMPTY_COPY.body).toContain('احفظ ما تحب الرجوع إليه');
    expect(SAVED_EMPTY_COPY.lectureHint).toBe('لحفظ محاضرة، اضغط عليها مطوّلاً.');
  });
});
