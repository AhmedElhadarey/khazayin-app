/**
 * data/content/quran.ts
 * ---------------------
 * Mock data for the Quran domain.
 * Sources:
 *   - SURAHS: 9 from mushaf.tsx:15-25, extended to 30 with authentic names.
 *   - AYAT_BY_SURAH: 5 from mushaf.tsx:27-37 keyed under surah "002".
 *   - QIRAAT: 10 strings from qiraat.tsx:10-21, assigned ids.
 *   - RECITERS: 7 from reciter.tsx:27-31, distributed across 4 styles.
 *   - RECITER_TABS: 4 tabs from reciter.tsx:19-25.
 *
 * No imports from data/mockData.ts — this module is isolated.
 * Track: khazain-content-service_20260506  Phase 1 / T1.1
 */

import type { Ayah, Lookup, Qiraat, Reciter, Surah } from '../../types/content';

// ---------------------------------------------------------------------------
// SURAHS
// ---------------------------------------------------------------------------

export const SURAHS: Surah[] = [
  // From mushaf.tsx (first 9, ids converted to western digits, ayah counts as numbers).
  // displayNumber is the Arabic-Indic two-digit numeral shown in the index badge.
  { id: '001', number: 1,   displayNumber: '٠١', name: 'سورة الفاتحة',   meta: 'مكية · ٧ آيات',    revelationType: 'meccan',  ayahCount: 7   },
  { id: '002', number: 2,   displayNumber: '٠٢', name: 'سورة البقرة',    meta: 'مدنية · ٢٨٦ آية', revelationType: 'medinan', ayahCount: 286 },
  { id: '003', number: 3,   displayNumber: '٠٣', name: 'سورة آل عمران',  meta: 'مدنية · ٢٠٠ آية', revelationType: 'medinan', ayahCount: 200 },
  { id: '004', number: 4,   displayNumber: '٠٤', name: 'سورة النساء',    meta: 'مدنية · ١٧٦ آية', revelationType: 'medinan', ayahCount: 176 },
  { id: '005', number: 5,   displayNumber: '٠٥', name: 'سورة المائدة',   meta: 'مدنية · ١٢٠ آية', revelationType: 'medinan', ayahCount: 120 },
  { id: '006', number: 6,   displayNumber: '٠٦', name: 'سورة الأنعام',   meta: 'مكية · ١٥٤ آية',  revelationType: 'meccan',  ayahCount: 154 },
  { id: '007', number: 7,   displayNumber: '٠٧', name: 'سورة الأعراف',   meta: 'مكية · ٢٠٤ آية',  revelationType: 'meccan',  ayahCount: 204 },
  { id: '008', number: 8,   displayNumber: '٠٨', name: 'سورة الأنفال',   meta: 'مدنية · ٧٥ آية',  revelationType: 'medinan', ayahCount: 75  },
  { id: '009', number: 9,   displayNumber: '٠٩', name: 'سورة التوبة',    meta: 'مدنية · ١٢٩ آية', revelationType: 'medinan', ayahCount: 129 },
  // Extended to 30 with authentic data
  { id: '010', number: 10,  displayNumber: '١٠', name: 'سورة يونس',      meta: 'مكية · ١٠٩ آيات', revelationType: 'meccan',  ayahCount: 109 },
  { id: '011', number: 11,  displayNumber: '١١', name: 'سورة هود',       meta: 'مكية · ١٢٣ آية',  revelationType: 'meccan',  ayahCount: 123 },
  { id: '012', number: 12,  displayNumber: '١٢', name: 'سورة يوسف',      meta: 'مكية · ١١١ آية',  revelationType: 'meccan',  ayahCount: 111 },
  { id: '013', number: 13,  displayNumber: '١٣', name: 'سورة الرعد',     meta: 'مدنية · ٤٣ آية',  revelationType: 'medinan', ayahCount: 43  },
  { id: '014', number: 14,  displayNumber: '١٤', name: 'سورة إبراهيم',   meta: 'مكية · ٥٢ آية',   revelationType: 'meccan',  ayahCount: 52  },
  { id: '015', number: 15,  displayNumber: '١٥', name: 'سورة الحجر',     meta: 'مكية · ٩٩ آية',   revelationType: 'meccan',  ayahCount: 99  },
  { id: '016', number: 16,  displayNumber: '١٦', name: 'سورة النحل',     meta: 'مكية · ١٢٨ آية',  revelationType: 'meccan',  ayahCount: 128 },
  { id: '017', number: 17,  displayNumber: '١٧', name: 'سورة الإسراء',   meta: 'مكية · ١١١ آية',  revelationType: 'meccan',  ayahCount: 111 },
  { id: '018', number: 18,  displayNumber: '١٨', name: 'سورة الكهف',     meta: 'مكية · ١١٠ آيات', revelationType: 'meccan',  ayahCount: 110 },
  { id: '019', number: 19,  displayNumber: '١٩', name: 'سورة مريم',      meta: 'مكية · ٩٨ آية',   revelationType: 'meccan',  ayahCount: 98  },
  { id: '020', number: 20,  displayNumber: '٢٠', name: 'سورة طه',        meta: 'مكية · ١٣٥ آية',  revelationType: 'meccan',  ayahCount: 135 },
  { id: '021', number: 21,  displayNumber: '٢١', name: 'سورة الأنبياء',  meta: 'مكية · ١١٢ آية',  revelationType: 'meccan',  ayahCount: 112 },
  { id: '022', number: 22,  displayNumber: '٢٢', name: 'سورة الحج',      meta: 'مدنية · ٧٨ آية',  revelationType: 'medinan', ayahCount: 78  },
  { id: '023', number: 23,  displayNumber: '٢٣', name: 'سورة المؤمنون',  meta: 'مكية · ١١٨ آية',  revelationType: 'meccan',  ayahCount: 118 },
  { id: '024', number: 24,  displayNumber: '٢٤', name: 'سورة النور',     meta: 'مدنية · ٦٤ آية',  revelationType: 'medinan', ayahCount: 64  },
  { id: '025', number: 25,  displayNumber: '٢٥', name: 'سورة الفرقان',   meta: 'مكية · ٧٧ آية',   revelationType: 'meccan',  ayahCount: 77  },
  { id: '026', number: 26,  displayNumber: '٢٦', name: 'سورة الشعراء',   meta: 'مكية · ٢٢٧ آية',  revelationType: 'meccan',  ayahCount: 227 },
  { id: '027', number: 27,  displayNumber: '٢٧', name: 'سورة النمل',     meta: 'مكية · ٩٣ آية',   revelationType: 'meccan',  ayahCount: 93  },
  { id: '028', number: 28,  displayNumber: '٢٨', name: 'سورة القصص',     meta: 'مكية · ٨٨ آية',   revelationType: 'meccan',  ayahCount: 88  },
  { id: '029', number: 29,  displayNumber: '٢٩', name: 'سورة العنكبوت',  meta: 'مكية · ٦٩ آية',   revelationType: 'meccan',  ayahCount: 69  },
  { id: '030', number: 30,  displayNumber: '٣٠', name: 'سورة الروم',     meta: 'مكية · ٦٠ آية',   revelationType: 'meccan',  ayahCount: 60  },
];

// ---------------------------------------------------------------------------
// AYAT_BY_SURAH
// ---------------------------------------------------------------------------

/**
 * Keyed by surah id. From mushaf.tsx first 5 ayat of Al-Baqarah.
 * Other surahs have empty arrays (sample text not yet populated).
 */
export const AYAT_BY_SURAH: Lookup<Ayah[]> = {
  '002': [
    { surahId: '002', number: 1, text: 'الٓمٓ' },
    { surahId: '002', number: 2, text: 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ' },
    { surahId: '002', number: 3, text: 'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَٰهُمْ يُنفِقُونَ' },
    { surahId: '002', number: 4, text: 'وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ وَمَآ أُنزِلَ مِن قَبْلِكَ وَبِٱلْءَاخِرَةِ هُمْ يُوقِنُونَ' },
    { surahId: '002', number: 5, text: 'أُو۟لَٰٓئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ' },
  ],
};

// ---------------------------------------------------------------------------
// QIRAAT
// ---------------------------------------------------------------------------

/** From qiraat.tsx:10-21 — 10 qira'at with generated slugs. */
export const QIRAAT: Qiraat[] = [
  { id: 'hafs-asim',        name: 'قراءة حفص عن عاصم' },
  { id: 'warsh-nafi',       name: 'قراءة ورش عن نافع' },
  { id: 'qaloon-nafi',      name: 'قراءة قالون عن نافع' },
  { id: 'duri-abu-amr',     name: 'الدوري عن أبي عمرو' },
  { id: 'susi-abu-amr',     name: 'السوسي عن أبي عمرو' },
  { id: 'shuba-asim',       name: 'شعبة عن عاصم' },
  { id: 'bazzi-ibn-kathir', name: 'البزي عن ابن كثير' },
  { id: 'nabl-ibn-kathir',  name: 'نبل عن ابن كثير' },
  { id: 'duri-kisai',       name: 'الدوري عن الكسائي' },
  { id: 'khalaf-hamza',     name: 'خلف عن حمزة' },
];

// ---------------------------------------------------------------------------
// RECITERS
// ---------------------------------------------------------------------------

/**
 * 7 reciters from reciter.tsx, distributed across the 4 tab styles.
 * The source screen used repeated placeholder names; here distinct real names
 * are used to give the UI meaningful content.
 */
export const RECITERS: Reciter[] = [
  { id: 'r1', name: 'الشيخ عبد الباسط عبد الصمد',    style: 'tajweed',  styleLabel: 'المصحف المجوّد'  },
  { id: 'r2', name: 'الشيخ محمود خليل الحصري',        style: 'tajweed',  styleLabel: 'المصحف المجوّد'  },
  { id: 'r3', name: 'الشيخ محمد صديق المنشاوي',       style: 'murattal', styleLabel: 'المصحف المرتل'  },
  { id: 'r4', name: 'الشيخ عبد الرحمن السديس',        style: 'murattal', styleLabel: 'المصحف المرتل'  },
  { id: 'r5', name: 'الشيخ سعد الغامدي',              style: 'murattal', styleLabel: 'المصحف المرتل'  },
  { id: 'r6', name: 'الشيخ محمد أيوب',                style: 'muallam',  styleLabel: 'المصحف المعلّم' },
  { id: 'r7', name: 'الشيخ ماهر المعيقلي',            style: 'qiraat',   styleLabel: 'قراءات'          },
];

// ---------------------------------------------------------------------------
// RECITER_TABS
// ---------------------------------------------------------------------------

/** From reciter.tsx:19-25. */
export const RECITER_TABS: { key: string; label: string }[] = [
  { key: 'tajweed',  label: 'المصحف المجوّد'  },
  { key: 'murattal', label: 'المصحف المرتل'  },
  { key: 'muallam',  label: 'المصحف المعلّم' },
  { key: 'qiraat',   label: 'قراءات'          },
];
