/**
 * services/community/idempotency.ts
 * ---------------------------------
 * Pure request-id helpers for community mutations (design §5.3).
 *
 *   requestId = `${op}:${target}:${hash(canonicalJson(payload))}:${nonce}`
 *
 * The id is reused only while the last failure may have reached the server
 * (network, timeout, server, rateLimit); every other outcome rotates it.
 * nonce = `now` in base36 + 4 base36 random digits. The clock is passed in
 * and the random source is injectable (`rand`), so tests stay deterministic.
 */

import type { ApiErrorCode } from '@/services/api/types';

/** What the caller remembers per intentKey between submits. */
export interface IdempotencyEntry {
  payloadHash: string;
  requestId: string;
  lastError: ApiErrorCode | null;
}

// Exhaustive over ApiErrorCode, so a new code is a compile error here.
const REUSE: Record<ApiErrorCode, boolean> = {
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

/** The mutating operations that carry a requestId (design §5.2 port). */
export type CommunityOp =
  | 'register'
  | 'rename'
  | 'deleteMe'
  | 'createGroup'
  | 'joinGroup'
  | 'leaveGroup'
  | 'setShareMyProgress'
  | 'startChallenge'
  | 'reportProgress'
  | 'createPost'
  | 'deletePost'
  | 'report';

/** True when a retry may safely resend the same requestId. */
export function shouldReuse(code: ApiErrorCode): boolean {
  return REUSE[code];
}

/**
 * JSON with object keys sorted at every depth; array order is kept.
 *
 * Input must be JSON-safe plain data: no cycles, Dates, Maps, Sets or BigInt.
 * Object keys whose value is `undefined` are dropped; `undefined` inside an
 * array, NaN and +-Infinity become `null`.
 */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  const o = v as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of Object.keys(o).sort()) {
    if (o[k] === undefined) continue;
    parts.push(`${JSON.stringify(k)}:${canonicalJson(o[k])}`);
  }
  return `{${parts.join(',')}}`;
}

/**
 * FNV-1a 32-bit over the UTF-8 bytes of `str` (not UTF-16 code units), so
 * Arabic text hashes identically on every engine. Returns an unsigned int.
 */
export function fnv1a(str: string): number {
  const P = 0x01000193;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    // Combine a surrogate pair into one code point; a lone surrogate is U+FFFD.
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i++;
      } else c = 0xfffd;
    } else if (c >= 0xdc00 && c <= 0xdfff) c = 0xfffd;
    if (c < 0x80) {
      h = Math.imul(h ^ c, P) >>> 0;
    } else if (c < 0x800) {
      h = Math.imul(h ^ (0xc0 | (c >> 6)), P) >>> 0;
      h = Math.imul(h ^ (0x80 | (c & 63)), P) >>> 0;
    } else if (c < 0x10000) {
      h = Math.imul(h ^ (0xe0 | (c >> 12)), P) >>> 0;
      h = Math.imul(h ^ (0x80 | ((c >> 6) & 63)), P) >>> 0;
      h = Math.imul(h ^ (0x80 | (c & 63)), P) >>> 0;
    } else {
      h = Math.imul(h ^ (0xf0 | (c >> 18)), P) >>> 0;
      h = Math.imul(h ^ (0x80 | ((c >> 12) & 63)), P) >>> 0;
      h = Math.imul(h ^ (0x80 | ((c >> 6) & 63)), P) >>> 0;
      h = Math.imul(h ^ (0x80 | (c & 63)), P) >>> 0;
    }
  }
  return h >>> 0;
}

/** 8-char lowercase hex hash of a payload's canonical JSON. */
export function hashPayload(payload: unknown): string {
  return fnv1a(canonicalJson(payload)).toString(16).padStart(8, '0');
}

/** Names one UI intent slot, e.g. `createPost:lecture-42` or `joinGroup:-`. */
export function intentKey(op: CommunityOp, target: string): string {
  return `${op}:${target}`;
}

/**
 * The requestId to send for this submit: reused or freshly minted.
 *
 * `rand` must return a value in [0, 1); it is clamped just below 1 so the
 * nonce suffix is always exactly 4 digits.
 *
 * Callers must check the in-flight map first. This function must never be
 * called while a request for the same intent is in flight; that duplicate
 * submit returns the existing promise and sends nothing (§5.3).
 */
export function nextRequestId(
  prev: IdempotencyEntry | null,
  op: CommunityOp,
  target: string,
  payload: unknown,
  now: number,
  rand: () => number = Math.random,
): string {
  const hash = hashPayload(payload);
  if (prev && prev.payloadHash === hash && prev.lastError !== null && shouldReuse(prev.lastError)) {
    return prev.requestId;
  }
  const salt = Math.floor(Math.min(rand(), 0.999999) * 36 ** 4).toString(36).padStart(4, '0');
  return `${op}:${target}:${hash}:${now.toString(36)}${salt}`;
}
