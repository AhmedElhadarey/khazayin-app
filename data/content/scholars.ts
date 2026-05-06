/**
 * data/content/scholars.ts
 * ------------------------
 * Mock data for the scholars domain.
 * Sources:
 *   - SCHOLARS: 3 from scholar.tsx:16-20 + 12 additional historic/contemporary names.
 *   - LECTURES_BY_SCHOLAR: 5 entries from scholar/[id].tsx:15-27 keyed by scholar id;
 *     placeholder lists for other scholars.
 *
 * No imports from data/mockData.ts — this module is isolated.
 * Track: khazain-content-service_20260506  Phase 1 / T1.2
 */

import type { Lecture, Lookup, Scholar } from '../../types/content';

// ---------------------------------------------------------------------------
// SCHOLARS
// ---------------------------------------------------------------------------

export const SCHOLARS: Scholar[] = [
  // Original 3 from scholar.tsx — ids s1/s2/s3 preserved for route compat
  { id: 's1', name: 'عبد المحسن العباد البدر' },
  { id: 's2', name: 'عبد المحسن العباد البدر' },
  { id: 's3', name: 'عبد المحسن العباد البدر' },
  // Contemporary scholars
  { id: 's4',  name: 'عبد العزيز بن عبد الله بن باز' },
  { id: 's5',  name: 'محمد بن صالح العثيمين' },
  { id: 's6',  name: 'صالح بن فوزان الفوزان' },
  { id: 's7',  name: 'ربيع بن هادي المدخلي' },
  { id: 's8',  name: 'محمد ناصر الدين الألباني' },
  { id: 's9',  name: 'عبد الرزاق بن عبد المحسن البدر' },
  { id: 's10', name: 'محمد بن عبد الوهاب الوصابي' },
  // Historic scholars
  { id: 's11', name: 'تقي الدين أحمد بن تيمية' },
  { id: 's12', name: 'محمد بن أبي بكر ابن القيم الجوزية' },
  { id: 's13', name: 'إسماعيل بن عمر بن كثير الدمشقي' },
  { id: 's14', name: 'أبو حامد محمد الغزالي' },
  { id: 's15', name: 'سعد بن ناصر الشثري' },
];

// ---------------------------------------------------------------------------
// LECTURES_BY_SCHOLAR
// ---------------------------------------------------------------------------

/**
 * Keyed by scholar id. 5 lectures from scholar/[id].tsx:21-27 under s1;
 * shorter placeholder lists for the rest.
 */
const S1_LECTURES: Lecture[] = [
  { id: 'sl1-1', title: 'آداب الدعاء',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'scholar', scholarId: 's1' },
  { id: 'sl1-2', title: 'آداب الدعاء',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'scholar', scholarId: 's1' },
  { id: 'sl1-3', title: 'آداب الدعاء',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'scholar', scholarId: 's1' },
  { id: 'sl1-4', title: 'آداب الدعاء',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'scholar', scholarId: 's1' },
  { id: 'sl1-5', title: 'آداب الدعاء',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'scholar', scholarId: 's1' },
];

const S4_LECTURES: Lecture[] = [
  { id: 'sl4-1', title: 'الفوائد من كتاب التوحيد',  scholar: 'الشيخ ابن باز',           duration: '٤٥ دقيقة', category: 'scholar', scholarId: 's4' },
  { id: 'sl4-2', title: 'شرح نواقض الإسلام',        scholar: 'الشيخ ابن باز',           duration: '٣٨ دقيقة', category: 'scholar', scholarId: 's4' },
  { id: 'sl4-3', title: 'أحكام الصلاة',             scholar: 'الشيخ ابن باز',           duration: '٥٢ دقيقة', category: 'scholar', scholarId: 's4' },
];

const S5_LECTURES: Lecture[] = [
  { id: 'sl5-1', title: 'شرح رياض الصالحين',        scholar: 'الشيخ ابن عثيمين',        duration: '٦٠ دقيقة', category: 'scholar', scholarId: 's5' },
  { id: 'sl5-2', title: 'العقيدة الواسطية',         scholar: 'الشيخ ابن عثيمين',        duration: '٤٤ دقيقة', category: 'scholar', scholarId: 's5' },
];

/** Default placeholder lectures shared by scholars without specific data. */
const PLACEHOLDER_LECTURES = (scholarId: string, name: string): Lecture[] => [
  { id: `sl${scholarId}-ph1`, title: 'درس علمي',    scholar: name, duration: '٣٠ دقيقة', category: 'scholar', scholarId },
  { id: `sl${scholarId}-ph2`, title: 'محاضرة عامة', scholar: name, duration: '٤٥ دقيقة', category: 'scholar', scholarId },
];

export const LECTURES_BY_SCHOLAR: Lookup<Lecture[]> = {
  s1:  S1_LECTURES,
  s2:  S1_LECTURES.map((l) => ({ ...l, id: l.id.replace('sl1', 'sl2'), scholarId: 's2' })),
  s3:  S1_LECTURES.map((l) => ({ ...l, id: l.id.replace('sl1', 'sl3'), scholarId: 's3' })),
  s4:  S4_LECTURES,
  s5:  S5_LECTURES,
  s6:  PLACEHOLDER_LECTURES('s6',  'الشيخ صالح الفوزان'),
  s7:  PLACEHOLDER_LECTURES('s7',  'الشيخ ربيع المدخلي'),
  s8:  PLACEHOLDER_LECTURES('s8',  'الشيخ الألباني'),
  s9:  PLACEHOLDER_LECTURES('s9',  'الشيخ عبد الرزاق البدر'),
  s10: PLACEHOLDER_LECTURES('s10', 'الشيخ محمد الوصابي'),
  s11: PLACEHOLDER_LECTURES('s11', 'شيخ الإسلام ابن تيمية'),
  s12: PLACEHOLDER_LECTURES('s12', 'ابن القيم الجوزية'),
  s13: PLACEHOLDER_LECTURES('s13', 'ابن كثير الدمشقي'),
  s14: PLACEHOLDER_LECTURES('s14', 'الإمام الغزالي'),
  s15: PLACEHOLDER_LECTURES('s15', 'الشيخ سعد الشثري'),
};
