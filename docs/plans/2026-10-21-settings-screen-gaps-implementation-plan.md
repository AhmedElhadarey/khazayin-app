# Settings screen gaps: implementation plan

> **For Claude:** REQUIRED SUB-SKILL: use superpowers:executing-plans (or the CLAUDE.md subagent loop: implementer, then spec review, then quality review) to implement this plan one task at a time.

**Goal:** Close the two PARTIAL audit findings on the "Settings Screen" ticket (https://trello.com/c/JIMyPFTs):
1. The privacy-policy link must be able to open in the in-app browser.
2. The build number must actually be displayed.

Neither may add a dependency.

**Design:** `docs/plans/2026-10-21-settings-screen-gaps-design.md`. Read §4 before starting.

**Architecture:**
- **Privacy URL.** It comes from `EXPO_PUBLIC_PRIVACY_POLICY_URL`, normalized in `constants/config.ts`. The tap logic moves to `services/privacyPolicy.ts` with injected dependencies.
- **Build number.** It is read natively in `services/appBuildInfo.ts`:
  - iOS: `Constants.platform.ios.buildNumber`
  - Android: `RNSentry.fetchNativeRelease().build`
  - fallback: `expoConfig`

  `hooks/useAppBuildNumber.ts` exposes it to `app/settings-about.tsx`, which now always renders the row.

**Tech stack:** Expo SDK 54, RN 0.81.5, TypeScript 5.9, jest-expo. Tests are logic-only under `__tests__/`; the repo has no renderer library.

**Ground rules:** Work on branch `fix/settings-privacy-build-number`. No new dependencies. No `Co-Authored-By` or any AI attribution in commits. Never `--no-verify`. Spread `RTL_TEXT` / `PHYSICAL_ROW` per `constants/layout.ts`.

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

**Step 2.** Reword the readiness bullet. It should say to set `EXPO_PUBLIC_PRIVACY_POLICY_URL` (in `.env` or the EAS profile `env`), then rebuild; no code change is needed. Keep the Sentry-disclosure note.

**Step 3.** Run `npx jest __tests__/privacyPolicy.test.ts`. Expected: still PASS, because the line is commented out and nothing reads it at test time.

**Step 4: Commit**

```bash
git add .env RELEASE-READINESS.md
git commit -m "docs(release): name the privacy policy env var"
```

---

### Task 4: Pure build-number precedence (45 min)

**Files:**
- Create: `services/appBuildInfo.ts`
- Create: `__tests__/appBuildInfo.test.ts`

**Step 1: Write the failing tests**, using `describe('pickBuildNumber')`:
- `T-BN-1: native build wins over expoConfig` (`{ native: '42', expoConfig: { ios: { buildNumber: '7' } } }` returns `'42'`)
- `T-BN-2: falls back to expoConfig.ios.buildNumber when native is absent`
- `T-BN-3: falls back to expoConfig.android.versionCode (number → string)` (`{ android: { versionCode: 12 } }` returns `'12'`)
- `T-BN-4: treats '', '  ', 'null', 'undefined', '0' and null as absent at every tier`, returning `null` when every tier is absent.
- `T-BN-5: trims a native value` (`' 15 '` returns `'15'`)

**Step 2: Run the tests and confirm they fail**

`npx jest __tests__/appBuildInfo.test.ts`. Expected: FAIL, because the module is missing.

**Step 3: Implement:**

```ts
export type BuildNumberSources = {
  native?: string | null;
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

export function pickBuildNumber(s: BuildNumberSources): string | null {
  return (
    clean(s.native) ??
    clean(s.expoConfig?.ios?.buildNumber) ??
    clean(s.expoConfig?.android?.versionCode) ??
    null
  );
}
```

The header comment must explain why native wins: `appVersionSource: "remote"` in `eas.json:4` writes the build number only into native files, and OTA updates can change `expoConfig` but never the binary.

**Step 4: Run the tests and the type-check**

- `npx jest __tests__/appBuildInfo.test.ts`. Expected: PASS.
- `npx tsc --noEmit --pretty false`. Expected: clean.

**Step 5: Commit**

```bash
git add services/appBuildInfo.ts __tests__/appBuildInfo.test.ts
git commit -m "feat(about): add build-number precedence (native, then app config)"
```

---

### Task 5: Native build-number reader and Sentry contract pin (1 h)

**Files:**
- Modify: `services/appBuildInfo.ts`
- Test: `__tests__/appBuildInfo.test.ts` (append)

**Step 1: Write the failing tests**, using `describe('readNativeBuildNumber')` with injected dependencies (no module mocks needed):
- `T-BN-6: iOS returns iosBuildNumber() and does not touch the Sentry module`. Use `{ os: 'ios', iosBuildNumber: () => '31', getSentryNative: jest.fn() }`, expect `'31'`, and expect `getSentryNative` not to have been called.
- `T-BN-7: iOS with null CFBundleVersion falls through to Sentry fetchNativeRelease().build`
- `T-BN-8: Android resolves fetchNativeRelease().build` (`{ build: '57' }` returns `'57'`)
- `T-BN-9: Android returns null when the Sentry module is missing (getSentryNative → null)`
- `T-BN-10: Android returns null (never throws) when fetchNativeRelease rejects or getSentryNative throws`
- `T-BN-11: web returns null without calling either source`

Add a second block, `describe('RNSentry native contract')`:
- `T-BN-12: @sentry/react-native still declares fetchNativeRelease(): Promise<NativeReleaseResponse> with build: string`. Use `fs.readFileSync(require.resolve('@sentry/react-native/dist/js/NativeRNSentry.d.ts'))` and assert both substrings: `fetchNativeRelease(): Promise<NativeReleaseResponse>` and `build: string;`. Check line 17 and lines 107-111 of that file today.

**Step 2: Run the tests and confirm they fail**

`npx jest __tests__/appBuildInfo.test.ts`. Expected: T-BN-6 to T-BN-11 FAIL, because `readNativeBuildNumber` is not exported. T-BN-12 already PASSES, since it pins the existing behaviour.

**Step 3: Implement:**

```ts
import Constants from 'expo-constants';
import { Platform, TurboModuleRegistry } from 'react-native';

type SentryNativeRelease = { fetchNativeRelease(): Promise<{ build?: string | null }> };

export type NativeBuildDeps = {
  os: string;
  iosBuildNumber: () => string | null | undefined;
  getSentryNative: () => SentryNativeRelease | null;
};

export const defaultNativeBuildDeps: NativeBuildDeps = {
  os: Platform.OS,
  // CFBundleVersion: node_modules/expo-constants/ios/EXConstantsService.m:49-59
  iosBuildNumber: () => Constants.platform?.ios?.buildNumber,
  // PackageInfo.versionCode: @sentry/react-native RNSentryModuleImpl.java:477-483.
  // Works without Sentry.init; expo-constants exposes nothing on Android.
  getSentryNative: () => TurboModuleRegistry.get<any>('RNSentry') as SentryNativeRelease | null,
};

export async function readNativeBuildNumber(
  deps: NativeBuildDeps = defaultNativeBuildDeps,
): Promise<string | null> {
  if (deps.os !== 'ios' && deps.os !== 'android') return null;
  try {
    if (deps.os === 'ios') {
      const ios = pickBuildNumber({ native: deps.iosBuildNumber() });
      if (ios) return ios;
    }
    const mod = deps.getSentryNative();
    if (!mod || typeof mod.fetchNativeRelease !== 'function') return null;
    const release = await mod.fetchNativeRelease();
    return pickBuildNumber({ native: release?.build });
  } catch {
    return null;
  }
}
```

Use `TurboModuleRegistry.get`, never `getEnforcing`; the reader must not throw. If eslint objects to `any`, use `TurboModuleRegistry.get<SentryNativeRelease & TurboModule>` with `import type { TurboModule } from 'react-native'`.

**Step 4: Run the tests, the type-check and lint**

- `npx jest __tests__/appBuildInfo.test.ts`. Expected: PASS (12 tests).
- `npx tsc --noEmit --pretty false`. Expected: clean.
- `npm run lint 2>&1 | grep -E "services/appBuildInfo" -A 2`. Expected: no output.

**Step 5: Commit**

```bash
git add services/appBuildInfo.ts __tests__/appBuildInfo.test.ts
git commit -m "feat(about): read the native build number on iOS and Android without a new dependency"
```

---

### Task 6: Always show the build-number row on the About modal (45 min)

**Files:**
- Create: `hooks/useAppBuildNumber.ts`
- Modify: `app/settings-about.tsx:1,14-22,37-38,56-61`
- Test: `__tests__/appBuildInfo.test.ts` (append one source-contract test)

**Step 1: Write the failing test** `T-BN-13: settings-about renders the build row unconditionally`. It is a source-level contract, the same style as `__tests__/rtlPhysicalContract.test.ts`. It reads `app/settings-about.tsx` as text and asserts:
- the source contains `useAppBuildNumber(`
- it contains `'رقم البناء'`
- it does **not** match `/\{build \? \(/`, the conditional guard that hid the row
- it does not define `function resolveBuildNumber`

**Step 2: Run the test and confirm it fails**

`npx jest __tests__/appBuildInfo.test.ts -t T-BN-13`. Expected: FAIL.

**Step 3: Implement**

`hooks/useAppBuildNumber.ts`:

```ts
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { pickBuildNumber, readNativeBuildNumber } from '@/services/appBuildInfo';

/** Native build number (CFBundleVersion / versionCode), or null on web and Expo Go. */
export function useAppBuildNumber(): string | null {
  const [build, setBuild] = useState<string | null>(() =>
    pickBuildNumber({
      native: Constants.platform?.ios?.buildNumber,
      expoConfig: Constants.expoConfig,
    }),
  );
  useEffect(() => {
    let alive = true;
    readNativeBuildNumber().then((b) => {
      if (alive && b) setBuild(b);
    });
    return () => {
      alive = false;
    };
  }, []);
  return build;
}
```

`app/settings-about.tsx`:
- Delete `resolveBuildNumber` (lines 14-22).
- `const build = useAppBuildNumber();` (line 38).
- Replace lines 56-61 with an unconditional row:

  ```tsx
  <View style={styles.versionRow}>
    <Text style={styles.versionValue}>{build ?? '—'}</Text>
    <Text style={styles.versionLabel}>رقم البناء</Text>
  </View>
  ```

  It reuses the existing `PHYSICAL_ROW` style (lines 119-125). Leave the version row and the `resolveVersion` path unchanged.

**Step 4: Run the tests, the type-check and lint**

- `npx jest __tests__/appBuildInfo.test.ts __tests__/rtlPhysicalContract.test.ts`. Expected: PASS.
- `npx tsc --noEmit --pretty false`. Expected: clean.
- `npm run lint 2>&1 | grep -E "settings-about|useAppBuildNumber" -A 2`. Expected: no output.

**Step 5: Commit**

```bash
git add hooks/useAppBuildNumber.ts app/settings-about.tsx __tests__/appBuildInfo.test.ts
git commit -m "fix(about): always show the build number, read from the native binary"
```

---

### Task 7: On-device check of the native sources (45 min, no commit unless a fix is needed)

These checks prove that the `RNSentry` turbo module and `Constants.platform.ios.buildNumber` resolve on real builds. Unit tests inject fakes, so they cannot prove this.

1. Run `list-devices` and prefer a booted iOS simulator and Android emulator. Load the `argent-device-interact` and `argent-metro-debugger` skills first.
2. On each device, run a dev-client build (`npm run ios` / `npm run android`), then use `debugger-connect` and `debugger-evaluate`:
   - iOS: `require('expo-constants').default.platform?.ios?.buildNumber`. Expected: a non-empty string, matching `CFBundleVersion`.
   - Both: `require('react-native').TurboModuleRegistry.get('RNSentry')?.fetchNativeRelease()`. Expected: it resolves `{ id, version, build }` with a non-empty `build`. On Android, `build` must equal `versionCode` in `android/app/build.gradle`.
3. Open More → الإعدادات → حول التطبيق. "رقم البناء" must show that same value, not `—`.
4. If `TurboModuleRegistry.get('RNSentry')` is null on either arch, stop. Record the finding and re-open design open question 2 (`expo-application`) with the user. Do not add the dependency unilaterally.

---

### Task 8: Full verification and visual QA

**Commands (all must pass):**

```bash
npx jest
npx tsc --noEmit --pretty false
npm run lint 2>&1 | grep -E "constants/config|services/privacyPolicy|services/appBuildInfo|hooks/useAppBuildNumber|settings-about|more/settings" -A 2   # expect no output
git log --oneline -6   # confirm the five commits from Tasks 1-6 exist, with no Co-Authored-By trailers
```

**Visual QA on the iOS simulator.** Capture each screen. Repeat rows 3-5 on the Android emulator for the build number.

| # | Route / state | Compare against |
|---|---|---|
| 1 | `/more` (initial viewport) | `/Users/ahmedelhadarey/samer/khazayin-app/docs/audit/2026-09-09/figma-reference/25-2102-2711.png`. The eight reference rows must be pixel-identical to the pre-change capture; this plan touches neither the rows nor their data. |
| 2 | `/more`, scrolled to "الإعدادات" (extension row) | No frame. Contracts: `constants/layout.ts` + `constants/rtlContracts.ts`. The row is unchanged. |
| 3 | `/(tabs)/more/settings`, scrolled to the "قانوني" section | No frame. Contracts: `constants/layout.ts`, `constants/typography.ts`. The row is unchanged. |
| 4 | Tap سياسة الخصوصية with the env **unset** | No frame. The Arabic alert "سياسة الخصوصية ستُضاف قريبًا." appears. |
| 5 | Same tap with `EXPO_PUBLIC_PRIVACY_POLICY_URL=https://khazayin.com` set **temporarily** in `.env.local`, then Metro restarted with `--clear` | No frame. The `expo-web-browser` in-app sheet (SFSafariViewController / Custom Tab) opens on that URL. **Remove `.env.local` afterwards and do not commit it.** This only proves the mechanism; it is not the real policy URL. |
| 6 | `/settings-about` modal | No frame. Contracts: `constants/layout.ts` (`PHYSICAL_ROW`: value on the physical left, label on the physical right), `constants/typography.ts` (`cardTitle` / `bodyCompact`). Both "الإصدار 1.0.0" and "رقم البناء <n>" render, with `<n>` matching Task 7. |
| 7 | `/settings-about` on web (`npm run web`) | No frame. "رقم البناء" shows `—`, with no crash. |
| 8 | Clear-cache confirm (regression) | No frame. The Arabic confirm dialog is unchanged (`app/(tabs)/more/settings.tsx:99-115`). |

**Done when:**
- every command passes
- rows 1-8 above are captured and match
- the spec and quality reviews in the CLAUDE.md loop have both passed for every task

**Remaining user action:** supply the real privacy policy URL (design §10, open question 1).
