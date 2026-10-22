import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('Home recommended-for-you wiring', () => {
  const src = read('app/(tabs)/index.tsx');

  it('renders the section behind the kill switch and skips null nodes', () => {
    expect(src).toMatch(/recommended: RECOMMENDATIONS_ENABLED \? <RecommendedSection/);
    expect(src).toContain('homeTabletRows(HOME_SECTION_ORDER)'); // unchanged literal
    expect(src).not.toMatch(/visibleOrder/);
    expect(src.match(/== null \? null/g)?.length).toBe(2); // both loops
  });

  it('loads the catalogue only after Home first fetches settle, after interactions', () => {
    expect(src).toMatch(/Promise\.allSettled\(\[fetchScholars\(\), fetchBooks\(\), fetchDawah\(\)\]\)/);
    expect(src).toMatch(/InteractionManager\.runAfterInteractions\(/);
    expect(src).toMatch(/loadCatalogue\(\{ signalCount/);
  });

  it('refreshes activity on focus, behind the kill switch', () => {
    expect(src).toMatch(/useFocusEffect\(/);
    expect(src).toMatch(/useFocusEffect\([\s\S]{0,200}RECOMMENDATIONS_ENABLED[\s\S]{0,120}refreshActivity\(\)/);
  });

  it('re-attempts the catalogue load after each focus refresh once the gate is open', () => {
    expect(src).toMatch(/catalogueGateOpen = useRef\(false\)/);
    expect(src).toMatch(/catalogueGateOpen\.current = true;\s*tryLoadCatalogue\(\)/);
    expect(src).toMatch(
      /refreshActivity\(\)\s*\.then\(\(\) => \{\s*if \(catalogueGateOpen\.current\) tryLoadCatalogue\(\)/,
    );
    expect(src).toMatch(/refreshActivity\(\)[\s\S]{0,160}\.catch\(/);
  });

  it('re-attempts the load when a signal source changes while Home stays focused', () => {
    expect(src).toContain('useSavedStore.subscribe(');
    expect(src).toContain('useNotesStore.subscribe(');
    expect(src).toContain('useRecommendationInputsStore.subscribe(');
    expect(src).toMatch(/watchSignals\(/);
    expect(src).toMatch(/\(\) => catalogueGateOpen\.current,\s*tryLoadCatalogue/);
    expect(src).not.toMatch(/shows on the next focus too/);
  });
});
