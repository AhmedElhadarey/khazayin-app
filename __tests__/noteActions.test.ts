import {
  bookNoteParams,
  lectureNoteParamsFromSession,
  takeAyahNoteParams,
  takeLectureNoteParams,
} from '@/services/noteActions';
import { makeAyahRef, noteRefToParams } from '@/services/noteRefs';

const TRACK = { id: 'ABC/001.mp3', title: 'ح1', reciter: 'س', durationSec: 600 };

describe('noteActions', () => {
  it('takeAyahNoteParams links the ayah', () => {
    expect(takeAyahNoteParams('002', 255)).toEqual(noteRefToParams(makeAyahRef('002', 255)));
  });
  it('takeAyahNoteParams surah-level', () => {
    const p = takeAyahNoteParams('002', undefined);
    expect('refPos' in p).toBe(false);
    expect(p.refLabel).toBe('سورة البقرة');
  });
  it('takeLectureNoteParams freezes the current second', () => {
    const p = takeLectureNoteParams(TRACK, 0.5)!;
    expect(p.refPos).toBe('300');
    expect(p.refContext).toBe('mini-player');
    expect(p.refId).toBe('ABC/001.mp3');
  });
  it('takeLectureNoteParams without a duration has no position', () => {
    const p = takeLectureNoteParams({ ...TRACK, durationSec: undefined }, 0.5)!;
    expect('refPos' in p).toBe(false);
    expect(p.refLabel).not.toContain(' — ');
  });
  it('takeLectureNoteParams for a non-episode track gives a plain note', () => {
    expect(takeLectureNoteParams({ ...TRACK, id: 'mock-fatiha' }, 0.2)).toBeUndefined();
  });
  it('takeLectureNoteParams with no track gives a plain note', () => {
    expect(takeLectureNoteParams(null, 0)).toBeUndefined();
  });
  it('lectureNoteParamsFromSession', () => {
    const p = lectureNoteParamsFromSession({
      lectureId: 'ABC/002.mp3',
      title: 'آداب الدعاء',
      author: 'الشيخ',
      durationSec: 1000,
      positionSec: 754.4,
      forwardListenedSec: 0,
      completed: false,
      lastListenedAt: 0,
    });
    expect(p!.refId).toBe('ABC/002.mp3');
    expect(p!.refPos).toBe('754');
    expect(p!.refContext).toBe('library-progress');
    expect(p!.refLabel).toBe('محاضرة آداب الدعاء — ١٢:٣٤');
  });
  it('lectureNoteParamsFromSession for a non-episode id is undefined', () => {
    expect(
      lectureNoteParamsFromSession({
        lectureId: 'sl5-1', title: 't', author: 'a', durationSec: 1,
        positionSec: 0, forwardListenedSec: 0, completed: false, lastListenedAt: 0,
      }),
    ).toBeUndefined();
  });
  it('bookNoteParams', () => {
    const p = bookNoteParams({ id: 'bk2', title: 'الأصول الثلاثة' });
    expect(p).toMatchObject({ refType: 'book', refId: 'bk2', refContext: 'book-detail' });
  });
});
