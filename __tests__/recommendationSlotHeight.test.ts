import fs from 'fs';
import path from 'path';
import { RECOMMENDATION_SLOT_HEIGHT } from '@/constants/recommendations';
import { TEXT_ROLES } from '@/constants/typography';

// The slot is the height of a typical row (one line each of reason, title and
// meta), so three short rows leave no blank band under «مقترح لك» (design §6.5).
const source = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/RibbonCard.tsx'),
  'utf8',
);

const block = (name: string): string => {
  const match = source.match(new RegExp(`${name}:\\s*\\{([^}]*)\\}`));
  expect(match).not.toBeNull();
  return match![1];
};

const num = (body: string, key: string): number => {
  const match = body.match(new RegExp(`${key}:\\s*(\\d+)`));
  expect(match).not.toBeNull();
  return Number(match![1]);
};

describe('RECOMMENDATION_SLOT_HEIGHT', () => {
  it("equals a one-line RibbonCard row, so short rows leave no blank band", () => {
    const card = block('cardWithRibbon');
    const titleBlock = block('titleBlock');
    const chrome = 2 * (num(card, 'paddingVertical') + num(card, 'borderWidth'));
    const lines =
      TEXT_ROLES.caption.lineHeight * 2 + TEXT_ROLES.bodyCompact.lineHeight + 2 * num(titleBlock, 'gap');
    expect(RECOMMENDATION_SLOT_HEIGHT).toBe(lines + chrome);
  });
});
