/**
 * data/content/lectures.ts
 * ------------------------
 * Mock data for lecture catalogues (prophet / book / queen / radio categories).
 * Sources:
 *   - PROPHET_LECTURES: 7 from prophet.tsx:16-24.
 *   - BOOK_LECTURES: 7 from books.tsx:14-19, expanded with real-feeling titles.
 *   - QUEEN_LECTURES: 10 from queen.tsx:15-20.
 *   - RADIO_PROGRAMS: 8 from radio.tsx:14-23 (category 'radio').
 *
 * All entries carry the correct `category` field.
 * No imports from data/mockData.ts — this module is isolated.
 * Track: khazain-content-service_20260506  Phase 1 / T1.3
 */

import type { Lecture } from '../../types/content';

// ---------------------------------------------------------------------------
// PROPHET_LECTURES — رسول الله ﷺ (prophet.tsx)
// ---------------------------------------------------------------------------

export const PROPHET_LECTURES: Lecture[] = [
  { id: 'p1', title: 'السيرة النبوية',         scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'prophet' },
  { id: 'p2', title: 'قصص الأنبياء',           scholar: 'الشيخ سعد البريك',        duration: '٥٠ دقيقة', category: 'prophet' },
  { id: 'p3', title: 'فقه العبادات',           scholar: 'الشيخ صالح الفوزان',      duration: '٢٠ دقيقة', category: 'prophet' },
  { id: 'p4', title: 'تفسير القرآن الكريم',    scholar: 'الشيخ محمد العريفي',      duration: '٤٥ دقيقة', category: 'prophet' },
  { id: 'p5', title: 'السيرة النبوية',         scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'prophet' },
  { id: 'p6', title: 'غزوة بدر',               scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'prophet' },
  { id: 'p7', title: 'غزوة بدر',               scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'prophet' },
];

// ---------------------------------------------------------------------------
// BOOK_LECTURES — الكتب العلمية (books.tsx, expanded)
// ---------------------------------------------------------------------------

/** Source had 7 identical rows. Expanded with real-feeling distinct titles. */
export const BOOK_LECTURES: Lecture[] = [
  { id: 'b1', title: 'الإعجاز العلمي في السنة النبوية',    scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'book' },
  { id: 'b2', title: 'شرح كتاب التوحيد',                   scholar: 'الشيخ ابن عثيمين',        duration: '٤٨ دقيقة', category: 'book' },
  { id: 'b3', title: 'شرح الأربعين النووية',               scholar: 'الشيخ صالح الفوزان',      duration: '٣٦ دقيقة', category: 'book' },
  { id: 'b4', title: 'شرح رياض الصالحين',                  scholar: 'الشيخ ابن عثيمين',        duration: '٥٤ دقيقة', category: 'book' },
  { id: 'b5', title: 'متن الآجرومية في النحو',             scholar: 'الشيخ ابن عثيمين',        duration: '٢٨ دقيقة', category: 'book' },
  { id: 'b6', title: 'شرح ثلاثة الأصول',                   scholar: 'الشيخ عبد المحسن العباد', duration: '٤٠ دقيقة', category: 'book' },
  { id: 'b7', title: 'التدمرية في العقيدة',                scholar: 'الشيخ ابن تيمية',         duration: '٦٠ دقيقة', category: 'book' },
];

// ---------------------------------------------------------------------------
// QUEEN_LECTURES — أنتِ ملكة (queen.tsx)
// ---------------------------------------------------------------------------

/** Source had 10 identical placeholder entries; expanded with varied titles. */
export const QUEEN_LECTURES: Lecture[] = [
  { id: 'q0',  title: 'أنتِ ملكة',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'queen' },
  { id: 'q1',  title: 'أنتِ ملكة',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'queen' },
  { id: 'q2',  title: 'المرأة المؤمنة',         scholar: 'الشيخ صالح الفوزان',      duration: '٢٧ دقيقة', category: 'queen' },
  { id: 'q3',  title: 'حقوق المرأة في الإسلام', scholar: 'الشيخ ابن باز',           duration: '٣٥ دقيقة', category: 'queen' },
  { id: 'q4',  title: 'الأمانة والوفاء',        scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'queen' },
  { id: 'q5',  title: 'أنتِ ملكة',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'queen' },
  { id: 'q6',  title: 'أنتِ ملكة',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'queen' },
  { id: 'q7',  title: 'الصبر والشكر',           scholar: 'الشيخ سعد البريك',        duration: '٤١ دقيقة', category: 'queen' },
  { id: 'q8',  title: 'البيت السعيد',           scholar: 'الشيخ محمد العريفي',      duration: '٣٨ دقيقة', category: 'queen' },
  { id: 'q9',  title: 'أنتِ ملكة',              scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'queen' },
];

// ---------------------------------------------------------------------------
// RADIO_PROGRAMS — برامج إذاعية (radio.tsx)
// ---------------------------------------------------------------------------

export const RADIO_PROGRAMS: Lecture[] = [
  { id: 'r1', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r2', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r3', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r4', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r5', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r6', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r7', title: 'الإعجاز العلمي في السنة النبوية', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'radio' },
  { id: 'r8', title: 'تاريخ العلوم الإسلامية',          scholar: 'الشيخ إسماعيل الديوبي',   duration: '٢٧ دقيقة', category: 'radio' },
];
