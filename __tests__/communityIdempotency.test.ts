import {
  canonicalJson,
  fnv1a,
  hashPayload,
  intentKey,
  nextRequestId,
  shouldReuse,
} from '@/services/community/idempotency';
import type { ApiErrorCode } from '@/services/api/types';

const NOW = 1_790_000_000_000;
const payload = { body: 'x' };
const R0 = () => 0;
const prevWith = (lastError: ApiErrorCode | null, p: unknown = payload) => ({
  payloadHash: hashPayload(p),
  requestId: 'createPost:L1:deadbeef:old',
  lastError,
});

describe('canonicalJson', () => {
  it('ignores key order, at any depth', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
    expect(canonicalJson({ x: { d: 1, c: [{ z: 1, y: 2 }] } })).toBe(
      canonicalJson({ x: { c: [{ y: 2, z: 1 }], d: 1 } }),
    );
  });
  it('keeps array order', () => {
    expect(canonicalJson([1, 2])).not.toBe(canonicalJson([2, 1]));
  });
});

describe('fnv1a', () => {
  it('matches the published 32-bit vectors', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
    expect(fnv1a('foobar')).toBe(0xbf9cf968);
  });
  it('hashes UTF-8 bytes, so Arabic is deterministic', () => {
    // 'م' is U+0645 -> UTF-8 D9 85 (a UTF-16 hash would differ)
    expect(fnv1a('م')).toBe(0x76d48d43);
    expect(fnv1a('مرحبا')).toBe(0xa8c482de);
  });
  it('hashes a surrogate pair as one 4-byte sequence', () => {
    // U+1F600 -> F0 9F 98 80
    expect(fnv1a('😀')).toBe(0x33a29608);
  });
  it('hashes a lone surrogate as U+FFFD (EF BF BD)', () => {
    expect(fnv1a('\ud800')).toBe(0x3479c4a);
    expect(fnv1a('a\udc00b')).toBe(0x763177ed);
  });
});

describe('intentKey', () => {
  it('joins op and target', () => {
    expect(intentKey('createPost', 'lecture-42')).toBe('createPost:lecture-42');
    expect(intentKey('joinGroup', '-')).toBe('joinGroup:-');
  });
});

describe('nextRequestId', () => {
  it('has the documented shape', () => {
    expect(nextRequestId(null, 'createPost', 'L1', payload, NOW, R0)).toMatch(
      /^createPost:L1:[0-9a-f]{8}:[0-9a-z]+$/,
    );
  });
  it('is deterministic for the same inputs', () => {
    expect(nextRequestId(null, 'createPost', 'L1', payload, NOW, R0)).toBe(
      nextRequestId(null, 'createPost', 'L1', payload, NOW, R0),
    );
  });
  it('builds the nonce from now (base36) plus 4 base36 random digits', () => {
    expect(nextRequestId(null, 'report', 'p1', 1, NOW, R0).endsWith(`:${NOW.toString(36)}0000`)).toBe(true);
  });
  it('keeps the nonce at 4 random digits even if rand returns 1', () => {
    const id = nextRequestId(null, 'report', 'p1', 1, NOW, () => 1);
    expect(id.split(':')[3]).toHaveLength(NOW.toString(36).length + 4);
  });
  it('gives different ids for different rand values', () => {
    const a = nextRequestId(null, 'report', 'p1', 1, NOW, () => 0);
    const b = nextRequestId(null, 'report', 'p1', 1, NOW, () => 0.5);
    expect(a).not.toBe(b);
    expect(b).toMatch(/^report:p1:[0-9a-f]{8}:[0-9a-z]+$/);
  });
  it.each(['network', 'timeout', 'server', 'rateLimit'] as const)('reuses the id after %s', (code) => {
    expect(nextRequestId(prevWith(code), 'createPost', 'L1', payload, NOW, R0)).toBe(
      'createPost:L1:deadbeef:old',
    );
  });
  it.each(['moderation', 'conflict', 'forbidden', 'notFound', 'auth', 'validation', 'unknown'] as const)(
    'rotates the id after %s',
    (code) => {
      const id = nextRequestId(prevWith(code), 'createPost', 'L1', payload, NOW, R0);
      expect(id).not.toBe('createPost:L1:deadbeef:old');
      expect(id).toMatch(/^createPost:L1:[0-9a-f]{8}:[0-9a-z]+$/);
    },
  );
  it('rotates when the payload changed, even after a reusable error', () => {
    const id = nextRequestId(prevWith('network'), 'createPost', 'L1', { body: 'y' }, NOW, R0);
    expect(id).not.toBe('createPost:L1:deadbeef:old');
  });
  it('rotates when there is no previous entry or no recorded error', () => {
    expect(nextRequestId(null, 'createPost', 'L1', payload, NOW, R0)).not.toBe('createPost:L1:deadbeef:old');
    expect(nextRequestId(prevWith(null), 'createPost', 'L1', payload, NOW, R0)).not.toBe(
      'createPost:L1:deadbeef:old',
    );
  });
});

describe('shouldReuse', () => {
  const table: Record<ApiErrorCode, boolean> = {
    network: true,
    timeout: true,
    server: true,
    rateLimit: true,
    moderation: false,
    conflict: false,
    forbidden: false,
    notFound: false,
    auth: false,
    validation: false,
    unknown: false,
  };
  it.each(Object.entries(table))('%s -> %s', (code, expected) => {
    expect(shouldReuse(code as ApiErrorCode)).toBe(expected);
  });
});
