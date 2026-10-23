/**
 * NOFRAME-25/26/30. No Figma frame: constants/layout.ts (MIN_TOUCH_TARGET),
 * theme.ts and typography.ts are the authority.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('OnboardingFooter touch targets', () => {
  const src = read('components/khazain/onboarding/OnboardingFooter.tsx');
  it('gives both links a 44pt target', () => {
    expect(src).toMatch(/link: \{[^}]*minHeight: MIN_TOUCH_TARGET[^}]*minWidth: MIN_TOUCH_TARGET[^}]*justifyContent: 'center'/);
    expect((src.match(/style=\{styles\.link\}/g) ?? []).length).toBe(2);
    expect((src.match(/hitSlop=\{\{ left: 8, right: 8 \}\}/g) ?? []).length).toBe(2);
    expect(src).toMatch(/minHeight: MIN_TOUCH_TARGET,\s*\}/);
  });
});

describe('OnboardingProgress', () => {
  it('draws inactive dots as an ink400 ring (cream400 is 1.51:1 on pageBg)', () => {
    const src = read('components/khazain/onboarding/OnboardingProgress.tsx');
    expect(src).toMatch(
      /dot: \{[^}]*width: 8,[^}]*height: 8,[^}]*borderRadius: 4,[^}]*borderWidth: 1\.5,[^}]*borderColor: KhazainColors\.ink400,[^}]*backgroundColor: 'transparent'/,
    );
    expect(src).toMatch(/dotDone: \{\s*borderWidth: 0,/);
    expect(src).toMatch(/dotActive: \{\s*borderWidth: 0,/);
    expect(src).not.toMatch(/cream400|KhazainColors\.cardBorder/);
  });
});

describe('settings-about', () => {
  const src = read('app/settings-about.tsx');
  it('shows version and build in Arabic-Indic digits, isolated LTR', () => {
    expect(src).toMatch(/isolatedDigits\(version\)/);
    expect(src).toMatch(/isolatedDigits\(build \?\? '—'\)/);
    expect(src).toMatch(/toArabicDigits/);
  });
  it('uses the Wordmark, 16 padding and a 44pt licence link', () => {
    expect(src).toMatch(/<Wordmark size=\{22\} color=\{KhazainColors\.navy900\}/);
    expect(src).not.toMatch(/Amiri-Bold|paddingHorizontal: 18/);
    expect(src).toMatch(/minHeight: MIN_TOUCH_TARGET/);
  });
});

describe.each(['font-size', 'wird-goal', 'wird-reminder'])('settings-%s footer', (name) => {
  const src = read(`app/settings-${name}.tsx`);
  it('uses PillButton and the cardBorder rule', () => {
    expect(src).toMatch(/<PillButton variant="navy" label="تطبيق" onPress=\{apply\} style=\{styles\.applyBtn\} \/>/);
    expect(src).toMatch(/applyBtn: \{ width: '100%' \}/);
    expect(src).toMatch(/borderTopColor: KhazainColors\.cardBorder/);
    expect(src).not.toMatch(/applyBtnLabel/);
  });
});

describe('settings-prayer locate button', () => {
  const src = read('app/settings-prayer.tsx');
  it('is a navy PillButton', () => {
    expect(src).toMatch(/<PillButton[\s\S]*?variant="navy"[\s\S]*?disabled=\{busy\}/);
    expect(src).not.toMatch(/locateBtnLabel/);
  });
});

describe('untokenised fills', () => {
  it('FontSizePreview and the notifications banner use tokens', () => {
    expect(read('components/khazain/settings/FontSizePreview.tsx')).toMatch(/backgroundColor: KhazainColors\.cream200/);
    const n = read('app/settings-notifications.tsx');
    expect(n).not.toMatch(/#FCE9D6|rgba\(141,107,52,0\.18\)/);
    expect(n).toMatch(/borderRadius: KhazainRadius\.md/);
  });
});
