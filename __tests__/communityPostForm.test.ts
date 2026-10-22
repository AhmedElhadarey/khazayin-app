import { COMMUNITY_LIMITS, COMMUNITY_RATES } from '@/constants/communityLimits';
import {
  codePointLength,
  counterAnnouncement,
  crossedThreshold,
  normalizePostInput,
  postWait,
} from '@/services/community/postForm';

const MAX = COMMUNITY_LIMITS.post.max;

describe('normalizePostInput', () => {
  it('strips zero-width and bidi controls before anything is counted', () => {
    expect(normalizePostInput('ا​ب‮ج﻿')).toBe('ابج');
  });

  it('drops control characters and unifies line endings', () => {
    expect(normalizePostInput('a\u0000b\r\nc\rd')).toBe('ab\nc\nd');
  });

  it('collapses runs of blank lines and leading whitespace but keeps a trailing space', () => {
    expect(normalizePostInput('  \n\nمرحبا\n\n\n\nبكم ')).toBe('مرحبا\n\nبكم ');
  });

  it('caps by code points, not UTF-16 units', () => {
    const emoji = '😀'.repeat(MAX + 20);
    expect(codePointLength(normalizePostInput(emoji))).toBe(MAX);
  });

  it('a paste that only fits once invisibles are gone is kept whole', () => {
    // maxLength on the input would cut this at 1000 raw characters, before the strip.
    const raw = 'ب'.repeat(MAX) + '​'.repeat(50);
    expect(normalizePostInput(raw)).toBe('ب'.repeat(MAX));
  });

  it('takes a custom cap for the report note', () => {
    expect(codePointLength(normalizePostInput('ا'.repeat(400), COMMUNITY_LIMITS.reportNote.max))).toBe(300);
  });

  it('is idempotent', () => {
    const once = normalizePostInput('  ​نص\n\n\n\nطويل ');
    expect(normalizePostInput(once)).toBe(once);
  });
});

describe('crossedThreshold', () => {
  it('fires once when the length reaches 90%', () => {
    expect(crossedThreshold(899, 900, MAX)).toBe(true);
    expect(crossedThreshold(900, 901, MAX)).toBe(false);
    expect(crossedThreshold(100, 950, MAX)).toBe(true);
  });

  it('does not fire when shrinking or below the threshold', () => {
    expect(crossedThreshold(950, 899, MAX)).toBe(false);
    expect(crossedThreshold(10, 20, MAX)).toBe(false);
  });
});

describe('postWait', () => {
  const NOW = 10_000_000;
  const HOUR = 3600e3;

  it('is null with no posts', () => {
    expect(postWait([], NOW)).toBeNull();
  });

  it('asks for the rest of the 30 s cooldown', () => {
    expect(postWait([NOW - 10_000], NOW)).toEqual({ kind: 'cooldown', ms: COMMUNITY_RATES.postCooldownMs - 10_000 });
  });

  it('is null once the cooldown has passed', () => {
    expect(postWait([NOW - COMMUNITY_RATES.postCooldownMs], NOW)).toBeNull();
  });

  it('reports the hourly cap with the time until the oldest post leaves the window', () => {
    const times = Array.from({ length: COMMUNITY_RATES.postsPerHour }, (_, i) => NOW - 40 * 60e3 + i * 60e3);
    expect(postWait(times, NOW)).toEqual({ kind: 'hourly', ms: times[0] + HOUR - NOW });
  });

  it('ignores posts older than an hour', () => {
    const old = Array.from({ length: 12 }, (_, i) => NOW - HOUR - 1000 - i);
    expect(postWait(old, NOW)).toBeNull();
  });

  it('treats a time in the future (clock moved back) as now', () => {
    expect(postWait([NOW + 5 * HOUR], NOW)).toEqual({ kind: 'cooldown', ms: COMMUNITY_RATES.postCooldownMs });
  });
});

describe('counterAnnouncement', () => {
  it('returns the remaining-characters text only when 90% is crossed', () => {
    expect(counterAnnouncement(899, 900, 1000)).toBe('الحروف المتبقية: ١٠٠');
    expect(counterAnnouncement(269, 270, 300)).toBe('الحروف المتبقية: ٣٠');
    expect(counterAnnouncement(900, 901, 1000)).toBeNull();
    expect(counterAnnouncement(10, 20, 300)).toBeNull();
  });
});
