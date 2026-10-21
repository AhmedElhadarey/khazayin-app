import { existsSync, readFileSync } from 'fs';
import path from 'path';

/**
 * Freezes the 28-frame Figma parity contract from
 * `docs/plans/2026-09-09-figma-style-remediation-design.md`.
 *
 * The manifest is plain JSON (not a TS module) so the visual-audit scripts and
 * this test read exactly the same bytes, and so the app bundle never pulls a
 * documentation artefact into production code.
 */

type FigmaScreenStatus = 'implemented' | 'missing-route' | 'transition';

type FigmaScreenRecord = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  appRoute: string | null;
  readyText?: string;
  state?: Record<string, string>;
  status: FigmaScreenStatus;
  referenceImage: string;
};

const REPO_ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  'docs/visual-regression/figma-mobile-screen-map.json',
);
const REFERENCE_DIR = path.join(REPO_ROOT, 'docs/audit/2026-09-09/figma-reference');

const manifest: FigmaScreenRecord[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

/** Node IDs quoted verbatim from design specification section 6. */
const SPLASH_NODES = ['2001:835', '2001:888', '2001:914', '2007:511'];
const ROOT_NODES = ['2001:940', '2031:4659'];
const SECTION_NODES = [
  '2031:5675',
  '2031:6193',
  '2102:3187',
  '2207:5270',
  '2207:17898',
  '2349:829',
  '2349:982',
  '2457:954',
  '2102:2975',
  '2465:1911',
  '2510:1990',
  '2589:1772',
  '2597:2552',
  '2606:3830',
  '2869:2088',
  '2869:2306',
  '2120:942',
  '2120:1857',
];
const MORE_NODES = ['2102:2711', '2106:2598', '2106:2712', '2558:1334'];

const byNode = new Map(manifest.map((record) => [record.nodeId, record]));

describe('Figma mobile screen manifest', () => {
  it('contains exactly 28 unique node IDs', () => {
    expect(manifest).toHaveLength(28);
    expect(new Set(manifest.map((record) => record.nodeId)).size).toBe(28);
  });

  it('covers the four splash nodes', () => {
    expect(SPLASH_NODES.every((nodeId) => byNode.has(nodeId))).toBe(true);
    expect(SPLASH_NODES.map((nodeId) => byNode.get(nodeId)!.status)).toEqual(
      SPLASH_NODES.map(() => 'transition'),
    );
  });

  it('covers Home and Library', () => {
    expect(ROOT_NODES.every((nodeId) => byNode.has(nodeId))).toBe(true);
    expect(byNode.get('2001:940')?.appRoute).toBe('/');
    expect(byNode.get('2031:4659')?.appRoute).toBe('/library');
  });

  it('covers the 18 section frames', () => {
    expect(SECTION_NODES).toHaveLength(18);
    expect(SECTION_NODES.filter((nodeId) => byNode.has(nodeId))).toEqual(SECTION_NODES);
  });

  it('covers the four More frames', () => {
    expect(MORE_NODES.filter((nodeId) => byNode.has(nodeId))).toEqual(MORE_NODES);
    MORE_NODES.forEach((nodeId) => {
      expect(byNode.get(nodeId)?.appRoute).toMatch(/^\/more/);
    });
  });

  it('gives every non-transition frame either a route or an explicit missing-route status', () => {
    manifest
      .filter((record) => record.status !== 'transition')
      .forEach((record) => {
        if (record.status === 'implemented') {
          expect(record.appRoute).toEqual(expect.stringMatching(/^\//));
        } else {
          expect(record.status).toBe('missing-route');
          expect(record.appRoute).toBeNull();
        }
      });
  });

  it('gives every implemented frame a visible readiness marker for native captures', () => {
    manifest
      .filter((record) => record.status === 'implemented')
      .forEach((record) => expect(record.readyText).toEqual(expect.stringMatching(/\S/)));
  });

  it('leaves transition frames without a route', () => {
    manifest
      .filter((record) => record.status === 'transition')
      .forEach((record) => {
        expect(record.appRoute).toBeNull();
      });
  });

  it('records the audited logical frame size for every node', () => {
    manifest.forEach((record) => {
      expect(record.width).toBe(393);
      expect(record.height).toBeGreaterThanOrEqual(844);
    });
  });

  it('models tab and query states explicitly instead of inventing file routes', () => {
    expect(byNode.get('2031:6193')?.state).toEqual({ tab: 'tajweed' });
    expect(byNode.get('2102:3187')?.state).toEqual({ tab: 'murattal' });
    expect(byNode.get('2349:982')?.state).toEqual({ surah: '2' });
    expect(byNode.get('2349:982')?.appRoute).toBe('/sections/mushaf');
  });

  it('points every record at its numbered audit reference image', () => {
    manifest.forEach((record, index) => {
      const sequence = String(index + 1).padStart(2, '0');
      const slug = record.nodeId.replace(':', '-');
      expect(record.referenceImage).toBe(
        `docs/audit/2026-09-09/figma-reference/${sequence}-${slug}.png`,
      );
    });
  });

  // The audit images are intentionally untracked (18 MB); only assert their
  // presence when the local evidence baseline is actually available.
  (existsSync(REFERENCE_DIR) ? it : it.skip)(
    'resolves every reference image in the local audit baseline',
    () => {
      manifest.forEach((record) => {
        expect(existsSync(path.join(REPO_ROOT, record.referenceImage))).toBe(true);
      });
    },
  );
});
