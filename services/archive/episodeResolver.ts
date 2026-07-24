import type { PlayerTrack } from '@/store/playerStore';

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

export function buildDownloadUrl(archiveId: string, name: string): string {
  return `https://archive.org/download/${archiveId}/${encodeURI(name)}`;
}

function parseTrack(track: string | undefined, fallbackIndex: number): number {
  if (track) {
    const n = parseInt(track.split('/')[0], 10);
    if (Number.isFinite(n)) return n;
  }
  return fallbackIndex + 1;
}

export function resolveEpisodes(archiveId: string, meta: ArchiveMetadata): ArchiveEpisode[] {
  const files = (meta.files ?? []).filter(
    (f): f is ArchiveFile & { name: string } =>
      typeof f.name === 'string' && f.name.toLowerCase().endsWith('.mp3'),
  );
  const byTrack = new Map<number, ArchiveFile & { name: string }>();
  files.forEach((f, i) => {
    const t = parseTrack(f.track, i);
    const existing = byTrack.get(t);
    if (!existing || (existing.source !== 'original' && f.source === 'original')) {
      byTrack.set(t, f);
    }
  });
  return [...byTrack.entries()]
    .sort(([a], [b]) => a - b)
    .map(([trackNumber, f]) => {
      const len = f.length ? parseFloat(f.length) : 0;
      return {
        id: `${archiveId}/${f.name}`,
        archiveId,
        name: f.name,
        title: f.title && f.title.trim() ? f.title : f.name,
        trackNumber,
        url: buildDownloadUrl(archiveId, f.name),
        durationSec: Number.isFinite(len) ? len : 0,
      };
    });
}

/** Map a resolved episode to the PlayerTrack shape the MiniPlayer renders. */
export function episodeToPlayerTrack(ep: ArchiveEpisode, scholar: string): PlayerTrack {
  return { id: ep.id, title: ep.title, reciter: scholar, durationSec: ep.durationSec };
}
