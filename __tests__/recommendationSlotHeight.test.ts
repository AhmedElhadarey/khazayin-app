import fs from 'fs';
import path from 'path';
import { LIST_ROW_TEXT } from '@/constants/layout';
import { RECOMMENDATION_SLOT_HEIGHT } from '@/constants/recommendations';

// The slot is the height of a typical row (reason, title, meta), so three short
// rows leave no blank band under «مقترح لك» (design §6.5). It is derived from
// LIST_ROW_TEXT, the constants RibbonCard itself reads; the rendered-card parity
// check lives in listRowMetrics.test.tsx.
const source = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/RibbonCard.tsx'),
  'utf8',
);

describe('RECOMMENDATION_SLOT_HEIGHT', () => {
  it('is built from the metrics RibbonCard reads', () => {
    for (const key of ['paddingVertical', 'borderWidth', 'titleLineHeight', 'titleGap', 'subtitleLineHeight']) {
      expect(source).toContain(`LIST_ROW_TEXT.${key}`);
    }
    expect(RECOMMENDATION_SLOT_HEIGHT).toBe(
      LIST_ROW_TEXT.subtitleLineHeight +
        LIST_ROW_TEXT.titleLineHeight +
        LIST_ROW_TEXT.titleGap +
        LIST_ROW_TEXT.subtitleLineHeight +
        2 * (LIST_ROW_TEXT.paddingVertical + LIST_ROW_TEXT.borderWidth),
    );
    expect(RECOMMENDATION_SLOT_HEIGHT).toBe(76);
  });
});
