import { SCHOLARS, LECTURES_BY_SCHOLAR } from '@/data/content/scholars';

const ARCHIVE_ID = /^[\w.\-]+$/;

describe('lecture catalogue', () => {
  it('every scholar has a lecture list', () => {
    SCHOLARS.forEach((s) => expect(LECTURES_BY_SCHOLAR[s.id]).toBeDefined());
  });
  it('every lecture with an archiveId is well-formed and scholar-scoped', () => {
    Object.values(LECTURES_BY_SCHOLAR).flat().forEach((l) => {
      if (l.archiveId) {
        expect(l.archiveId).toMatch(ARCHIVE_ID);
        expect(l.category).toBe('scholar');
        expect(l.scholarId).toBeTruthy();
      }
    });
  });
  it('the mapped contemporary scholars have real archive audio', () => {
    ['s1', 's4', 's5', 's6', 's8', 's9', 's15'].forEach((id) => {
      expect(LECTURES_BY_SCHOLAR[id].some((l) => !!l.archiveId)).toBe(true);
    });
  });
});
