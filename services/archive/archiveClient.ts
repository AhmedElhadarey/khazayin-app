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
const TIMEOUT_MS = 10_000;

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
