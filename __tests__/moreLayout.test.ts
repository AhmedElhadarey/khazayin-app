import fs from 'fs';
import path from 'path';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { TEXT_ROLES } from '@/constants/typography';

// Every number here is stated by node 2102:2711 (`المزيد`) in
// `docs/KHAZAYIN.fig`, read out of the binary node graph rather than measured
// off an export. The sub-screens are 2106:2598 (contact), 2106:2712 (about)
// and 2558:1334 (archive); they redraw the same chrome.

describe('the More row box the frame states', () => {
  it('gives the More card 82 at radius 16', () => {
    // `websiteLink-13` — 361 x 82, radius 16 on all four corners.
    expect(CARD_DENSITY.moreCardHeight).toBe(82);
    expect(CARD_DENSITY.moreCardRadius).toBe(16);
  });

  it('does not draw it at the lecture row height', () => {
    // The app had been reusing `lectureCardMinHeight` for this card, which is
    // the coupling that made the More rows 18pt short of the frame.
    expect(CARD_DENSITY.moreCardHeight).not.toBe(CARD_DENSITY.lectureCardMinHeight);
  });

  it('gives it a 48 rounded-square chip, not the 40 disc', () => {
    // `DIV-24` — 48 x 48 at radius 16, so it is a squircle and not a circle.
    expect(CARD_DENSITY.moreChipSize).toBe(48);
    expect(CARD_DENSITY.moreChipRadius).toBe(16);
    expect(CARD_DENSITY.moreChipRadius).toBeLessThan(CARD_DENSITY.moreChipSize / 2);
  });

  it('centres the chip in the card', () => {
    // `DIV-24` sits at y=122 in a card that starts at 105: inset 17 each side.
    expect((CARD_DENSITY.moreCardHeight - CARD_DENSITY.moreChipSize) / 2).toBe(17);
  });

  it('spaces the rows 12 apart', () => {
    // Each `margin-wrap` is 94 over an 82 card, and the cards step 94 apart:
    // y = 105, 199, 293, 387, 481, 575, 669, 763.
    expect(CARD_DENSITY.moreListGap).toBe(12);
    expect(CARD_DENSITY.moreCardHeight + CARD_DENSITY.moreListGap).toBe(94);
  });

  it('insets the row 16 from the card edge', () => {
    // The chevron sits at x=33 and the chip's `margin-wrap` ends at x=360, in
    // a card spanning 16..377.
    expect(CARD_DENSITY.moreCardPaddingHorizontal).toBe(16);
  });

  it('strokes it in the frame cream, not the section card border', () => {
    // `websiteLink-13` states `#f1e7dd` at 1pt — a warm cream, where the
    // section card carries no stroke at all.
    expect(KhazainColors.hairlineCream).toBe('#F1E7DD');
    expect(KhazainColors.hairlineCream).not.toBe(KhazainColors.cardBorder);
  });

  it('sets both of its lines in the body face at 14', () => {
    // `H3-18` and `P-21` are both TheMixArab Regular 14; the file states
    // lh 21 and 20, and the Arabic leading floor lands both on 21.
    expect(TEXT_ROLES.bodyCompact.fontSize).toBe(14);
    expect(TEXT_ROLES.bodyCompact.lineHeight).toBe(21);
    expect(TEXT_ROLES.bodyCompact.fontFamily).toBe('TheMixArab');
  });
});

describe('the components read the box rather than restating it', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

  it('ListRowCard reads every More metric from the shared constants', () => {
    const src = read('components/khazain/primitives/ListRowCard.tsx');
    for (const ref of [
      'CARD_DENSITY.moreCardHeight',
      'CARD_DENSITY.moreCardRadius',
      'CARD_DENSITY.moreCardPaddingHorizontal',
      'CARD_DENSITY.moreChipSize',
      'CARD_DENSITY.moreChipRadius',
    ]) {
      expect(src).toContain(ref);
    }
  });

  it('leaves no More screen restating a height the file already states', () => {
    for (const file of [
      'app/(tabs)/more/index.tsx',
      'app/(tabs)/more/settings.tsx',
      'components/khazain/primitives/ListRowCard.tsx',
    ]) {
      const src = read(file);
      for (const n of [82, 48]) {
        expect(src).not.toMatch(new RegExp(`(minHeight|height):\\s*${n}\\b`));
      }
    }
  });

  it('drives both More lists from the same variant, so the cards match', () => {
    // The user-visible defect this replaced: More root drew `compact` (64)
    // while Settings drew the default (96), so two screens one tap apart
    // disagreed about how tall a row is.
    const more = read('app/(tabs)/more/index.tsx');
    const settings = read('app/(tabs)/more/settings.tsx');
    expect(more).toContain('variant="more"');
    expect(settings).toContain('variant="more"');
    expect(more).not.toContain('compact');
    expect(settings).not.toContain('compact');
  });
});
