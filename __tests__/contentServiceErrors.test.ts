jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import fs from 'fs';
import path from 'path';
import { request } from '@/services/api/client';
import { arabicCopyForCode, isApiError, makeApiError, toApiError } from '@/services/api/errors';
import { mockAdapter, SIMULATED_ERROR_MESSAGE } from '@/services/contentService';

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

describe('isApiError', () => {
  it('accepts errors built by toApiError', () => {
    expect(isApiError(toApiError(new TypeError('offline')))).toBe(true);
  });
  it('rejects plain Errors, nullish and non-errors', () => {
    expect(isApiError(new Error('boom'))).toBe(false);
    expect(isApiError(null)).toBe(false);
    expect(isApiError(undefined)).toBe(false);
    expect(isApiError({ name: 'ApiError', code: 'unknown' })).toBe(false); // not an Error
  });
});

describe('makeApiError', () => {
  it('defaults to the canonical Arabic copy and not retriable', () => {
    const e = makeApiError('server');
    expect(isApiError(e)).toBe(true);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe('ApiError');
    expect(e.code).toBe('server');
    expect(e.message).toBe(arabicCopyForCode('server'));
    expect(e.retriable).toBe(false);
    expect(e).not.toHaveProperty('status');
  });
  it('takes a message and retriable override', () => {
    const e = makeApiError('unknown', { message: 'رسالة', retriable: true });
    expect(e.message).toBe('رسالة');
    expect(e.retriable).toBe(true);
  });
});

describe('community error copy', () => {
  it.each([
    ['moderation', 'لم تُنشر المشاركة لأنها تخالف إرشادات المجتمع. يُرجى مراجعتها.'],
    ['conflict', 'تعذّر إتمام الطلب لتعارضه مع تغيير آخر. حدّث الصفحة وحاول مجددًا.'],
  ] as const)('%s', (code, copy) => {
    expect(arabicCopyForCode(code)).toBe(copy);
    expect(copy).not.toMatch(/[A-Za-z]/);
    expect(makeApiError(code).message).toBe(copy);
  });
});

describe('toApiError classification (pinned before the makeApiError refactor)', () => {
  it.each([
    ['HTTP 500', () => toApiError(undefined, 500), 'server', true, 500],
    ['HTTP 404', () => toApiError(undefined, 404), 'notFound', false, 404],
    ['HTTP 429', () => toApiError(undefined, 429), 'rateLimit', true, 429],
    ['HTTP 418', () => toApiError(undefined, 418), 'unknown', false, 418],
    ['AbortError', () => toApiError(Object.assign(new Error('a'), { name: 'AbortError' })), 'timeout', false, undefined],
    ['TypeError', () => toApiError(new TypeError('offline')), 'network', true, undefined],
    ['plain Error', () => toApiError(new Error('boom')), 'unknown', false, undefined],
    ['non-error', () => toApiError('x'), 'unknown', false, undefined],
  ] as const)('%s', (_label, build, code, retriable, status) => {
    const e = build();
    expect(isApiError(e)).toBe(true);
    expect(e.code).toBe(code);
    expect(e.retriable).toBe(retriable);
    expect(e.message).toBe(arabicCopyForCode(code));
    expect(e.status).toBe(status);
  });
  it('keeps the original stack for debugging', () => {
    const src = new TypeError('offline');
    expect(toApiError(src).stack).toBe(src.stack);
  });
});

describe('client cursor guard', () => {
  const saved = process.env.EXPO_PUBLIC_API_BASE;
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_API_BASE;
    else process.env.EXPO_PUBLIC_API_BASE = saved;
  });
  it('rejects an oversize cursor with a validation ApiError in Arabic', async () => {
    process.env.EXPO_PUBLIC_API_BASE = 'https://api.example.test';
    const err = await request({ path: '/v1/x', query: { cursor: 'a'.repeat(2049) } })
      .catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect((err as { code: string }).code).toBe('validation');
    expect((err as Error).message).toBe(arabicCopyForCode('validation'));
  });
});

describe('mockAdapter.simulateError (audit gap 3)', () => {
  const saved = { delay: mockAdapter.mockDelay, sim: mockAdapter.simulateError };
  beforeEach(() => { mockAdapter.mockDelay = 0; mockAdapter.simulateError = true; });
  afterEach(() => { mockAdapter.mockDelay = saved.delay; mockAdapter.simulateError = saved.sim; });

  it('the simulated message is Arabic with no Latin letters', () => {
    expect(SIMULATED_ERROR_MESSAGE).toMatch(ARABIC);
    expect(SIMULATED_ERROR_MESSAGE).not.toMatch(LATIN);
  });

  it('throws an ApiError carrying the Arabic copy', async () => {
    const err = await mockAdapter.quran.listReciters().catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect((err as Error).message).toBe(SIMULATED_ERROR_MESSAGE);
    expect(err).toMatchObject({ code: 'unknown', retriable: true });
  });

  it('builds the simulated error through makeApiError, not by hand', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'services/contentService.ts'), 'utf8');
    expect(src).toContain("makeApiError('unknown', { message: SIMULATED_ERROR_MESSAGE, retriable: true })");
    expect(src).not.toContain("name = 'ApiError'");
  });
});
