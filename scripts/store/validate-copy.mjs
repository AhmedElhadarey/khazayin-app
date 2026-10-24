#!/usr/bin/env node
/**
 * scripts/store/validate-copy.mjs
 * -------------------------------
 * Validates the store-listing copy under docs/store/ (design
 * docs/plans/2026-10-24-store-submission-design.md §5). No dependencies.
 *
 *   node scripts/store/validate-copy.mjs          # table on success, report + exit 1 on violation
 *   node scripts/store/validate-copy.mjs --json   # machine-readable, same exit code
 *   node scripts/store/validate-copy.mjs --root <dir>   # validate another docs/store-shaped dir
 *
 * Lengths are UTF-16 code units (`str.length`), which is what App Store Connect
 * and Play Console count, measured after trimming ONE trailing newline.
 *
 * Exports `validate(rootDir)` → results array, plus the pure rule helpers, so
 * __tests__/storeCopy.test.ts can exercise the rules on synthetic input.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every length-limited field: id, path relative to the store root, limit. */
export const FIELDS = Object.freeze([
  { id: 'appStore.name', file: 'app-store/ar-SA/name.txt', limit: 30 },
  { id: 'appStore.subtitle', file: 'app-store/ar-SA/subtitle.txt', limit: 30 },
  { id: 'appStore.keywords', file: 'app-store/ar-SA/keywords.txt', limit: 100 },
  { id: 'appStore.promotionalText', file: 'app-store/ar-SA/promotional_text.txt', limit: 170 },
  { id: 'appStore.description', file: 'app-store/ar-SA/description.txt', limit: 4000 },
  { id: 'appStore.releaseNotes', file: 'app-store/ar-SA/release_notes.txt', limit: 4000 },
  { id: 'appStore.supportUrl', file: 'app-store/ar-SA/support_url.txt', limit: 255 },
  { id: 'appStore.marketingUrl', file: 'app-store/ar-SA/marketing_url.txt', limit: 255 },
  { id: 'appStore.copyright', file: 'app-store/ar-SA/copyright.txt', limit: 255 },
  { id: 'play.title', file: 'play/ar/title.txt', limit: 30 },
  { id: 'play.shortDescription', file: 'play/ar/short_description.txt', limit: 80 },
  { id: 'play.fullDescription', file: 'play/ar/full_description.txt', limit: 4000 },
]);

/** Store-visible prose: no emoji in any of it (the Foundation's tone, and Play policy). */
const PROSE_FIELDS = new Set([
  'appStore.name', 'appStore.subtitle', 'appStore.keywords', 'appStore.promotionalText',
  'appStore.description', 'appStore.releaseNotes',
  'play.title', 'play.shortDescription', 'play.fullDescription',
]);

/** Play metadata policy: no promotional or ranking claims in the title or short description. */
const PLAY_PROMO_FIELDS = new Set(['play.title', 'play.shortDescription']);
const PLAY_PROMO_TERMS = [
  'مجاني', 'مجانا', 'مجانًا', 'مجانى', 'الأفضل', 'أفضل', 'الأكثر', 'الأول', 'رقم ١', 'رقم 1', 'خصم', 'تخفيض',
  '#1', 'free', 'best', 'top', 'sale', 'discount', 'new',
];

/** The publisher is «العلمية»; this misspelling must never reach a store surface. */
export const FORBIDDEN_SPELLING = 'العالمية';

/** Directories/files (relative to the root) scanned for the forbidden spelling. */
const SPELLING_SCAN = ['app-store', 'play', 'privacy', 'rating', 'listing.json'];

/** Marks a value the Foundation still has to supply. Reported, never a violation. */
export const PLACEHOLDER_RE = /«\[يُستكمل:[^\]]*\]»|TODO\(foundation\)[^\n]*/g;
const IS_PLACEHOLDER = new RegExp(PLACEHOLDER_RE.source);

const ARABIC_MARKS = /[\u064B-\u065F\u0670\u0640]/g;

/** Field text as the console sees it: a leading BOM and one trailing newline removed, nothing else. */
export function fieldText(raw) {
  return raw.replace(/^\uFEFF/, '').replace(/\r?\n$/, '');
}

/** UTF-16 code units: what both consoles count. */
export function countLength(text) {
  return text.length;
}

/** Emoji / pictographs, excluding ©, ® and ™ (legitimate in copyright lines). */
export function findEmoji(text) {
  const re = /\p{Regional_Indicator}|\uFE0F|\p{Extended_Pictographic}/gu;
  return (text.match(re) ?? []).filter((c) => !['©', '®', '™'].includes(c));
}

/**
 * Normalised comparison keys for one Arabic/Latin word. Strips diacritics and
 * tatweel, unifies alef/yaa forms, and adds the form without a leading «و»,
 * «ال» or «وال», because «العلماء» in the subtitle already covers «علماء».
 */
export function wordKeys(word) {
  const base = word
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .trim();
  const keys = new Set([base]);
  if (base.startsWith('وال') && base.length > 5) keys.add(base.slice(3));
  if (base.startsWith('ال') && base.length > 4) keys.add(base.slice(2));
  if (base.startsWith('و') && base.length > 3) {
    const rest = base.slice(1);
    keys.add(rest);
    if (rest.startsWith('ال') && rest.length > 4) keys.add(rest.slice(2));
  }
  return [...keys].filter(Boolean);
}

/** Words of a name/subtitle, split on whitespace and listing punctuation. */
export function words(text) {
  return text.split(/[\s:،,\-–—·«»()|/]+/u).filter(Boolean);
}

/**
 * App Store keyword rules: comma-separated, no space after a comma, no empty
 * or duplicate tokens, and no word already indexed via the name or subtitle.
 * Returns a list of problem strings (empty = valid).
 */
export function checkKeywords(keywords, name, subtitle) {
  const problems = [];
  if (/,\s/.test(keywords)) problems.push('space after a comma (Apple counts it as a wasted character)');
  if (/\s,/.test(keywords)) problems.push('space before a comma');
  if (/^\s|\s$/.test(keywords)) problems.push('leading or trailing whitespace');
  if (/[،;]/.test(keywords)) problems.push('separator must be a Latin comma «,», not «،» or «;»');
  const tokens = keywords.split(',');
  tokens.forEach((t, i) => {
    if (t.trim() === '') problems.push(`empty keyword at position ${i + 1}`);
  });
  const indexed = new Map();
  for (const w of [...words(name), ...words(subtitle)]) {
    for (const k of wordKeys(w)) indexed.set(k, w);
  }
  const seen = new Map();
  for (const token of tokens.map((t) => t.trim()).filter(Boolean)) {
    for (const w of words(token)) {
      for (const k of wordKeys(w)) {
        if (indexed.has(k)) {
          problems.push(`«${token}» repeats «${indexed.get(k)}» from the name/subtitle`);
          break;
        }
      }
    }
    const key = wordKeys(token)[0];
    if (seen.has(key)) problems.push(`duplicate keyword «${token}»`);
    seen.set(key, token);
  }
  return [...new Set(problems)];
}

/** Play title / short description promotional-claim rules. */
export function checkPlayPromo(text) {
  const problems = [];
  const lower = text.toLowerCase();
  for (const term of PLAY_PROMO_TERMS) {
    const isLatin = /^[#a-z0-9 ]+$/.test(term);
    const hit = isLatin
      ? new RegExp(`(^|[^a-z])${term.replace('#', '\\#')}([^a-z]|$)`).test(lower)
      : lower.includes(term);
    if (hit) problems.push(`promotional/ranking term «${term}» is not allowed here (Play metadata policy)`);
  }
  const caps = text.match(/\b[A-Z]{4,}\b/g);
  if (caps) problems.push(`all-caps word(s) used for emphasis: ${caps.join(', ')}`);
  return problems;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  if (fs.statSync(dir).isFile()) return [dir];
  return fs.readdirSync(dir).flatMap((f) => listFiles(path.join(dir, f)));
}

const isText = (f) => /\.(txt|md|html|json)$/.test(f);

/**
 * Validates the store root. Returns one result per field plus one per
 * cross-file check: `{ id, file, length?, limit?, problems: string[] }`.
 * A result with any problem is a violation.
 */
export function validate(rootDir) {
  const read = (rel) => {
    const p = path.join(rootDir, rel);
    return fs.existsSync(p) ? fieldText(fs.readFileSync(p, 'utf8')) : null;
  };
  const results = [];
  const texts = {};

  for (const { id, file, limit } of FIELDS) {
    const text = read(file);
    const problems = [];
    if (text === null) {
      results.push({ id, file, length: null, limit, problems: ['file is missing'] });
      continue;
    }
    texts[id] = text;
    const length = countLength(text);
    if (text.trim() === '') problems.push('field is empty');
    if (length > limit) problems.push(`${length} > ${limit} UTF-16 units`);
    if (PROSE_FIELDS.has(id)) {
      const emoji = findEmoji(text);
      if (emoji.length) problems.push(`emoji/pictograph not allowed: ${[...new Set(emoji)].join(' ')}`);
    }
    if (PLAY_PROMO_FIELDS.has(id)) problems.push(...checkPlayPromo(text));
    if (['appStore.name', 'appStore.subtitle', 'appStore.keywords', 'play.title', 'play.shortDescription'].includes(id) && /\n/.test(text)) {
      problems.push('single-line field contains a line break');
    }
    if (id === 'appStore.marketingUrl' && !/^https:\/\/\S+$/.test(text)) problems.push('must be one https URL');
    if (id === 'appStore.supportUrl' && !/^https:\/\/\S+$/.test(text) && !IS_PLACEHOLDER.test(text)) {
      problems.push('must be one https URL (or a «[يُستكمل: …]» placeholder until the Foundation supplies it)');
    }
    if (id === 'appStore.copyright' && !/^© (19|20)\d\d /.test(text)) {
      problems.push('must start with «© YYYY » using Latin digits');
    }
    results.push({ id, file, length, limit, problems });
  }

  if (texts['appStore.keywords'] !== undefined) {
    results.push({
      id: 'appStore.keywords.rules',
      file: 'app-store/ar-SA/keywords.txt',
      problems: checkKeywords(
        texts['appStore.keywords'],
        texts['appStore.name'] ?? '',
        texts['appStore.subtitle'] ?? '',
      ),
    });
  }

  const spellingProblems = [];
  const placeholders = [];
  for (const rel of SPELLING_SCAN) {
    for (const f of listFiles(path.join(rootDir, rel)).filter(isText)) {
      const raw = fs.readFileSync(f, 'utf8');
      const relFile = path.relative(rootDir, f);
      if (raw.includes(FORBIDDEN_SPELLING) || raw.replace(ARABIC_MARKS, '').includes(FORBIDDEN_SPELLING)) {
        spellingProblems.push(`${relFile} contains «${FORBIDDEN_SPELLING}»; the publisher is «العلمية»`);
      }
      const found = raw.match(PLACEHOLDER_RE) ?? [];
      if (found.length) placeholders.push({ file: relFile, count: found.length, values: [...new Set(found)] });
    }
  }
  results.push({ id: 'publisherSpelling', file: SPELLING_SCAN.join(', '), problems: spellingProblems });
  results.push({ id: 'placeholders', file: '(info)', problems: [], placeholders });
  return results;
}

/** The violating results only. */
export function violations(results) {
  return results.filter((r) => r.problems.length > 0);
}

function printTable(results) {
  const rows = results.filter((r) => r.limit !== undefined);
  const w = Math.max(...rows.map((r) => r.id.length));
  console.log(`${'field'.padEnd(w)}  length / limit  headroom`);
  console.log(`${'-'.repeat(w)}  --------------  --------`);
  for (const r of rows) {
    const len = String(r.length).padStart(6);
    const lim = String(r.limit).padEnd(6);
    console.log(`${r.id.padEnd(w)}  ${len} / ${lim}  ${String(r.limit - r.length).padStart(8)}`);
  }
  for (const r of results.filter((x) => x.limit === undefined && x.id !== 'placeholders')) {
    console.log(`${r.id.padEnd(w)}  ok`);
  }
  const ph = results.find((r) => r.id === 'placeholders')?.placeholders ?? [];
  const total = ph.reduce((n, p) => n + p.count, 0);
  if (total) {
    console.log(`\n${total} Foundation placeholder(s) still open (not a copy violation):`);
    for (const p of ph) console.log(`  ${p.file}: ${p.count}`);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const rootIdx = args.indexOf('--root');
  const here = path.dirname(fileURLToPath(import.meta.url));
  if (rootIdx >= 0 && (args[rootIdx + 1] === undefined || args[rootIdx + 1].startsWith('--'))) {
    console.error('--root requires a directory argument');
    process.exit(2);
  }
  const root = rootIdx >= 0 ? path.resolve(args[rootIdx + 1]) : path.resolve(here, '../../docs/store');
  const results = validate(root);
  const bad = violations(results);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ok: bad.length === 0, root, results }, null, 2));
  } else if (bad.length) {
    console.error(`Store copy: ${bad.length} check(s) failed under ${root}\n`);
    for (const r of bad) {
      console.error(`✗ ${r.id} (${r.file})`);
      for (const p of r.problems) console.error(`    - ${p}`);
    }
  } else {
    console.log(`Store copy OK (${root})\n`);
    printTable(results);
  }
  process.exit(bad.length ? 1 : 0);
}
