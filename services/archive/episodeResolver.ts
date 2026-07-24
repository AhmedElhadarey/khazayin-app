export interface ArchiveEpisode {
  id: string;
  archiveId: string;
  name: string;
  title: string;
  trackNumber: number;
  url: string;
  durationSec: number;
}

interface ArchiveFile {
  name?: string;
  title?: string;
  track?: string;
  length?: string;
  format?: string;
  source?: string;
}
interface ArchiveMetadata {
  files?: ArchiveFile[];
}

type NamedFile = ArchiveFile & { name: string };

export function buildDownloadUrl(archiveId: string, name: string): string {
  const encodedName = name.split('/').map(encodeURIComponent).join('/');
  return `https://archive.org/download/${encodeURIComponent(archiveId)}/${encodedName}`;
}

/** Parse an archive.org `track` field ("2", "001/114", …). Undefined when absent/unparseable. */
function parseTrack(track: string | undefined): number | undefined {
  if (track) {
    const n = parseInt(track.split('/')[0], 10);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Parse an archive.org `length` field: decimal seconds ("460.07") or colon time ("7:40", "1:02:03"). */
export function parseLength(len?: string): number {
  if (!len) return 0;
  if (len.includes(':')) {
    const parts = len.split(':').map(Number);
    if (parts.some((n) => !Number.isFinite(n))) return 0;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = parseFloat(len);
  return Number.isFinite(n) ? n : 0;
}

/** Keep `candidate` over `existing` only when it upgrades a derivative to the original source. */
function preferOriginal(existing: NamedFile | undefined, candidate: NamedFile): boolean {
  return !existing || (existing.source !== 'original' && candidate.source === 'original');
}

export function resolveEpisodes(archiveId: string, meta: ArchiveMetadata): ArchiveEpisode[] {
  const files = (meta.files ?? []).filter(
    (f): f is NamedFile => typeof f.name === 'string' && f.name.toLowerCase().endsWith('.mp3'),
  );

  // Tracked files: dedupe by real track number, prefer source === 'original'.
  const tracked = new Map<number, NamedFile>();
  // Untracked files: dedupe by name, keep original file order (Map preserves insertion order).
  const untracked = new Map<string, NamedFile>();

  for (const f of files) {
    const t = parseTrack(f.track);
    if (t !== undefined) {
      if (preferOriginal(tracked.get(t), f)) tracked.set(t, f);
    } else if (preferOriginal(untracked.get(f.name), f)) {
      untracked.set(f.name, f);
    }
  }

  const trackedEntries = [...tracked.entries()].sort(([a], [b]) => a - b);
  const maxTrackedNumber = trackedEntries.length
    ? trackedEntries[trackedEntries.length - 1][0]
    : 0;
  const ordered: Array<[number, NamedFile]> = [
    ...trackedEntries,
    ...[...untracked.values()].map((f, i): [number, NamedFile] => [maxTrackedNumber + 1 + i, f]),
  ];

  return ordered.map(([trackNumber, f]) => ({
    id: `${archiveId}/${f.name}`,
    archiveId,
    name: f.name,
    title: f.title && f.title.trim() ? f.title : f.name,
    trackNumber,
    url: buildDownloadUrl(archiveId, f.name),
    durationSec: parseLength(f.length),
  }));
}
