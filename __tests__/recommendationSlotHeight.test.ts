import fs from 'fs';
import path from 'path';
import { RIBBON_ROW } from '@/constants/layout';
import { RECOMMENDATION_SLOT_HEIGHT } from '@/constants/recommendations';

// The slot is the height of a typical row (reason, title, meta), so three short
// rows leave no blank band under «مقترح لك» (design §6.5). It is derived from
// RIBBON_ROW, the constants RibbonCard itself reads; the rendered-card parity
// check lives in listRowMetrics.test.tsx.
const source = fs.readFileSync(
  path.join(__dirname, '..', 'components/khazain/primitives/RibbonCard.tsx'),
  'utf8',
);

describe('RECOMMENDATION_SLOT_HEIGHT', () => {
  it('is built from the metrics RibbonCard reads', () => {
    for (const key of ['paddingVertical', 'borderWidth', 'pretitleLineHeight', 'titleLineHeight', 'titleGap', 'metaLineHeight']) {
      expect(source).toContain(`RIBBON_ROW.${key}`);
    }
    expect(RECOMMENDATION_SLOT_HEIGHT).toBe(
      RIBBON_ROW.pretitleLineHeight +
        RIBBON_ROW.titleLineHeight +
        RIBBON_ROW.titleGap +
        RIBBON_ROW.metaLineHeight +
        2 * (RIBBON_ROW.paddingVertical + RIBBON_ROW.borderWidth),
    );
    expect(RECOMMENDATION_SLOT_HEIGHT).toBe(76);
  });
});
