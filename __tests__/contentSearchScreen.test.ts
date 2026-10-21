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

  it('starts playback when the root reappears under the closed modal, not on the next tick', () => {
    // InteractionManager is a setImmediate stub on RN 0.81, so it cannot wait
    // for the dismissal (R8). The closing screen's own transitionEnd never
    // arrives: it is unmounted, and its event emitter with it. The (tabs)
    // route stays mounted and gets transitionEnd {closing: false} instead.
    expect(src).toMatch(/runOnceAfterDismissal\(/);
    expect(src).toMatch(/onClosed: onRootRevealedOnce/);
    expect(src).not.toMatch(/addListener\('transitionEnd'/);
    expect(src).not.toMatch(/InteractionManager/);
  });

  it('has the root stack announce the (tabs) reveal', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toMatch(
      /<Stack\.Screen\s+name="\(tabs\)"[\s\S]*?listeners=\{\{\s*transitionEnd: \(e\) => \{\s*if \(!e\.data\.closing\) notifyRootRevealed\(\);/,
    );
  });

  it('reads the corpus load state from its own module', () =>
    expect(src).toMatch(/import \{ isCorpusLoading \} from '@\/services\/loadState';/));

  it('announces the loading body as a progress indicator', () =>
    expect(src).toMatch(/style=\{styles\.loadingWrap\}[\s\S]{0,40}accessible[\s\S]{0,40}accessibilityRole="progressbar"/));

  it('creates its one-shot runner once per mount', () =>
    expect(src).toMatch(/const \[runTarget\] = useState\(\(\) => createSearchTargetRunner\(/));

  it('records the typed query only when the tap actually navigated', () => {
    expect(src).not.toMatch(/onPress\(route, title\)/);
    expect(src).toMatch(/if \(runTarget\(target\)\) commitQuery\(query\);/);
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
