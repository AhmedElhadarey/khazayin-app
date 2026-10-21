import { quranAdapter } from '@/services/api/httpAdapter.quran';
import { httpAdapter } from '@/services/api/httpAdapter';
import { isNotModified } from '@/services/api/types';

type Stub = { status: number; body?: unknown; etag?: string | null };

function stubFetch(...responses: Stub[]) {
  const fn = jest.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      headers: {
        get: (k: string) => (k === 'ETag' ? r.etag ?? null : null),
      },
      json: async () => r.body,
    });
  }
  (global as any).fetch = fn;
  return fn;
}

const BASE = 'https://api.example.test';
const savedBase = process.env.EXPO_PUBLIC_API_BASE;
const savedFetch = (global as any).fetch;
beforeEach(() => { process.env.EXPO_PUBLIC_API_BASE = BASE; });
afterEach(() => {
  (global as any).fetch = savedFetch;
  if (savedBase === undefined) delete process.env.EXPO_PUBLIC_API_BASE;
  else process.env.EXPO_PUBLIC_API_BASE = savedBase;
});

const urlOf = (fn: jest.Mock, call = 0) => new URL(fn.mock.calls[call][0] as string);
const headersOf = (fn: jest.Mock, call = 0) =>
  (fn.mock.calls[call][1] as { headers: Record<string, string> }).headers;

describe('quranAdapter', () => {
  it('listSurahs unwraps Paged.items and carries the ETag', async () => {
    const surah = { id: '001', number: 1, displayNumber: '٠١', name: 'الفاتحة', meta: '', revelationType: 'meccan', ayahCount: 7 };
    const f = stubFetch({ status: 200, etag: '"s1"', body: { items: [surah], nextCursor: null } });
    const res = await quranAdapter.listSurahs();
    expect(urlOf(f).pathname).toBe('/v1/surahs');
    expect(res).toEqual({ data: [surah], etag: '"s1"' });
  });

  it('listAyahs hits the per-surah path and unwraps items', async () => {
    const f = stubFetch({ status: 200, etag: null, body: { items: [{ surahId: '002', number: 1, text: 'الم' }], nextCursor: null } });
    const res = await quranAdapter.listAyahs('002');
    expect(urlOf(f).pathname).toBe('/v1/surahs/002/ayat');
    expect(isNotModified(res)).toBe(false);
    expect((res as { data: unknown[] }).data).toHaveLength(1);
  });

  it('listQiraat returns the array body as-is', async () => {
    const q = [{ id: 'q1', name: 'حفص عن عاصم' }];
    stubFetch({ status: 200, etag: '"q"', body: q });
    expect(await quranAdapter.listQiraat()).toEqual({ data: q, etag: '"q"' });
  });

  it('listReciters sends ?style= only when a style is given', async () => {
    const f = stubFetch({ status: 200, body: [] }, { status: 200, body: [] });
    await quranAdapter.listReciters('murattal');
    await quranAdapter.listReciters();
    expect(urlOf(f, 0).pathname).toBe('/v1/reciters');
    expect(urlOf(f, 0).searchParams.get('style')).toBe('murattal');
    expect(urlOf(f, 1).searchParams.has('style')).toBe(false);
  });

  it('forwards If-None-Match and passes a 304 through as NotModifiedMarker', async () => {
    const f = stubFetch({ status: 304, etag: '"r1"' });
    const res = await quranAdapter.listReciters(undefined, { ifNoneMatch: '"r1"' });
    expect(headersOf(f)['If-None-Match']).toBe('"r1"');
    expect(isNotModified(res)).toBe(true);
  });
});

describe('dawahAdapter mapping (the only field-renaming adapter)', () => {
  it('listFeatured maps imageUrl → imageSource { uri }', async () => {
    stubFetch({ status: 200, body: [
      { id: 'd1', tone: 'navy', title: 'ت', body: 'ب', imageUrl: 'https://cdn.test/1.png' },
      { id: 'd2', tone: 'gold', title: 'ت', body: 'ب' },
    ] });
    const res = await httpAdapter.dawah.listFeatured();
    const data = (res as { data: any[] }).data;
    expect(data[0].imageSource).toEqual({ uri: 'https://cdn.test/1.png' });
    expect(data[0]).not.toHaveProperty('imageUrl');
    expect(data[1].imageSource).toBeUndefined();
  });

  it('listByMonth URL-encodes the month and unwraps Paged.items', async () => {
    const f = stubFetch({ status: 200, body: { items: [{ id: 'd3', tone: 'navy', title: 'ت', body: 'ب', month: 'رمضان' }], nextCursor: null } });
    const res = await httpAdapter.dawah.listByMonth('رمضان');
    expect(urlOf(f).pathname).toBe(`/v1/dawah/months/${encodeURIComponent('رمضان')}/posters`);
    expect((res as { data: any[] }).data[0].month).toBe('رمضان');
  });
});
