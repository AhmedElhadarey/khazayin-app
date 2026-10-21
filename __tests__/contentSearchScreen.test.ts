import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
const src = read('app/content-search.tsx');

describe('content search screen', () => {
  it('chooses its body through searchBodyState and the corpus load state', () => {
    expect(src).toMatch(/searchBodyState\(/);
    expect(src).toMatch(/isCorpusLoading\(\[/);
    expect(src).toMatch(/body === 'loading'/);
    expect(src).toMatch(/<SkeletonRowList/);
  });

  it('leaves search with dismissTo + anchor through a one-shot runner', () => {
    expect(src).toMatch(/createSearchTargetRunner\(/);
    expect(src).toMatch(/router\.dismissTo\([^)]*\{ withAnchor: true \}\)/);
    expect(src).not.toMatch(/router\.replace\(/);
    expect(src).not.toMatch(/router\.push\(/);
  });

  it('starts playback only after the dismissal settles', () =>
    expect(src).toMatch(/InteractionManager\.runAfterInteractions\(/));

  it('records what the user typed as the recent search, not the tapped title', () => {
    expect(src).not.toMatch(/onPress\(route, title\)/);
    expect(src).toMatch(/commitQuery\(query\)/);
  });

  it('offers suggestion chips on no-results inside a pinned physical box', () => {
    expect(src).toMatch(/function NoResults[\s\S]*?style=\{styles\.noResultsSuggestions\}[\s\S]*?<SuggestionChips/);
    expect(src).toMatch(/noResultsSuggestions: \{\s*\.\.\.PHYSICAL_BOX,\s*alignSelf: 'stretch'/);
  });

  it('lets a tap through while the keyboard is up', () => {
    expect(src.match(/keyboardShouldPersistTaps="handled"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(read('components/khazain/search/SuggestionChips.tsx')).toMatch(/keyboardShouldPersistTaps="handled"/);
  });

  it('opens with the keyboard up', () => expect(src).toMatch(/autoFocus/));
});
