# Onboarding flow gaps — Design (v2)

**Date:** 2026-10-21
**Branch:** `feat/onboarding-audio-previews`
**Ticket:** "First-Time Onboarding Flow" — https://trello.com/c/QTQYqLBB (marked Done, failed the acceptance audit)
**Status:** v2. Incorporates the CTO review ("APPROVE WITH CHANGES") and the user's decisions of 2026-10-21 (§8).

### v2 changes from v1

| Change | Was (v1) | Now (v2) |
|---|---|---|
| Preview source | archive *series* id; metadata fetch + `pickPreviewEpisode` at play time | one **verified direct file** per reciter `{ archiveId, file }` → URL via `buildDownloadUrl` (no metadata round trip, no `NoAudioError` path) |
| Popular list | hand-picked 6 ids | **the reciters with a verified file** (user decision Q1) |
| Source verification | gated task near the end | **early task**, before the engine work |
| Queue isolation | 750 ms drain window | synchronous module-level `_queueOwner: 'none' \| 'lecture' \| 'preview'` |
| Live lecture during preview | pause, save position, restore | **removed**. Previews are hidden while a lecture owns the queue. |
| Superseded starts | one currency check | a check after **every** await; `'playing'` is set when `play()` resolves |
| Row chrome | padding moved to the outer View | padding and `minHeight` **stay on the select Pressable**; the outer View carries only border, background and shadow |

---

## 1. Problem

The ticket shipped as track 003 (`app/onboarding.tsx` plus `components/khazain/onboarding/*`). The audit against the card found:

| # | Audit finding | Evidence |
|---|---|---|
| G1 | **PARTIAL: no audio previews.** | `components/khazain/onboarding/ReciterStep.tsx:14-15`: "Visual-only — audio previews are deferred (FR-006)". |
| G2 | **PARTIAL: 8 screens, but the card asks for 3-4.** | `constants/settings.ts:60` `ONBOARDING_STEP_COUNT = 8`; `app/onboarding.tsx:171-196`. |
| G3 | **Deviation: Welcome draws `FoundationMark`, not `LogoBadge`.** | `WelcomeStep.tsx:13-18`; pinned by `__tests__/fontScaleChrome.test.ts:84-91`. |

- **G1a: no reciter has an audio source.** No entry in `data/content/quran.ts:114-131` has an `archiveId`. The foundation's archive has no per-reciter recitations (`docs/plans/2026-07-23-audio-playback-design.md` §Decisions 4). The user has therefore approved public Internet Archive files, **each verified**, with sign-off before merge (§8 Q1).

## 2. Acceptance criteria (verbatim from the card)

- 3-4 onboarding screens with smooth page transitions
- Welcome screen shows foundation identity (LogoBadge + Wordmark + mission)
- Qira'a selection screen allows choosing default recitation style
- Reciter selection screen shows popular reciters with audio previews
- Telegram/YouTube channel subscription CTAs are included
- Onboarding completion flag persists across app restarts
- Returning users skip onboarding entirely
- Users can skip onboarding at any point

| Criterion | Today | After |
|---|---|---|
| 3-4 screens, smooth transitions | 8 screens | **4 screens**; transition code `app/onboarding.tsx:53-108` unchanged |
| Welcome identity | FoundationMark + Wordmark + mission | unchanged; **user-approved deviation** (§4.4) |
| Qira'a selection | met | unchanged |
| Popular reciters + previews | full list, no audio | the reciters with a verified Al-Fatiha file, each with a play/stop preview |
| Telegram/YouTube CTAs | met | unchanged |
| Completion flag persists | met (T-SS-12) | unchanged |
| Returning users skip | met (`services/onboardingGate.ts`) | unchanged |
| Skip at any point | met (`OnboardingFooter.tsx:20-21`) | unchanged; skip also stops a preview |

## 3. Governing authority (no Figma frame)

No onboarding node exists in `docs/visual-regression/figma-mobile-screen-map.json`, so **no Figma frame is affected and nothing here claims to "match Figma"**. The governing contracts are:

- `constants/layout.ts`: `RTL_TEXT` (:112), `PHYSICAL_BOX` (:122), `PHYSICAL_ROW` (:125), `MIN_TOUCH_TARGET` (:153).
- `constants/rtlContracts.ts`: this design adds `SELECTABLE_ROW_ORDER`.
- `constants/typography.ts` and the `Khazain*` tokens in `constants/theme.ts`.

## 4. Approach

### 4.1 G2: four screens (welcome → qira'a → reciter → channels)

- `constants/settings.ts`: `ONBOARDING_STEPS = ['welcome', 'qiraa', 'reciter', 'channels'] as const`, with `ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length`. This removes the LOCKSTEP hazard noted at `:57-58`.
- `renderStep` (`app/onboarding.tsx:174-196`) switches on `ONBOARDING_STEPS[step]`. The switch is exhaustive over the id union, so `tsc` catches a missing case. There is **no index fallback**, because the step is always clamped (by the `goTo` clamp at `:111` and by the store).
- Welcome gains `WELCOME_HIGHLIGHTS`: four one-line highlights taken from the old `FEATURE_STEPS`, shown as a gold-bulleted list. The step already scrolls (`WelcomeStep.tsx:51-64`).
- `FeatureStep.tsx` is **deleted** (user decision Q3) and removed from the barrel. The illustrations it used (`RehlArt`, `ScrollArt`, `CrownBookArt` in `components/khazain/art/`) **stay**. Per CLAUDE.md they are the component API that future client art will replace.
- Rejected alternatives: keeping 8 screens (the card is the authority, and the user confirmed it, Q2); a single carousel step (still more than 4 screens, and it adds RTL scroll-origin risk).

### 4.2 G2 migration: persisted resume when the count shrinks

The `onboardingStep` coercion (`store/settingsStore.ts:266-274`) gains a legacy mapping with **no schema bump**:

| Stored step | Meaning in the 8-step flow | New step |
|---|---|---|
| 0, 1, 2 | welcome / qira'a / reciter | same |
| 3-7 | features / channels (setup done) | **3** (channels) |
| ≥ 8, negative, non-integer, non-number | never written | **0** (existing reset; T-SS-11 still holds) |

Rule: an integer in `[COUNT, LEGACY_ONBOARDING_STEP_COUNT = 8)` clamps to `COUNT - 1`.

This works because indices 0-2 mean the same thing in both layouts. The Task 1 assertion `ONBOARDING_STEP_COUNT ≤ 4` protects the mapping: if the count grew back past 4, old indices would change meaning and the mapping would have to be revisited.

Bumping `SETTINGS_SCHEMA_VERSION` was rejected: it would touch the version gate (`:184-197`) and every migration test, for no gain.

### 4.3 G1: per-row reciter audio preview

#### Behaviour

- A row shows a 44 × 44 play/stop button **only if** that reciter has a verified preview source **and** the engine can preview. The engine cannot preview on web, or while a lecture owns the queue. Otherwise the row shows no button.
- One preview at a time. Starting B stops A, and A's in-flight work is abandoned.
- The sample is that reciter's verified **Al-Fatiha file**, capped at **30 s** (`PREVIEW_MAX_SEC`).
- The preview stops on any of:
  - tapping stop, or starting another row;
  - a step change, skip or finish;
  - the reciter step unmounting, or the app leaving the foreground;
  - a remote pause or stop, the end of the track, or a playback error.
- Failures show the Arabic toast `تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.` through the root `ToastOverlay` (`app/_layout.tsx:476`). This covers a rejected start and an RNTP `PlaybackError` during streaming.
- Previewing never changes `preferredReciterId`. Select and preview are separate controls.

#### Sources: verified direct files (user decision Q1)

- `constants/settings.ts`:

  ```ts
  type PreviewSource = { archiveId: string; file: string };
  ONBOARDING_RECITER_PREVIEW_SOURCES: Readonly<Record<string, PreviewSource>>
  ```

  It is keyed by reciter id and records the verification evidence in a comment. The URL is `buildDownloadUrl(archiveId, file)` (`services/archive/episodeResolver.ts`). Playback goes straight to the file, with no metadata fetch at play time.
- **Popular list = verified list.** `ONBOARDING_POPULAR_RECITER_IDS` is the keys of the source map, in display order.
- Candidates supplied by the user, to verify during implementation (Task 4):

  | Reciter (id) | Candidate archive items |
  |---|---|
  | al-Minshawi (`r3`) | `Minshawi_Morattal_FullQuran`, `mos7af_Siddeeq_al_Minshawi` |
  | al-Afasy (`r12`) | `mishari-rashid-al-afasy-quran-mp3`, `afasyrecitation` |
  | al-Husary (`r2`) | `QuranRecitation-Husary` (flagged unverified) |

  A candidate is accepted only if:
  1. the item metadata names that reciter;
  2. the file is surah 1, by name, track or title;
  3. its duration and size are plausible for Al-Fatiha;
  4. the download URL resolves to audio.

  If **no** candidate verifies, implementation stops and escalates. The criterion cannot be met without a source, and the list would be empty.
- `Reciter.archiveId` in `data/content/quran.ts` **is not set**. That would expose the surah-list bug where playback always starts at episode 0 (§9).
- `selectOnboardingReciters(all, popularIds, selectedId)` returns the popular (verified) reciters in order. It **appends the user's current selection if it is not in the list**: the default `r7` is not a candidate and has no preview button. If none of the popular ids exist in the data, it falls back to the first 6.

#### Architecture: one audio boundary, one queue owner

```
ReciterStep ──▶ services/reciterPreview.ts   (UI facade: never throws, Arabic toast)
     │                     │
     │ reads               ▼
     │        services/audioEngine.ts — _queueOwner: 'none' | 'lecture' | 'preview'
     │            canPreviewAudio / startReciterPreview / stopReciterPreview
     │            playLecture   → owner = 'lecture' (synchronously, first line)
     │            togglePlayback→ owner 'preview' counts as "no queue"
     ▼                     │ drives
store/previewStore.ts { reciterId, status: 'idle'|'loading'|'playing' }
                           ▲
syncBridge.ts — owner 'preview': drop ALL playerStore writes; end/err → stopReciterPreview
                QueueEnded clears the MiniPlayer only when owner === 'lecture'
```

- **`_queueOwner`** is a module-level value in `services/audioEngine.ts`, read and written **synchronously**, so there is no timing window.
  - `startReciterPreview` sets `'preview'` before its first await.
  - `stopReciterPreview` sets `'none'` before its first await.
  - `playLecture` sets `'lecture'` on its first line.
  - The engine's `stop()` sets `'none'`.
  - `setupPlayer` adopts an owner from a queue that survived a JS restart (Android "ContinuePlayback"): a `preview:`-prefixed active track gives `'preview'`, any other track gives `'lecture'`.
- **`canPreviewAudio()` = `!isWeb() && _queueOwner !== 'lecture'`.** Previews are never offered over a live lecture queue, so the engine never pauses, saves or restores a lecture (v1's restore path is cut). In a first run the owner is `'none'`: `restoreLastLecture` only seeds the store and builds no queue. Previews are hidden only if the user played a lecture this session and then re-entered onboarding through the dev reset (`app/(tabs)/more/settings.tsx:125-130`).
- **`startReciterPreview(reciter, source)`:**
  1. Bump the token, set the owner to `'preview'`, call `begin(reciter.id)`, and clear the cap timer.
  2. Run the following, checking **currency after every await**:
     - `setupPlayer()`, check;
     - `reset()`, check;
     - `add({ id: 'preview:<id>', url, title: 'سورة الفاتحة — عيّنة', artist: name })`, check;
     - `play()`, check;
     - `markPlaying(id)` and start the 30 s cap timer.
  3. On error, if still current: clear the timer and the store, set the owner to `'none'`, and rethrow.

  Currency means the token is unchanged **and** the owner is still `'preview'`. A superseded start never *issues* another command. JS is single-threaded, so the check and the next call happen in the same tick. Any command it already issued reaches RNTP before the newer start's `reset()`. That is why no extra serialization is needed.
- **`stopReciterPreview()`** is a no-op unless the owner is `'preview'`, so it can never reset a lecture queue. It works in two parts:
  - Synchronously: bump the token, clear the timer, clear the store, and set the owner to `'none'`.
  - Then: `reset()`.
- **`togglePlayback`** (`audioEngine.ts:188-207`) treats owner `'preview'` as "no queue". The MiniPlayer's play button then rebuilds the user's lecture through `playLecture` (which takes ownership) instead of toggling the preview track.
- **Bridge (`syncBridge.ts:30-67`):**
  - **Owner `'preview'`:**
    - Ignore `ActiveTrackChanged`, `ProgressUpdated` and `isPlaying` updates. There is no MiniPlayer change and **no lecture tick into SQLite**.
    - `PlaybackState` `Paused`, `Stopped` or `Ended` while the status is `'playing'` calls `stopReciterPreview()`. The preview's own `reset()` happens while the status is still `'loading'`, so it is ignored.
    - `QueueEnded` calls `stopReciterPreview()`.
    - `PlaybackError` calls `stopReciterPreview()` and shows the preview toast once.
  - **Any owner:** `QueueEnded` calls `playerStore.setTrack(null)` **only when the owner is `'lecture'`**. A `QueueEnded` that arrives after a preview has stopped (owner `'none'`) therefore cannot flush a `completed = 1` tick for the restored lecture (`playerStore.ts:102-108`). This rule replaces v1's drain window.
- **UI.**
  - `SelectableRow` becomes an outer `View`. It holds the border, background, shadow and the gold selected border, and **nothing else**. Inside it, in `SELECTABLE_ROW_ORDER = ['preview', 'select']`:
    - an optional `PreviewButton`, with a physical left margin;
    - the existing radio `Pressable`. It **keeps** its `paddingVertical: 12`, `paddingHorizontal: 16`, `minHeight: 64` and tick → text order.
  - `QiraaStep` passes no preview, so its rows render exactly as today.
  - The preview button is a sibling of the radio, not nested inside it, so VoiceOver reaches it.
  - `PreviewButton` shows `PlayIcon`, an `ActivityIndicator` while loading, or `PauseIcon` while playing. It has `accessibilityRole="button"`, an Arabic label, `busy` state, and a size of at least `MIN_TOUCH_TARGET`.
  - `ReciterStep` calls `stopPreview()` in an unmount cleanup and whenever `AppState` leaves `active`. `app/onboarding.tsx` calls `stopPreview()` first thing in `goTo` and `finish`.

#### Expo Go

The Expo Go guard (`6e9d60d`, `services/audioEngine/rntp.ts`, `isInert()`) is only on `origin/fix/rntp-expo-go-guard`. It is not an ancestor of this branch.

- The preview adds no new import of RNTP.
- The button is hidden whenever `canPreviewAudio()` is false.
- Task 12 is conditional: once the guard is in the base, `canPreviewAudio = () => !isInert() && _queueOwner !== 'lecture'`.

### 4.4 G3: `FoundationMark`. **User-approved deviation** (Q6, 2026-10-21)

The card names "LogoBadge". `LogoBadge` is a generic octagon with an Amiri "خر" monogram. `FoundationMark` is the foundation's real mark, the same one the Home header uses. The user has decided to **keep FoundationMark**. There is no code change; the decision is recorded here and in the PR. `__tests__/fontScaleChrome.test.ts:84-91` keeps pinning it.

## 5. Data, route and store changes

| Area | Change |
|---|---|
| Routes | None. |
| `constants/settings.ts` | `ONBOARDING_STEPS`, derived `ONBOARDING_STEP_COUNT` (4), `LEGACY_ONBOARDING_STEP_COUNT` (8), `PreviewSource`, `ONBOARDING_RECITER_PREVIEW_SOURCES` (verified), `ONBOARDING_POPULAR_RECITER_IDS` (its keys), `PREVIEW_MAX_SEC` (30). |
| `store/settingsStore.ts` | Legacy step mapping in coercion. No schema bump. Same storage key. |
| `store/previewStore.ts` | New, not persisted. |
| `services/audioEngine.ts` | `_queueOwner` + `getQueueOwner`, `canPreviewAudio`, `startReciterPreview`, `stopReciterPreview`, `PREVIEW_ERROR_MESSAGE`. Owner set in `playLecture`, `stop`, `setupPlayer`. `togglePlayback` treats `'preview'` as no queue. |
| `services/audioEngine/syncBridge.ts` | Owner-based suppression; QueueEnded clears the MiniPlayer only for `'lecture'`. |
| `services/reciterPreview.ts` | New facade: `previewSourceFor`, `canPreview`, `toggleReciterPreview`, `stopPreview`. |
| `services/onboardingReciters.ts` | New, pure: `selectOnboardingReciters`. |
| `constants/rtlContracts.ts` | `SELECTABLE_ROW_ORDER`. |
| Components | `SelectableRow`, `ReciterStep`, `WelcomeStep`, new `PreviewButton`; `FeatureStep` deleted; barrel updated. |
| Dependencies | None. |

## 6. RTL considerations

- Selectable row, physical left → right: `[preview?] [select: tick? → text]`. It uses `PHYSICAL_ROW` and never `row-reverse`. `SelectableRow`, `ReciterStep`, `PreviewButton` and `WelcomeStep` are all in `PINNED_SCREENS` (`__tests__/rtlPhysicalContract.test.ts`).
- Welcome highlight rows use `PHYSICAL_ROW`, authored `[text, bullet]`, so the bullet leads at the physical right. The text spreads `RTL_TEXT`.
- The play glyph is not mirrored.
- The slide direction (`app/onboarding.tsx:132-136`) is untouched.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Preview events leak into the MiniPlayer or SQLite. | Synchronous `_queueOwner`; the bridge drops every playerStore write while the owner is `'preview'`; QueueEnded clears the MiniPlayer only for `'lecture'`. Unit-tested (B1-B8). |
| A preview resets a real lecture queue. | `canPreviewAudio()` is false while the owner is `'lecture'`, and stop is a no-op unless the owner is `'preview'`. |
| A stale start lands after a newer one. | A currency check after every await, so a stale start issues no further command (tests P5, P6). |
| A third-party recording is wrong or unattributed. | Verify each file against four criteria. Exact `item id + file` are listed in the PR, and the user signs off before merge. |
| An item is removed from archive.org later. | Streaming fails and the Arabic toast is shown; nothing crashes. Re-verify sources at each release (noted in the QA doc). |
| Android: swiping the app away mid-preview lets RNTP's `ContinuePlayback` play the whole Al-Fatiha. | Accepted. It is one short file. On relaunch `setupPlayer` adopts the owner `'preview'`, so nothing leaks into the MiniPlayer. Checked in QA. |
| The lock screen shows the preview. | Accepted: titled `سورة الفاتحة — عيّنة`. Remote pause and stop end the preview. |
| Welcome is taller. | It already scrolls. QA at 320 pt × font scale 1.7. |

## 8. Decisions and remaining questions

| # | Question | Decision (user, 2026-10-21) |
|---|---|---|
| Q1 | Preview source | Use archive.org files. **Verify each candidate's Al-Fatiha file** (metadata, name, size, duration, download). Use only verified ones; the preview list is the reciters with a verified file. List the exact sources (item id + file) in the PR for sign-off before merge. |
| Q2 | Screen count | **4 screens**, per the card. |
| Q3 | `FeatureStep.tsx` | **Delete.** |
| Q4 | "Popular reciters" | Superseded by Q1: the verified set. |
| Q5 | Merge order with the Expo Go guard | Build on the current base; Task 12 stays conditional. |
| Q6 | FoundationMark vs LogoBadge | **Keep FoundationMark**, as a user-approved deviation. |

Remaining: **none blocking.** If no candidate verifies (Q1), stop and escalate rather than ship an empty list.

## 9. Out of scope

- The reciter surah list starting at episode 0 for any surah (`services/reciterNavigation.ts:33-43` → `playLecture`). It must be fixed before `Reciter.archiveId` is ever populated.
- Populating `Reciter.archiveId`; reciter catalogue or API work.
- Previews in Settings → القارئ (`app/settings-reciter.tsx`).
- Pausing or restoring a live lecture around a preview (cut in v2).
- Changes to the transition animation, the redirect gate, the legacy-flag reconciliation, `ChannelsStep`, or `QiraaStep` content.
- Merging the Expo Go guard branch. New dependencies.
