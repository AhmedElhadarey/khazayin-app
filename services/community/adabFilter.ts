/**
 * services/community/adabFilter.ts
 * --------------------------------
 * Pure client-side text filter for community writes (design 7.1).
 *
 * Order of checks: length, links, phones, terms, repetition. `block` hits,
 * links and phones refuse locally; a `review` hit is allowed and the post is
 * created as `pending`. The term list is Foundation-owned (data/community).
 */
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { ADAB_TERMS, STOPWORDS, type AdabTier } from '@/data/community/adabTerms';
import { foldArabic } from '@/services/search/normalize';

export type AdabField = 'post' | 'name' | 'groupName' | 'reportNote';

export type AdabRejectReason =
  | 'empty'
  | 'tooShort'
  | 'tooLong'
  | 'link'
  | 'phone'
  | 'term'
  | 'repetition';

export type AdabResult =
  | { ok: true; review: boolean }
  | {
      ok: false;
      reason: AdabRejectReason;
    };

const LIMIT_BY_FIELD = {
  post: COMMUNITY_LIMITS.post,
  name: COMMUNITY_LIMITS.displayName,
  groupName: COMMUNITY_LIMITS.groupName,
  reportNote: COMMUNITY_LIMITS.reportNote,
} as const;

// Extra combining marks (U+0610-061A, U+0653-065F) and Quranic annotation marks.
const EXTRA_MARKS_RE = /[ؐ-ؚٓ-ٟۖ-ۭ]/g;
// Zero-width and bidi controls, soft hyphen, Arabic letter mark, BOM.
const INVISIBLE_RE = /[​-‏‪-‮⁠-⁩﻿؜­]/g;
const PERSIAN_DIGITS_RE = /[۰-۹]/g;

// Stretched letters: 3+ of any Arabic letter, or 2 of ا/و/ي, collapse to one.
// Real consonant pairs («الله», «اللغة») are left alone.
const RUN3_RE = /([ء-ي])\1{2,}/g;
const RUN2_WEAK_RE = /([اوي])\1/g;

const LINK_RES: readonly RegExp[] = [
  /https?:\/\//,
  /www\./,
  /\b[\w-]+\.(?:com|net|org|info|me|io|app|ly|link|sa|eg|ae|kw|qa)\b/,
  /\b(?:t|wa)\.me\//,
  /@\w{3,}/,
  /[\w.+-]+@[\w-]+\.[\w.-]+/,
];

const DATE_RE = /\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/g;
// +, 00 or 0 prefix, then 9+ digits with optional separators between them.
// Each repetition consumes a digit, so matching stays linear.
const PHONE_RE = /(?:^|\D)(?:\+|00|0)\d(?:[\s\-.()]?\d){8,}/;

// Each prefix is tried independently, so «والله» yields both «له» and «الله».
const CLITICS = ['وال', 'بال', 'ال', 'و', 'ف', 'ب', 'ك', 'ل'] as const;

const MIN_REPEAT_TOKENS = 10;
const MAX_REPEAT_SHARE = 0.3;
const MIN_REPEAT_LETTERS = 4;

/** Fold without the letter-run collapse (links and phones need Latin runs intact). */
function foldBase(text: string): string {
  const cleaned = text
    .replace(INVISIBLE_RE, '')
    .replace(EXTRA_MARKS_RE, '')
    .replace(PERSIAN_DIGITS_RE, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/ک/g, 'ك')
    .replace(/[یے]/g, 'ي');
  return foldArabic(cleaned, { ibnBin: false });
}

function collapseRuns(s: string): string {
  return s.replace(RUN3_RE, '$1').replace(RUN2_WEAK_RE, '$1');
}

function hasLink(folded: string): boolean {
  return LINK_RES.some((re) => re.test(folded));
}

function hasPhone(folded: string): boolean {
  return PHONE_RE.test(folded.replace(DATE_RE, ' '));
}

function tokenize(s: string): string[] {
  return s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** The token itself plus the token with each possible single leading clitic removed. */
function variants(token: string): string[] {
  const out = [token];
  for (const c of CLITICS) {
    if (token.length > c.length && token.startsWith(c)) {
      out.push(token.slice(c.length));
    }
  }
  return out;
}

function matchTerms(tokens: string[]): AdabTier | null {
  const forms = tokens.map(variants);
  let review = false;
  for (const term of ADAB_TERMS) {
    const n = term.tokens.length;
    for (let i = 0; i + n <= tokens.length; i++) {
      if (term.tokens.every((t, k) => forms[i + k].includes(t))) {
        if (term.tier === 'block') return 'block';
        review = true;
      }
    }
  }
  return review ? 'review' : null;
}

function isRepetitive(tokens: string[]): boolean {
  const counts = new Map<string, number>();
  let total = 0;
  for (const t of tokens) {
    if (t.length < MIN_REPEAT_LETTERS || variants(t).some((v) => STOPWORDS.has(v))) continue;
    total += 1;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (total < MIN_REPEAT_TOKENS) return false;
  for (const n of counts.values()) {
    if (n / total > MAX_REPEAT_SHARE) return true;
  }
  return false;
}

export function checkText(text: string, field: AdabField): AdabResult {
  const limit = LIMIT_BY_FIELD[field];
  const length = [...text.trim()].length;
  if (length === 0 && limit.min > 0) return { ok: false, reason: 'empty' };
  if (length < limit.min) return { ok: false, reason: 'tooShort' };
  if (length > limit.max) return { ok: false, reason: 'tooLong' };

  const base = foldBase(text);
  if (hasLink(base)) return { ok: false, reason: 'link' };
  if (hasPhone(base)) return { ok: false, reason: 'phone' };

  const tokens = tokenize(collapseRuns(base));
  const hit = matchTerms(tokens);
  if (hit === 'block') return { ok: false, reason: 'term' };
  if (isRepetitive(tokens)) return { ok: false, reason: 'repetition' };
  return { ok: true, review: hit === 'review' };
}
