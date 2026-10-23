/**
 * data/content/sections.ts
 * ------------------------
 * Mock data for navigation / UI taxonomy.
 * Sources:
 *   - SECTIONS:         sections/index.tsx:18-28.
 *   - MORE_ROWS:        more/index.tsx:21-36.
 *   - MORE_EXTERNAL_URLS: more/index.tsx:32-36 EXTERNAL_URLS.
 *   - LIBRARY_FILTERS:  library.tsx:17-21 FILTERS.
 *
 * No imports from data/mockData.ts — this module is isolated.
 * Track: khazain-content-service_20260506  Phase 1 / T1.5
 */

import type { LibraryFilterChip, Lookup, MoreRow, SectionEntry } from '../../types/content';
import type { CommunityMode } from '../../services/community/gate';

// ---------------------------------------------------------------------------
// SECTIONS — 9-item sections list (sections/index.tsx)
// ---------------------------------------------------------------------------

/**
 * `iconKey` corresponds to the keys in SECTION_ICONS from
 * `components/khazain/icons/sections`. Resolved at render-time.
 *
 * Order, copy, and counts are the reference dataset for Figma node 2031:5675
 * and are asserted by `__tests__/sectionPresentation.test.ts`. In API mode the
 * counts come from the backend and may differ; only the geometry is fixed.
 */
export const SECTIONS: SectionEntry[] = [
  {
    id:       'quran',
    route:    '/sections/reciter',
    title:    'القرآن حياة',
    subtitle: 'تلاوات وتفسير وتدبر القرآن الكريم',
    count:    '١٥٦ حلقة',
    iconKey:  'quran',
  },
  {
    id:       'prophet',
    route:    '/sections/prophet',
    title:    'رسول الله ﷺ',
    subtitle: 'محاضرات ودروس كبار العلماء',
    count:    '٢٤٣ حلقة',
    iconKey:  'prophet',
  },
  {
    id:       'scholars',
    route:    '/sections/scholar',
    title:    'العلماء والمشايخ',
    subtitle: 'محاضرات ودروس كبار العلماء',
    count:    '٢٤٣ حلقة',
    iconKey:  'scholar',
  },
  {
    id:       'books',
    route:    '/sections/books',
    title:    'الكتب العلمية',
    subtitle: 'شروحات الكتب الإسلامية المهمة',
    count:    '٨٩ حلقة',
    iconKey:  'book',
  },
  {
    id:       'queen',
    route:    '/sections/queen',
    title:    'أنتِ ملكة',
    subtitle: 'مَلِكةٌ أنتِ لا سِواكِ',
    count:    '١٢٨ حلقة',
    iconKey:  'crown',
  },
  {
    id:       'audiobooks',
    route:    '/sections/audiobooks',
    title:    'كتب صوتية',
    subtitle: 'كتب إسلامية مقروءة بصوت عذب',
    count:    '٦٧ كتاب',
    iconKey:  'headphones',
  },
  {
    id:       'exclusive',
    route:    '/sections/exclusive',
    title:    'حصريات خزائن الرحمن',
    subtitle: 'محتوى حصري ومميز',
    count:    '٣٤ حلقة',
    iconKey:  'sparkle',
  },
  {
    id:       'radio',
    route:    '/sections/radio',
    title:    'برامج إذاعية',
    subtitle: 'برامج إذاعية إسلامية متنوعة',
    count:    '١٢٨ حلقة',
    iconKey:  'mic',
  },
  {
    id:       'dawah',
    route:    '/sections/dawah',
    title:    'تصميمات دعوية',
    subtitle: 'محتوى بصري ومرئي للدعوة',
    count:    '٤٥ تصميم',
    iconKey:  'design',
  },
];

/**
 * Sections whose Figma screen has no route yet. Empty now that every section
 * is implemented; the sections screen still falls back to a "قريباً" alert
 * rather than pushing a dead route if one is ever added here again.
 */
export const PENDING_SECTION_ROUTES: readonly string[] = [];

// ---------------------------------------------------------------------------
// MORE_ROWS — More tab list (more/index.tsx)
// ---------------------------------------------------------------------------

/**
 * The eight rows Figma node 2102:2711 opens with, in frame order. The audit
 * found the tab opening with two settings rows the frame does not have, which
 * pushed this whole group off the initial viewport.
 */
export const MORE_ROWS: MoreRow[] = [
  { id: 'web',       title: 'الموقع الإلكتروني',   subtitle: 'زيارة الموقع الرسمي للمؤسسة',   iconKey: 'web',       isExternal: true,  externalKey: 'web'       },
  { id: 'youtube',   title: 'قنوات اليوتيوب',      subtitle: '٦٥ قناة للأعمال والمشايخ',       iconKey: 'youtube',   isExternal: false, route: '/youtube-sheet'  },
  { id: 'telegram',  title: 'قنوات التليجرام',     subtitle: 'القنوات الأصلية للمؤسسة',        iconKey: 'telegram',  isExternal: false, route: '/telegram-sheet' },
  { id: 'whatsapp',  title: 'قنوات الواتساب',      subtitle: 'القنوات الأصلية للمؤسسة',        iconKey: 'whatsapp',  isExternal: true,  externalKey: 'whatsapp'  },
  { id: 'soundcloud',title: 'ساوند كلاود',          subtitle: 'القنوات الأصلية للمؤسسة',        iconKey: 'soundcloud',isExternal: true,  externalKey: 'soundcloud'},
  { id: 'archive',   title: 'الأرشيف',             subtitle: 'أرشيف المؤسسة',                   iconKey: 'archive',   isExternal: false, route: '/more/archive'   },
  { id: 'contact',   title: 'تواصل معنا',          subtitle: 'راسلنا أو اتصل بنا مباشرة',      iconKey: 'contact',   isExternal: false, route: '/more/contact'   },
  { id: 'about',     title: 'نبذة عن المؤسسة',    subtitle: 'تعرّف على رؤيتنا وأهدافنا',      iconKey: 'about',     isExternal: false, route: '/more/about'     },
];

/** The reference order, asserted separately so a reorder is a test failure. */
export const MORE_REFERENCE_ORDER: readonly string[] = MORE_ROWS.map((row) => row.id);

/**
 * Rows this app added after the design. They stay available but render after
 * the reference group, so the initial viewport matches the frame.
 */
export type MoreExtensionRow = {
  id: string;
  title: string;
  subtitle: string;
  route: string;
  /** Present only on rows that exist in some community modes (design §8.3). */
  gate?: 'community';
};

export const MORE_EXTENSION_ROWS: readonly MoreExtensionRow[] = [
  {
    id: 'settings',
    title: 'الإعدادات',
    subtitle: 'التلاوة · القراءة · الإشعارات · البيانات',
    route: '/(tabs)/more/settings',
  },
  {
    id: 'progress',
    title: 'إعدادات التقدّم',
    subtitle: 'هدف الورد اليومي · إعادة تعيين',
    route: '/(tabs)/more/settings-progress',
  },
  {
    id: 'community',
    title: 'المجتمع',
    subtitle: 'مجموعات القراءة · الختمات · نقاشات الدروس',
    route: '/(tabs)/more/community',
    gate: 'community',
  },
];

/**
 * Drops gated rows the current community mode does not offer. With the mode
 * `off` (production) the list is exactly the ungated rows, so the More screen
 * renders as it did before community existed.
 */
export function visibleExtensionRows(
  rows: readonly MoreExtensionRow[],
  mode: CommunityMode,
): MoreExtensionRow[] {
  return rows.filter((row) => row.gate !== 'community' || mode !== 'off');
}

// ---------------------------------------------------------------------------
// MORE_EXTERNAL_URLS — Partial map of external URLs (more/index.tsx)
// ---------------------------------------------------------------------------

export const MORE_EXTERNAL_URLS: Lookup<string> = {
  web:        'https://khazayin.com',
  whatsapp:   'https://wa.me/',
  soundcloud: 'https://soundcloud.com/khazain',
};

// ---------------------------------------------------------------------------
// LIBRARY_FILTERS — filter pills (library.tsx)
// ---------------------------------------------------------------------------

/**
 * Chip set, in the file's order (right to left). The counts of الكل / المحفوظات / ملاحظاتي / المكتمل /
 * تذكيراتي are real and filled in by the Library from its stores; the rest carry none, so
 * the chip renders its label alone (no fabricated number). The file also draws
 * المفضلة between ملاحظاتي and تذكيراتي; it has no data model, so it is absent.
 */
export const LIBRARY_FILTERS: LibraryFilterChip[] = [
  { id: 'all',       label: 'الكل',            count: '' },
  { id: 'saved',     label: 'المحفوظات',        count: '' },
  { id: 'playlist',  label: 'قوائم التشغيل' },
  { id: 'completed', label: 'المكتمل',          count: '' },
  { id: 'notes',     label: 'ملاحظاتي',         count: '' },
  { id: 'reminders', label: 'تذكيراتي',         count: '' },
  { id: 'history',   label: 'السجل' },
];
