/**
 * services/archive/archiveClient.ts
 * ---------------------------------
 * Thin network layer over the Internet Archive item-metadata endpoint:
 *   GET https://archive.org/metadata/<archiveId>
 * Returns the raw metadata object consumed by `resolveEpisodes`. Successful
 * responses are memoised per archiveId for the app session (episode lists are
 * effectively immutable); failures are NOT cached so a retry can succeed.
 */

export interface ArchiveItemFile {
  name?: string;
  title?: string;
  track?: string;
  length?: string;
  format?: string;
  source?: string;
}

export interface ArchiveItemMetadata {
  server?: string;
  dir?: string;
  files?: ArchiveItemFile[];
}

export class ArchiveError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'ArchiveError';
  }
}

const METADATA_BASE = 'https://archive.org/metadata';
/**
 * Measured against the real endpoint, not guessed: five samples of
 * `archive.org/metadata/<id>` from this machine returned in 1.8, 2.6, 2.8, 5.2
 * and 10.3 s, with a cold first call at 17.5 s. A 10 s budget therefore aborts
 * a request that was going to succeed, and the user gets "تعذّر التشغيل" for a
 * lecture that is perfectly playable. archive.org is a slow origin and this is
 * one metadata call before playback, so waiting is cheaper than failing.
 */
const TIMEOUT_MS = 30_000;

const _cache = new Map<string, ArchiveItemMetadata>();

/** Test-only: clear the in-memory metadata cache. */
export function __clearArchiveMetaCache(): void {
  _cache.clear();
}

export async function fetchItemMetadata(archiveId: string): Promise<ArchiveItemMetadata> {
  const cached = _cache.get(archiveId);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${METADATA_BASE}/${archiveId}`, { signal: controller.signal });
    if (!res.ok) {
      throw new ArchiveError(`Archive metadata ${archiveId} failed (${res.status})`, res.status);
    }
    const meta = (await res.json()) as ArchiveItemMetadata;
    _cache.set(archiveId, meta);
    return meta;
  } catch (err) {
    if (err instanceof ArchiveError) throw err;
    throw new ArchiveError(
      `Archive metadata ${archiveId} request failed: ${(err as Error).message}`,
    );
  } finally {
    clearTimeout(timer);
  }
}
