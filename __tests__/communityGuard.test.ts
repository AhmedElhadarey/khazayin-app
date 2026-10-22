/**
 * Route guard (design §3.2). `guardRedirect` is pure; the hook only wires it
 * to the store and to expo-router.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { guardRedirect, guardDecision } from '@/hooks/useCommunityGuard';

// The hook module imports the persisted store; the pure function needs none of it.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('guardRedirect', () => {
  it('sends a hidden More route back to More', () => {
    expect(guardRedirect('hidden', 'open', '/more/community/join')).toBe('/(tabs)/more');
    expect(guardRedirect('hidden', 'intro', '/more/community')).toBe('/(tabs)/more');
  });

  it('sends a hidden discussion route to the Sections root', () => {
    expect(guardRedirect('hidden', 'open', '/sections/discussion/L1')).toBe('/(tabs)/sections');
    expect(guardRedirect('hidden', 'open', '/sections/discussion')).toBe('/(tabs)/sections');
  });

  it('sends intro access on an open-only route to the hub', () => {
    expect(guardRedirect('intro', 'open', '/more/community/create')).toBe('/(tabs)/more/community');
    expect(guardRedirect('intro', 'open', '/sections/discussion/L1')).toBe('/(tabs)/more/community');
  });

  it('lets a satisfied route through', () => {
    expect(guardRedirect('open', 'open', '/more/community/join')).toBeNull();
    expect(guardRedirect('intro', 'intro', '/more/community')).toBeNull();
    expect(guardRedirect('open', 'intro', '/more/community/guidelines')).toBeNull();
  });
});

describe('guardDecision', () => {
  const at = '/more/community/join';

  it('does not redirect, and does not render, before the store has hydrated', () => {
    expect(guardDecision('hidden', 'open', at, { focused: true, hydrated: false })).toEqual({
      allowed: false,
      redirectTo: null,
    });
  });

  it('does not redirect from an unfocused screen', () => {
    // usePathname() is global in expo-router 6: a mounted-but-hidden screen
    // sees the focused screen's path and must not navigate on its behalf.
    expect(guardDecision('hidden', 'open', '/more/settings', { focused: false, hydrated: true })).toEqual({
      allowed: false,
      redirectTo: null,
    });
  });

  it('redirects a focused, hydrated screen', () => {
    expect(guardDecision('hidden', 'open', at, { focused: true, hydrated: true })).toEqual({
      allowed: false,
      redirectTo: '/(tabs)/more',
    });
    expect(guardDecision('intro', 'open', at, { focused: true, hydrated: true }).redirectTo).toBe(
      '/(tabs)/more/community',
    );
  });

  it('allows a satisfied route once hydrated', () => {
    expect(guardDecision('open', 'open', at, { focused: false, hydrated: true })).toEqual({
      allowed: true,
      redirectTo: null,
    });
  });
});

describe('useCommunityGuard wiring', () => {
  const src = readFileSync(join(__dirname, '..', 'hooks/useCommunityGuard.ts'), 'utf8');

  it('gates navigation on focus and hydration', () => {
    expect(src).toMatch(/useIsFocused/);
    expect(src).toMatch(/@react-navigation\/native/);
    expect(src).toMatch(/persist\.hasHydrated\(\)/);
    expect(src).toMatch(/persist\.onFinishHydration/);
    expect(src).toMatch(/if \(redirectTo\) router\.replace/);
  });
});
