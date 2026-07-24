import { resolveEpisodes, buildDownloadUrl, parseLength } from '../episodeResolver';
import meta from '../__fixtures__/meta-002_20210904.json';

describe('buildDownloadUrl', () => {
  it('builds a canonical archive.org download url', () => {
    expect(buildDownloadUrl('002_20210904', '001.mp3'))
      .toBe('https://archive.org/download/002_20210904/001.mp3');
  });
  it('leaves the common case unchanged', () => {
    expect(buildDownloadUrl('ABC', '001.mp3'))
      .toBe('https://archive.org/download/ABC/001.mp3');
  });
  it('percent-encodes reserved characters in the file name (L7)', () => {
    expect(buildDownloadUrl('ABC', 'my file#1.mp3'))
      .toBe('https://archive.org/download/ABC/my%20file%231.mp3');
  });
  it('encodes per path segment, preserving "/" separators', () => {
    expect(buildDownloadUrl('ABC', 'dir one/a+b.mp3'))
      .toBe('https://archive.org/download/ABC/dir%20one/a%2Bb.mp3');
  });
});

describe('parseLength', () => {
  it('parses plain decimal seconds', () => {
    expect(parseLength('460.07')).toBeCloseTo(460.07, 2);
  });
  it('parses MM:SS', () => {
    expect(parseLength('7:40')).toBe(460);
  });
  it('parses H:MM:SS', () => {
    expect(parseLength('1:02:03')).toBe(3723);
  });
  it('returns 0 for empty / undefined / garbage', () => {
    expect(parseLength('')).toBe(0);
    expect(parseLength(undefined)).toBe(0);
    expect(parseLength('abc')).toBe(0);
    expect(parseLength('1:xx')).toBe(0);
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
  it('keeps both tracked and untracked files without collision (M2)', () => {
    const eps = resolveEpisodes('x', {
      files: [
        { name: 'a.mp3', track: '2', source: 'original' },
        { name: 'b.mp3', source: 'original' },
      ],
    } as any);
    expect(eps).toHaveLength(2);
    expect(eps[0].name).toBe('a.mp3');
    expect(eps[0].trackNumber).toBe(2);
    expect(eps[1].name).toBe('b.mp3');
    expect(eps[1].trackNumber).toBe(3);
  });
  it('preserves original file order for all-untracked files (M2)', () => {
    const eps = resolveEpisodes('x', {
      files: [
        { name: 'zeta.mp3', source: 'original' },
        { name: 'alpha.mp3', source: 'original' },
        { name: 'mid.mp3', source: 'original' },
      ],
    } as any);
    expect(eps.map((e) => e.name)).toEqual(['zeta.mp3', 'alpha.mp3', 'mid.mp3']);
    expect(eps.map((e) => e.trackNumber)).toEqual([1, 2, 3]);
  });
  it('dedupes untracked files by name, preferring the original source', () => {
    const eps = resolveEpisodes('x', {
      files: [
        { name: 'a.mp3', source: 'derivative' },
        { name: 'a.mp3', source: 'original', title: 'kept' },
      ],
    } as any);
    expect(eps).toHaveLength(1);
    expect(eps[0].title).toBe('kept');
  });
  it('parses colon-formatted lengths into seconds (M3)', () => {
    const eps = resolveEpisodes('x', {
      files: [{ name: 'a.mp3', track: '1', length: '7:40', source: 'original' }],
    } as any);
    expect(eps[0].durationSec).toBe(460);
  });
});
