import { resolveEpisodes, buildDownloadUrl } from '../episodeResolver';
import meta from '../__fixtures__/meta-002_20210904.json';

describe('buildDownloadUrl', () => {
  it('builds a canonical archive.org download url', () => {
    expect(buildDownloadUrl('002_20210904', '001.mp3'))
      .toBe('https://archive.org/download/002_20210904/001.mp3');
  });
});

describe('resolveEpisodes', () => {
  const eps = resolveEpisodes('002_20210904', meta as any);
  it('keeps only mp3 files', () => {
    expect(eps.every((e) => e.name.toLowerCase().endsWith('.mp3'))).toBe(true);
    expect(eps.length).toBe(3);
  });
  it('dedupes derivative duplicates — one entry per track number', () => {
    expect(eps.filter((e) => e.trackNumber === 1)).toHaveLength(1);
    expect(eps.find((e) => e.trackNumber === 1)!.name).toBe('001.mp3');
  });
  it('sorts ascending by track number', () => {
    const nums = eps.map((e) => e.trackNumber);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
    expect(nums).toEqual([1, 2, 3]);
  });
  it('parses duration seconds, builds url and stable id', () => {
    expect(eps[0].durationSec).toBeCloseTo(460.07, 1);
    expect(eps[0].url).toBe('https://archive.org/download/002_20210904/001.mp3');
    expect(eps[0].id).toBe('002_20210904/001.mp3');
  });
  it('falls back to name when title missing', () => {
    const noTitle = resolveEpisodes('x', { files: [{ name: '007.mp3', format: 'VBR MP3', source: 'original' }] } as any);
    expect(noTitle[0].title).toBe('007.mp3');
  });
});
