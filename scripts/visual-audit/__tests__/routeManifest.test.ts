import {
  buildCaptureTargets,
  buildDeepLink,
  captureFileName,
  classifyTarget,
  DEEP_LINKABLE_STATE_KEYS,
  MASK_REGIONS,
} from '../manifest';
import { parseArgs } from '../run';

const home = {
  nodeId: '2001:940',
  name: 'Home',
  width: 393,
  height: 1321,
  appRoute: '/',
  status: 'implemented' as const,
  referenceImage: 'docs/audit/2026-09-09/figma-reference/05-2001-940.png',
};

const mushafSurah = {
  nodeId: '2349:982',
  name: 'Mushaf reader — loaded surah',
  width: 393,
  height: 844,
  appRoute: '/sections/mushaf',
  state: { surah: '1' },
  status: 'implemented' as const,
  referenceImage: 'docs/audit/2026-09-09/figma-reference/16-2349-982.png',
};

const murattalTab = {
  nodeId: '2102:3187',
  name: 'Reciters — Murattal tab',
  width: 393,
  height: 844,
  appRoute: '/sections/reciter',
  state: { tab: 'murattal' },
  status: 'implemented' as const,
  referenceImage: 'docs/audit/2026-09-09/figma-reference/10-2102-3187.png',
};

const tajweedTab = {
  nodeId: '2031:6193',
  name: 'Reciters — default (Mujawwad) tab',
  width: 393,
  height: 844,
  appRoute: '/sections/reciter',
  state: { tab: 'tajweed' },
  status: 'implemented' as const,
  referenceImage: 'docs/audit/2026-09-09/figma-reference/08-2031-6193.png',
};

const splash = {
  nodeId: '2001:835',
  name: 'Splash — patterned launch state',
  width: 393,
  height: 852,
  appRoute: null,
  status: 'transition' as const,
  referenceImage: 'docs/audit/2026-09-09/figma-reference/01-2001-835.png',
};

const audiobooks = {
  nodeId: '2869:2088',
  name: 'Audiobooks',
  width: 393,
  height: 844,
  appRoute: null,
  status: 'missing-route' as const,
  referenceImage: 'docs/audit/2026-09-09/figma-reference/23-2869-2088.png',
};

describe('captureFileName', () => {
  it('names the root route without leaving an empty slug', () => {
    expect(captureFileName(home)).toBe('05-2001-940__home.png');
  });

  it('flattens nested routes into a single hyphenated slug', () => {
    expect(captureFileName(murattalTab)).toBe('10-2102-3187__sections-reciter__tab-murattal.png');
  });

  it('keeps query state in the filename so states never overwrite each other', () => {
    expect(captureFileName(mushafSurah)).toBe('16-2349-982__sections-mushaf__surah-1.png');
  });

  it('names route-less frames by node alone', () => {
    expect(captureFileName(splash)).toBe('01-2001-835__splash.png');
  });
});

describe('buildDeepLink', () => {
  it('builds a scheme URL for a plain route', () => {
    expect(buildDeepLink('khazayinapp', home)).toBe('khazayinapp:///');
  });

  it('preserves deep-linkable query state', () => {
    expect(buildDeepLink('khazayinapp', mushafSurah)).toBe(
      'khazayinapp:///sections/mushaf?surah=1',
    );
  });

  it('omits interaction-only state from the URL', () => {
    expect(buildDeepLink('khazayinapp', murattalTab)).toBe('khazayinapp:///sections/reciter');
    expect(buildDeepLink('khazayinapp', tajweedTab)).toBe('khazayinapp:///sections/reciter');
  });

  it('returns null when there is no route to open', () => {
    expect(buildDeepLink('khazayinapp', splash)).toBeNull();
    expect(buildDeepLink('khazayinapp', audiobooks)).toBeNull();
  });

  it('only treats query parameters the router actually reads as deep-linkable', () => {
    expect([...DEEP_LINKABLE_STATE_KEYS]).toEqual(['surah']);
  });
});

describe('classifyTarget', () => {
  it('captures a plain implemented route automatically', () => {
    expect(classifyTarget(home)).toEqual({ kind: 'deep-link', reason: null });
  });

  it('captures a deep-linkable query state automatically', () => {
    expect(classifyTarget(mushafSurah).kind).toBe('deep-link');
  });

  it('captures a screen default state automatically because arriving is enough', () => {
    expect(classifyTarget(tajweedTab)).toEqual({ kind: 'deep-link', reason: null });
  });

  it('requires a manual tap sequence for non-default interaction state', () => {
    const target = classifyTarget(murattalTab);
    expect(target.kind).toBe('manual');
    expect(target.reason).toContain('tab');
  });

  it('skips transition frames', () => {
    const target = classifyTarget(splash);
    expect(target.kind).toBe('skip');
    expect(target.reason).toContain('transition');
  });

  it('skips frames whose route is not implemented yet', () => {
    const target = classifyTarget(audiobooks);
    expect(target.kind).toBe('skip');
    expect(target.reason).toContain('missing-route');
  });
});

describe('buildCaptureTargets', () => {
  const targets = buildCaptureTargets([home, mushafSurah, murattalTab, splash, audiobooks]);

  it('returns one target per manifest record so nothing is silently dropped', () => {
    expect(targets).toHaveLength(5);
    expect(targets.map((t) => t.nodeId)).toEqual([
      '2001:940',
      '2349:982',
      '2102:3187',
      '2001:835',
      '2869:2088',
    ]);
  });

  it('carries the deep link and file name for automatic targets', () => {
    expect(targets[1]).toMatchObject({
      kind: 'deep-link',
      deepLink: 'khazayinapp:///sections/mushaf?surah=1',
      fileName: '16-2349-982__sections-mushaf__surah-1.png',
    });
  });

  it('leaves no deep link on manual and skipped targets', () => {
    expect(targets[2].deepLink).toBeNull();
    expect(targets[3].deepLink).toBeNull();
    expect(targets[4].deepLink).toBeNull();
  });
});

describe('MASK_REGIONS', () => {
  it('masks only device chrome, never app content', () => {
    expect(Object.keys(MASK_REGIONS).sort()).toEqual(['android', 'ios']);
    [...MASK_REGIONS.ios, ...MASK_REGIONS.android].forEach((region) => {
      expect(region.label).toMatch(/status bar|home indicator|navigation bar/);
      expect(region.heightRatio).toBeGreaterThan(0);
      expect(region.heightRatio).toBeLessThan(0.1);
    });
  });
});

describe('parseArgs', () => {
  const defaults = { out: '/tmp/x', settle: 1500 };

  it('applies defaults when nothing is passed', () => {
    expect(parseArgs([], defaults)).toEqual(defaults);
  });

  it('accepts both --key value and --key=value', () => {
    expect(parseArgs(['--out', '/tmp/a', '--settle=900'], defaults)).toEqual({
      out: '/tmp/a',
      settle: 900,
    });
  });

  it('coerces numeric options so --settle is never a string', () => {
    expect(parseArgs(['--settle', '900'], defaults).settle).toBe(900);
  });

  it('rejects unknown options instead of silently ignoring them', () => {
    expect(() => parseArgs(['--nope', '1'], defaults)).toThrow(/Unknown option "--nope"/);
  });

  it('rejects an option with no value', () => {
    expect(() => parseArgs(['--out'], defaults)).toThrow(/needs a value/);
  });
});
