import fs from 'fs';
import path from 'path';

/**
 * The MiniPlayer has to be reachable wherever audio can start.
 *
 * The bar itself is a four-root control — `shouldShowMainTabBar` keeps it to
 * `/`, `/library`, `/sections` and `/more`, which is what the frames draw. But
 * the MiniPlayer used to be rendered *inside* it, and every path that starts
 * audio is a nested route: a scholar's lecture list, a reciter's surah list.
 *
 * So on device the foreground service came up, `AudioTrack` ran, and the
 * screen showed no player at all — nothing to pause, nothing naming the track.
 * Rendering `MiniPlayerDock` where the bar is suppressed is what fixes it.
 */
const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('the player is reachable from the screens that start it', () => {
  it('renders the dock instead of nothing when the bar is suppressed', () => {
    const src = read('app/(tabs)/_layout.tsx');
    expect(src).toMatch(/showTabBar \? <CustomTabBar \{\.\.\.props\} \/> : <MiniPlayerDock \/>/);
    // The regression this replaces: a bare `null`, which took the player with it.
    expect(src).not.toMatch(/showTabBar \? <CustomTabBar \{\.\.\.props\} \/> : null/);
  });

  it('keeps the bar itself on the four roots the frames draw', () => {
    const src = read('constants/layout.ts');
    expect(src).toMatch(/MAIN_TAB_PATHS = new Set\(\['\/', '\/library', '\/sections', '\/more'\]\)/);
  });

  it('collapses the dock when nothing is playing, so no inset is measured', () => {
    // React Navigation measures whatever `tabBar` returns and pushes the
    // screen up by it. A dock that always rendered would add a phantom gap to
    // every quiet nested screen.
    const src = read('components/khazain/primitives/CustomTabBar.tsx');
    expect(src).toMatch(/if \(!isVisible \|\| !track\) return null;/);
  });
});

describe('the archive metadata budget fits the origin', () => {
  it('allows more than the slowest measured response', () => {
    // Measured: 1.8, 2.6, 2.8, 5.2, 10.3 s warm and 17.5 s cold. A 10 s budget
    // aborted requests that were going to succeed.
    const src = read('services/archive/archiveClient.ts');
    const m = src.match(/const TIMEOUT_MS = ([\d_]+);/);
    expect(m).not.toBeNull();
    expect(Number(m![1].replace(/_/g, ''))).toBeGreaterThanOrEqual(20_000);
  });
});
