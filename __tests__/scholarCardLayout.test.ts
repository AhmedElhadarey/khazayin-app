import {
  SCHOLAR_CARD_DESIGN,
  scholarCardLayout,
} from '@/components/khazain/home/scholarCardLayout';

// Figma node 2001:940, the three "العلماء والمشايخ" cards. Card 2001:1091 is
// the fully-visible one: FRAME 216.1 x 88.37 with two image children.
const REF = SCHOLAR_CARD_DESIGN.width;

describe('scholar card layout', () => {
  it('rounds the stripe to three quarters of half its height (HOME-21)', () => {
    expect(scholarCardLayout(REF).stripeRadius).toBeCloseTo(1.9, 1);
    expect(scholarCardLayout(REF * 2).stripeRadius).toBeCloseTo(3.8, 1);
  });

  it('reproduces the design card at the reference width', () => {
    const l = scholarCardLayout(REF);
    expect(l.cardHeight).toBeCloseTo(88.37, 2);
    expect(l.radius).toBeCloseTo(6.3559, 3);
  });

  it('places the gold stripe where the design does', () => {
    const { stripe } = scholarCardLayout(REF);
    expect(stripe.width).toBeCloseTo(149.59, 2);
    expect(stripe.height).toBeCloseTo(5.07, 2);
    // It overhangs the card's top edge.
    expect(stripe.top).toBeCloseTo(-2.54, 2);
    expect(stripe.left + stripe.width / 2).toBeCloseTo(REF / 2, 3);
  });

  it('sizes and centres the honorific image the way the design does', () => {
    const { honorific } = scholarCardLayout(REF);
    expect(honorific.width).toBeCloseTo(74.6329, 3);
    expect(honorific.height).toBeCloseTo(22.3949, 3);
    expect(honorific.top).toBeCloseTo(8.91, 2);
    expect(honorific.left + honorific.width / 2).toBeCloseTo(REF / 2, 3);
  });

  it('sizes and centres the name box the way the design does', () => {
    const { name } = scholarCardLayout(REF);
    expect(name.width).toBeCloseTo(178.228, 3);
    expect(name.height).toBeCloseTo(43.6946, 3);
    expect(name.top).toBeCloseTo(35.7606, 3);
    expect(name.left + name.width / 2).toBeCloseTo(REF / 2, 3);
  });

  it('leaves a gap between the honorific and the name, as the design does', () => {
    const { honorific, name } = scholarCardLayout(REF);
    expect(name.top - (honorific.top + honorific.height)).toBeCloseTo(4.4557, 3);
  });

  // The name's image fill carries a transform in the .fig — Figma's own SVG
  // export resolves it to matrix(0.00227964 0 0 0.00925926 -0.00699635
  // 0.0548105) over a 439 x 100 image — so the painted art is NOT the node box.
  it('insets the painted name art inside its box, as the fill transform does', () => {
    const { name, nameArt } = scholarCardLayout(REF);
    expect(nameArt.left).toBeCloseTo(-1.2468, 3);
    expect(nameArt.top).toBeCloseTo(2.3949, 3);
    expect(nameArt.width).toBeCloseTo(178.3638, 3);
    expect(nameArt.height).toBeCloseTo(40.458, 3);
    // Which means it is shorter than its box and hangs off the leading edge.
    expect(nameArt.height).toBeLessThan(name.height);
    expect(nameArt.left).toBeLessThan(0);
  });

  it('scales every rect with the card', () => {
    const half = scholarCardLayout(REF / 2);
    const full = scholarCardLayout(REF);
    (['stripe', 'honorific', 'name', 'nameArt'] as const).forEach((k) => {
      expect(half[k].width).toBeCloseTo(full[k].width / 2, 6);
      expect(half[k].height).toBeCloseTo(full[k].height / 2, 6);
      expect(half[k].left).toBeCloseTo(full[k].left / 2, 6);
      expect(half[k].top).toBeCloseTo(full[k].top / 2, 6);
    });
    expect(half.cardHeight).toBeCloseTo(full.cardHeight / 2, 6);
  });
});
