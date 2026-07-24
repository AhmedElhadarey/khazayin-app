/**
 * cacheFacade — registry-based, user-content-safe cache clear.
 *
 * Contract: specs/002-settings-screen/contracts/cache-facade.contract.md
 *
 * Safety boundary: this module has NO implicit knowledge of any cache
 * location. It clears ONLY what callers have explicitly registered via
 * `registerCacheRoot()`. This is intentional and load-bearing — it is the
 * guarantee that `clearAppCache()` cannot ever delete user-generated
 * content (notes, settings, saved, navigation, the SQLite DB).
 *
 * Consequences (enforced by tests in `__tests__/cacheFacade.test.ts`):
 *  - NO `AsyncStorage.clear()` call.
 *  - NO `expo-file-system` import.
 *  - NO `expo-sqlite` import.
 *
 * Consumers (e.g. `app/_layout.tsx`) register their cache roots at module
 * load. For v1, only the image cache is registered (id: 'expo-image').
 */

export type CacheRootKind = 'image' | 'audio' | 'other';

export type CacheRoot = Readonly<{
  /** Stable id for the producer (e.g., 'expo-image', 'audio-downloader'). */
  id: string;
  /** Kind of cache the producer owns. */
  kind: CacheRootKind;
  /** Returns the byte count cleared (best-effort, 0 if not measurable). */
  clear: () => Promise<number>;
}>;

export type CacheClearResult = Readonly<{
  /** Sum of bytes reported by registered roots, grouped by kind. */
  byKind: Record<CacheRootKind, number>;
  /** Total across all kinds. */
  total: number;
}>;

const roots: Map<string, CacheRoot> = new Map();

export function registerCacheRoot(root: CacheRoot): void {
  // Set semantics — same id overwrites the previous registration.
  roots.set(root.id, root);
}

export function listCacheRoots(): ReadonlyArray<CacheRoot> {
  return Array.from(roots.values());
}

export async function clearAppCache(): Promise<CacheClearResult> {
  const snapshot = Array.from(roots.values());

  const byKind: Record<CacheRootKind, number> = {
    image: 0,
    audio: 0,
    other: 0,
  };

  const results = await Promise.allSettled(
    snapshot.map((root) => root.clear()),
  );

  results.forEach((result, index) => {
    const root = snapshot[index];
    if (result.status === 'fulfilled') {
      const bytes = Number.isFinite(result.value) ? result.value : 0;
      byKind[root.kind] += bytes > 0 ? bytes : 0;
      return;
    }
    if (__DEV__) {
      // Dev-only diagnostic; production stays silent so a failing root
      // never surfaces a warning to end users.
      // eslint-disable-next-line no-console
      console.warn(
        `[cacheFacade] root "${root.id}" (${root.kind}) failed to clear:`,
        result.reason,
      );
    }
  });

  const total = byKind.image + byKind.audio + byKind.other;
  return { byKind, total };
}
