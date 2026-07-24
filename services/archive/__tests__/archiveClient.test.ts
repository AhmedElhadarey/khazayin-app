import { fetchItemMetadata, ArchiveError, __clearArchiveMetaCache } from '../archiveClient';

describe('fetchItemMetadata', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    __clearArchiveMetaCache();
  });

  it('GETs the archive metadata endpoint and returns parsed JSON', async () => {
    const body = { server: 's', dir: '/d', files: [{ name: '001.mp3' }] };
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    global.fetch = f as any;

    const meta = await fetchItemMetadata('002_20210904');

    expect(f).toHaveBeenCalledTimes(1);
    const [url, opts] = f.mock.calls[0];
    expect(url).toBe('https://archive.org/metadata/002_20210904');
    expect(opts).toEqual(expect.objectContaining({ signal: expect.anything() }));
    expect(meta.files![0].name).toBe('001.mp3');
  });

  it('caches by archiveId — second call does not re-fetch', async () => {
    const body = { files: [] };
    const f = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
    global.fetch = f as any;

    await fetchItemMetadata('X');
    await fetchItemMetadata('X');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('throws ArchiveError on non-200', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }) as any;
    await expect(fetchItemMetadata('missing')).rejects.toBeInstanceOf(ArchiveError);
  });

  it('does not cache failures — a failed fetch can be retried', async () => {
    const f = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ files: [] }) });
    global.fetch = f as any;
    await expect(fetchItemMetadata('Y')).rejects.toBeInstanceOf(ArchiveError);
    await expect(fetchItemMetadata('Y')).resolves.toBeDefined();
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('wraps network rejection in ArchiveError', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('boom')) as any;
    await expect(fetchItemMetadata('Z')).rejects.toBeInstanceOf(ArchiveError);
  });
});
