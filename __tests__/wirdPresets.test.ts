/**
 * T027 [US1] — `presetToPages` maps the three juz presets to FLAT page counts
 * (FR-005a). The mapping must be a pure constant lookup, independent of the
 * current juz — ajzāʾ are not uniform (juz 1 = 21 pages, juz 2 = 20), so a
 * dynamic mapping would make `wird_target_at_day` incomparable across history.
 */

import { presetToPages } from '@/db/helpers/wirdPresets';
import { JUZ_PRESET_PAGES } from '@/constants/progress';

describe('presetToPages (FR-005a)', () => {
  it('T027-1: maps quarter/half/full to flat page counts', () => {
    expect(presetToPages('quarter')).toBe(5);
    expect(presetToPages('half')).toBe(10);
    expect(presetToPages('full')).toBe(20);
  });

  it('T027-2: the mapping is a constant, independent of the current juz', () => {
    // No juz argument exists — the function cannot vary with reading position.
    // Repeated calls are bit-identical, and the values match the named constant.
    expect(presetToPages('quarter')).toBe(presetToPages('quarter'));
    expect(presetToPages('full')).toBe(presetToPages('full'));
    expect(JUZ_PRESET_PAGES).toEqual({ quarter: 5, half: 10, full: 20 });
  });
});
