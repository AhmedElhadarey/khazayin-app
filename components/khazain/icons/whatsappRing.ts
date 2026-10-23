/**
 * The `Yu` instance (symbol 2548:1404) that holds the WhatsApp mark, as the
 * two More frames size it. The instance is a ring (a stroke around its own
 * box) with the 18pt glyph 2548:1405 scaled down inside it:
 *
 *  - More root, DIV-52 → 2548:1411: 16 box, 1pt ring, glyph x0.4 = 7.2.
 *  - Contact,   DIV-52 → 2548:1634: 28 box, 1.75pt ring, glyph x0.7 = 12.6.
 *
 * The instance's own stroke outline is not reused: Figma derives it at twice
 * the stated weight, so the ring is drawn as a bordered View of the stated one.
 */
export type WhatsappRingSpec = { ring: number; border: number; glyph: number };

export const WHATSAPP_RING = Object.freeze({
  more: Object.freeze({ ring: 16, border: 1, glyph: 7.2 }),
  contact: Object.freeze({ ring: 28, border: 1.75, glyph: 12.6 }),
} satisfies Readonly<Record<'more' | 'contact', WhatsappRingSpec>>);
