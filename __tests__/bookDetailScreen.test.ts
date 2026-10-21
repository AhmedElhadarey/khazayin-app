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

describe('BookCard accessibility', () => {
  it('is only announced as a button when it has an action', () => {
    const src = read('components/khazain/home/BookCard.tsx');
    expect(src).toMatch(/accessibilityRole=\{onPress \? 'button' : undefined\}/);
    expect(src).toMatch(/disabled=\{!onPress\}/);
  });
});
