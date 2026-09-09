/**
 * data/content/audiobooks.ts
 * -------------------------
 * Deterministic mock rows for the كتب صوتية screen (Figma node 2869:2088).
 *
 * There is no audiobook endpoint yet, so this module is the source of truth in
 * offline/mock mode and exists so the parity screenshot has real content. When
 * a backend lands, move these behind the content service the way the reciter
 * and lecture domains already are — do not invent an endpoint here.
 */

import type { Lecture } from '../../types/content';

export const AUDIOBOOKS: Lecture[] = [
  {
    id: 'ab1',
    title: 'الرحيق المختوم',
    scholar: 'صفي الرحمن المباركفوري',
    duration: '٦ س ٢٠ د',
    category: 'general',
  },
  {
    id: 'ab2',
    title: 'رياض الصالحين',
    scholar: 'الإمام النووي',
    duration: '٩ س ٤٥ د',
    category: 'general',
  },
  {
    id: 'ab3',
    title: 'زاد المعاد',
    scholar: 'ابن قيم الجوزية',
    duration: '١٢ س ١٠ د',
    category: 'general',
  },
  {
    id: 'ab4',
    title: 'مختصر منهاج القاصدين',
    scholar: 'ابن قدامة المقدسي',
    duration: '٧ س ٣٠ د',
    category: 'general',
  },
  {
    id: 'ab5',
    title: 'صفة الصفوة',
    scholar: 'ابن الجوزي',
    duration: '٨ س ١٥ د',
    category: 'general',
  },
  {
    id: 'ab6',
    title: 'تهذيب سيرة ابن هشام',
    scholar: 'عبد السلام هارون',
    duration: '٥ س ٥٠ د',
    category: 'general',
  },
];
