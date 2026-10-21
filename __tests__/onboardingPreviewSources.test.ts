import {
  ONBOARDING_POPULAR_RECITER_IDS,
  ONBOARDING_RECITER_PREVIEW_SOURCES,
} from '@/constants/settings';
import { RECITERS } from '@/data/content/quran';
import { buildDownloadUrl } from '@/services/archive/episodeResolver';

describe('onboarding preview sources (user decision Q1: verified files only)', () => {
  it('F8: at least one verified source ships', () => {
    expect(Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES).length).toBeGreaterThan(0);
  });
  it('F8: every curated reciter has a verified source, and the curated list IS the verified list', () => {
    expect([...ONBOARDING_POPULAR_RECITER_IDS]).toEqual(
      Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES),
    );
    for (const id of ONBOARDING_POPULAR_RECITER_IDS) {
      expect(ONBOARDING_RECITER_PREVIEW_SOURCES[id]).toBeDefined();
    }
  });
  it('F8: every source belongs to a reciter in the catalogue', () => {
    const ids = RECITERS.map((r) => r.id);
    for (const id of Object.keys(ONBOARDING_RECITER_PREVIEW_SOURCES)) expect(ids).toContain(id);
  });
  it('F8: every source is a direct archive.org mp3', () => {
    for (const { archiveId, file } of Object.values(ONBOARDING_RECITER_PREVIEW_SOURCES)) {
      expect(archiveId).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(file).toMatch(/\.mp3$/i);
      expect(buildDownloadUrl(archiveId, file)).toMatch(/^https:\/\/archive\.org\/download\//);
    }
  });
  it('does not touch Reciter.archiveId (design §9: surah list would play episode 0)', () => {
    expect(RECITERS.every((r) => r.archiveId === undefined)).toBe(true);
  });
});
