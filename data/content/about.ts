/**
 * data/content/about.ts
 * ---------------------
 * Copy and running order for the "مؤسسة خزائن الرحمن" screen, Figma node
 * 2106:2712. Extracted from the screen for the same reason as the archive
 * rows: the order is part of the design contract, and asserting it in JSX
 * needs a renderer, while asserting it here does not.
 */

/** Body paragraphs, in reference order, above the two info cards. */
export const ABOUT_PARAGRAPHS: readonly string[] = Object.freeze([
  'مؤسسة خزائن الرحمن هي مؤسسة دعوية تهدف إلى نشر العلم الشرعي والمحتوى الإسلامي الهادف من خلال منصات متعددة.',
  'نسعى لخدمة الدين الإسلامي من خلال توفير محتوى عالي الجودة يشمل المحاضرات والدروس والبرامج الدينية.',
  'تضم المؤسسة أكثر من ٦٥ قناة يوتيوب متخصصة في المحتوى الديني والدعوي، بالإضافة إلى قنوات التليجرام الرسمية.',
]);

export type AboutCard = { id: 'vision' | 'mission'; title: string; body: string };

/** The two cream cards below the paragraphs, in reference order. */
export const ABOUT_CARDS: readonly AboutCard[] = Object.freeze([
  {
    id: 'vision',
    title: 'رؤيتنا',
    body: 'أن نكون المرجع الأول في نشر المحتوى الإسلامي الأصيل والموثوق عبر المنصات الرقمية.',
  },
  {
    id: 'mission',
    title: 'رسالتنا',
    body: 'نشر العلم الشرعي والقيم الإسلامية من خلال وسائل التقنية الحديثة لنصل إلى أكبر عدد من المسلمين حول العالم.',
  },
]);

/** Running order of the screen's two blocks. */
export const ABOUT_SECTION_ORDER = Object.freeze(['paragraphs', 'cards'] as const);
