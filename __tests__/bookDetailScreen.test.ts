import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SCREEN = 'app/(tabs)/sections/book/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('book detail screen', () => {
  it('exists and is registered on the Sections stack', () => {
    expect(fs.existsSync(path.join(ROOT, SCREEN))).toBe(true);
    expect(read('app/(tabs)/sections/_layout.tsx')).toMatch(/<Stack\.Screen name="book\/\[id\]" \/>/);
  });

  it('renders its sections in the contract order', () =>
    expect(read(SCREEN)).toMatch(/BOOK_DETAIL_SECTIONS\.map\(/));

  it('resolves through the pure resolver and plays through the single playback path', () => {
    const src = read(SCREEN);
    expect(src).toMatch(/resolveBookDetail\(/);
    expect(src).toMatch(/startLecturePlayback\(/);
  });

  it('uses the Sections sub-screen header, like its siblings', () =>
    expect(read(SCREEN)).toMatch(/<InlineHeader/));
});

describe('book detail screen states', () => {
  const src = read(SCREEN);

  it('picks its body and primary action through the pure helpers', () => {
    expect(src).toMatch(/bookDetailBody\(/);
    expect(src).toMatch(/bookPrimaryAction\(/);
  });

  it('offers a retry when the books failed, like the scholar detail', () => {
    expect(src).toMatch(/<AsyncContent[\s\S]*?status="error"[\s\S]*?onRetry=/);
  });

  it('holds the cover footprint while loading instead of a left-aligned row', () => {
    expect(src).not.toMatch(/SkeletonCardList/);
    expect(src).toMatch(/bookCardLayout\(/);
    expect(src).toMatch(/coverSkeleton: \{[^}]*alignSelf: 'center'/);
  });

  it('resolves the detail once per input change', () =>
    expect(src).toMatch(/useMemo\(\s*\(\) => resolveBookDetail\(/));
});

describe('BookCard accessibility', () => {
  const src = read('components/khazain/home/BookCard.tsx');

  it('is only announced as a button when it has an action', () =>
    expect(src).toMatch(/accessibilityRole=\{onPress \? 'button' : undefined\}/));

  it('is never marked disabled — a screen reader would announce it "dimmed"', () =>
    expect(src).not.toMatch(/disabled=/));

  it('gives no press feedback when there is nothing to press', () =>
    expect(src).toMatch(/scale: pressed && onPress \? 0\.97 : 1/));
});
