/**
 * T02: ad-hoc font weights are routed through the type roles. These pin the
 * role each call site resolves to, so a regression to a hand-assembled style
 * (or a bold fontWeight on a static face) fails here and not on a device.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { StyleSheet } from 'react-native';

import { PillButton } from '@/components/khazain/primitives/PillButton';
import { SearchGroupHeader } from '@/components/khazain/search/SearchGroupHeader';
import { SelectableRow } from '@/components/khazain/onboarding/SelectableRow';
import { SheetShell } from '@/components/khazain/sheets/SheetShell';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { TEXT_ROLES } from '@/constants/typography';

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ width: 393, sideInsets: 0 }),
}));

type Node = {
  type: unknown;
  props: Record<string, any>;
  findAll: (p: (n: Node) => boolean) => Node[];
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};
const render = (el: React.ReactElement) => {
  let r!: { root: Node };
  act(() => {
    r = create(el);
  });
  return r;
};
const textWith = (r: { root: Node }, content: string) =>
  r.root.findAll((n) => n.type === 'Text' && n.props.children === content)[0];
const flat = (n: Node) => StyleSheet.flatten(n.props.style);
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const sameRole = (style: Record<string, any>, role: keyof typeof TEXT_ROLES) => {
  const r = TEXT_ROLES[role];
  expect({
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
  }).toEqual({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: '400',
    lineHeight: r.lineHeight,
  });
};

describe('NOFRAME-09 SearchGroupHeader', () => {
  it('is sectionTitle with a line height and Arabic-Indic count digits', () => {
    const r = render(<SearchGroupHeader title="الدروس" count={3} />);
    const title = textWith(r, 'الدروس (٣)');
    expect(title).toBeDefined();
    sameRole(flat(title), 'sectionTitle');
    expect(flat(title).color).toBe(KhazainColors.ink900);
  });

  it('draws its rule in hairlineWarm', () => {
    const rule = render(<SearchGroupHeader title="x" count={12} />).root.findAll(
      (n) => n.type === 'View' && flat(n)?.height === 1,
    )[0];
    expect(flat(rule).backgroundColor).toBe(KhazainColors.hairlineWarm);
  });
});

describe('NOFRAME-16 SheetShell title', () => {
  it('is bodyLarge, inkTitle, centred', () => {
    const r = render(
      <SheetShell title="مشاركة" onClose={() => {}}>
        {null}
      </SheetShell>,
    );
    const s = flat(textWith(r, 'مشاركة'));
    sameRole(s, 'bodyLarge');
    expect(s.color).toBe(KhazainColors.inkTitle);
    expect(s.textAlign).toBe('center');
  });
});

describe('NOFRAME-36 PillButton label', () => {
  it('uses cardTitle for lg and label for sm, never a fontWeight', () => {
    const lg = flat(textWith(render(<PillButton label="متابعة" />), 'متابعة'));
    const sm = flat(textWith(render(<PillButton label="متابعة" size="sm" />), 'متابعة'));
    sameRole(lg, 'cardTitle');
    sameRole(sm, 'label');
    expect(lg.textAlign).toBe('center');
  });
});

describe('NOFRAME-23 selectable rows', () => {
  const row = (selected: boolean) =>
    render(<SelectableRow title="حفص" subtitle="رواية" selected={selected} onPress={() => {}} />);

  it('titles are bodyCompact/inkTitle and subtitles caption/ink500', () => {
    const r = row(false);
    const t = flat(textWith(r, 'حفص'));
    const s = flat(textWith(r, 'رواية'));
    sameRole(t, 'bodyCompact');
    expect(t.color).toBe(KhazainColors.inkTitle);
    sameRole(s, 'caption');
    expect(s.color).toBe(KhazainColors.ink500);
  });

  it('is a flat reciter-density card: no shadow, hairlineWarm frame, gold 1.5 when chosen', () => {
    const idle = row(false);
    const card = idle.root.findAll((n) => n.type === 'View' && flat(n)?.minHeight)[0];
    const c = flat(card);
    expect(c.minHeight).toBe(CARD_DENSITY.reciterRowMinHeight);
    expect(c.borderRadius).toBe(CARD_DENSITY.reciterRowRadius);
    expect(c.shadowOpacity).toBeUndefined();
    expect(c.elevation).toBeUndefined();
    const frame = (r: ReturnType<typeof row>) =>
      flat(r.root.findAll((n) => n.type === 'View' && flat(n)?.borderWidth)[0]);
    expect(frame(idle)).toMatchObject({ borderColor: KhazainColors.hairlineWarm, borderWidth: 1 });
    expect(frame(row(true))).toMatchObject({ borderColor: KhazainColors.goldAccent, borderWidth: 1.5 });
  });

  it.each(['app/settings-qiraa.tsx', 'app/settings-reciter.tsx', 'app/settings-wird-goal.tsx'])(
    '%s rows use reciter density, hairlineWarm, no shadow and role titles',
    (rel) => {
      const src = read(rel);
      expect(src).toContain('CARD_DENSITY.reciterRowMinHeight');
      expect(src).toContain('CARD_DENSITY.reciterRowRadius');
      expect(src).toContain('KhazainColors.hairlineWarm');
      expect(src).not.toMatch(/styles\.row,\s*KhazainShadows/);
      expect(src).toMatch(/textStyle\('bodyCompact', \{ color: KhazainColors\.inkTitle \}\)/);
    },
  );
});

describe('source-level role routing (screens with heavy providers)', () => {
  it('NOFRAME-12 RecentSearchRow: bodyCompact text, hairlineFaint divider', () => {
    const src = read('components/khazain/search/RecentSearchRow.tsx');
    expect(src).toContain("textStyle('bodyCompact', { color: KhazainColors.ink900 })");
    expect(src).toContain('borderBottomColor: KhazainColors.hairlineFaint');
  });

  it('NOFRAME-20 youtube-sheet `more` is a centred goldAccent caption', () => {
    expect(read('app/youtube-sheet.tsx')).toContain(
      "textStyle('caption', { color: KhazainColors.goldAccent, textAlign: 'center' })",
    );
  });

  it('NOFRAME-24 onboarding steps take their type from the roles', () => {
    for (const f of ['QiraaStep', 'ReciterStep', 'ChannelsStep']) {
      expect(read(`components/khazain/onboarding/${f}.tsx`)).toContain("textStyle('bodyLarge'");
    }
    const welcome = read('components/khazain/onboarding/WelcomeStep.tsx');
    expect(welcome).toContain("mission: textStyle('bodyLarge'");
    expect(welcome).toContain("textStyle('body', { color: KhazainColors.ink700 })");
    expect(read('components/khazain/onboarding/OnboardingFooter.tsx')).toContain(
      "textStyle('cardTitle', { color: KhazainColors.inkSubtle })",
    );
    const channels = read('components/khazain/onboarding/ChannelsStep.tsx');
    expect(channels).not.toContain('ctaLabel');
    // The welcome step must keep scrolling at large font scales.
    expect(welcome).toContain('<ScrollView');
    expect(welcome).toContain('flexGrow: 1');
  });

  it('NOFRAME-33 settings-prayer: role-based active label and time, stretch empty state', () => {
    const src = read('app/settings-prayer.tsx');
    expect(src).toContain("selectLabelActive: textStyle('cardTitle', { color: KhazainColors.navy800 })");
    expect(src).toContain("timeValue: textStyle('sectionTitle', { color: KhazainColors.navy800 })");
    expect(src).toMatch(/emptyState: \{[^}]*alignItems: 'stretch'/);
  });

  it('NOFRAME-34 the crash fallback uses roles, the page palette and PillButton', () => {
    const src = read('app/_layout.tsx');
    const block = src.slice(src.indexOf('const fallbackStyles'));
    expect(block).toContain("textStyle('bodyLarge'");
    expect(block).toContain("textStyle('bodyCompact'");
    expect(block).toContain('KhazainColors.pageBg');
    expect(block).not.toContain('Colors.light');
    expect(src).toContain('<PillButton label="إعادة المحاولة"');
  });
});

describe('NOFRAME-23 settings-font-size LevelRow', () => {
  const src = read('app/settings-font-size.tsx');
  it('uses reciter density, a hairlineWarm overlay frame and no shadow', () => {
    expect(src).toContain('CARD_DENSITY.reciterRowMinHeight');
    expect(src).toContain('CARD_DENSITY.reciterRowRadius');
    expect(src).toContain('KhazainColors.hairlineWarm');
    expect(src).toContain('styles.frame');
    expect(src).not.toContain('KhazainShadows');
  });
  it('takes its label from bodyCompact but keeps the per-level size', () => {
    expect(src).toContain("...textStyle('bodyCompact', { color: KhazainColors.inkTitle })");
    expect(src).toMatch(/\[styles\.rowLabel, \{ fontSize,/);
    expect(src).not.toContain('Amiri-Bold');
  });
});

describe('weight decisions', () => {
  it('SettingsToggleRow title matches the value row (bodyCompact)', () => {
    expect(read('components/khazain/settings/SettingsToggleRow.tsx')).toContain(
      "textStyle('bodyCompact', { color: KhazainColors.inkTitle })",
    );
  });
  it('the suggestion banner sentence is Regular', () => {
    expect(read('components/khazain/library/WirdSuggestionBanner.tsx')).toContain(
      "message: textStyle('bodyCompact'",
    );
  });
});
