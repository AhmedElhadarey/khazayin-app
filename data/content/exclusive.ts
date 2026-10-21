/**
 * data/content/exclusive.ts
 * ------------------------
 * Deterministic mock rows for the حصريات خزائن الرحمن screen
 * (Figma node 2869:2306).
 *
 * The reference frame exports as a blank media frame, so the layout follows
 * the written specification — title, search, physical-right letter rail, and
 * exclusive-content rows — rather than a readable render. Content is mock-only
 * until a backend exists; no endpoint is invented here.
 */

import type { Lecture } from '../../types/content';

export const EXCLUSIVE_ITEMS: Lecture[] = [
  {
    id: 'ex1',
    title: 'لقاء خاص مع فضيلة الشيخ',
    scholar: 'عبد المحسن العباد البدر',
    duration: '٥٢ دقيقة',
    category: 'general',
  },
  {
    id: 'ex2',
    title: 'سلسلة الحصريات — الحلقة الأولى',
    scholar: 'محمد بن صالح العثيمين',
    duration: '٤٠ دقيقة',
    category: 'general',
  },
  {
    id: 'ex3',
    title: 'مجالس رمضانية غير منشورة',
    scholar: 'عبد العزيز بن عبد الله بن باز',
    duration: '٦٥ دقيقة',
    category: 'general',
  },
  {
    id: 'ex4',
    title: 'وصايا للشباب',
    scholar: 'صالح بن فوزان الفوزان',
    duration: '٣٨ دقيقة',
    category: 'general',
  },
  {
    id: 'ex5',
    title: 'من كنوز التفسير',
    scholar: 'سعد البريك',
    duration: '٤٧ دقيقة',
    category: 'general',
  },
  {
    id: 'ex6',
    title: 'أسئلة وأجوبة حصرية',
    scholar: 'محمد العريفي',
    duration: '٣٣ دقيقة',
    category: 'general',
  },
];
