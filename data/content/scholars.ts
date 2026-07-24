/**
 * data/content/scholars.ts
 * ------------------------
 * Data for the scholars domain.
 * Sources:
 *   - SCHOLARS: 3 from scholar.tsx:16-20 + 12 additional historic/contemporary names.
 *   - LECTURES_BY_SCHOLAR: archive-backed catalogue — each lecture with an
 *     `archiveId` is a REAL Internet Archive audio series (one item = one
 *     series; episodes are resolved at play time). Scholars without archive
 *     material keep their previous placeholder lists.
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
 * Keyed by scholar id. Archive-backed series for the mapped contemporary
 * scholars (s1-s6, s8, s9, s15); placeholder lists for the rest.
 * `duration` is intentionally '' for archive series — per-episode duration is
 * resolved at play time.
 */
const S1_LECTURES: Lecture[] = [
  { id: 'sl1-1', title: 'شرح صحيح البخاري',   scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '214_20210728' },
  { id: 'sl1-2', title: 'شرح صحيح مسلم',      scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '094_20210730' },
  { id: 'sl1-3', title: 'شرح سنن أبي داود',   scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '001_20210731' },
  { id: 'sl1-4', title: 'شرح سنن الترمذي',    scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '336_20210804' },
  { id: 'sl1-5', title: 'شرح سنن النسائي',    scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '042_20210805' },
  { id: 'sl1-6', title: 'شرح سنن ابن ماجه',   scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '096_20210806' },
  { id: 'sl1-7', title: 'شرح بلوغ المرام',    scholar: 'الشيخ عبد المحسن العباد', duration: '', category: 'scholar', scholarId: 's1', archiveId: '061_20210807' },
];

const S4_LECTURES: Lecture[] = [
  { id: 'sl4-1', title: 'محاضرات ابن باز',      scholar: 'الشيخ ابن باز', duration: '', category: 'scholar', scholarId: 's4', archiveId: '0006_20231225' },
  { id: 'sl4-2', title: 'فتاوى نور على الدرب',  scholar: 'الشيخ ابن باز', duration: '', category: 'scholar', scholarId: 's4', archiveId: '973_20210629' },
  { id: 'sl4-3', title: 'شرح رياض الصالحين',    scholar: 'الشيخ ابن باز', duration: '', category: 'scholar', scholarId: 's4', archiveId: '001_20210704_202107' },
  { id: 'sl4-4', title: 'تفسير ابن كثير',       scholar: 'الشيخ ابن باز', duration: '', category: 'scholar', scholarId: 's4', archiveId: '033_20210704' },
];

const S5_LECTURES: Lecture[] = [
  { id: 'sl5-1', title: 'تفسير القرآن الكريم',        scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '485_20210705' },
  { id: 'sl5-2', title: 'شرح رياض الصالحين',          scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '011_20210710' },
  { id: 'sl5-3', title: 'شرح صحيح البخاري',           scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '059_20210716' },
  { id: 'sl5-4', title: 'شرح صحيح مسلم',              scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '1_20210717_20210717' },
  { id: 'sl5-5', title: 'شرح زاد المستقنع',           scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '109_20210725' },
  { id: 'sl5-6', title: 'شرح بلوغ المرام',            scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '002_20210724_202107' },
  { id: 'sl5-7', title: 'سلسلة لقاء الباب المفتوح',   scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '002_20230101' },
  { id: 'sl5-8', title: 'محاضرات ابن عثيمين',         scholar: 'الشيخ ابن عثيمين', duration: '', category: 'scholar', scholarId: 's5', archiveId: '361_20250211' },
];

const S6_LECTURES: Lecture[] = [
  { id: 'sl6-1', title: 'شرح زاد المستقنع',           scholar: 'الشيخ صالح الفوزان', duration: '', category: 'scholar', scholarId: 's6', archiveId: '109_20210817' },
  { id: 'sl6-2', title: 'بلوغ المرام',                scholar: 'الشيخ صالح الفوزان', duration: '', category: 'scholar', scholarId: 's6', archiveId: '103_20210808' },
  { id: 'sl6-3', title: 'مختصر زاد المعاد',           scholar: 'الشيخ صالح الفوزان', duration: '', category: 'scholar', scholarId: 's6', archiveId: '060_20210818' },
  { id: 'sl6-4', title: 'فتاوى نور على الدرب',        scholar: 'الشيخ صالح الفوزان', duration: '', category: 'scholar', scholarId: 's6', archiveId: '063_20220117' },
  { id: 'sl6-5', title: 'اقتضاء الصراط المستقيم',     scholar: 'الشيخ صالح الفوزان', duration: '', category: 'scholar', scholarId: 's6', archiveId: '001_20210810_202108' },
];

const S8_LECTURES: Lecture[] = [
  { id: 'sl8-1', title: 'محاضرات الألباني',  scholar: 'الشيخ الألباني', duration: '', category: 'scholar', scholarId: 's8', archiveId: '169_20210628' },
  { id: 'sl8-2', title: 'فتاوى الألباني',    scholar: 'الشيخ الألباني', duration: '', category: 'scholar', scholarId: 's8', archiveId: '1067_20220519' },
  { id: 'sl8-3', title: 'فوائد الألباني',    scholar: 'الشيخ الألباني', duration: '', category: 'scholar', scholarId: 's8', archiveId: '0001_20230715' },
];

const S9_LECTURES: Lecture[] = [
  { id: 'sl9-1', title: 'تفسير السعدي',                scholar: 'الشيخ عبد الرزاق البدر', duration: '', category: 'scholar', scholarId: 's9', archiveId: '0003-1_202412' },
  { id: 'sl9-2', title: 'تطريز رياض الصالحين',         scholar: 'الشيخ عبد الرزاق البدر', duration: '', category: 'scholar', scholarId: 's9', archiveId: '195_20240813' },
  { id: 'sl9-3', title: 'محاضرات عبد الرزاق البدر',    scholar: 'الشيخ عبد الرزاق البدر', duration: '', category: 'scholar', scholarId: 's9', archiveId: '012_20230905' },
  { id: 'sl9-4', title: 'معارج القبول',                scholar: 'الشيخ عبد الرزاق البدر', duration: '', category: 'scholar', scholarId: 's9', archiveId: '122_20211026' },
  { id: 'sl9-5', title: 'فقه الأدعية والأذكار',        scholar: 'الشيخ عبد الرزاق البدر', duration: '', category: 'scholar', scholarId: 's9', archiveId: '042_20220511' },
  { id: 'sl9-6', title: 'شرح الأدب المفرد',            scholar: 'الشيخ عبد الرزاق البدر', duration: '', category: 'scholar', scholarId: 's9', archiveId: '152_20211013' },
];

const S15_LECTURES: Lecture[] = [
  { id: 'sl15-1', title: 'التفسير الفقهي',         scholar: 'الشيخ سعد الشثري', duration: '', category: 'scholar', scholarId: 's15', archiveId: '034_20220810' },
  { id: 'sl15-2', title: 'فتاوى نور على الدرب',    scholar: 'الشيخ سعد الشثري', duration: '', category: 'scholar', scholarId: 's15', archiveId: '001_20220312_202203' },
];

/** Default placeholder lectures shared by scholars without archive material. */
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
  s6:  S6_LECTURES,
  s7:  PLACEHOLDER_LECTURES('s7',  'الشيخ ربيع المدخلي'),
  s8:  S8_LECTURES,
  s9:  S9_LECTURES,
  s10: PLACEHOLDER_LECTURES('s10', 'الشيخ محمد الوصابي'),
  s11: PLACEHOLDER_LECTURES('s11', 'شيخ الإسلام ابن تيمية'),
  s12: PLACEHOLDER_LECTURES('s12', 'ابن القيم الجوزية'),
  s13: PLACEHOLDER_LECTURES('s13', 'ابن كثير الدمشقي'),
  s14: PLACEHOLDER_LECTURES('s14', 'الإمام الغزالي'),
  s15: S15_LECTURES,
};
