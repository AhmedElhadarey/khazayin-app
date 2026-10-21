import { bookDetailHref } from '@/services/bookDetail';
import {
  noteSourceTarget,
  runNoteSource,
  viewerSourceAction,
} from '@/services/noteNavigation';
import { makeAyahRef, makeBookRef, makeLectureRef } from '@/services/noteRefs';

const lectureRef = (positionSec?: number) =>
  makeLectureRef(
    { id: 'ABC/002.mp3', title: 'ح2', speaker: 'الشيخ', positionSec },
    'mini-player',
  )!;

describe('noteSourceTarget', () => {
  it('ayah ref targets the reader at that ayah', () => {
    expect(noteSourceTarget(makeAyahRef('2', 255))).toEqual({
      kind: 'route',
      href: '/sections/mushaf?surah=2&ayah=255',
    });
  });
  it('surah-level ayah ref', () => {
    expect(noteSourceTarget(makeAyahRef('2'))).toEqual({
      kind: 'route',
      href: '/sections/mushaf?surah=2',
    });
  });
  it('corrupt surah id → null', () => {
    expect(noteSourceTarget({ ...makeAyahRef('2', 1), id: '999' })).toBeNull();
  });
  it('lecture ref targets playback at that second', () => {
    expect(noteSourceTarget(lectureRef(754))).toEqual({
      kind: 'lecture',
      lecture: {
        id: 'ABC',
        archiveId: 'ABC',
        title: 'ح2',
        scholar: 'الشيخ',
        duration: '',
        category: 'scholar',
      },
      start: { episodeId: 'ABC/002.mp3', positionSec: 754 },
    });
  });
  it('lecture ref without a position starts at 0', () => {
    const t = noteSourceTarget(lectureRef());
    expect(t && t.kind === 'lecture' && t.start.positionSec).toBe(0);
  });
  it('lecture ref with a non-episode id → null', () => {
    expect(noteSourceTarget({ type: 'lecture', id: 'sl5-1', label: 'l' })).toBeNull();
  });
  it("book ref targets book detail via search's helper", () => {
    expect(noteSourceTarget(makeBookRef({ id: 'bk2', title: 't' }))).toEqual({
      kind: 'route',
      href: bookDetailHref('bk2'),
    });
  });
  it('unknown type → null', () => {
    expect(noteSourceTarget({ type: 'video', id: 'v', label: 'l' })).toBeNull();
  });
});

describe('runNoteSource', () => {
  it('navigates a route and never dismisses', () => {
    const deps = { navigate: jest.fn(), play: jest.fn() };
    runNoteSource({ kind: 'route', href: '/x' }, deps);
    expect(deps.navigate).toHaveBeenCalledWith('/x');
    expect(deps.play).not.toHaveBeenCalled();
    expect(Object.keys(deps).sort()).toEqual(['navigate', 'play']);
  });
  it('plays a lecture target', () => {
    const deps = { navigate: jest.fn(), play: jest.fn() };
    const target = noteSourceTarget(lectureRef(10))!;
    runNoteSource(target, deps);
    if (target.kind !== 'lecture') throw new Error('expected lecture');
    expect(deps.play).toHaveBeenCalledWith(target.lecture, target.start);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
  it('null is a no-op', () => {
    const deps = { navigate: jest.fn(), play: jest.fn() };
    runNoteSource(null, deps);
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.play).not.toHaveBeenCalled();
  });
});

describe('viewerSourceAction', () => {
  const fake = () => {
    const order: string[] = [];
    return {
      order,
      deps: {
        back: () => order.push('back'),
        navigate: (h: string) => order.push(`navigate:${h}`),
        play: () => {
          order.push('play');
        },
      },
    };
  };
  it('closes first, then runs the target', () => {
    const { order, deps } = fake();
    viewerSourceAction(makeAyahRef('2', 255), deps);
    expect(order).toEqual(['back', 'navigate:/sections/mushaf?surah=2&ayah=255']);
  });
  it('for a lecture closes, then plays', () => {
    const { order, deps } = fake();
    viewerSourceAction(lectureRef(5), deps);
    expect(order).toEqual(['back', 'play']);
  });
  it('for an unlinkable ref does nothing', () => {
    const a = fake();
    viewerSourceAction({ type: 'video', id: 'v', label: 'l' }, a.deps);
    viewerSourceAction(undefined, a.deps);
    expect(a.order).toEqual([]);
  });
});
