/**
 * Route guard for every community route (design §3.2).
 *
 * `guardRedirect` is pure so the table is testable; the hook reads the access
 * level from the local store and redirects with expo-router.
 */
import { useIsFocused } from '@react-navigation/native';
import { useRouter, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { COMMUNITY_MODE } from '@/services/community/config';
import { communityAccess, type CommunityAccess } from '@/services/community/gate';
import { useCommunityLocalStore } from '@/store/communityLocalStore';

export type RequiredAccess = 'intro' | 'open';

const MORE_ROOT = '/(tabs)/more';
const HUB = '/(tabs)/more/community';
const SECTIONS_ROOT = '/(tabs)/sections';

/** `usePathname` omits group segments: `/sections/discussion/L1`. */
const isDiscussionRoute = (pathname: string) => /(^|\/)sections\/discussion(\/|$)/.test(pathname);

/**
 * Where to send the user, or `null` to let the route render.
 *  - `hidden` (mode off, or deletion pending): back to More, or to the
 *    Sections root for a discussion route;
 *  - `intro` on a route that needs `open`: the hub, where the intro lives.
 */
export function guardRedirect(
  access: CommunityAccess,
  required: RequiredAccess,
  pathname: string,
): string | null {
  if (access === 'hidden') return isDiscussionRoute(pathname) ? SECTIONS_ROOT : MORE_ROOT;
  if (required === 'open' && access === 'intro') return HUB;
  return null;
}

/**
 * The hook's whole decision, pure so it is testable without a renderer.
 *  - Before the persisted store has hydrated, access is a default (`intro`),
 *    not the truth: render nothing and navigate nowhere.
 *  - `usePathname()` is global in expo-router 6, so every mounted screen sees
 *    the focused screen's path. Only the focused screen may navigate;
 *    otherwise a paused discussion screen behind Settings would pull the user
 *    to the hub, and a deletion would fire one replace per mounted screen.
 */
export function guardDecision(
  access: CommunityAccess,
  required: RequiredAccess,
  pathname: string,
  state: { focused: boolean; hydrated: boolean },
): { allowed: boolean; redirectTo: string | null } {
  if (!state.hydrated) return { allowed: false, redirectTo: null };
  const target = guardRedirect(access, required, pathname);
  return { allowed: target === null, redirectTo: state.focused ? target : null };
}

/** True once the persisted community store has finished rehydrating. */
function useCommunityHydrated(): boolean {
  const { persist } = useCommunityLocalStore;
  const [hydrated, setHydrated] = useState(() => persist.hasHydrated());
  useEffect(() => {
    // Hydration may have finished between the first render and this effect.
    setHydrated(persist.hasHydrated());
    return persist.onFinishHydration(() => setHydrated(true));
  }, [persist]);
  return hydrated;
}

/** Current access level, computed from the persisted profile and mode. */
export function useCommunityAccess(): CommunityAccess {
  const optedIn = useCommunityLocalStore((s) => s.prefs.optedIn);
  const guidelinesVersion = useCommunityLocalStore((s) => s.prefs.guidelinesVersion);
  const deletion = useCommunityLocalStore((s) => s.deletion);
  return communityAccess(COMMUNITY_MODE, { optedIn, guidelinesVersion, deletion });
}

/**
 * Call at the top of a community screen. Returns `true` when the route may
 * render; the screen should render nothing while it is `false`.
 */
export function useCommunityGuard(required: RequiredAccess): boolean {
  const access = useCommunityAccess();
  const pathname = usePathname();
  const router = useRouter();
  const focused = useIsFocused();
  const hydrated = useCommunityHydrated();
  const { allowed, redirectTo } = guardDecision(access, required, pathname, { focused, hydrated });

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo as any);
  }, [redirectTo, router]);

  return allowed;
}
