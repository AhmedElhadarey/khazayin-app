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

  it('offers a retry when the books failed, through ErrorState directly', () => {
    expect(src).toMatch(/<ErrorState[^>]*onRetry=\{\(\) => \{ void useBooksStore\.getState\(\)\.refresh\(\); \}\}/);
    expect(src).not.toMatch(/AsyncContent/);
  });

  it('offers an Arabic retry when the sharh list failed, instead of "no audio"', () => {
    expect(src).toMatch(/action === 'error'/);
    expect(src).toMatch(/useBookLecturesStore\.getState\(\)\.refresh\(\)/);
  });

  it('sizes the action placeholder from PillButton, not a copied constant', () => {
    expect(src).toMatch(/PILL_BUTTON_HEIGHTS\.lg/);
    expect(src).not.toMatch(/= 44\b/);
    expect(read('components/khazain/primitives/PillButton.tsx'))
      .toMatch(/export const PILL_BUTTON_HEIGHTS/);
  });

  it('announces the loading cover as a progress indicator', () =>
    expect(src).toMatch(/accessible\s+accessibilityRole="progressbar"\s+accessibilityLabel="جارٍ التحميل"/));

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

  it('is not an accessibility element without an action, so its bookmark is reachable', () =>
    expect(src).toMatch(/accessible=\{onPress !== undefined\}/));

  it('labels the card only when it is the element, so the name is not read twice', () => {
    expect(src).toMatch(/<Pressable[\s\S]*?accessibilityLabel=\{onPress \? name : undefined\}/);
    expect(src).not.toMatch(/<Pressable[^>]*?accessibilityLabel=\{name\}/);
  });

  it('still names the book when the title is calligraphy art and the card is not one element', () => {
    // Home's rail cards have no onPress and render the title as an image
    // (app/(tabs)/index.tsx): without this the name would not be read at all.
    expect(src).toMatch(/<Image[\s\S]*?accessible=\{onPress === undefined\}[\s\S]*?accessibilityLabel=\{name\}[\s\S]*?\/>/);
  });
});
