import {
  BOOK_CARD_DESIGN,
  bookCardLayout,
} from '@/components/khazain/home/bookCardLayout';

// Figma node 2001:940, frame "الكتب العلمية".
const REF = BOOK_CARD_DESIGN.width;

describe('book card layout', () => {
  it('rounds the stripe to three quarters of half its height (HOME-21)', () => {
    expect(bookCardLayout(REF).stripeRadius).toBeCloseTo(1.45, 2);
  });

  it('reproduces the design card at the reference width', () => {
    const l = bookCardLayout(REF);
    expect(l.cardHeight).toBeCloseTo(81, 2);
    expect(l.radius).toBeCloseTo(7.7137, 3);
  });

  it('places the navy stripe where the design does', () => {
    const { stripe } = bookCardLayout(REF);
    expect(stripe.width).toBeCloseTo(113.77, 2);
    expect(stripe.height).toBeCloseTo(3.86, 2);
    // Half of it overhangs the card's top edge.
    expect(stripe.top).toBeCloseTo(-1.93, 2);
    expect(stripe.left + stripe.width / 2).toBeCloseTo(REF / 2, 3);
  });

  it('centres the title rect the way the design does', () => {
    const { title } = bookCardLayout(REF);
    expect(title.width).toBeCloseTo(160, 2);
    expect(title.height).toBeCloseTo(37, 2);
    expect(title.left).toBeCloseTo(16, 2);
    expect(title.top).toBeCloseTo(22, 2);
    expect(title.left + title.width / 2).toBeCloseTo(REF / 2, 3);
    expect(title.top + title.height / 2).toBeCloseTo(81 / 2, 3);
  });

  it('scales every rect with the card', () => {
    const half = bookCardLayout(REF / 2);
    const full = bookCardLayout(REF);
    (['stripe', 'title'] as const).forEach((k) => {
      expect(half[k].width).toBeCloseTo(full[k].width / 2, 6);
      expect(half[k].height).toBeCloseTo(full[k].height / 2, 6);
      expect(half[k].left).toBeCloseTo(full[k].left / 2, 6);
      expect(half[k].top).toBeCloseTo(full[k].top / 2, 6);
    });
    expect(half.cardHeight).toBeCloseTo(full.cardHeight / 2, 6);
  });
});
