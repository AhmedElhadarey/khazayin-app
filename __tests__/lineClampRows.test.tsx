/**
 * Rows that can grow keep their Figma clamp at the default text size and wrap
 * once the user enlarges text (ticket T28). Found on Android at 320dp x 1.7:
 * the Books lecture row drew «في السنة النب» for the second title line and
 * «الشيخ صالح الف» for the scholar — the clamp dropped letters with no
 * ellipsis, because Android 15 breaks lines by ink bounds while RN 0.81
 * measures by advances.
 *
 * The jest Dimensions mock reports fontScale 2, so every render here pins the
 * scale explicitly.
 */
import React from 'react';
import { Text } from 'react-native';
import { LectureCard } from '@/components/khazain/primitives/LectureCard';
import { ListRowCard } from '@/components/khazain/primitives/ListRowCard';
import { ReciterRow } from '@/components/khazain/primitives/ReciterRow';
import { RibbonCard } from '@/components/khazain/primitives/RibbonCard';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/services/audioEngine', () => ({}));
jest.mock('react-native-track-player', () => ({}));
jest.mock('@sentry/react-native', () => ({}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node; unmount: () => void };
};

let mockFontScale = 1;
beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockImplementation(() => ({
    width: 320,
    height: 640,
    scale: 2,
    fontScale: mockFontScale,
  }));
});
afterEach(() => jest.restoreAllMocks());

/** `numberOfLines` of each Text, keyed by its string content, at a font scale. */
function clampsAt(fontScale: number, el: React.ReactElement): Record<string, number | undefined> {
  mockFontScale = fontScale;
  let r!: ReturnType<typeof create>;
  act(() => {
    r = create(el);
  });
  const out: Record<string, number | undefined> = {};
  for (const n of r.root.findAll((x) => x.type === Text)) {
    if (typeof n.props.children === 'string') out[n.props.children] = n.props.numberOfLines;
  }
  act(() => r.unmount());
  return out;
}

const TITLE = 'الإعجاز العلمي في السنة النبوية';
const SCHOLAR = 'الشيخ صالح الفوزان';

describe('LectureCard (the Books row from the device report)', () => {
  const card = (
    <LectureCard
      id="b1"
      category={'books' as any}
      iconNode={null}
      title={TITLE}
      scholar={SCHOLAR}
      duration="45 دقيقة"
      pretitleSmall="فضيلة الشيخ"
    />
  );

  it('clamps the title to 2 and the scholar to 1 at the default text size', () => {
    const c = clampsAt(1, card);
    expect(c[TITLE]).toBe(2);
    expect(c[SCHOLAR]).toBe(1);
    expect(c['فضيلة الشيخ']).toBe(1);
  });

  it('unclamps both at font scale 1.7, so the row grows instead of dropping letters', () => {
    const c = clampsAt(1.7, card);
    expect(c[TITLE]).toBeUndefined();
    expect(c[SCHOLAR]).toBeUndefined();
    expect(c['فضيلة الشيخ']).toBeUndefined();
  });

  it('keeps the rail variant at one line by default and unclamps it when enlarged', () => {
    const rail = <LectureCard id="r1" category={'books' as any} iconNode={null} title={TITLE} variant="rail" />;
    expect(clampsAt(1, rail)[TITLE]).toBe(1);
    expect(clampsAt(1.7, rail)[TITLE]).toBeUndefined();
  });
});

describe('ReciterRow', () => {
  const row = <ReciterRow title="مشاري راشد العفاسي" subtitle="رواية حفص عن عاصم" />;

  it('clamps title and subtitle to 1 at the default text size', () => {
    const c = clampsAt(1, row);
    expect(c['مشاري راشد العفاسي']).toBe(1);
    expect(c['رواية حفص عن عاصم']).toBe(1);
  });

  it('unclamps both at font scale 1.7', () => {
    const c = clampsAt(1.7, row);
    expect(c['مشاري راشد العفاسي']).toBeUndefined();
    expect(c['رواية حفص عن عاصم']).toBeUndefined();
  });
});

describe('RibbonCard', () => {
  const card = <RibbonCard title={TITLE} meta={SCHOLAR} duration="30 دقيقة" />;

  it('clamps the title to 2 and the meta to 1 at the default text size', () => {
    const c = clampsAt(1, card);
    expect(c[TITLE]).toBe(2);
    expect(c[SCHOLAR]).toBe(1);
  });

  it('unclamps both at font scale 1.7', () => {
    const c = clampsAt(1.7, card);
    expect(c[TITLE]).toBeUndefined();
    expect(c[SCHOLAR]).toBeUndefined();
  });
});

describe.each(['section', 'archive', 'more'] as const)('ListRowCard variant=%s', (variant) => {
  const row = <ListRowCard variant={variant} icon={null} title="قنوات الواتساب" subtitle="القنوات الأصلية" />;

  it('clamps title and subtitle to 2 at the default text size', () => {
    const c = clampsAt(1, row);
    expect(c['قنوات الواتساب']).toBe(2);
    expect(c['القنوات الأصلية']).toBe(2);
  });

  it('unclamps both at font scale 1.7', () => {
    const c = clampsAt(1.7, row);
    expect(c['قنوات الواتساب']).toBeUndefined();
    expect(c['القنوات الأصلية']).toBeUndefined();
  });
});
