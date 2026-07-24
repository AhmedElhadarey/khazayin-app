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

import type { LibraryFilter, Lookup, MoreRow, SectionEntry } from '../../types/content';

// ---------------------------------------------------------------------------
// SECTIONS — 9-item sections list (sections/index.tsx)
// ---------------------------------------------------------------------------

/**
 * `iconKey` corresponds to the keys in SECTION_ICONS from
 * `components/khazain/icons/sections`. Resolved at render-time.
 */
export const SECTIONS: SectionEntry[] = [
  {
    id:       'quran',
    route:    '/sections/reciter',
    title:    'القرآن حياة',
    subtitle: 'تلاوات وتفسير وتدبّر القرآن الكريم',
    count:    '١٥١ حلقة',
    iconKey:  'quran',
  },
  {
    id:       'prophet',
    route:    '/sections/prophet',
    title:    'رسول الله ﷺ',
    subtitle: 'السيرة النبوية والشمائل المحمدية',
    count:    '٢٥٣ حلقة',
    iconKey:  'prophet',
  },
  {
    id:       'scholars',
    route:    '/sections/scholar',
    title:    'العلماء والمشايخ',
    subtitle: 'محاضرات ودروس كبار العلماء',
    count:    '٢٥٣ حلقة',
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
    subtitle: 'ملكةٌ أنتِ لا سواكِ',
    count:    null,
    iconKey:  'crown',
  },
  {
    id:       'audiobooks',
    route:    null,
    title:    'كتب صوتية',
    subtitle: 'كتب إسلامية مقروءة بصوت عذب',
    count:    '١٧ كتاباً',
    iconKey:  'headphones',
  },
  {
    id:       'exclusive',
    route:    null,
    title:    'حصريات خزائن الرحمن',
    subtitle: 'محتوى حصري ومميّز',
    count:    '٣١ حلقة',
    iconKey:  'sparkle',
  },
  {
    id:       'radio',
    route:    '/sections/radio',
    title:    'برامج إذاعية',
    subtitle: 'برامج إذاعية إسلامية متنوعة',
    count:    '٢٣٨ برنامج',
    iconKey:  'mic',
  },
  {
    id:       'dawah',
    route:    '/sections/dawah',
    title:    'تصميمات دعوية',
    subtitle: 'محتوى دعوي ومرئي للدعوة',
    count:    '١٢٥ تصميم',
    iconKey:  'design',
  },
];

// ---------------------------------------------------------------------------
// MORE_ROWS — More tab list (more/index.tsx)
// ---------------------------------------------------------------------------

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

/** `count` matches the original inline mock values from library.tsx:17-21. */
export const LIBRARY_FILTERS: LibraryFilter[] = [
  { id: 'all',      label: 'الكل',            count: '١٢' },
  { id: 'saved',    label: 'المحفوظات',        count: '١٨' },
  { id: 'playlist', label: 'قوائم التشغيل',   count: '٥'  },
  { id: 'history',  label: 'السجل',           count: ''   },
];
