import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('useRecommendations source (design §7.6)', () => {
  it('the hook memoises on primitives, not an options object', () => {
    const src = read('services/recommendations/useRecommendations.ts');
    expect(src).toMatch(/useMemo\(\(\) => indexCatalogue\(catalogue\), \[catalogue\]\)/);
    expect(src).toMatch(/\[signals, index, nowMs, dismissed, limit, contextSurah\]/);
    expect(src).not.toMatch(/useShallow/);
  });
});
