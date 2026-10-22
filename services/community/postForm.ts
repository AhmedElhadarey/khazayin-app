/**
 * services/community/postForm.ts
 * ------------------------------
 * Pure input helpers for the post composer and the report note (design §7.1,
 * §7.5, §10).
 *
 * The cap is applied here, after the strip, and counts code points. A native
 * `maxLength` would cut a paste before the invisibles were removed and count
 * UTF-16 units, so the composer does not set one.
 */
import { charsLeftLabel } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS, COMMUNITY_RATES } from '@/constants/communityLimits';

// Control characters except tab and newline.
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
// Zero-width and bidi controls, soft hyphen, Arabic letter mark, BOM (same set the filter strips).
const INVISIBLE_RE = /[​-‏‪-‮⁠-⁩﻿؜­]/g;

const HOUR_MS = 3600e3;
/** Share of the cap at which the counter is announced (§10). */
const ANNOUNCE_AT = 0.9;

export const codePointLength = (s: string): number => [...s].length;

function capCodePoints(s: string, max: number): string {
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max).join('');
}

/**
 * What the field holds after each keystroke or paste. Trailing whitespace is
 * kept so typing a space is not eaten; submit trims.
 */
export function normalizePostInput(raw: string, max: number = COMMUNITY_LIMITS.post.max): string {
  const cleaned = raw
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_RE, '')
    .replace(INVISIBLE_RE, '')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+/, '');
  return capCodePoints(cleaned, max);
}

/** True once a change takes the length across 90% of the cap (announce once, not on every key). */
export function crossedThreshold(prev: number, next: number, max: number): boolean {
  const at = Math.ceil(max * ANNOUNCE_AT);
  return prev < at && next >= at;
}

/** The text to announce when a change crosses 90% of the cap, else null. */
export function counterAnnouncement(prev: number, next: number, max: number): string | null {
  return crossedThreshold(prev, next, max) ? charsLeftLabel(max - next) : null;
}

export type PostWait = { kind: 'cooldown' | 'hourly'; ms: number };

/**
 * How long until the member may post again, from the times they posted (§7.5).
 * A time in the future (the clock moved back) counts as now, so it cannot
 * lock the composer for hours.
 */
export function postWait(postTimes: readonly number[], now: number): PostWait | null {
  const times = postTimes.map((t) => Math.min(t, now));
  const last = times.reduce((m, t) => Math.max(m, t), -Infinity);
  const cooldownMs = times.length > 0 ? COMMUNITY_RATES.postCooldownMs - (now - last) : 0;

  const inWindow = times.filter((t) => t > now - HOUR_MS);
  const hourlyMs =
    inWindow.length >= COMMUNITY_RATES.postsPerHour ? Math.min(...inWindow) + HOUR_MS - now : 0;

  if (hourlyMs > 0 && hourlyMs >= cooldownMs) return { kind: 'hourly', ms: hourlyMs };
  if (cooldownMs > 0) return { kind: 'cooldown', ms: cooldownMs };
  return null;
}
