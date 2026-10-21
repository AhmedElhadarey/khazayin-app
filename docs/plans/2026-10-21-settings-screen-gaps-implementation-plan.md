# Settings screen gaps: implementation plan (v2, after CTO review)

> **For Claude:** REQUIRED SUB-SKILL: use superpowers:executing-plans (or the CLAUDE.md subagent loop: implementer, then spec review, then quality review) to implement this plan one task at a time.

**Goal:** Close the two PARTIAL audit findings on the "Settings Screen" ticket (https://trello.com/c/JIMyPFTs):
1. The privacy-policy link must be able to open in the in-app browser.
2. The build number must actually be displayed.

The one dependency added is `expo-application`, which the user approved on 2026-10-21. It is already linked transitively, so there is no native change.

**Design:** `docs/plans/2026-10-21-settings-screen-gaps-design.md`. Read §4 before starting.

**Architecture:**
- **Privacy URL.** It comes from `EXPO_PUBLIC_PRIVACY_POLICY_URL`, normalized in `constants/config.ts`. The tap logic moves to `services/privacyPolicy.ts` with injected dependencies.
- **Build number.** `app/settings-about.tsx` passes `Application.nativeBuildVersion` (synchronous), `Constants.executionEnvironment` and `Constants.expoConfig` to the pure `resolveBuildNumber` in `services/appBuildInfo.ts`:
  - native first
  - then the app config
  - `null` in Expo Go (`storeClient`) and on web

  The "رقم البناء" row always renders, showing `{build ?? '—'}`.

**Tech stack:** Expo SDK 54, RN 0.81.5, TypeScript 5.9, jest-expo. Tests are logic-only under `__tests__/`; the repo has no renderer library.

**Ground rules:** Work on branch `fix/settings-privacy-build-number`. No dependencies beyond `expo-application` (Task 4). No `Co-Authored-By` or any AI attribution in commits. Never `--no-verify`. Spread `RTL_TEXT` / `PHYSICAL_ROW` per `constants/layout.ts`.

**Verified during planning:**
- jest reads `process.env.EXPO_PUBLIC_*` at module init under `jest.isolateModules`. A throwaway probe passed; the env is not inlined at transform time in jest.
- The `.env` file is tracked, not git-ignored.

---

### Task 1: Normalize the privacy URL from the env (30 min)

**Files:**
- Modify: `constants/config.ts:1-3`
- Create: `__tests__/privacyPolicy.test.ts`

**Step 1: Write the failing tests** in `__tests__/privacyPolicy.test.ts`, using `describe('normalizePrivacyPolicyUrl')`:
- `T-PP-1: returns null for undefined, null, '' and whitespace-only`
- `T-PP-2: trims and returns a valid https URL` (`'  https://khazayin.com/privacy  '` returns `'https://khazayin.com/privacy'`)
- `T-PP-3: rejects non-https schemes`. Each of these returns `null`: `'http://khazayin.com/p'`, `'javascript:alert(1)'`, `'ftp://x.y'`, `'khazayin.com/privacy'`.
- `T-PP-4: rejects https URLs containing whitespace or with no host` (`'https:// x'`, `'https://'` both return `null`)

Add a second block, `describe('KhazainConfig.privacyPolicyUrl')`:
- `T-PP-5: reads EXPO_PUBLIC_PRIVACY_POLICY_URL at module init`. Set the env, then `jest.isolateModules(() => require('@/constants/config'))`, and expect the normalized value.
- `T-PP-6: is null (never '') when the env var is unset`. In `afterEach`, delete the env var.

**Step 2: Run the tests and confirm they fail**

`npx jest __tests__/privacyPolicy.test.ts`. Expected: FAIL, because `normalizePrivacyPolicyUrl` is not exported.

**Step 3: Implement** in `constants/config.ts`:

```ts
/**
 * Only https URLs survive. A regex, not `new URL()`: React Native's URL
 * polyfill throws on `.protocol`. Returns null (never '') when unusable.
 */
export function normalizePrivacyPolicyUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  return /^https:\/\/[^\s/?#]+[^\s]*$/i.test(url) ? url : null;
}

export const KhazainConfig = Object.freeze({
  /** Set via EXPO_PUBLIC_PRIVACY_POLICY_URL (inlined at build time). */
  privacyPolicyUrl: normalizePrivacyPolicyUrl(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
});
```

Keep the literal `process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL` member access. babel-preset-expo only inlines that exact form.

**Step 4: Run the tests and the type-check**

- `npx jest __tests__/privacyPolicy.test.ts`. Expected: PASS.
- `npx tsc --noEmit --pretty false`. Expected: no new errors. `app/(tabs)/more/settings.tsx:88` already uses `if (!url)`.

**Step 5: Commit**

```bash
git add constants/config.ts __tests__/privacyPolicy.test.ts
git commit -m "feat(settings): read the privacy policy URL from EXPO_PUBLIC_PRIVACY_POLICY_URL"
```

---

### Task 2: Extract the open-privacy-policy logic and rewire the screen (45 min)

**Files:**
- Create: `services/privacyPolicy.ts`
- Modify: `app/(tabs)/more/settings.tsx:7` (imports) and `app/(tabs)/more/settings.tsx:86-97` (`openPrivacyPolicy`)
- Test: `__tests__/privacyPolicy.test.ts` (append)

**Step 1: Write the failing tests**, using `describe('openPrivacyPolicy')` with `jest.fn()` dependencies:
- `T-PP-7: url null → alerts PRIVACY_POLICY_ALERTS.pending, never opens a browser, resolves 'pending'`
- `T-PP-8: valid url → calls openBrowser(url) exactly once, no alert, resolves 'opened'`
- `T-PP-9: openBrowser rejects → alerts PRIVACY_POLICY_ALERTS.failed, resolves 'failed' (does not throw)`
- `T-PP-10: alert copy is the Arabic text shipped today`. Pin `pending` to `{ title: 'سياسة الخصوصية', body: 'سياسة الخصوصية ستُضاف قريبًا.' }` and `failed` to `{ title: 'سياسة الخصوصية', body: 'تعذّر فتح سياسة الخصوصية. حاول مجددًا.' }`, copied exactly from `app/(tabs)/more/settings.tsx:89,95`.

**Step 2: Run the tests and confirm they fail**

`npx jest __tests__/privacyPolicy.test.ts`. Expected: FAIL, because it cannot find module `@/services/privacyPolicy`.

**Step 3: Implement** `services/privacyPolicy.ts`. Mirror the header-comment style of `services/contactForm.ts`.

```ts
export const PRIVACY_POLICY_ALERTS = Object.freeze({
  pending: Object.freeze({ title: 'سياسة الخصوصية', body: 'سياسة الخصوصية ستُضاف قريبًا.' }),
  failed: Object.freeze({ title: 'سياسة الخصوصية', body: 'تعذّر فتح سياسة الخصوصية. حاول مجددًا.' }),
} as const);

export type PrivacyPolicyDeps = {
  url: string | null;
  openBrowser: (url: string) => Promise<unknown>;
  alert: (title: string, body: string) => void;
};
export type PrivacyPolicyOutcome = 'opened' | 'pending' | 'failed';

export async function openPrivacyPolicy(deps: PrivacyPolicyDeps): Promise<PrivacyPolicyOutcome> {
  if (!deps.url) {
    deps.alert(PRIVACY_POLICY_ALERTS.pending.title, PRIVACY_POLICY_ALERTS.pending.body);
    return 'pending';
  }
  try {
    await deps.openBrowser(deps.url);
    return 'opened';
  } catch {
    deps.alert(PRIVACY_POLICY_ALERTS.failed.title, PRIVACY_POLICY_ALERTS.failed.body);
    return 'failed';
  }
}
```

Then, in `app/(tabs)/more/settings.tsx`, replace lines 86-97 with:

```ts
const onOpenPrivacyPolicy = () =>
  openPrivacyPolicy({
    url: KhazainConfig.privacyPolicyUrl,
    openBrowser: (url) => WebBrowser.openBrowserAsync(url),
    alert: (title, body) => Alert.alert(title, body),
  });
```

Also:
- Point the row at line 254 to `onPress={onOpenPrivacyPolicy}`.
- Add the import `import { openPrivacyPolicy } from '@/services/privacyPolicy';`.

Keep the `expo-web-browser` import (`settings.tsx:25`); it is still the in-app browser.

**Step 4: Run the tests, the type-check and lint**

- `npx jest __tests__/privacyPolicy.test.ts`. Expected: PASS.
- `npx tsc --noEmit --pretty false`. Expected: clean.
- `npm run lint 2>&1 | grep -E "services/privacyPolicy|more/settings" -A 2`. Expected: no output.

**Step 5: Commit**

```bash
git add services/privacyPolicy.ts "app/(tabs)/more/settings.tsx" __tests__/privacyPolicy.test.ts
git commit -m "refactor(settings): move the privacy-policy open path into a tested service"
```

---

### Task 3: Document the env var (15 min, docs only)

**Files:**
- Modify: `.env` (append a commented block; do not set a value)
- Modify: `RELEASE-READINESS.md:26-28`

**Step 1.** Append to `.env`:

```
# Privacy policy shown from Settings → سياسة الخصوصية in the in-app browser.
# https only. Unset = the app shows "ستُضاف قريبًا". Public URL, safe to commit.
# EXPO_PUBLIC_PRIVACY_POLICY_URL=
```

**Step 2.** Reword the readiness bullet at `RELEASE-READINESS.md:26-28`, and **keep it ☐ (unchecked)**. It should say:
- the code is complete
- the item is blocked on the client's URL
- set `EXPO_PUBLIC_PRIVACY_POLICY_URL` (in `.env` or the EAS profile `env`)
- the value is **inlined into the JS bundle at build time**, so a **new build** is required. `expo-updates` is not installed, so there is no OTA path.

Keep the Sentry-disclosure note.

**Step 3.** Run `npx jest __tests__/privacyPolicy.test.ts`. Expected: still PASS, because the line is commented out and nothing reads it at test time.

**Step 4: Commit**

```bash
git add .env RELEASE-READINESS.md
git commit -m "docs(release): name the privacy policy env var"
```

---

### Task 4: Promote `expo-application` to a direct dependency (20 min)

**User-approved (2026-10-21).** The module is already linked transitively, through `expo-notifications` → `expo-application ~7.0.8`:
- `package-lock.json:7746-7749` resolves 7.0.8
- the main checkout's `ios/Podfile.lock` has `EXApplication (7.0.8)`

So this task must produce **no native change**.

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `package-lock.json` (root `packages[""]` dependencies only)

**Step 1: Record the baseline**

```bash
node -p "require('./package-lock.json').packages['node_modules/expo-application'].version"   # expect 7.0.8
grep -n "EXApplication (" /Users/ahmedelhadarey/samer/khazayin-app/ios/Podfile.lock          # expect "- EXApplication (7.0.8):"
```

**Step 2: Add the dependency**

```bash
npx expo install expo-application -- --package-lock-only
```

`expo install` picks the SDK-54-compatible range (`~7.0.8`). The `--package-lock-only` flag is passed through to npm, so the **shared, symlinked `node_modules` is not rewritten**: this worktree's `node_modules` points at the main checkout's, and the planner rules forbid installing into it. 7.0.8 is already on disk, so nothing needs installing.

**Step 3: Verify**

```bash
node -p "require('./package.json').dependencies['expo-application']"                         # expect ~7.0.8
node -p "require('./package-lock.json').packages['node_modules/expo-application'].version"   # expect 7.0.8 (unchanged)
git diff --stat                                                                               # expect only package.json and package-lock.json
npx tsc --noEmit --pretty false                                                               # expect clean
```

**Stop and report to the user** if any of these happens:
- the lockfile version moves off 7.0.x
- `git diff` touches anything else
- a later `npx pod-install` in the main checkout would change `EXApplication (7.0.8)`

Any of these means a native rebuild, which was not approved.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): depend on expo-application directly (already linked via expo-notifications)"
```

---

### Task 5: Pure build-number resolver (45 min)

**Files:**
- Create: `services/appBuildInfo.ts`
- Create: `__tests__/appBuildInfo.test.ts`

**Step 1: Write the failing tests**, using `describe('resolveBuildNumber')`. They inject plain objects, so no module mocks are needed:
- `T-BN-1: returns nativeBuildVersion when present` (`{ executionEnvironment: 'standalone', nativeBuildVersion: '42', expoConfig: { ios: { buildNumber: '7' } } }` returns `'42'`; native wins over app config)
- `T-BN-2: works for a bare/dev-client build` (`executionEnvironment: 'bare'`, `nativeBuildVersion: '1'` returns `'1'`)
- `T-BN-3: returns null in Expo Go (executionEnvironment 'storeClient') even when nativeBuildVersion is set`. That value is Expo Go's own build, not ours.
- `T-BN-4: falls back to expoConfig.ios.buildNumber, then expoConfig.android.versionCode (number → string)`
- `T-BN-5: treats '', '  ', 'null', 'undefined', '0' and null as absent at every tier → null`. This covers web, where `nativeBuildVersion` is `null`.
- `T-BN-6: trims the native value` (`' 15 '` returns `'15'`)

**Step 2: Run the tests and confirm they fail**

`npx jest __tests__/appBuildInfo.test.ts`. Expected: FAIL, because it cannot find module `@/services/appBuildInfo`.

**Step 3: Implement:**

```ts
/**
 * services/appBuildInfo.ts
 * ------------------------
 * The build number shown on حول التطبيق (app/settings-about.tsx).
 *
 * Native first: eas.json uses appVersionSource "remote", so EAS writes the build
 * number only into the native project (CFBundleVersion / versionCode). It never
 * reaches Constants.expoConfig, which is why the row used to be hidden.
 * Application.nativeBuildVersion reads it from the installed binary, synchronously.
 */
export type BuildNumberSources = {
  executionEnvironment?: string | null;
  nativeBuildVersion?: string | null;
  expoConfig?: {
    ios?: { buildNumber?: string | null } | null;
    android?: { versionCode?: number | null } | null;
  } | null;
};

const ABSENT = new Set(['', 'null', 'undefined', '0']);
function clean(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return ABSENT.has(s) ? null : s;
}

export function resolveBuildNumber(s: BuildNumberSources): string | null {
  // Expo Go: nativeBuildVersion is Expo Go's own build number, not this app's.
  if (s.executionEnvironment === 'storeClient') return null;
  return (
    clean(s.nativeBuildVersion) ??
    clean(s.expoConfig?.ios?.buildNumber) ??
    clean(s.expoConfig?.android?.versionCode) ??
    null
  );
}
```

Keep this module free of `expo-application` / `expo-constants` imports. The screen passes the values in, so the tests never load native modules.

**Step 4: Run the tests and the type-check**

- `npx jest __tests__/appBuildInfo.test.ts`. Expected: PASS (6 tests).
- `npx tsc --noEmit --pretty false`. Expected: clean.

**Step 5: Commit**

```bash
git add services/appBuildInfo.ts __tests__/appBuildInfo.test.ts
git commit -m "feat(about): resolve the build number from the native binary, with an Expo Go guard"
```

---

### Task 6: Always show the build-number row on the About modal (30 min)

**Files:**
- Modify: `app/settings-about.tsx`, at these lines:
  - 1-4 (imports)
  - 14-22 (delete the local `resolveBuildNumber`)
  - 38
  - 56-61 (the conditional row)
- Test: `__tests__/appBuildInfo.test.ts` (append)

**Step 1: Write the failing test.** `T-BN-7: settings-about wires the native resolver and always renders the build row` is a source-level contract, the same style as `__tests__/rtlPhysicalContract.test.ts`. It reads `app/settings-about.tsx` as text and asserts on what **must be present**:
- it imports `expo-application`: `/from 'expo-application'/`
- it calls the shared resolver: `/resolveBuildNumber\(\{/`
- it passes the native value: `/nativeBuildVersion: Application\.nativeBuildVersion/`
- it passes the Expo Go signal: `/executionEnvironment: Constants\.executionEnvironment/`

These are three separate `toMatch` calls, so key order does not matter.
- the value cell renders unconditionally beside the label, i.e. this regex matches:

  ```
  /<Text style=\{styles\.versionValue\}>\{build \?\? '—'\}<\/Text>\s*<Text style=\{styles\.versionLabel\}>رقم البناء<\/Text>/
  ```

**Step 2: Run the test and confirm it fails**

`npx jest __tests__/appBuildInfo.test.ts -t T-BN-7`. Expected: FAIL.

**Step 3: Implement** in `app/settings-about.tsx`.

Add the imports:

```ts
import * as Application from 'expo-application';
import { resolveBuildNumber } from '@/services/appBuildInfo';
```

Delete lines 14-22 (the local `resolveBuildNumber`). Replace line 38 with:

```ts
const build = resolveBuildNumber({
  executionEnvironment: Constants.executionEnvironment,
  nativeBuildVersion: Application.nativeBuildVersion,
  expoConfig: Constants.expoConfig,
});
```

Replace lines 56-61 with the unconditional row:

```tsx
<View style={styles.versionRow}>
  <Text style={styles.versionValue}>{build ?? '—'}</Text>
  <Text style={styles.versionLabel}>رقم البناء</Text>
</View>
```

Notes:
- The value is synchronous, so there is no state, no effect and no loading flash. `—` appears only when the number is genuinely unavailable (web, Expo Go).
- The row reuses `styles.versionRow` (`PHYSICAL_ROW`, lines 119-125).
- Leave `resolveVersion` and the version row unchanged.

**Step 4: Run the tests, the type-check and lint**

- `npx jest __tests__/appBuildInfo.test.ts __tests__/rtlPhysicalContract.test.ts`. Expected: PASS.
- `npx tsc --noEmit --pretty false`. Expected: clean.
- `npm run lint 2>&1 | grep -E "settings-about|appBuildInfo" -A 2`. Expected: no output.

**Step 5: Commit**

```bash
git add app/settings-about.tsx __tests__/appBuildInfo.test.ts
git commit -m "fix(about): always show the build number, read from the native binary"
```

---

### Task 7: On-device check (45 min, plus a manual EAS follow-up)

**Local check (do now).** Load `argent-device-interact` and `argent-metro-debugger` first, then call `list-devices` and prefer booted devices.
1. Run a dev-client build on an iOS simulator (`npm run ios`) and an Android emulator (`npm run android`).
2. Use `debugger-evaluate`: `require('expo-application').nativeBuildVersion`.
   - Android: expect `'1'`, the local `versionCode` in `android/app/build.gradle`.
   - iOS: expect the local `CFBundleVersion`.
3. Open More → الإعدادات → حول التطبيق. "رقم البناء" must show that same value, not `—`.

**What this does and does not prove:** local builds only ever carry `versionCode 1` and the local `CFBundleVersion`. They prove the wiring, not the remote-managed number.

**Manual follow-up (record it in the PR or ticket; not blocking this branch):**
- Install an **EAS preview APK** (`eas build -p android --profile preview`). With `appVersionSource: "remote"`, EAS assigns a `versionCode` > 1.
- Confirm "رقم البناء" equals the number EAS printed for that build. This is the real proof for the criterion.
- Do the same for an iOS internal build if one is cut.

---

### Task 8: Full verification and visual QA

**Commands (all must pass):**

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "constants/config|services/privacyPolicy|services/appBuildInfo|settings-about|more/settings" -A 2   # expect no output
git log --oneline -7   # confirm the six commits from Tasks 1-6 exist, with no Co-Authored-By or AI attribution
git diff main -- package-lock.json | grep -E '^[+-] ' | grep -v '"expo-application": "~7.0.8"'   # expect no output: the only lockfile change is the root dependency entry (/ios and /android are git-ignored, so the lockfile is the native-diff signal)
```

**Visual QA on the iOS simulator.** Capture each screen. Repeat row 6 on the Android emulator.

| # | Route / state | Compare against |
|---|---|---|
| 1 | `/more` (initial viewport) | `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/25-2102-2711.png`. The eight reference rows must be pixel-identical to the pre-change capture (untouched). |
| 2 | `/more`, scrolled to "الإعدادات" (extension row) | No frame. Contracts: `constants/layout.ts` + `constants/rtlContracts.ts`. The row is unchanged. |
| 3 | `/(tabs)/more/settings`, scrolled to "قانوني" | No frame. Contracts: `constants/layout.ts`, `constants/typography.ts`. The row is unchanged. |
| 4 | Tap سياسة الخصوصية with the env **unset** | No frame. The Arabic alert "سياسة الخصوصية ستُضاف قريبًا." appears. |
| 5 | Same tap with `EXPO_PUBLIC_PRIVACY_POLICY_URL=https://khazayin.com` set **temporarily** in `.env.local`, then `npx expo start --clear` | No frame. The `expo-web-browser` in-app sheet opens on that URL. **Delete `.env.local` and do not commit it.** This proves the mechanism only. The criterion stays BLOCKED on the client's URL, which needs a new build because the value is bundle-inlined. |
| 6 | `/settings-about` modal | No frame. Contracts: `constants/layout.ts` (`PHYSICAL_ROW`: value on the physical left, label on the physical right), `constants/typography.ts`. Both "الإصدار 1.0.0" and "رقم البناء <n>" render, with `<n>` matching Task 7. No `—` flash on open. |
| 7 | `/settings-about` on web (`npm run web`) | No frame. "رقم البناء" shows `—`, with no crash. |
| 8 | Clear-cache confirm (regression) | No frame. The Arabic confirm dialog is unchanged (`app/(tabs)/more/settings.tsx:99-115`). |

**Done when:**
- every command passes
- rows 1-8 above are captured and match
- the spec and quality reviews have both passed for every task

**Still open after merge:**
1. The privacy policy URL from the client, followed by a new build. `RELEASE-READINESS.md:26` stays ☐.
2. The EAS preview APK build-number check (Task 7 follow-up).

---

## Deviations (recorded during implementation)

1. **Task 4: the lockfile also gained `"hasInstallScript": true` on the root `packages[""]` entry.** `npx expo install expo-application -- --package-lock-only` added it along with `"expo-application": "~7.0.8"`. `package.json` has had `"postinstall": "patch-package"` since 0635ea1, but the committed lockfile had not been regenerated since then. npm writes this flag on every lockfile write, so it is a stale-metadata correction, not a dependency or native change. `node_modules/expo-application` still resolves to 7.0.8. Consequence for Task 8: the lockfile-diff check must also allow this line, i.e. `grep -v -e '"expo-application": "~7.0.8"' -e '"hasInstallScript": true'`.
2. **Task 4 side effect: npm rewrote the hidden lockfile `node_modules/.package-lock.json` in the shared (symlinked) `node_modules`.** This happened even with `--package-lock-only`. No package directory under `node_modules` changed (checked with `find -newer` to depth 4). The hidden lockfile is npm's regenerable cache, not tracked by git.
3. **Task 8: the lockfile check must diff against the branch base `0635ea1`, not `main`.** This branch is stacked on `fix/real-device-layout-2026-09-12` (base `0635ea1`), which is not merged into `main`. `git diff main -- package-lock.json` therefore also shows the 185 lockfile lines that base adds (the `patch-package` tree from 0635ea1). Run against the true base, `git diff 0635ea1 -- package-lock.json | grep -E '^[+-] '` shows exactly two lines, `"hasInstallScript": true` and `"expo-application": "~7.0.8"`, both in the root entry.
