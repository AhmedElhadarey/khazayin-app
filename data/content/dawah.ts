/**
 * data/content/dawah.ts
 * ---------------------
 * Mock data for the dawah (Islamic outreach design) domain.
 * Sources:
 *   - DAWAH_POSTERS:
 *       3 from components/khazain/home/DawahPoster.tsx:19-23
 *         (shape renamed: t→title, b→body, source→imageSource)
 *       4 from app/(tabs)/sections/dawah/[month].tsx:24-61 POSTERS
 *         (shape renamed similarly; month field added)
 *   - DAWAH_MONTHS: 5 from dawah.tsx:14-20 GROUPS + keys from
 *       dawah/[month].tsx:15-21 MONTH_TITLES merged.
 *   - FEATURED_DAWAH: the first 3 posters (home-screen subset).
 *
 * No imports from data/mockData.ts — this module is isolated.
 *
 * NOTE: imageSource values use require() which is resolved at bundle time.
 * The 3 home-screen posters carry real asset ids; the month-detail posters
 * do not have dedicated art yet (imageSource omitted → card uses tone only).
 *
 * Track: khazain-content-service_20260506  Phase 1 / T1.4
 */

import type { DawahPoster } from '../../types/content';

// ---------------------------------------------------------------------------
// Asset pre-requires (home-screen posters only)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const DAWAH_LAYLAT = require('../../assets/khazain/home/dawah-laylat-alqadr.webp') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DAWAH_MAWIZA = require('../../assets/khazain/home/dawah-mawiza-sabah.webp') as number;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const DAWAH_HELAL  = require('../../assets/khazain/home/dawah-helal.webp') as number;

// ---------------------------------------------------------------------------
// DAWAH_POSTERS — combined home + month-detail entries
// ---------------------------------------------------------------------------

export const DAWAH_POSTERS: DawahPoster[] = [
  // ── Home-screen 3 (from DawahPoster.tsx:19-23) ──
  {
    id: 'home-laylat',
    tone:        '#1A3F62',
    title:       'دعاء ليلة القدر',
    body:        'اللهم إنك عفوٌّ كريم تحب العفو فاعفُ عنّي',
    imageSource: DAWAH_LAYLAT,
    month:       'ramadan-shawwal',
  },
  {
    id: 'home-mawiza',
    tone:        '#3F2A1B',
    title:       'موعظة الصباح',
    body:        'فاجعل لها قِسطًا من دعائك',
    imageSource: DAWAH_MAWIZA,
    month:       'rabi1-rabi2',
  },
  {
    id: 'home-helal',
    tone:        '#1A3F62',
    title:       'هلال',
    body:        'كلُّ الحياة',
    imageSource: DAWAH_HELAL,
    month:       'muharram-safar',
  },
  // ── Month-detail 4 (from dawah/[month].tsx:24-61 POSTERS) ──
  {
    id: 'd1',
    tone:  '#E8DDD0',
    title: 'دعاء ليلة القدر',
    body:  'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    month: 'ramadan-shawwal',
  },
  {
    id: 'd2',
    tone:  '#E1D4BE',
    title: 'دعاء ليلة القدر',
    body:  'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    month: 'ramadan-shawwal',
  },
  {
    id: 'd3',
    tone:  '#DBC9B0',
    title: 'دعاء ليلة القدر',
    body:  'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    month: 'muharram-safar',
  },
  {
    id: 'd4',
    tone:  '#E8DDD0',
    title: 'دعاء ليلة القدر',
    body:  'اللهم إنك عفوٌّ كريمٌ\nتحب العفو فاعفُ عنّي',
    month: 'dhul-qadah-dhul-hijjah',
  },
];

// ---------------------------------------------------------------------------
// FEATURED_DAWAH — home-screen 3 (first 3 entries)
// ---------------------------------------------------------------------------

/** Subset returned by contentService.dawah.listFeatured(). */
export const FEATURED_DAWAH: DawahPoster[] = DAWAH_POSTERS.slice(0, 3);

// ---------------------------------------------------------------------------
// DAWAH_MONTHS
// ---------------------------------------------------------------------------

/**
 * Combined from dawah.tsx:14-20 GROUPS (id + count) and
 * dawah/[month].tsx:15-21 MONTH_TITLES (id + title display).
 * The extra slug 'shawwal-ramadan' comes from MONTH_TITLES only —
 * kept here for completeness.
 */
export const DAWAH_MONTHS: { id: string; title: string; count: string }[] = [
  { id: 'ramadan-shawwal',       title: 'من رمضان إلى شوال',                count: '٥ تخطيط' },
  { id: 'rabi1-rabi2',           title: 'من ربيع الأول إلى ربيع الآخر',     count: '٩ تخطيط' },
  { id: 'muharram-safar',        title: 'من محرم إلى صفر',                  count: '٨ تخطيط' },
  { id: 'dhul-qadah-dhul-hijjah',title: 'من ذو القعدة إلى ذو الحجة',        count: '٧ تخطيط' },
  { id: 'shawwal-dhul-qadah',    title: 'من شوال إلى ذو القعدة',            count: '٦ تخطيط' },
  // From MONTH_TITLES only (no GROUPS entry)
  { id: 'shawwal-ramadan',       title: 'من شوال إلى رمضان',                count: '٤ تخطيط' },
];
