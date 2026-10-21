import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * The prototype ends with Home moving in from the bottom over the splash
 * (2007:511 → 2001:940, MOVE_FROM_BOTTOM). That makes the splash a layer
 * *under* the navigator, and the navigator the thing that moves — so the root
 * wiring is part of the spec. See docs/plans/2026-10-22-launch-steps-design.md.
 */
describe('the root lays the splash under a moving navigator', () => {
  const layout = read('app/_layout.tsx');

  it('draws the overlay before the navigator, so Home slides over it', () => {
    const overlay = layout.indexOf('<LaunchSequence');
    // `<Stack\s` is the element; `<Stack>` also appears in comments.
    const navigator = layout.search(/<Stack\s/);
    expect(overlay).toBeGreaterThan(-1);
    expect(navigator).toBeGreaterThan(overlay);
  });

  it('moves the navigator with the launch reveal', () => {
    expect(layout).toMatch(/useLaunchReveal\(/);
    expect(layout).toMatch(/launchReveal\.style/);
  });

  it('keeps a moving Home from taking taps or being read out', () => {
    // R7: an off-screen Home must not be reachable for 7.8 s.
    expect(layout).toMatch(/pointerEvents=\{showLaunch \? 'none' : 'auto'\}/);
    expect(layout).toMatch(/accessibilityElementsHidden=\{showLaunch\}/);
    expect(layout).toMatch(/importantForAccessibility=\{showLaunch \? 'no-hide-descendants' : 'auto'\}/);
  });

  it('waits for the onboarding decision, not just the navigator', () => {
    // R4: revealing before it would slide Home up, then swap in onboarding.
    expect(layout).toMatch(/onboardingDecided=\{onboardingDecided\}/);
    expect(layout).toMatch(/const onboardingDecided = useOnboardingRedirect\(navigatorReady\)/);
  });
});

describe('the overlay keeps the launch alive across re-renders', () => {
  it('never lists the reveal object as an effect dependency', () => {
    // An effect whose cleanup resets the navigator and calls onDone would end
    // the launch on the next root re-render if it depended on an object that
    // is rebuilt each render. It depends on the shared values instead, which
    // keep their identity for the component's life.
    const src = read('components/khazain/launch/LaunchSequence.tsx');
    expect(src).not.toMatch(/\[[^\]]*\breveal\b[^.\]]*\]\s*,?\s*\)/);
  });
});

describe('the first screens a launch can reveal', () => {
  // R6: the native SafeAreaView reads its insets from where it sits on screen,
  // so one shifted down by the screen height would jump when it lands.
  it.each(['app/(tabs)/index.tsx', 'app/onboarding.tsx'])('%s pads with the inset hook', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/<SafeAreaView/);
    expect(src).toMatch(/useSafeAreaInsets\(\)/);
  });
});
