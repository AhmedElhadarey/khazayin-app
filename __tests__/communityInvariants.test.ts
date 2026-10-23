/**
 * Community source scans (design §3.2, §11.3).
 *
 * Grows task by task; this first cut covers the build-flag scan only.
 */
import fs from 'fs';
import path from 'path';

import { guardRedirect } from '@/hooks/useCommunityGuard';
import { REPORT_REASON_ORDER } from '@/services/community/threadActions';

// The guard module imports the persisted store; the pure redirect table needs none of it.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('community build flags', () => {
  it.each(['.env', 'app.json', 'eas.json'])(
    '%s carries no community flag',
    (file) => {
      expect(read(file)).not.toMatch(/EXPO_PUBLIC_COMMUNITY_|COMMUNITY_PREVIEW/);
    },
  );

  it('config.ts reads the audit flag by literal access only', () => {
    const src = read('services/community/config.ts');
    expect(src).toContain('process.env.EXPO_PUBLIC_VISUAL_AUDIT');
    expect(src).not.toContain('process.env[');
  });
});

// ---------------------------------------------------------------------------
// N1 and bundle hygiene (design §3.2)
// ---------------------------------------------------------------------------

const SCANNED_DIRS = ['services', 'app', 'store', 'components', 'hooks'];
const SOURCE_DIRS_ALL = [...SCANNED_DIRS, 'data', 'constants', 'types', 'db', 'lib', 'plugins'];
const isSource = (f: string) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts');

function walk(rel: string): string[] {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const r = path.posix.join(rel, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : walk(r);
    return isSource(e.name) ? [r] : [];
  });
}

const MOCK_PATH = /['"][^'"]*\/mockAdapter['"]/;
const MOCK_REQUIRE = /require\(\s*['"][^'"]*\/mockAdapter['"]/g;

/** Why `src` (a file that names the mock adapter module) breaks the §3.2 form. */
function mockAdapterViolations(src: string): string[] {
  if (!MOCK_PATH.test(src)) return [];
  const out: string[] = [];
  if (/__DEV__\s*\?/.test(src)) out.push('ternary on __DEV__');
  if (/&&\s*__DEV__/.test(src)) out.push('__DEV__ placed second');
  if (/\?\s*require\(\s*['"]\.\/mockAdapter['"]/.test(src)) out.push('ternary require');
  if (/^\s*import\s+(?!type\b)[^;]*?from\s+['"][^'"]*\/mockAdapter['"]/m.test(src)) {
    out.push('static import');
  }
  if (/\bimport\(\s*['"][^'"]*\/mockAdapter['"]\s*\)/.test(src)) out.push('dynamic import');
  return out;
}

describe('N1: the mock adapter is reachable only through the __DEV__ require', () => {
  it('has exactly one require, in services/community/index.ts', () => {
    const hits = SCANNED_DIRS.flatMap(walk).filter((f) => (read(f).match(MOCK_REQUIRE) ?? []).length > 0);
    expect(hits).toEqual(['services/community/index.ts']);
    expect(read('services/community/index.ts').match(MOCK_REQUIRE)).toHaveLength(1);
  });

  it.each([
    ["require('./mockAdapter')"],
    ["require('@/services/community/mockAdapter')"],
    ['require("../community/mockAdapter")'],
  ])('counts %s as a require', (src) => {
    expect(src.match(MOCK_REQUIRE)).toHaveLength(1);
  });

  it('wraps it as `if (__DEV__) { … }`', () => {
    expect(read('services/community/index.ts')).toMatch(/if \(__DEV__\) \{[^}]*require\('\.\/mockAdapter'\)/);
  });

  it('has no other violating form anywhere in the scanned source', () => {
    const bad = SCANNED_DIRS.flatMap(walk).filter((f) => mockAdapterViolations(read(f)).length > 0);
    expect(bad).toEqual([]);
  });

  it.each([
    ["const a = __DEV__ ? require('./mockAdapter') : null;"],
    ["const a = ok && __DEV__ && require('./mockAdapter');"],
    ["const a = flag ? require('./mockAdapter') : null;"],
    ["import { mockCommunityAdapter } from './mockAdapter';"],
    ["import * as m from '@/services/community/mockAdapter';"],
    ["const m = await import('./mockAdapter');"],
  ])('flags %s', (src) => {
    expect(mockAdapterViolations(src).length).toBeGreaterThan(0);
  });

  it.each([
    ["import type { MockCommunityAdapter } from './mockAdapter';"],
    ["if (__DEV__) {\n  if (x) selected = require('./mockAdapter').mockCommunityAdapter;\n}"],
  ])('accepts %s', (src) => {
    expect(mockAdapterViolations(src)).toEqual([]);
  });

  it('references data/community/seed only from mockAdapter.ts', () => {
    const files = SOURCE_DIRS_ALL.flatMap(walk).filter((f) => !f.endsWith('data/community/seed.ts'));
    const hits = files.filter((f) => /community\/seed['"]/.test(read(f)));
    expect(hits).toEqual(['services/community/mockAdapter.ts']);
  });

  it('declares the sentinel beside the join codes', () => {
    expect(read('data/community/seed.ts')).toContain("SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'");
  });

  it('never routes a community token through setAuthToken', () => {
    const hits = walk('services/community').filter((f) => read(f).includes('setAuthToken'));
    expect(hits).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// T7b: guard, banner, Settings section and deletion-runner wiring
// ---------------------------------------------------------------------------

const COMMUNITY_SCREENS = walk('app/(tabs)/more/community').filter((f) => f.endsWith('.tsx'));

describe('community screens under More', () => {
  it('finds the hub and the guidelines screen', () => {
    expect(COMMUNITY_SCREENS).toEqual(
      expect.arrayContaining([
        'app/(tabs)/more/community/index.tsx',
        'app/(tabs)/more/community/guidelines.tsx',
      ]),
    );
  });

  it.each(COMMUNITY_SCREENS)('%s calls useCommunityGuard(', (file) => {
    expect(read(file)).toContain('useCommunityGuard(');
  });

  it.each(COMMUNITY_SCREENS)('%s renders <PreviewBanner', (file) => {
    expect(read(file)).toContain('<PreviewBanner');
  });

  it.each(COMMUNITY_SCREENS)('%s opts in only through enrollMember', (file) => {
    expect(read(file)).not.toMatch(/\.optIn\(|members\.(register|rename)/);
  });

  it('registers the hub and the guidelines screen in the More stack', () => {
    const layout = read('app/(tabs)/more/_layout.tsx');
    expect(layout).toContain('name="community/index"');
    expect(layout).toContain('name="community/guidelines"');
  });
});

// ---------------------------------------------------------------------------
// T8: group screens
// ---------------------------------------------------------------------------

const GROUP_SCREENS = [
  'app/(tabs)/more/community/create.tsx',
  'app/(tabs)/more/community/join.tsx',
  'app/(tabs)/more/community/group/[id].tsx',
];

describe('group screens', () => {
  it('are found by the screen walk, so the guard and banner scans cover them', () => {
    expect(COMMUNITY_SCREENS).toEqual(expect.arrayContaining(GROUP_SCREENS));
  });

  it.each(GROUP_SCREENS)("%s needs an open community", (file) => {
    expect(read(file)).toContain("useCommunityGuard('open')");
  });

  it.each(GROUP_SCREENS)('%s has no long-press and no row-reverse', (file) => {
    expect(read(file)).not.toMatch(/onLongPress|row-reverse/);
  });

  it('registers the three routes in the More stack', () => {
    const layout = read('app/(tabs)/more/_layout.tsx');
    for (const name of ['community/create', 'community/join', 'community/group/[id]']) {
      expect(layout).toContain(`name="${name}"`);
    }
  });

  it('is reached through the exact paths the hub pushes', () => {
    const hub = read('app/(tabs)/more/community/index.tsx');
    expect(hub).toContain("'/(tabs)/more/community/create'");
    expect(hub).toContain("'/(tabs)/more/community/join'");
    expect(hub).toContain('`/(tabs)/more/community/group/${encodeURIComponent(id)}`');
  });

  describe('group/[id].tsx', () => {
    const src = read('app/(tabs)/more/community/group/[id].tsx');

    it('pushes progress from useFocusEffect', () => {
      expect(src).toMatch(/useFocusEffect\(\s*useCallback\([\s\S]*?onGroupFocused\(/);
    });

    it('shows the share toggle and the reset help from the frozen copy', () => {
      expect(src).toContain('COMMUNITY_COPY.shareProgress');
      expect(src).toContain('COMMUNITY_COPY.resetHelp');
      const copy = read('constants/communityCopy.ts');
      expect(copy).toContain("'إظهار تقدّمي لأعضاء المجموعة'");
      expect(copy).toContain("'لا ينقص التقدّم المُرسَل بعد إعادة تعيين القراءة'");
    });

    it('gates the totals through groupView and sums nothing itself', () => {
      expect(src).toContain('groupView(');
      expect(src).not.toMatch(/\.reduce\(/);
    });

    it('shares the code with Share.share inside a PHYSICAL_BOX', () => {
      expect(src).toContain('Share.share(');
      expect(src).toContain('PHYSICAL_BOX');
    });

    it('leaves through a destructive Alert and runMutation', () => {
      expect(src).toContain("style: 'destructive'");
      expect(src).toContain("runMutation('leaveGroup'");
    });

    it('fetches the detail only while the guard allows the screen', () => {
      expect(src).toMatch(/if \(allowed && !leaveGuard\.current\.left\) void fetchDetail\(\)/);
    });

    it('has no empty-state prop: the detail store has no empty state', () => {
      expect(src).not.toContain('emptyMessage=');
    });

    it('sends the share toggle through runMutation', () => {
      expect(src).toContain("runMutation('setShareMyProgress'");
    });
  });

  describe('create.tsx and join.tsx', () => {
    const create = read('app/(tabs)/more/community/create.tsx');
    const join = read('app/(tabs)/more/community/join.tsx');

    it('filters the group name with the adab filter', () => {
      expect(create).toMatch(/checkText\([^)]*'groupName'\)/);
    });

    it('creates and starts through runMutation and reports the challenge', () => {
      expect(create).toMatch(/runMutation\(\s*'createGroup'/);
      expect(create).toMatch(/runMutation\(\s*'startChallenge'/);
      expect(create).toContain('onChallengeJoined(');
    });

    it('joins through runMutation, uppercased, with the code length cap', () => {
      expect(join).toContain("runMutation('joinGroup'");
      expect(join).toContain('normalizeJoinCode(');
      expect(join).not.toContain('maxLength=');
      expect(join).toContain('onChallengeJoined(');
    });

    it('sets error state only while the generation is current', () => {
      for (const src of [create, join]) {
        expect(src).toMatch(/catch \(e\) \{\s*if \(gen === communityGeneration\(\)\) \{?\s*setError\(/);
      }
    });

    it('keeps the code field in the fixed input row', () => {
      expect(join).toContain('styles.inputRow');
    });
  });

  it('pins direction on the scroll content so inherited-RTL texts align right', () => {
    // A Text with RTL_TEXT directly in the content (or AsyncContent's fade wrapper)
    // is not inside any PHYSICAL_BOX and renders on the physical left on native.
    const styleBody = (src: string, key: string) =>
      src.match(new RegExp(`\\n  ${key}: \\{[^}]*\\}`))?.[0] ?? '';
    for (const file of GROUP_SCREENS) {
      expect(styleBody(read(file), 'content')).toContain('...PHYSICAL_BOX');
    }
    expect(styleBody(read('app/(tabs)/more/community/group/[id].tsx'), 'body')).toContain('...PHYSICAL_BOX');
  });

  it('resolves the group detail store once per screen, outside render', () => {
    const src = read('app/(tabs)/more/community/group/[id].tsx');
    expect(src).toMatch(/useState\(\(\) => groupDetailStore\(groupId\)\)/);
    expect(src).not.toMatch(/=\s*groupDetailStore\(groupId\);/);
  });

  it('leaves through the guarded runner and creates through the retrying flow', () => {
    expect(read('app/(tabs)/more/community/group/[id].tsx')).toContain('runLeave(');
    expect(read('app/(tabs)/more/community/create.tsx')).toContain('runCreateFlow(');
  });

  it('does not wait for the progress report before navigating', () => {
    const create = read('app/(tabs)/more/community/create.tsx');
    expect(create).not.toMatch(/await onChallengeJoined\(/);
    expect(create).toMatch(/router\.replace\([^;]*;\s*void onChallengeJoined\(/);
    const join = read('app/(tabs)/more/community/join.tsx');
    expect(join).not.toMatch(/await reportJoined\(/);
    expect(join).toMatch(/router\.replace\([^;]*;\s*void reportJoined\(/);
  });

  it('keys the focus push on the challenge id', () => {
    expect(read('app/(tabs)/more/community/group/[id].tsx')).toMatch(/\[challenge\?\.id\]/);
  });

  it('picker options are radios with a checked state', () => {
    const src = read('app/(tabs)/more/community/create.tsx');
    expect(src).toContain('accessibilityRole="radio"');
    expect(src).toMatch(/accessibilityState=\{\{ checked:/);
    expect(src).not.toMatch(/accessibilityState=\{\{ selected/);
  });

  it('ProgressBar is a progressbar with a value', () => {
    const src = read('components/khazain/community/ProgressBar.tsx');
    expect(src).toContain('accessibilityRole="progressbar"');
    expect(src).toContain('accessibilityValue');
  });

  it('GroupRow spreads PHYSICAL_ROW and authors its children in GROUP_ROW_ORDER', () => {
    const src = read('components/khazain/community/GroupRow.tsx');
    expect(src).toContain('...PHYSICAL_ROW');
    expect(src).toContain('GROUP_ROW_ORDER');
  });

  it('exports the four components from the community barrel', () => {
    const barrel = read('components/khazain/community/index.ts');
    for (const name of ['GroupRow', 'ChallengeCard', 'ProgressBar', 'MemberRow']) {
      expect(barrel).toContain(name);
    }
  });

  it('keeps the seeded join codes out of every file except the seed', () => {
    const files = SOURCE_DIRS_ALL.flatMap(walk).filter((f) => !f.endsWith('data/community/seed.ts'));
    const hits = files.filter((f) => /KHZ7Q2|NUR4M8|HDY9P3/.test(read(f)));
    expect(hits).toEqual([]);
  });
});

describe('Settings community section', () => {
  const src = read('app/(tabs)/more/settings.tsx');

  it('uses the frozen copy for the three entry strings', () => {
    for (const key of ['joinCommunity', 'participate', 'deletionPending']) {
      expect(src).toContain(`COMMUNITY_COPY.${key}`);
    }
    const copy = read('constants/communityCopy.ts');
    for (const s of ['الانضمام إلى المجتمع', 'المشاركة في المجتمع', 'جارٍ حذف بياناتك في المجتمع']) {
      expect(copy).toContain(`'${s}'`);
    }
  });

  it('mounts the section exactly once, behind the mode check', () => {
    expect(src.match(/<CommunitySettingsSection/g)).toHaveLength(1);
    expect(src).toContain("{COMMUNITY_MODE !== 'off' ? <CommunitySettingsSection /> : null}");
  });

  it('renders the section only when the mode is not off', () => {
    expect(src).toMatch(/COMMUNITY_MODE !== 'off'/);
    const at = src.indexOf("COMMUNITY_MODE !== 'off'");
    expect(src.indexOf('COMMUNITY_COPY.settingsSection')).toBeGreaterThan(at);
    expect(src.indexOf('COMMUNITY_COPY.deleteMyData')).toBeGreaterThan(at);
  });

  it('confirms the deletion with a destructive Alert', () => {
    const from = src.indexOf('Alert.alert(COMMUNITY_COPY.deleteMyData');
    expect(from).toBeGreaterThan(-1);
    const call = src.slice(from, src.indexOf(']);', from));
    expect(call).toContain('COMMUNITY_COPY.deleteConfirmBody');
    expect(call.match(/style: 'destructive'/g)).toHaveLength(1);
  });
});

describe('deletion runner wiring', () => {
  it('starts once in the root layout', () => {
    expect(read('app/_layout.tsx').match(/startDeletionRunner\(\)/g)).toHaveLength(1);
  });

  it('is a no-op in off mode', () => {
    expect(read('services/community/deletionRunner.ts')).toMatch(/COMMUNITY_MODE === 'off'/);
  });
});

describe('community name checks', () => {
  it('adab-checks the name in the enrollment flow', () => {
    expect(read('services/community/enrollment.ts')).toMatch(/checkText\([^)]*'name'\)/);
  });
});

// ---------------------------------------------------------------------------
// T9: lecture discussions, report sheet, mute
// ---------------------------------------------------------------------------

const DISCUSSION_SCREENS = [
  'app/(tabs)/sections/discussion/index.tsx',
  'app/(tabs)/sections/discussion/[lectureId].tsx',
];
const REPORT_SHEET = 'app/community-report-sheet.tsx';
const T9_SCREENS = [...DISCUSSION_SCREENS, REPORT_SHEET];
const COMMUNITY_COMPONENTS = walk('components/khazain/community').filter((f) => f.endsWith('.tsx'));
const styleOf = (src: string, key: string) => src.match(new RegExp(`\\n  ${key}: \\{[^}]*\\}`))?.[0] ?? '';

describe('discussion screens and the report sheet', () => {
  it.each(T9_SCREENS)("%s needs an open community, renders the banner and has no long-press", (file) => {
    const src = read(file);
    expect(src).toContain("useCommunityGuard('open'");
    expect(src).toContain('<PreviewBanner');
    expect(src).not.toMatch(/onLongPress|row-reverse/);
  });

  it.each(DISCUSSION_SCREENS)('%s pins direction on the scroll content', (file) => {
    expect(styleOf(read(file), 'content')).toContain('...PHYSICAL_BOX');
  });

  it('registers both discussion routes in the Sections stack', () => {
    const layout = read('app/(tabs)/sections/_layout.tsx');
    expect(layout).toContain('name="discussion/index"');
    expect(layout).toContain('name="discussion/[lectureId]"');
  });

  it('declares the report sheet as a transparent fade modal at the root', () => {
    expect(read('app/_layout.tsx')).toMatch(
      /name="community-report-sheet"\s*options=\{SHEET_OPTIONS\}/,
    );
  });

  it('sends a discussion path in `hidden` to the Sections root', () => {
    expect(guardRedirect('hidden', 'open', '/sections/discussion')).toBe('/(tabs)/sections');
    expect(guardRedirect('hidden', 'open', '/sections/discussion/sl1-1')).toBe('/(tabs)/sections');
  });

  describe('the thread', () => {
    const src = read('app/(tabs)/sections/discussion/[lectureId].tsx');

    it('keys the thread on Lecture.id and reads posts through visiblePosts', () => {
      expect(src).toContain('useThreadPostsStore(lectureId)');
      expect(src).toContain('visiblePosts(');
      expect(src).toContain('useScholarLecturesStore(scholarId)');
      expect(src).not.toMatch(/usePlayerStore|PlayerTrack/);
    });

    it('plays through startLecturePlayback with the frozen label', () => {
      expect(src).toContain('startLecturePlayback(');
      expect(src).toContain('COMMUNITY_COPY.listenToLecture');
    });

    it('writes only through the pure runners and runMutation', () => {
      for (const op of ["'createPost'", "'deletePost'"]) expect(src).toContain(`runMutation(${op}`);
      for (const fn of ['runSubmitPost(', 'runDeletePost(', 'runMute(', 'openOnce(']) expect(src).toContain(fn);
    });

    it('confirms delete and mute with destructive Alerts', () => {
      expect(src.match(/style: 'destructive'/g)).toHaveLength(2);
      expect(src).toContain('COMMUNITY_COPY.muteConfirm');
    });

    it('keeps the composer in the fixed input row inside a KeyboardAvoidingView', () => {
      expect(src).toContain('<KeyboardAvoidingView');
      expect(src).toContain('styles.inputRow');
    });

    it('pushes the report sheet by postId only', () => {
      expect(src).toContain("'/community-report-sheet'");
      expect(src).toMatch(/params:\s*\{\s*postId:\s*post\.id\s*\}/);
    });
  });

  describe('the composer', () => {
    const src = read('components/khazain/community/Composer.tsx');
    const thread = read('app/(tabs)/sections/discussion/[lectureId].tsx');

    it('filters as a post and sanitizes before the cap, so there is no native maxLength', () => {
      expect(read('services/community/threadActions.ts')).toMatch(/checkText\([^)]*'post'\)/);
      expect(src).not.toContain('maxLength=');
      expect(src).toContain('normalizePostInput(');
    });

    it('announces the counter at 90% and labels the input', () => {
      expect(src).toContain('announceForAccessibility');
      expect(src).toContain('counterAnnouncement(');
      expect(src).toContain('accessibilityLabel={COMMUNITY_COPY.composerLabel}');
    });

    it('shows the cooldown and review copy from the frozen set', () => {
      const actions = read('services/community/threadActions.ts');
      expect(actions).toContain('cooldownCopy(');
      expect(actions).toContain('COMMUNITY_COPY.hourlyLimit');
      expect(thread).toContain('waitCopy(');
      expect(thread).toContain('COMMUNITY_COPY.reviewNotice');
    });
  });

  describe('the report sheet', () => {
    const src = read(REPORT_SHEET);

    it('is a SheetShell of SheetRow radios over the six frozen reasons', () => {
      expect(src).toContain('<SheetShell');
      expect(src).toContain('REPORT_REASON_ORDER.map(');
      expect(src.match(/<SheetRow/g)).toHaveLength(1);
      expect(REPORT_REASON_ORDER).toHaveLength(6);
      expect(src).toContain('checked={');
    });

    it('resolves its target from the postId param and the store, and closes if it is gone', () => {
      expect(src).toContain('findThreadPost(postId)');
      expect(src).toMatch(/useLocalSearchParams<\{ postId\?: string \| string\[\] \}>/);
      expect(src).not.toMatch(/params\.(body|name|displayName|lectureId)/);
    });

    it('reports through runMutation and the pure runner, then hides locally', () => {
      expect(src).toContain("runMutation('report'");
      expect(src).toContain('runSubmitReport(');
      expect(src).toContain('hidePost');
    });

    it('uses the sheet shell for the tablet column, not columnStyle', () => {
      expect(src).not.toContain('columnStyle');
    });
  });
});

describe('T9 review fixes', () => {
  it('the index shows the zero-discussion subtitle for an empty summaries store too', () => {
    const src = read('app/(tabs)/sections/discussion/index.tsx');
    expect(src).toMatch(/summariesStatus === 'success' \|\| summariesStatus === 'empty'/);
  });

  it('the report note announces its counter at 90% like the composer', () => {
    const sheet = read(REPORT_SHEET);
    expect(sheet).toContain('counterAnnouncement(');
    expect(sheet).toContain('announceForAccessibility');
    expect(read('components/khazain/community/Composer.tsx')).toContain('counterAnnouncement(');
  });
});

describe('T9 quality fixes', () => {
  const thread = read('app/(tabs)/sections/discussion/[lectureId].tsx');
  const index = read('app/(tabs)/sections/discussion/index.tsx');

  it('the thread keeps loaded posts on screen whatever the store status says', () => {
    expect(thread).toContain('data={posts}');
    expect(thread).not.toMatch(/status === 'success' \? posts/);
    expect(thread).toContain('threadListPlan(');
  });

  it('both screens show the empty state, not a skeleton, when the route param is missing', () => {
    expect(thread).toMatch(/lectureId === ''/);
    expect(index).toMatch(/scholarId === ''/);
  });

  it('the report sheet latches close() and releases the latch on mount', () => {
    const sheet = read(REPORT_SHEET);
    expect(sheet).toContain('closeOnce(');
    expect(sheet).toMatch(/state\.closed = false;\s*return \(\) => \{\s*state\.closed = true;/);
  });
});

describe('community components', () => {
  it('finds the three new components', () => {
    expect(COMMUNITY_COMPONENTS).toEqual(
      expect.arrayContaining([
        'components/khazain/community/ScholarDiscussionsEntry.tsx',
        'components/khazain/community/PostRow.tsx',
        'components/khazain/community/Composer.tsx',
      ]),
    );
  });

  it.each(COMMUNITY_COMPONENTS)('%s has no long-press, row-reverse, or logging of a body or name', (file) => {
    const src = read(file);
    expect(src).not.toMatch(/onLongPress|row-reverse/);
    expect(src).not.toMatch(/console\.[^;]*(body|displayName|name)/);
  });

  it('PostRow spreads PHYSICAL_ROW in COMMUNITY_POST_ORDER', () => {
    const src = read('components/khazain/community/PostRow.tsx');
    expect(src).toContain('...PHYSICAL_ROW');
    expect(src).toContain('COMMUNITY_POST_ORDER');
  });

  it('exports them from the community barrel', () => {
    const barrel = read('components/khazain/community/index.ts');
    for (const name of ['ScholarDiscussionsEntry', 'PostRow', 'Composer']) expect(barrel).toContain(name);
  });
});

describe('community code never logs a post body or a name', () => {
  const files = [...walk('services/community'), ...walk('components/khazain/community'), ...T9_SCREENS, 'store/communityMutations.ts', 'store/communityStores.ts'];
  it.each(files)('%s', (file) => {
    expect(read(file)).not.toMatch(/console\.[a-z]+\([^)]*\b(body|displayName|authorName|text|note)\b/);
  });
});

describe('scholar detail entry', () => {
  const src = read('app/(tabs)/sections/scholar/[id].tsx');
  const entry = read('components/khazain/community/ScholarDiscussionsEntry.tsx');

  it('holds the entry in `discussionEntry` and places it exactly twice', () => {
    expect(src.match(/discussionEntry/g)).toHaveLength(3);
    expect(src).toMatch(/const discussionEntry = \(?\s*<ScholarDiscussionsEntry/);
    expect(src).toMatch(/\{notesPlacement === 'panel' \? notesSection : null\}\s*\{discussionEntry\}/);
  });

  it('never puts it in the list footer, and leaves the notes pins alone', () => {
    expect(src.match(/notesSection/g)).toHaveLength(3);
    expect(src).toContain("ListFooterComponent={notesPlacement === 'footer' ? notesSection : null}");
    expect(src).not.toMatch(/ListFooterComponent=\{[^}]*discussionEntry/);
    expect(src).not.toMatch(/<RibbonCard[^>]*onLongPress/);
  });

  it('renders null unless the community is open, and names nothing notesSection', () => {
    expect(entry).toContain("if (access !== 'open') return null;");
    expect(entry).not.toContain('notesSection');
  });

  it('starts no fetch before the access check', () => {
    const gate = entry.indexOf("if (access !== 'open') return null;");
    expect(gate).toBeGreaterThan(-1);
    expect(entry.indexOf('useThreadSummariesStore(')).toBeGreaterThan(gate);
  });
});
