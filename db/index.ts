/**
 * Platform-aware singletons for the progress-tracking repositories. App code
 * imports `progressRepo`, `lectureRepo`, `wirdRepo`, `achievementsRepo`, and
 * `resetFacade` from here — never reach into `db/repositories/*` directly.
 *
 * Native: opens the SQLite handle once, builds the repo objects on first use.
 * Web   : returns the AsyncStorage-backed shim (research R2).
 */

import { Platform } from 'react-native';
import { createWebRepos } from './web-shim';
import type {
  AchievementsRepository,
  LectureSessionsRepository,
  PageReadsRepository,
  ProgressResetFacade,
  Repos,
  WirdRepository,
} from './types';

let cached: Repos | null = null;
let initPromise: Promise<Repos> | null = null;

async function init(): Promise<Repos> {
  if (cached) return cached;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (Platform.OS === 'web') {
      cached = createWebRepos();
      return cached;
    }
    // Native: dynamically import the SQLite client to keep the web bundle
    // free of `expo-sqlite`'s native module references.
    const [{ openDb }, pageReadsMod, lectureMod, wirdMod, achievementsMod, resetMod] =
      await Promise.all([
        import('./client'),
        import('./repositories/pageReads'),
        import('./repositories/lectureSessions'),
        import('./repositories/wird'),
        import('./repositories/achievements'),
        import('./repositories/reset'),
      ]);
    const db = await openDb();
    cached = {
      pageReads: pageReadsMod.createPageReadsRepository(db),
      lectureSessions: lectureMod.createLectureSessionsRepository(db),
      wird: wirdMod.createWirdRepository(db),
      achievements: achievementsMod.createAchievementsRepository(db),
      reset: resetMod.createResetFacade(db),
    };
    return cached;
  })().catch((err: unknown) => {
    // Do NOT cache the rejection. A transient failure (corrupt file, migration
    // throw, open error) must not permanently brick the app: clear the cached
    // promise so the next getRepos() retries from scratch.
    initPromise = null;
    throw err;
  });
  return initPromise;
}

export async function getRepos(): Promise<Repos> {
  return init();
}

/**
 * Sync-lazy accessors used by stores. They throw if `init()` hasn't resolved
 * yet — the boot hydration in `app/_layout.tsx` is responsible for awaiting
 * `getRepos()` before any UI consumer runs.
 */
function requireRepos(): Repos {
  if (!cached) {
    throw new Error(
      '[db] repos accessed before hydration. Call getRepos() from app boot first.',
    );
  }
  return cached;
}

export const progressRepo: PageReadsRepository = new Proxy({} as PageReadsRepository, {
  get(_t, prop) {
    const r = requireRepos().pageReads as unknown as Record<string, unknown>;
    return r[prop as string];
  },
});

export const lectureRepo: LectureSessionsRepository = new Proxy(
  {} as LectureSessionsRepository,
  {
    get(_t, prop) {
      const r = requireRepos().lectureSessions as unknown as Record<string, unknown>;
      return r[prop as string];
    },
  },
);

export const wirdRepo: WirdRepository = new Proxy({} as WirdRepository, {
  get(_t, prop) {
    const r = requireRepos().wird as unknown as Record<string, unknown>;
    return r[prop as string];
  },
});

export const achievementsRepo: AchievementsRepository = new Proxy(
  {} as AchievementsRepository,
  {
    get(_t, prop) {
      const r = requireRepos().achievements as unknown as Record<string, unknown>;
      return r[prop as string];
    },
  },
);

export const resetFacade: ProgressResetFacade = new Proxy({} as ProgressResetFacade, {
  get(_t, prop) {
    const r = requireRepos().reset as unknown as Record<string, unknown>;
    return r[prop as string];
  },
});

/** Test/reset utility — never call from app code. */
export function __resetReposForTesting(): void {
  cached = null;
  initPromise = null;
}
