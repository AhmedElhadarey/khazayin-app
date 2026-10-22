# Community & Social Features — design v3

- Date: 2026-10-22 · Ticket: Trello OP6jAXQ0 "Community & Social Features"
- Status: **v3.** v2 was revised after the CTO review (APPROVE WITH CHANGES, B1–B3, S1–S11) and the board review (5-0 APPROVE WITH CHANGES, C1–C8); where they conflicted, the coordinator decided. v3 applies the CTO re-check (APPROVE WITH CHANGES: N1, S2, C4, plan split, one fold nit).
- Implementation plan: `docs/plans/2026-10-22-community-implementation-plan.md`
- Ships as **one PR**. The ticket is reported as **"client complete, blocked on backend"** (§2).

## Change log v2 → v3

| Ref | v2 | v3 |
|---|---|---|
| N1 | Mock selected by `communityMode(config) === 'mock' && __DEV__ ? require(...)`; release grep for «(تجريبي)» | Selection is `if (__DEV__) { ... require('./mockAdapter') ... }` and the T4b scan rejects any other form. An ASCII `SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'` sits beside the seed join codes. The release grep looks for the sentinel and the join codes (Hermes bytecode may hold Arabic as UTF-16), and a dev export serves as the positive control. A Metro `resolveRequest` stub is recorded only as a fallback that needs user consent. The release grep moves into CI (§13) |
| S2 | Policy said «دون تفاصيل ما قرأت ومتى» | «دون تفاصيل الصفحات التي قرأتها», and the policy now discloses that update times are recorded |
| C4 | Totals shown once there are ≥3 reporters | Totals are shown only when there are ≥2 non-sharing reporters besides the viewer, and the numbers others see are rounded to the nearest 10. The server and the mock compute this per viewer. Mirrored in A.2, with a contract test on the seeded leak group `KHZ7Q2`. Appendix C now says the total combines members' counts and drops the "never visible" promise |
| Plan | 9 tasks | 11 tasks: T4 split into T4a (error copy + idempotency, pure) and T4b (port, mock, seed, selection, N1 scan); T7 split into T7a (guard, copy, More row) and T7b (hub, guidelines, Settings, `services/community/deletionRunner.ts`) |
| Nit | — | The filter also folds U+0610–061A |

## Change log v1 → v2

| Ref | v1 | v2 |
|---|---|---|
| B1 / C1 / S10 | Three modes (`http` / `mock` / `off`); `EXPO_PUBLIC_COMMUNITY_PREVIEW`; seed bundled but unreachable | Two modes in v1: `mock` iff `__DEV__`, else `off`. The preview flag is removed. The mock is loaded with `if (__DEV__) require(...)`, so it is absent from production bundles, and a release check greps the bundle. `http` is future work behind four preconditions (§3.3) |
| S4 | — | `EXPO_PUBLIC_VISUAL_AUDIT === '1'` forces `off` |
| — | — | A source scan rejects any community flag in `.env`, `app.json`, `eas.json` |
| C2 | HTTP adapter task; `idempotencyKey`/`bearer` in `RequestOpts`; 409/422 status mapping | Dropped from v1. Appendix A is a document only. The `moderation`/`conflict` codes and their copy move into the port/mock task. `client.ts` and `toApiError` are untouched |
| C2 | Khatm by juz (claims, juz grid, 409 claim paths) | Cut to v1.1. v1 challenges: whole khatm (604 pages, group total) and daily wird |
| C2 | 12 tasks | 9 tasks, one PR |
| C4 / S2 | Each member's counts visible to the group | Groups show totals by default, and totals appear only once 3 or more members have reported. A member's own counts reach others only through an opt-in that is off by default |
| S5 | Push on every page read (subscribe + 20 s debounce) | Push on app background, challenge start or join, and group-detail focus, throttled to once an hour. No progress-store subscription |
| C7 | Last write wins | Reports within a challenge are monotonic: push `max(lastReported, current)`. The server also keeps the max |
| B2 | `requestId` "per intent" | Defined: key = op + target + hash(payload) + nonce. Reused only after network, timeout, server or rateLimit failures, rotated otherwise. The mock stores 2xx responses only. The in-flight duplicate rule is specified. `intentKey` is defined (§5.3) |
| B3 | Bare-term list; repetition by count; "<3 distinct letters" | Phrase entries split into `block` and `review` tiers (a `review` hit posts as `pending`). The repetition rule is a ratio over ≥4-letter non-stopword tokens. The "<3 letters" rule is removed. An authored Quran/hadith pass fixture is added |
| S6 / S7 | — | Fold U+0653–065F and U+06D6–06ED. Phone = `+` / `00` / leading `0` with ≥9 digits, and dates are exempt |
| S1 / C6 | Untagged local store | The store records its `mode`. A mode change wipes the mock ledger and the local member id. Future `http` access is `intro` unless `serverIssued` |
| S3 | — | Local `mutedMemberIds` (كتم) in v1 |
| S8 | — | Ledger responses and `postTimes` pruned to 24 h on every write |
| S9 / C5 | `pendingDeletion` boolean | Deletion state machine with a visible status, capped backoff, 401/404 counted as done, and a lost-token fallback channel. Q5 resolved: posts are deleted, not anonymised |
| C3 | Risks list | New §13: go-live checklist that blocks `http` |
| C8 | — | New §2.1: AC status table |
| S11 | `PATCH /members/me` | `PUT /members/me` |
| UX | One Settings toggle; «منتهي»; ad-hoc counts | Settings shows a «الانضمام» row before opt-in and the toggle after. «منتهٍ». Counts use the existing `arabicCount` (`services/libraryStats.ts:15`) |
| Nits | — | QA join uses a seeded code. `COLUMN_SCREENS` `blocks` is set per screen. The hidden-mode redirect from discussion routes goes to the Sections root. The entry component name avoids "notesSection". Corrected citations: notes id generator `store/notesStore.ts:57-58`; `createAsyncStore` requires `initialData` (`store/createAsyncStore.ts:88-89`) |
| Board 6 | Short policy draft | Appendix C extended (retention, server/IP logs, moderator access, member visibility, deletion fallback, residency, minors). Marked for Foundation sign-off |

## 0. Spot-check of the scoping notes (kept from v1)

1. **HTTP 400 maps to `'unknown'`.** `toApiError` classifies by status only (`services/api/errors.ts:112-143`). Every 4xx except 401/403/404/429 becomes `'unknown'` (`:138-141`; the 418 case is pinned at `__tests__/contentServiceErrors.test.ts:49`). `'validation'` is only built by the cursor guard (`services/api/client.ts:66-72`). The comment at `services/api/types.ts:40` is wrong. v1 does not touch this (Q8).
2. **`RequestOpts` has no header field** (`services/api/types.ts:110-122`). `client.ts` retries 429/5xx (`:237-240`) and network `TypeError` (`:289+`) for every method. That matters for the future HTTP adapter only (Appendix A.0).
3. **The scholar screen is pinned.** `__tests__/scholarSplitPane.test.ts:24-29` requires exactly 3 occurrences of `notesSection` and the literal `notesPlacement === 'footer' ? notesSection`. `__tests__/contextualNotesInvariants.test.ts` pins `notesSection =…<LinkedNotesSection` and `ListFooterComponent=…notesSection`.
4. **The global Bearer slot is attached to every request** (`client.ts:156-159`). A future community token must never go through `setAuthToken` (`services/api/auth.ts:57`).

## 1. Goals, non-goals, v1 scope

**Goals.**
- Meet ACs 1–7 at the client level against a `CommunityService` port, fully exercisable in dev builds.
- Document a backend contract (Appendix A) and a go-live checklist (§13), so that the later `http` phase is a bounded follow-up and not a redesign.

**Non-goals (v1).**
- An HTTP adapter, and any change to `services/api/client.ts`.
- A moderator dashboard (Foundation/backend, A.4).
- Real-time updates.
- A public group directory.
- Group chat, nested replies, reactions.
- Threads on non-scholar lectures.
- Arabizi detection.
- Khatm-by-juz (v1.1).
- Poster collections (v2).

**v1 scope.**

| In v1 | Notes |
|---|---|
| Opt-in + versioned guidelines acceptance + display name | Re-acceptance when `GUIDELINES_VERSION` bumps |
| Groups: create, join by 6-character code, leave | Name only; max 50 members, max 5 groups per member |
| One active challenge per group: **khatm** (604-page group total) or **daily wird** (N pages × D days) | Totals by default; personal counts opt-in (§6) |
| Lecture discussion threads (flat, newest first) | Entry from scholar detail only |
| Report flow (reason sheet) + local hide | |
| Mute a member (كتم), local | Server-side block is a go-live item |
| Client adab filter, `block` / `review` tiers | Advisory; the server is the authority later |
| Pending / hidden status on own posts | Simulated by the mock |
| Delete my community data | State machine (§4.3) |

**Deferred, with reasons.**
- **Khatm-by-juz → v1.1.** It is the largest slice (claims, conflict paths, a 30-cell grid, extra RTL contract), and AC6 is met without it.
- **Poster collections → v2.** No AC mentions them, private collections are already covered by المحفوظات, and sharing them adds a third moderated surface that needs moderators who are not yet named.

## 2. What works now vs. only with a backend

| Capability | v1 (dev builds, mock) | Needs the Foundation backend |
|---|---|---|
| Opt-in, guidelines, name, mute, local hide, delete | Real, local | Server deletion and server block |
| Groups | Own writes persisted; other members are **seeded samples** | Real multi-member |
| Challenge progress | **Own** counts are real (SQLite). Others are seeded | Real totals |
| Threads | Own posts persisted. Others are seeded | Real |
| Adab filter | Real | The server re-checks |
| Pending / hidden | Mock knob plus the `review` tier | Server moderation |
| Reports | Recorded locally; nobody reviews them | Queue + dashboard |
| Rate limits | Client cooldown | Server 429 |

**Production builds (release, `__DEV__ === false`) contain no community UI and no mock code.** That is true until the §13 checklist is done and the `http` track lands.

### 2.1 Acceptance-criteria status

| AC | Met in dev / mock | Needs backend |
|---|---|---|
| 1 Create or join reading groups | Yes (join works against seeded codes and own groups) | Real other members |
| 2 Discussion threads on lectures | Yes | Real other posters |
| 3 Moderation tools prevent inappropriate posts | Partly: client filter, `review` → pending, report, mute | Server filter, moderator queue and dashboard (A.4) |
| 4 Guidelines aligned with adab are enforced | Partly: acceptance required, filter | Enforcement by moderators; Foundation sign-off on the text |
| 5 Reporting mechanism | UI and local effect | Report delivery and review |
| 6 Group wird challenges with shared progress | Yes for own progress; totals from seeds | Real totals |
| 7 Opt-in, not forced | Yes | — |

Ticket status to report: **client complete, blocked on backend** (§13).

## 3. The gate

### 3.1 v1 (implemented)

`services/community/gate.ts` holds the pure logic. `services/community/config.ts` reads `__DEV__` and the literal `process.env.EXPO_PUBLIC_VISUAL_AUDIT` once. Expo inlines env values only on literal access, the same way `app/_layout.tsx:61` does.

```ts
export type CommunityMode = 'mock' | 'off';                 // v1: exactly two
export function communityMode(env: { isDev: boolean; visualAudit?: string }): CommunityMode {
  if (env.visualAudit === '1') return 'off';               // S4: captures never show community UI
  return env.isDev ? 'mock' : 'off';
}
export type CommunityAccess = 'hidden' | 'intro' | 'open';
export function communityAccess(
  mode: CommunityMode,
  p: { optedIn: boolean; guidelinesVersion: number; deletion: DeletionState },
): CommunityAccess {
  if (mode === 'off' || p.deletion.state !== 'none') return 'hidden';
  return p.optedIn && p.guidelinesVersion >= GUIDELINES_VERSION ? 'open' : 'intro';
}
```

### 3.2 Keeping the mock out of production

- `services/community/index.ts` selects the adapter with `__DEV__` as the outermost test:
  ```ts
  let selected: CommunityService = offAdapter;
  if (__DEV__) {
    if (COMMUNITY_MODE === 'mock') selected = require('./mockAdapter').mockCommunityAdapter;
  }
  export const communityService: CommunityService = selected;
  ```
  - In a production transform `__DEV__` folds to `false` and the whole block is removed before dependencies are collected, so `mockAdapter.ts` and `data/community/seed.ts` (which only the mock requires) should never enter the bundle.
  - This is the only accepted form. The T4b scan requires exactly one `require('./mockAdapter')` in the repo, and it must match `/if \(__DEV__\) \{[^}]*require\('\.\/mockAdapter'\)/` in that file. Any other form fails the scan: a ternary, `__DEV__` placed second, or a static `import` other than `import type`.
- **Sentinel.** `data/community/seed.ts` exports `SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'` next to the join codes, and the mock stamps it into every seeded group's `id` prefix, so it cannot be dropped as an unused value. It is ASCII because Hermes bytecode may store non-ASCII strings as UTF-16, where an Arabic grep would silently miss.
- `offAdapter` rejects every call with `makeApiError('forbidden')`, so a deep link that got past the guard shows Arabic error copy, never data.
- **Release check (QA case 1; required before every release, and in CI once CI exists, §13):**
  1. `npx expo export --platform ios --platform android --output-dir dist-check` (a production build by default).
  2. `grep -rlaE "KHZ_COMMUNITY_SEED|KHZ7Q2|NUR4M8|HDY9P3" dist-check` must print nothing. `-a` reads `.hbc` bytecode as text.
  3. Positive control: `npx expo export --dev --platform android --output-dir dist-dev` followed by the same grep **must** list a file. That proves the grep can see the sentinel at all.
- **Documented fallback, not planned.** If step 2 ever finds the sentinel, a Metro `resolveRequest` stub in `metro.config.js` could map `./mockAdapter` to an empty module in production. That changes build configuration, `metro.config.js` is on the never-commit list, and it needs explicit user consent, so it is not in the plan.
- **Source scans** (`__tests__/communityInvariants.test.ts`):
  - `mockAdapter` appears only inside the `__DEV__` `require` in `services/community/index.ts` (other files may only use `import type`);
  - `data/community/seed` is required only by `mockAdapter.ts`;
  - `.env`, `app.json` and `eas.json` contain no `EXPO_PUBLIC_COMMUNITY_` key and no `COMMUNITY_PREVIEW`.
- In dev, every community screen shows the banner «بيانات تجريبية للمعاينة — الأعضاء والمشاركات هنا ليست حقيقية», and every seeded name ends in «(تجريبي)».
- **Route guard.** Every community route calls `useCommunityGuard(required)`:
  - `hidden` on a More route redirects to `/(tabs)/more`;
  - `hidden` on a discussion route redirects to `/(tabs)/sections` (the Sections root);
  - `intro` where `open` is required redirects to `/(tabs)/more/community`.

### 3.3 Future `http` mode (documented only, not built)

The `http` track adds a third mode. The gate **refuses** `http` unless **all** of the following hold:
1. `EXPO_PUBLIC_API_BASE` is non-empty;
2. `EXPO_PUBLIC_COMMUNITY_ENABLED === '1'`;
3. `KhazainConfig.privacyPolicyUrl !== null` (`constants/config.ts:12-15`), pointing at a policy with the community section;
4. secure token storage is available (`expo-secure-store`, a new dependency that needs user approval).

In `http` mode, access is `intro` unless `profile.serverIssued === true`. A locally generated id never reaches `open` against a real server.

## 4. Identity and privacy

### 4.1 Identity
- `memberId` in v1 is a local handle, generated like note ids (`store/notesStore.ts:57-58`, `Date.now().toString(36)` + `Math.random`). It is not a security token.
- In the future `http` mode, the server issues the id and the token, and `serverIssued` becomes `true`.
- `displayName`: 2–24 characters, adab-filtered at the `block` tier. A `review` hit is refused for names with the copy «يُرجى اختيار اسم آخر».
- Never collected: device ids, advertising ids, location, contacts, phone, email.

### 4.2 Storage: `store/communityLocalStore.ts`, key `@khazain/community`
This is a persisted Zustand store following the notesStore pattern: `createJSONStorage(AsyncStorage)`, `merge` + `coerceCommunity`, **no `version`/`migrate`** (rationale at `store/notesStore.ts:88-99`).

```ts
type DeletionState =
  | { state: 'none' }
  | { state: 'pending'; attempts: number; nextAttemptAt: number; lastError: ApiErrorCode | null };
type CommunityLocal = {
  mode: CommunityMode;                                   // S1/C6 tag
  profile: { memberId: string; displayName: string; serverIssued: boolean } | null;
  prefs: { optedIn: boolean; guidelinesVersion: number; acceptedAt: number; shareMyProgress: boolean };
  deletion: DeletionState;
  postTimes: number[];                                   // cooldown; pruned to 24 h
  locallyHiddenPostIds: string[];                        // reported by me
  mutedMemberIds: string[];                              // S3
  lastReported: Record<string, { pagesCovered: number; daysMet: number; at: number }>; // per challengeId
  mockLedger: MockLedger;                                // mock adapter only
};
```

- **Mode change (S1/C6).** At hydrate time, if `persisted.mode` exists and differs from the current mode, and the current mode is not `off`, then `mockLedger` is reset, `profile` is set to null, `prefs.optedIn` to false, and `lastReported` to `{}`. In `off` mode the store performs **no writes**, so a production build never alters what a dev build left behind, and never reads it into UI either.
- **Pruning (S8).** Every write drops `postTimes` and `mockLedger.responses` entries older than 24 h.
- Other people's content is never persisted. Community reads are in-memory only, with no SWR, and `CacheDomain` is unchanged.

### 4.3 Pause, leave, delete
- **Pause.** The Settings toggle off sets `optedIn:false` and keeps the data. Copy: «إيقاف المشاركة يخفي المجتمع ولا يحذف بياناتك.»
- **Leave a group.** Non-destructive (§8.4).
- **Delete my community data (S9/C5).** A destructive Alert (pattern: `app/(tabs)/more/settings-progress.tsx:62-83`) starts a state machine in the pure module `services/community/deletion.ts`:
  1. Set `deletion = { state:'pending', attempts:0, nextAttemptAt: now }`. Access is now `hidden`.
  2. Attempt `members.deleteMe()`.
     - On success, or on `auth` (401) or `notFound` (404), the account is treated as already gone: `AsyncStorage.removeItem('@khazain/community')` and the store resets.
     - On any other error, `attempts++` and `nextAttemptAt = now + backoff(attempts)`, with `backoff = [1 min, 5 min, 30 min, 2 h, 12 h]`, then capped at 24 h. Attempts continue indefinitely at the cap.
  3. Retries run at launch and when the app returns to the foreground, whenever they are due. `services/community/deletionRunner.ts` owns this: `startDeletionRunner()` is called once from `app/_layout.tsx`. It runs `runDeletionIfDue(now)` at launch and on every `AppState` → `active`. That function calls `communityService.members.deleteMe` through `runMutation('deleteMe', '-', …)`, applies the outcome with `nextDeletionState`, and when the deletion is done calls `wipe()` and then `resetCommunityStores()`. The «إعادة المحاولة الآن» action calls `runDeletionIfDue(now, { force: true })`.
  4. Settings shows a status row while pending: «جارٍ حذف بياناتك في المجتمع» with the subtitle «المحاولة القادمة {time}» and a «إعادة المحاولة الآن» action.
- **Lost token (future `http`).** If no token is available, the client cannot authenticate the deletion. The status row then shows «تعذّر التحقق من حسابك. راسلنا من "تواصل معنا" لحذف بياناتك» and links to `/more/contact`. The member id is shown so the request can be matched. The Foundation must also publish an email for this (§13).
- v1's mock deletion usually succeeds at once. `simulateError` exercises the retry path.
- Q5 resolved: a member's posts are **deleted**, not anonymised.

### 4.4 Telemetry and tokens
- Sentry runs with `sendDefaultPii:false` (`app/_layout.tsx:81`). Community code never `console.*`s post bodies or display names (source scan).
- The future token is passed per request and never through `setAuthToken`.

## 5. Domain and port

### 5.1 Types (`types/community.ts`)
```ts
type ISODay = string;
type ModerationStatus = 'visible' | 'pending' | 'hidden' | 'removed';
type ModerationState = { status: ModerationStatus; updatedAt: number };
type MemberSummary = { memberId: string; displayName: string; isOwner: boolean };
type Group = { id: string; name: string; joinCode: string; ownerId: string; memberCount: number;
  maxMembers: number; createdAt: number; activeChallengeId: string | null };
type Membership = { groupId: string; memberId: string; role: 'owner' | 'member'; joinedAt: number;
  shareMyProgress: boolean };
type ChallengeKind =
  | { kind: 'khatm' }                                         // group goal: 604 pages total
  | { kind: 'daily-wird'; pagesPerDay: number; days: number }; // 1..604, 1..60
type Challenge = ChallengeKind & { id: string; groupId: string; title: string; startsOn: ISODay; createdBy: string };
/** Leaves the device. Counts only. */
type ProgressReport = { challengeId: string; memberId: string; computedAt: number;
  pagesCovered: number; daysMet: number };
/** Computed per viewer by the server (mock today). `totals` is null unless the viewer
 *  can't isolate anyone: >= 2 reporters besides the viewer who do not share. Rounded to 10. */
type GroupProgress = { reporters: number;
  totals: { pages: number; daysMet: number } | null;
  shared: { member: MemberSummary; pagesCovered: number; daysMet: number }[] };   // opted-in members only
type ThreadSummary = { lectureId: string; postCount: number; lastPostAt: number | null };
type Post = { id: string; lectureId: string; author: MemberSummary; body: string; createdAt: number;
  moderation: ModerationState; isMine: boolean };
type ReportReason = 'offensive' | 'sectarian' | 'misinformation' | 'spam' | 'privacy' | 'other';
```
Threads are keyed by **`Lecture.id`** (`types/content.ts:91-99`), never by `PlayerTrack.id`.

### 5.2 Port (`services/community/communityService.ts`)
```ts
type Mut = { requestId: string };
interface CommunityService {
  readonly kind: 'mock' | 'off';
  members: { register(i: Mut & { displayName: string; guidelinesVersion: number }): Promise<MemberSummary>;
             rename(i: Mut & { displayName: string }): Promise<MemberSummary>;
             deleteMe(i: Mut): Promise<void> };
  groups: { listMine(): Promise<Group[]>;
            get(id: string): Promise<{ group: Group; members: MemberSummary[]; challenge: Challenge | null;
                                       progress: GroupProgress; me: Membership }>;
            create(i: Mut & { name: string }): Promise<Group>;
            join(i: Mut & { code: string }): Promise<Group>;
            leave(i: Mut & { groupId: string }): Promise<void>;
            setShareMyProgress(i: Mut & { groupId: string; share: boolean }): Promise<Membership> };
  challenges: { start(i: Mut & { groupId: string; title: string; startsOn: ISODay } & ChallengeKind): Promise<Challenge>;
                reportProgress(i: Mut & ProgressReport): Promise<void> };
  threads: { summaries(lectureIds: string[]): Promise<ThreadSummary[]>;
             posts(lectureId: string, cursor: string | null): Promise<Paged<Post>>;
             createPost(i: Mut & { lectureId: string; body: string; review: boolean }): Promise<Post>;
             deletePost(i: Mut & { postId: string }): Promise<void>;
             report(i: Mut & { postId: string; reason: ReportReason; note?: string }): Promise<void> };
}
```
`review` is the client filter's tier result. The server ignores it and classifies on its own; the mock honours it.

**Errors.**
- `ApiErrorCode` (`services/api/types.ts:34-43`) gains two members:
  - `'moderation'`: «لم تُنشر المشاركة لأنها تخالف إرشادات المجتمع. يُرجى مراجعتها.»
  - `'conflict'`: «تعذّر إتمام الطلب لتعارضه مع تغيير آخر. حدّث الصفحة وحاول مجددًا.»
- `ARABIC_COPY` (`errors.ts:30`) is a total `Record`, so it gets both entries.
- Only the mock throws these in v1, through `makeApiError`. The status mapping in `toApiError` (409/422) belongs to the `http` track.
- Mock error sources:
  - `conflict`: group full, member at the 5-group cap, a challenge already active;
  - `notFound`: bad join code;
  - `moderation`: a `block`-tier hit (defence in depth);
  - `forbidden`: a non-owner starting a challenge;
  - `rateLimit`: client limits exceeded.

### 5.3 Idempotency (B2)
- **`intentKey`** = `${op}:${target}` and names one UI intent slot, for example:
  - `createPost:lecture-42`
  - `joinGroup:-` (no target)
  - `report:post-9`
  - `startChallenge:group-3`
  - `reportProgress:challenge-7`
  - `deleteMe:-`
- **`requestId`** = `${op}:${target}:${hash(canonicalJson(payload))}:${nonce}`.
  - `hash` is a pure FNV-1a 32-bit over JSON with sorted keys.
  - `nonce` is `Date.now().toString(36)` + random.
  - A pure module, `services/community/idempotency.ts`, exports `nextRequestId(prev, op, target, payload)` and `shouldReuse(code)`.
- **Reuse rule.** The helper keeps `{ payloadHash, requestId, lastError }` per `intentKey`. On submit:
  - same `payloadHash` and `lastError ∈ {network, timeout, server, rateLimit}` → reuse `requestId`;
  - otherwise (no entry, payload changed, or `lastError` is anything else: `moderation`, `conflict`, `forbidden`, `notFound`, `auth`, `validation`, `unknown`) → new `requestId`.
  - After success the entry is deleted, so a later identical post gets a fresh key.
- **In-flight duplicates.**
  - Client side, a second submit on an `intentKey` that is already in flight returns the same promise and sends nothing.
  - Server side (contract A.0), a duplicate key that arrives while the original is still processing is held until the original completes (up to 10 s) and then gets its response replayed. If it is still running after that, the answer is `503` + `Retry-After: 2`. That classifies as `server`, so the client reuses the key.
  - The mock mirrors this with a `Map<requestId, Promise>`.
- **Stored responses.** The mock records **2xx results only** in `mockLedger.responses` (pruned at 24 h), so an error is recomputed on retry. A reused key with a different payload hash cannot happen by construction, because the hash is part of the key.

### 5.4 Mock adapter (`services/community/mockAdapter.ts`, dev only)
- Knobs: `mockDelay` (300), `simulateError`, and `holdForReview` (every own post becomes `pending`).
- Seeds (`data/community/seed.ts`):
  - `SEED_SENTINEL = 'KHZ_COMMUNITY_SEED'` beside the join codes (§3.2);
  - 3 groups with join codes `KHZ7Q2`, `NUR4M8` and `HDY9P3`:
    - `KHZ7Q2` is the **leak case**. Its active khatm has two sharing reporters and one non-sharing reporter, so a joining viewer has only one non-sharer besides themselves, and `totals` must be `null`;
    - `NUR4M8` is the **visible case**. Three non-sharing reporters, so `totals` is shown, rounded to 10;
    - `HDY9P3` is a daily-wird group;
  - 6 members named «… (تجريبي)»;
  - posts on the first two scholars' lectures.
- Own writes go to `mockLedger` through an injected port `{ read(): MockLedger; write(fn) }`.
- It enforces every §7.6 limit, the §7.5 rates, and the gate's `block` tier.

### 5.5 Future HTTP adapter
Specified by Appendix A only. It is not built in v1.

## 6. Shared progress

- **Repo method (db only).**
  - `PageReadsRepository.distinctPagesSince(fromLocalDay): Promise<number[]>`: `SELECT DISTINCT page_number FROM khz_page_reads WHERE local_day >= ? ORDER BY page_number`, served by the `(local_day, page_number)` primary key (`db/schema.ts:29-34`).
  - Web-shim parity in `db/web-shim.ts`, next to `completedJuzCount` (`:213-217`).
  - The interface is at `db/types.ts:58-88`, exposed through the `progressRepo` proxy (`db/index.ts:80`).
  - Daily wird reuses `dayCompletionsInRange` (`db/types.ts:84-87`, rows carry `pages_read`).
- **Pure maths (`services/community/progressMath.ts`).**
  - `ownKhatm(pages) → { pagesCovered: min(pages.length, 604) }`.
  - `ownDaysMet(rows, pagesPerDay, startsOn, days)`: days in the window with `pages_read >= pagesPerDay`.
  - `monotonic(last, current) → { pagesCovered: max(..), daysMet: max(..) }` (C7).
  - `visibleTotals(reports, viewerId)` is the **differencing rule (C4)**, shared by the mock and specified for the server (A.2).
    - Count the reporters other than the viewer whose membership has `shareMyProgress: false`. If there are fewer than 2, return `null`.
    - Otherwise sum pages and days over **all** reporters and round each sum to the nearest 10: `Math.round(x / 10) * 10`.
    - Why both parts:
      - Shared members' exact counts are already visible, and the viewer knows their own. Subtracting both from an exact total would expose a lone non-sharer.
      - With ≥2 non-sharers the remainder belongs to several people, and rounding blunts change-over-time comparisons.
    - Chosen over "bar only" because a bar can be read to about 2 pages per pixel on a phone, so it would leak almost as much while hiding a useful number.
  - `groupView(progress, memberCount, challenge)` renders `progress.totals`. It never recomputes totals on the client.
    - When `totals` is `null` the copy is «يظهر مجموع المجموعة بعد مشاركة مزيد من الأعضاء في التحدي».
    - khatm bar: `min(totals.pages, 604) / 604`, labelled «نحو {n} صفحة».
    - daily-wird bar: `totals.daysMet / (memberCount × days)`.
  - The copy states plainly that khatm totals add up members' pages and can count the same page more than once: «مجموع ما قرأه الأعضاء منذ بدء التحدي». True juz coverage is v1.1.
- **Own view.** Your own counts are computed locally and shown to you live, so they do not wait for a push.
- **Sharing.** Each membership has `shareMyProgress` (default false), set by the toggle «إظهار تقدّمي لأعضاء المجموعة» on group detail. The server always receives the counts, because totals need them, but returns per-member figures only for members who opted in.
- **Push (S5), `services/community/progressSync.ts`.**
  - Triggers:
    - (a) `AppState` → `background`, following the pattern in `store/savedStore.ts:86`;
    - (b) challenge start or join;
    - (c) group-detail focus.
  - Throttle: at most once per hour per challenge. Trigger (b) bypasses the throttle for that challenge's first report.
  - What is pushed: `monotonic(lastReported[challengeId], current)`, and only when it changed.
  - It does nothing unless access is `open`.
  - Errors are swallowed (dev `console.warn` without content).
  - `progressStore.ts` is **not** touched and there is no subscription. `startCommunityProgressSync()` is called once in `app/_layout.tsx` after the progress hydrate, and returns immediately in `off` mode.
- **Reset (C7).** `resetFacade.resetAll` lowers local counts, but pushed values never go down within a challenge. The reset Alert's copy in `settings-progress.tsx` stays unchanged. The rule is documented here and in the group-detail help text «لا ينقص التقدّم المُرسَل بعد إعادة تعيين القراءة».

## 7. Moderation

### 7.1 `services/community/adabFilter.ts` (pure)
`checkText(text, field: 'post' | 'name' | 'groupName' | 'reportNote') → { ok: true; review: boolean } | { ok: false; reason: 'empty' | 'tooShort' | 'tooLong' | 'link' | 'phone' | 'term' | 'repetition' }`

1. **Fold.**
   - Reuse the `normalize.ts` steps (`services/search/normalize.ts:23-60`): export them, or export `foldArabic(s, { ibnBin:false })`. `normalize()` output stays byte-identical.
   - **Add, in the filter only:**
     - strip the extra marks U+0610–061A and U+0653–065F, and the Quranic annotation marks U+06D6–06ED (S6, v3 nit);
     - strip zero-width and bidi controls (U+200B–200F, U+202A–202E, U+2060–2069, U+FEFF, U+061C, U+00AD);
     - fold ک→ك, ی/ے→ي, ۰–۹ → digits;
     - collapse runs of 3+ of any letter to 1, and runs of 2 of ا/و/ي to 1. Consonant pairs are kept, because «الله» and «اللغة» contain real ones.
2. **Links.**
   - `https?://`, `www.`;
   - `\b[\w-]+\.(com|net|org|info|me|io|app|ly|link|sa|eg|ae|kw|qa)\b`;
   - `t.me/`, `wa.me/`;
   - `@handle` with 3+ characters;
   - email addresses.
3. **Phones (S7).**
   1. First remove date shapes `\d{1,4}[\/\-.]\d{1,2}[\/\-.]\d{1,4}` (Hijri and Gregorian).
   2. Then remove the separators space, `-`, `.`, `(`, `)` *between digits*.
   3. Block `\+\d{9,}`, `00\d{9,}`, or `\b0\d{9,}`.
   A 9-digit number without a leading `0`, `00` or `+` passes, as do Quran references «٢:٢٥٥» and years.
4. **Terms.** Entries in `data/community/adabTerms.ts` are `{ tokens: string[]; tier: 'block' | 'review' }`, stored pre-folded. Matching is on token sequences, whole words, with one leading clitic (و ف ب ك ل ال وال بال) stripped per token.
   - Words that occur in the Quran or hadith (كافر، لعنة، كلب، حمار، قردة، خنازير…) are **never listed alone**. They appear only in insulting constructions such as the vocative «يا + word», or «أنت + word», at the `block` tier. Ambiguous constructions go in the `review` tier.
   - The Foundation owns the list (§13). This doc quotes no entries.
5. **Repetition (B3).**
   - Count the tokens with ≥4 letters that are not in a small stopword list (من، إلى، على، الله، الذين، التي، هذا، هذه، كان، قال…).
   - If there are ≥10 such tokens and any one of them accounts for >30%, the result is `repetition`.
   - The v1 "<3 distinct letters" rule is removed, because it blocked «لا».
- **Outcome.**
  - `block` hits, links and phones refuse locally with inline copy.
  - A `review` hit is allowed. The composer says «ستُراجَع مشاركتك قبل ظهورها», and the post is created as `pending`.
- **Pass fixture.** `__tests__/fixtures/adabAllowlist.ts` is authored, and also marked for Foundation review. Every entry must return `{ ok:true, review:false }`, both with full tashkeel and with none. It includes at least:
  - «إِنَّ اللَّهَ لَا يَهْدِي الْقَوْمَ الْكَافِرِينَ» (المائدة ٦٧)
  - «أَلَا لَعْنَةُ اللَّهِ عَلَى الظَّالِمِينَ» (هود ١٨)
  - «فَمَثَلُهُ كَمَثَلِ الْكَلْبِ إِن تَحْمِلْ عَلَيْهِ يَلْهَثْ» (الأعراف ١٧٦)
  - «كَمَثَلِ الْحِمَارِ يَحْمِلُ أَسْفَارًا» (الجمعة ٥)
  - «وَجَعَلَ مِنْهُمُ الْقِرَدَةَ وَالْخَنَازِيرَ» (المائدة ٦٠)
  - «إِنَّ أَنكَرَ الْأَصْوَاتِ لَصَوْتُ الْحَمِيرِ» (لقمان ١٩)
  - «إذا شرب الكلب في إناء أحدكم فليغسله سبعًا» (متفق عليه)
  - «لعن الله الواشمات والمستوشمات» (متفق عليه)
  - ordinary posts: «جزاكم الله خيرًا على هذا الدرس», «ما المقصود بقوله في الدقيقة ١٢؟», «سنة ١٤٤٧ هـ», «اللغة العربية».

### 7.2 Status
- Others never see pending, hidden or removed posts. The author sees badges: «قيد المراجعة — لن تظهر للآخرين حتى تُعتمد», «أُخفيت لمخالفتها إرشادات المجتمع». Removed posts disappear.
- The mock produces `pending` from `review` and `holdForReview`.

### 7.3 Report and mute
- «إبلاغ» opens the root route `app/community-report-sheet.tsx` (`transparentModal` + `fade`, `SheetShell` + `SheetRow`; `SheetShell` already applies `sheetColumn`, `components/khazain/sheets/SheetShell.tsx:21`). Reasons:
  - «إساءة أو ألفاظ غير لائقة»
  - «تكفير أو طعن أو إثارة فتنة»
  - «نسبة قول أو حديث بغير تثبّت»
  - «إعلان أو تكرار مزعج»
  - «كشف معلومات شخصية»
  - «سبب آخر» (note up to 300 characters)
- On submit the post joins `locallyHiddenPostIds`, and a toast (`store/toastStore.ts:32`) says «شكرًا لك، تم الإبلاغ وإخفاء المشاركة عنك».
- **Mute (S3).**
  - Trigger: the action «كتم هذا العضو» on another member's post.
  - Confirm: «لن تظهر لك مشاركات هذا العضو.»
  - Effect: the member's id is added to `mutedMemberIds`, and thread selectors filter it out in a memo.
  - Undo: Settings › المجتمع › «الأعضاء المكتومون» lists them with «إلغاء الكتم».

### 7.4 Guidelines (Arabic draft, **Foundation sign-off required**, `GUIDELINES_VERSION = 1`, `constants/communityGuidelines.ts`)
> **إرشادات مجتمع خزائن الرحمن**
> ١. أخلص النية لله، واجعل مشاركتك نافعة لإخوانك وأخواتك.
> ٢. التزم أدب الحوار: «وَقُولُوا لِلنَّاسِ حُسْنًا». لا سبّ ولا سخرية ولا تجريح.
> ٣. لا تكفير ولا تبديع ولا طعن في العلماء أو في الأشخاص، ولا إثارة للخلافات المذهبية.
> ٤. تثبّت قبل النقل: لا تنسب حديثًا أو قولًا لعالم إلا بمصدر موثوق.
> ٥. اجعل النقاش في موضوع الدرس، واسأل أهل العلم فيما يحتاج إلى فتوى.
> ٦. لا روابط ولا أرقام هواتف ولا إعلانات، ولا تطلب معلومات شخصية من أحد.
> ٧. احفظ خصوصيتك وخصوصية غيرك.
> ٨. تُراجَع المشاركات وقد تُخفى المخالفة منها، ويُوقف من يتكرر منه ذلك.
> ٩. إن رأيت ما يخالف هذه الإرشادات فاستخدم «إبلاغ» بدلًا من الردّ.

### 7.5 Rates (client; server mirrors later)
- posts: 30 s cooldown and ≤10 per rolling hour;
- groups created: ≤3 per day;
- joins: ≤10 per day;
- reports: ≤20 per day.

Cooldown copy: «يمكنك المشاركة مجددًا بعد {arabicCount(n, SECONDS)}», for example «بعد ٣ ثوانٍ», «بعد ٢٥ ثانية».

### 7.6 Limits (`constants/communityLimits.ts`)
- post 1–1000
- display name 2–24
- group name 3–40
- challenge title 3–40
- report note ≤300
- join code 6
- members ≤50
- groups per member ≤5
- daily-wird pages 1–604, days 1–60

## 8. UX and navigation

### 8.1 Authorities
No Figma frame covers these screens. The authorities are:
- `constants/layout.ts` (`RTL_TEXT`, `PHYSICAL_ROW`, `PHYSICAL_BOX`, `:112-125`)
- `constants/typography.ts`
- `constants/rtlContracts.ts`
- the `Khazain*` tokens
- the existing primitives (`InlineHeader`, `ListRowCard`, `SettingsSection`, `SettingsToggleRow`, `SheetShell`, `SheetRow`, `AsyncContent`, `Toggle`, `PillButton`)

Production builds render no community UI, so every Figma capture is unaffected. Visual-audit runs force `off` (S4).

### 8.2 Routes
| Route | Guard | `COLUMN_SCREENS` spec |
|---|---|---|
| `app/(tabs)/more/community/index.tsx`: `intro` (about, guidelines link, policy link, name field, «قرأت الإرشادات وأوافق عليها»), or `open` (my groups + «إنشاء مجموعة» / «الانضمام برمز») | `intro` | `scroll:1, header:true, blocks:false` (the name field sits inside the scroll) |
| `app/(tabs)/more/community/guidelines.tsx` | `intro` | `scroll:1, header:true` |
| `app/(tabs)/more/community/create.tsx`: name + challenge (khatm / daily wird) | `open` | `scroll:1, header:true` |
| `app/(tabs)/more/community/join.tsx`: code field fixed above the keyboard | `open` | `scroll:1, header:true, blocks:true` (`styles.inputRow`) |
| `app/(tabs)/more/community/group/[id].tsx`: code + share, challenge card, totals, own progress, share toggle, members, leave | `open` | `scroll:1, header:true` |
| `app/(tabs)/sections/discussion/index.tsx?scholarId=` | `open` | `scroll:1, header:true` |
| `app/(tabs)/sections/discussion/[lectureId].tsx?scholarId=`: «استمع للدرس», posts, composer pinned | `open` | `scroll:1, header:true, blocks:true` (`styles.inputRow`) |
| `app/community-report-sheet.tsx` (root, `transparentModal`) | `open` | not listed (`SheetShell`) |

- The discussion routes live in the Sections stack (`app/(tabs)/sections/_layout.tsx`), so Back returns to the scholar.
- No route uses `presentation:'modal'`, so the page-sheet rule (`__tests__/tabletReadingColumn.test.ts:250-271`) does not apply.
- Use `router.push(... as any)` until typed routes regenerate.

### 8.3 Entry points
- **More row.** Add `{ id:'community', title:'المجتمع', subtitle:'مجموعات القراءة · الختمات · نقاشات الدروس', route:'/(tabs)/more/community', gate:'community' }` to `MORE_EXTENSION_ROWS` (`data/content/sections.ts:138-155`).
  - A pure `visibleExtensionRows(rows, mode)` filters it before the map at `app/(tabs)/more/index.tsx:100-108`.
  - A drawn glyph is added in `DrawnRowGlyph` (`:151-177`).
  - `data/content/__tests__/morePresentation.test.ts:37` becomes `['settings','progress','community']`.
- **Settings** (`app/(tabs)/more/settings.tsx`), section «المجتمع», rendered only in `mock` mode:
  - before opt-in: a `ListRowCard` «الانضمام إلى المجتمع» → the hub;
  - after opt-in: a `SettingsToggleRow` «المشاركة في المجتمع». Off pauses. On returns to the hub if the guidelines version is stale.
  - «الأعضاء المكتومون», shown when the list is non-empty;
  - «حذف بياناتي في المجتمع», shown when a profile exists;
  - the deletion status row (§4.3) while pending.
- **Scholar detail.**
  - The entry is one compact row: the component `ScholarDiscussionsEntry` («نقاشات دروس الشيخ» · «{arabicCount(n, DISCUSSIONS)}»), held in the variable `discussionEntry`. Neither name contains the string "notesSection".
  - It renders `null` unless access is `open`.
  - Placement:
    - (a) in the split panel, after `{notesPlacement === 'panel' ? notesSection : null}` (`app/(tabs)/sections/scholar/[id].tsx:122`);
    - (b) otherwise, after the search block (`:130`).
  - It never goes in `ListFooterComponent`, so `notesSection` stays at 3 occurrences and every pin in §0.3 holds unchanged.
- **MiniPlayer.** Rejected for v1: `PlayerTrack` has no `Lecture.id` (`store/playerStore.ts:44-50`), and its pins and long-press NOTE rule apply.

### 8.4 Behaviours
- **Owner leaves.** Ownership transfers to the earliest joiner. If the owner was the last member, the group closes.
- **Challenges.** Owner only, one active at a time, `startsOn` defaults to today. Copy: «تُحتسب الصفحات المقروءة من تاريخ بدء التحدي».
- **Posts.**
  - Newest first, paginated.
  - The composer sits in a `KeyboardAvoidingView` with a live counter.
  - Own posts offer «حذف». Others' posts offer «إبلاغ» and «كتم هذا العضو».
- **No long-press anywhere in community UI.** Long-press stays SAVE on lecture rows and NOTE on ayah/MiniPlayer, per CLAUDE.md.

### 8.5 RTL
- `RTL_TEXT` on all text, `PHYSICAL_ROW` on rows, never `row-reverse`.
- New frozen orders in `constants/rtlContracts.ts`, left → right:
  - `COMMUNITY_POST_ORDER = ['actions','text','avatar']`
  - `GROUP_ROW_ORDER = ['disclosure','text','progress']`
  - `COMPOSER_ORDER = ['send','field']`
- The join code renders in a `PHYSICAL_BOX`.

### 8.6 Copy (frozen in `constants/communityCopy.ts`)
- Bad code: «رمز غير صحيح أو منتهٍ».
- Full: «المجموعة مكتملة».
- Counts go through `arabicCount` (`services/libraryStats.ts:15`, which handles 1 / 2 / 3–10 / other) with these forms:
  - `MEMBERS {عضو واحد، عضوان، أعضاء، عضوًا}`
  - `DAYS {يوم واحد، يومان، أيام، يومًا}`
  - `SECONDS {ثانية واحدة، ثانيتان، ثوانٍ، ثانية}`
  - `DISCUSSIONS {نقاش واحد، نقاشان، نقاشات، نقاشًا}`
  - the existing page forms
- `arabicCount` is defined for n ≥ 1. Zero uses dedicated copy (for example «لا توجد نقاشات بعد»).
- Its single `many` form is accusative («يومًا»), which is wrong at 100+. Limits keep members ≤50, days ≤60 and seconds ≤60. Unbounded totals use label form instead («أيام الإنجاز: ١٢٠ من ٣٠٠٠»), and a test pins this.
- Further strings (pending Foundation review):
  - `introTitle` «مجتمع خزائن الرحمن»
  - `introBody` «انضم إلى مجموعة قراءة مع أهلك وأصحابك، فاختموا القرآن معًا أو التزموا وردًا يوميًا، وتدارسوا الدروس في نقاشات يحكمها أدب طالب العلم.»
  - `introPrivacy` «لا نشارك صفحاتك ولا ملاحظاتك. يرى أعضاء مجموعتك الاسم الذي تختاره ومجموع تقدّمك في التحدي فقط، ويمكنك إيقاف المشاركة متى شئت.»
  - `nameLabel` «الاسم الذي يظهر للأعضاء», `namePlaceholder` «مثال: أبو عبد الله»
  - `guidelinesLink` «إرشادات المجتمع», `policyLink` «سياسة الخصوصية», `accept` «قرأت الإرشادات وأوافق عليها»
  - `composerPlaceholder` «شارك فائدة أو سؤالًا حول الدرس…», `emptyThread` «لا توجد مشاركات بعد. كن أول من يشارك بفائدة.»
  - `filterReason` (one per `AdabRejectReason`):
    - empty «اكتب شيئًا قبل الإرسال»
    - tooShort «النص قصير جدًا»
    - tooLong «النص أطول من المسموح»
    - link «لا يُسمح بالروابط في المشاركات»
    - phone «لا يُسمح بأرقام الهواتف حفاظًا على الخصوصية»
    - term «يُرجى مراجعة الصياغة بما يليق بأدب الحوار»
    - repetition «يُرجى تجنّب تكرار الأحرف أو الكلمات»
  - Added with the hub, Settings section and deletion runner (T7b), also pending Foundation review:
    - `screenTitle` «المجتمع»
    - `myGroups` «مجموعاتي», `noGroupsYet` «لم تنضمّ إلى أي مجموعة بعد»
    - `createGroup` «إنشاء مجموعة», `joinWithCode` «الانضمام برمز»
    - `deleteConfirmBody` «سيُحذف اسمك ومشاركاتك وعضويتك في المجموعات من المجتمع نهائيًا، ولا يمكن التراجع عن ذلك.»
    - `mutedMemberLabel(n)` «عضو مكتوم {n}» (names are never stored, so muted members are numbered)
    - `dueNow` «الآن» (the pending-deletion row when the next attempt is already due)

### 8.7 Tablet
- `columnStyle` goes on `contentContainerStyle` and on `InlineHeader`, and `inputRow` takes `columnStyle` where it is set.
- The per-screen `COLUMN_SCREENS` entries are in §8.2.
- The report sheet inherits `sheetColumn`.

## 9. Stores
- `store/communityStores.ts`, no SWR:
  - `useMyGroupsStore = createAsyncStore<Group[]>({ name:'community-groups', initialData: [], fetcher: () => communityService.groups.listMine(), isEmpty: (d) => d.length === 0 })`. `initialData` is required (`store/createAsyncStore.ts:88-89`).
  - Keyed factories modelled on `store/scholarStore.ts:21-47`: `useGroupDetailStore(id)`, `useThreadSummariesStore(scholarId)`, and `useThreadPostsStore(lectureId)` (`createPaginatedStore<Post>`). Confirm the paginated fetcher envelope at T6 start.
- `store/communityMutations.ts`:
  - `runMutation(op, target, payload, perform)` applies §5.3 (the key is derived as `intentKey(op, target)`), tracks `inFlight`, and dedupes concurrent calls.
  - Patchers `prependPost`, `replacePost` and `removePost` use `setState`, because `refresh()` clears items (`store/paginated.ts:354-372`).
  - Group mutations re-fetch quietly (no `loading` status, existing state kept on failure) instead of calling `refresh()`.
  - Known limitation: a quiet re-fetch and a normal `refresh` are last-write-wins, because the factories have no sequence guard. An earlier refresh can overwrite post-mutation data until the next fetch.
- Selectors subscribe to raw arrays and filter in `useMemo`, per `store/notesStore.ts:116-123`.

## 10. Accessibility
- Pressables: `accessibilityRole="button"` with Arabic labels, for example «الإبلاغ عن مشاركة {name}», «كتم {name}».
- The toggle uses `Toggle`'s label.
- A post reads as «{name}، {time}، {status}، {body}».
- Progress: `accessibilityRole="progressbar"` + `accessibilityValue`, plus a text equivalent.
- Status is text, never colour alone.
- Inputs: visible labels, `maxLength`, and a counter announced at 90%.
- Touch targets ≥44 pt.
- System font scaling is kept; check at 1.3× on 360 dp.

## 11. Testing

### 11.1 Unit
- **Gate:** the truth table, including visual audit → off and deletion pending → hidden.
- **Swap:** with `jest.isolateModules` and `__DEV__` toggled, the mock in dev and `offAdapter` otherwise.
- **Filter:** every fold, phone/date and link case. The allowlist fixture passes with and without tashkeel. Block versus review. The repetition ratio, including «لا» passing. `normalize()` unchanged.
- **Progress maths:** monotonic; `visibleTotals` returns null with 0 or 1 non-sharers besides the viewer and with sharers only; the viewer's own sharing state never counts; totals are rounded to 10 (14 → 10, 15 → 20); the windows.
- **Idempotency:** the reuse/rotate table for every `ApiErrorCode`, the hash ignoring key order, and the nonce rotating.
- **Deletion:** the backoff schedule and cap, and 401/404 counted as done.
- **`arabicCount` forms:** «٣ ثوانٍ», «٧ أيام», «١١ يومًا».

### 11.2 Contract and store
- Contract tests against the mock:
  - 2xx-only replay;
  - an in-flight duplicate getting the same promise;
  - `conflict` and `notFound` paths;
  - `review` → pending;
  - pending posts hidden from others;
  - leave and delete;
  - per-member progress only for sharers;
  - **differencing leak case.** After a viewer joins `KHZ7Q2` and reports, `groups.get` returns `progress.totals === null` even though `progress.reporters === 4`. On `NUR4M8`, `totals.pages % 10 === 0`. Subtracting the viewer's own count and every `shared` count from `NUR4M8`'s total never yields any single non-sharer's exact seeded count.
- `pageReadsRepo` covers `distinctPagesSince`.
- `communityLocalStore`:
  - coerce leniency;
  - no `version` key written;
  - a mode change wipes the ledger and profile;
  - `off` performs no writes;
  - 24 h pruning.
- Mutations: reuse after `network`, rotate after `moderation`.
- Progress sync: throttle, triggers, monotonic, no-op when not `open`.

### 11.3 Source scans (`communityInvariants.test.ts`)
- §3.2 bundle hygiene and the flag scan.
- The guard is called in every community route.
- No `onLongPress`, no `console.` with a body or name, and no `setAuthToken` in community code.
- `notesSection` count unchanged.
- `contextualNotesInvariants` and `scholarSplitPane` unchanged.
- `COLUMN_SCREENS` additions, and `rtlPhysicalContract` covering the new rows.

### 11.4 On-device QA
Devices: iPhone 16; a Realme Note 50-class 360×800 AVD; a Pixel Tablet AVD; iPad Pro 13.

| # | Case | Expected |
|---|---|---|
| 1 | **Release check:** production `expo export` grep for the sentinel and join codes, the dev-export positive control (§3.2), plus a release build | Production: no hits. Dev control: hits. Release build: no More row, Settings section, or scholar entry |
| 2 | Dev build, first open | Banner, intro, guidelines acceptance |
| 3 | Join seeded `KHZ7Q2`, then `NUR4M8` | `KHZ7Q2`: no totals, with the «بعد مشاركة مزيد من الأعضاء» copy. `NUR4M8`: totals rounded to 10 |
| 4 | Create a group, start a khatm, read 3 Mushaf pages, background the app | Own progress +3 live; push recorded in the ledger |
| 5 | Link, phone, `block` phrase; then a `review` phrase | Inline refusal; then the post shows «قيد المراجعة» |
| 6 | Quran fixture phrase as a post | Posts as visible |
| 7 | Report, then mute | Post hidden; member's posts hidden; unmute in Settings |
| 8 | 360 dp at 1.3× | No clipping |
| 9 | Tablets | Column-centred; scholar split panel shows the entry |
| 10 | Delete with `simulateError` | Status row; retry; then a clean intro |
| 11 | VoiceOver / TalkBack | Labels per §10 |

## 12. Open questions
- **Q2.** Who maintains the term list and allowlist fixture, and who decides the `review` tier?
- **Q6.** Arabizi.
- **Q8.** Should content-layer 400s map to `'validation'`?
- **v1.1:** khatm-by-juz.
- **v2:** poster collections, server-side block.
- **Q5 (resolved):** delete posts, do not anonymise them.

## 13. Go-live checklist (blocks `http` mode)
Each item must be signed off by the named owner before the `http` track merges.
1. **Moderators (Q1).** Named moderators, coverage hours, an SLA for the pending queue, the auto-hide threshold (3 reports proposed) and the new-member pre-moderation count (3 proposed). *Owner: Foundation.*
2. **`expo-secure-store` approved** as a dependency (USER_ONLY). *Owner: user.*
3. **Blocking.** A server-side member block, plus moderator suspension (A.4). The app stores require reporting, blocking and a moderation contact for UGC apps. *Owner: backend.*
4. **Privacy policy published** with the community section (Appendix C), and its URL configured. *Owner: Foundation counsel.*
5. **Term list and allowlist signed** (`adabTerms.ts`, `adabAllowlist.ts`), and the guidelines text (§7.4) approved. *Owner: Foundation scholars.*
6. **Minors.** An age floor or parental policy for posting, and store age-rating answers. *Owner: Foundation.*
7. **Mixed-gender groups.** Decide whether groups may be mixed, single-gender, or owner-chosen, and whether display names may imply gender. This is a policy decision with possible UI (a group type field). *Owner: Foundation.*
8. **Orphaned groups.** Rules when the owner is deleted or suspended (transfer to the earliest member is proposed), and closure of groups with no activity for 90 days. *Owner: Foundation + backend.*
9. **Hosting, residency, retention, backups, IP-log policy.** *Owner: Foundation + backend.*
10. **Lost-token deletion channel.** A published email and the contact-form handling (§4.3). *Owner: Foundation.*
11. **Appendix A implemented,** including idempotency and in-flight semantics and the A.2 differencing rule, and contract tests passing against staging. *Owner: backend.*
12. **Release grep in CI.** The §3.2 production-export grep for `KHZ_COMMUNITY_SEED` and the seed join codes, plus the dev-export positive control, runs on every release build in CI. Until CI exists, it is a manual release step. *Owner: user / whoever owns the build pipeline.*

---

## Appendix A — Backend contract (document only; base `${EXPO_PUBLIC_API_BASE}/v1/community`)

**A.0 Conventions.**
- Bearer community token on everything except `POST /members`.
- Every non-GET request carries `Idempotency-Key: <requestId>`:
  - the server stores **2xx** responses per `(memberId, key)` for 24 h and replays them;
  - an in-flight duplicate waits ≤10 s for the original and replays it, else returns `503` + `Retry-After: 2`.
- Errors come as `{error:{code,message}}`. Statuses:
  - 401 auth
  - 403 forbidden
  - 404 notFound
  - 409 conflict
  - 422 moderation
  - 429 rateLimit + `Retry-After`
  - 5xx server
- The server enforces §7.5 and §7.6, re-runs the filter with both tiers, and keeps progress **monotonic per (challenge, member)**.
- Epoch ms; `YYYY-MM-DD` days; cursors ≤2 KB.
- The `http` track adds `idempotencyKey` and `bearer` to `RequestOpts`, and 409/422 to `toApiError`.

**A.1 Members.**
- `POST /members` `{displayName, guidelinesVersion}` → 201 `{memberId, displayName, token}`.
- `PUT /members/me` `{displayName}` → `MemberSummary`.
- `DELETE /members/me` → 204. Deletes posts, reports-by-me, memberships and progress, and transfers or closes owned groups. A repeat call returns 404, which the client treats as done.

**A.2 Groups and challenges.**
- `GET /groups/mine` → `Group[]`.
- `GET /groups/{id}` → `{group, members, challenge, progress: GroupProgress, me: Membership}`. Per-member figures are included only for `shareMyProgress` members. `progress.totals` is computed **per viewer**: it is `null` unless at least 2 reporters other than the viewer have `shareMyProgress: false`, and otherwise each sum is rounded to the nearest 10. The server must never return exact totals or a per-member figure for a non-sharer.
- `POST /groups` `{name}` → 201.
- `POST /groups/join` `{code}` → `Group` (404 bad code; 409 full or at the 5-group cap).
- `DELETE /groups/{id}/membership` → 204.
- `PUT /groups/{id}/membership` `{shareMyProgress}` → `Membership`.
- `POST /groups/{id}/challenges` `{title, startsOn, kind, pagesPerDay?, days?}` → 201 (403 non-owner; 409 if one is active).
- `PUT /challenges/{id}/progress` `{pagesCovered ≤ 604, daysMet ≤ days, computedAt}` → 204 (the server stores the max).

**A.3 Threads.**
- `GET /threads?lectureIds=` (≤100) → `ThreadSummary[]`.
- `GET /threads/{lectureId}/posts?cursor=` → `{items, nextCursor}`. Others' non-visible posts are excluded; the viewer's own are included.
- `POST /threads/{lectureId}/posts` `{body}` → 201 `Post` (visible | pending) or 422.
- `DELETE /posts/{id}` → 204.
- `POST /posts/{id}/reports` `{reason, note?}` → 202 (403 on own post).
- `PUT /members/me/mutes/{memberId}` and `DELETE /members/me/mutes/{memberId}` (optional server sync of mutes).

**A.4 Moderation (staff dashboard; never called by the app).**
- `GET /moderation/queue`
- `POST /moderation/posts/{id}/decision` `{action: approve|hide|remove, reasonAr}`
- `POST /moderation/members/{id}/suspend` `{days, reasonAr}`
- `GET /moderation/reports?postId=`
- Every action is audit-logged.

## Appendix B — Dev knobs
`mockCommunityAdapter.mockDelay` (300), `.simulateError` (false), `.holdForReview` (false). These follow the `@devOnly` fields in `services/contentService.ts:14-21`.

## Appendix C — Privacy policy community section (Arabic draft, **requires Foundation and counsel sign-off**; values in [●] are not yet decided)
> **المجتمع (ميزة اختيارية)**
> **ما نجمعه:** عند انضمامك نحفظ اسمًا ظاهرًا تختاره، ومعرّفًا عشوائيًا لا يرتبط بجهازك، والمجموعات التي تنضم إليها، وأعدادًا إجمالية لتقدّمك في تحديات مجموعاتك (عدد الصفحات المقروءة منذ بدء التحدي وعدد الأيام التي أتممت فيها الورد فقط، دون تفاصيل الصفحات التي قرأتها)، ووقت آخر تحديث لهذه الأعداد، ومشاركاتك وبلاغاتك. لا نجمع معرّف الجهاز ولا موقعك ولا جهات اتصالك.
> **ما يراه الآخرون:** يرى أعضاء مجموعتك اسمك الظاهر. ويرون مجموعًا تقريبيًا لتقدّم المجموعة (مقرّبًا إلى أقرب عشرة) يجمع أعداد الأعضاء ومنها أعدادك، ولا يظهر إلا حين يكون في المجموعة عضوان آخران على الأقل لا يُظهران تقدّمهما. لا نعرض أعدادك منفردة إلا إذا فعّلت «إظهار تقدّمي لأعضاء المجموعة». يرى مستخدمو المجتمع مشاركاتك المنشورة في نقاشات الدروس مع اسمك الظاهر.
> **المشرفون:** يطّلع مشرفو المؤسسة على المشاركات والبلاغات وما يلزم من بيانات العضوية لتطبيق إرشادات المجتمع، ولهم إخفاء المشاركات وإيقاف الحسابات المخالفة. تُسجَّل قراراتهم.
> **سجلات الخادم:** تحتفظ خوادمنا بسجلات تقنية تتضمن عنوان IP ووقت الطلب لمدة [●] يومًا لأغراض الأمان ومنع الإساءة، ثم تُحذف.
> **مدة الاحتفاظ:** تبقى بياناتك ما دمت عضوًا. تُحذف البلاغات بعد [●] شهرًا من البتّ فيها، وتُحذف النسخ الاحتياطية خلال [●] يومًا.
> **مكان التخزين:** تُستضاف البيانات لدى [●] في [●].
> **الحذف:** يمكنك إيقاف المشاركة، أو حذف بياناتك في المجتمع نهائيًا من الإعدادات، فتُحذف مشاركاتك وعضوياتك وتقدّمك المُرسَل. إن تعذّر الحذف من التطبيق (مثلًا بعد فقدان الجهاز) فراسلنا عبر «تواصل معنا» أو على [●] مع معرّف العضوية إن توفّر.
> **القُصَّر:** المشاركة في المجتمع متاحة لمن بلغ [●] عامًا فأكثر [سياسة المؤسسة قيد التحديد].
