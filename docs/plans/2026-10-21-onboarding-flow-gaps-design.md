# Onboarding flow gaps — Design

**Date:** 2026-10-21
**Branch:** `feat/onboarding-audio-previews`
**Ticket:** "First-Time Onboarding Flow" — https://trello.com/c/QTQYqLBB (marked Done, failed the acceptance audit)
**Status:** Draft for review. The defaults below let work proceed; the open questions at the end are for the user.

---

## 1. Problem

The ticket shipped as track 003 (`app/onboarding.tsx` plus `components/khazain/onboarding/*`). An audit against the card's acceptance criteria found two PARTIAL criteria and one deviation that needs recording:

| # | Audit finding | Evidence |
|---|---|---|
| G1 | **PARTIAL: no audio previews.** The reciter step only lets the user select. | `components/khazain/onboarding/ReciterStep.tsx:14-15`: "Visual-only — audio previews are deferred (FR-006)". |
| G2 | **PARTIAL: 8 screens, but the card asks for 3-4.** | `constants/settings.ts:60` `ONBOARDING_STEP_COUNT = 8`; `app/onboarding.tsx:171-196` renders welcome, qira'a, reciter, 4 × `FEATURE_STEPS`, channels. |
| G3 | **Deviation: Welcome draws `FoundationMark`, not `LogoBadge`.** | `components/khazain/onboarding/WelcomeStep.tsx:13-18`; pinned by `__tests__/fontScaleChrome.test.ts:84-91`. |

A gap the audit did not list turned up while designing G1:

- **G1a: no reciter has an audio source.** All 16 entries in `data/content/quran.ts:114-131` lack `archiveId` (the comment at `:110-112` says so on purpose). `docs/plans/2026-07-23-audio-playback-design.md` §Decisions 4 records that the foundation's Internet Archive account "has no per-reciter surah recitations". With the "hide the button when there is no source" rule, the preview would ship invisible unless a source is supplied. See §8 Q1.

## 2. Acceptance criteria (verbatim from the card)

- 3-4 onboarding screens with smooth page transitions
- Welcome screen shows foundation identity (LogoBadge + Wordmark + mission)
- Qira'a selection screen allows choosing default recitation style
- Reciter selection screen shows popular reciters with audio previews
- Telegram/YouTube channel subscription CTAs are included
- Onboarding completion flag persists across app restarts
- Returning users skip onboarding entirely
- Users can skip onboarding at any point

Status after this design:

| Criterion | Today | After |
|---|---|---|
| 3-4 screens, smooth transitions | 8 screens; 280 ms slide+fade | **4 screens**; the transition code at `app/onboarding.tsx:53-108` is unchanged |
| Welcome identity | FoundationMark + Wordmark + mission | unchanged; recorded as an accepted deviation (§4.4) |
| Qira'a selection | met | unchanged |
| Popular reciters + audio previews | full list, no audio | **6 curated reciters** + a play/stop preview per row |
| Telegram/YouTube CTAs | met (`ChannelsStep.tsx`) | unchanged |
| Completion flag persists | met (`settingsStore`, T-SS-12) | unchanged |
| Returning users skip | met (`services/onboardingGate.ts`, `app/_layout.tsx:131-195`) | unchanged |
| Skip at any point | met (`OnboardingFooter.tsx:20-21`) | unchanged; skipping also stops any preview |

## 3. Governing authority (no Figma frame)

`docs/visual-regression/figma-mobile-screen-map.json` has no onboarding node, and none of the 28 frames covers this flow. **No Figma frame is affected and nothing here claims to "match Figma".** The authorities are:

- `constants/layout.ts`: `RTL_TEXT` (:112), `PHYSICAL_BOX` (:122), `PHYSICAL_ROW` (:125), `MIN_TOUCH_TARGET` (:153).
- `constants/rtlContracts.ts`: physical slot orders. This design adds `SELECTABLE_ROW_ORDER`.
- `constants/typography.ts` and the `Khazain*` tokens in `constants/theme.ts`. Sizes and colours stay the ones the step components already use.

## 4. Approach

### 4.1 G2: four screens (welcome → qira'a → reciter → channels)

**Chosen.** Fold the four feature highlights into the Welcome screen as a short list (one line each, gold bullet), and remove the four `FeatureStep` screens.

- Replace the magic count with an ordered id list in `constants/settings.ts`:
  `ONBOARDING_STEPS = ['welcome', 'qiraa', 'reciter', 'channels'] as const` and `ONBOARDING_STEP_COUNT = ONBOARDING_STEPS.length`. This removes the "LOCKSTEP" hazard noted at `constants/settings.ts:57-58`, where a step missing from `renderStep` silently showed Welcome.
- `renderStep` in `app/onboarding.tsx:174-196` switches on `ONBOARDING_STEPS[step]` rather than on raw indices. The `default → WelcomeStep` fallback goes away, and the `switch` is exhaustive over the id union, so `tsc` catches a missing case.
- `WelcomeStep.tsx` gains `WELCOME_HIGHLIGHTS`, four short Arabic lines taken from the old `FEATURE_STEPS` titles and descriptions. It renders them under the mission. The step is already a `ScrollView` with `flexGrow: 1` (`WelcomeStep.tsx:51-64`), so the longer content scrolls at font scale 1.7 / 320 pt instead of spilling, the same protection the file already has.
- `FeatureStep.tsx` loses its last caller. It is removed and dropped from the barrel (`index.ts:14`). It is track-003 code, not a file on CLAUDE.md's legacy list. See Q3.

**Rejected:**
- *Keep 8 and argue for it.* The card is the acceptance authority. Commit `d74bfc1` ("feat(onboarding): feature-education screens…", 2026-06-17) gives the intent, "4 'how the app works' steps", but cites no ticket or product decision. Recorded as Q2.
- *Collapse the features into one swipeable carousel step (5 screens).* That is still above 4, and it adds a horizontal scroller with RTL scroll-origin risk (see the `RtlCarousel` exception in CLAUDE.md).

### 4.2 G2 migration: persisted step resume when the count shrinks

`onboardingStep` is persisted (`store/settingsStore.ts:268-274`). Today, a stored value `>= ONBOARDING_STEP_COUNT` is **reset to 0**. With a count of 4, a user who stopped at old step 3-7 would restart at Welcome. That does not crash (the screen reads the step once at `app/onboarding.tsx:35`, and `renderStep` has a fallback), but it throws away their progress.

**Chosen:** an explicit legacy mapping inside `coerceSettings`, with no schema bump:

| Stored step | Meaning in the 8-step flow | New step |
|---|---|---|
| 0, 1, 2 | welcome / qira'a / reciter | same index (same meaning) |
| 3-6 | feature screens (setup already done) | **3** (channels, the next unseen screen) |
| 7 | channels | **3** (channels) |
| ≥ 8, negative, non-integer, non-number | not a step either layout ever wrote | **0** (existing reset; T-SS-11 keeps passing) |

This is the rule "an integer in `[COUNT, LEGACY_ONBOARDING_STEP_COUNT)` clamps to `COUNT - 1`", with `LEGACY_ONBOARDING_STEP_COUNT = 8` held as a named constant. The mapping is unambiguous without a version bump because indices 0-2 mean the same thing in both layouts, and every old index ≥ 3 should land on channels. **Rejected:** bumping `SETTINGS_SCHEMA_VERSION` to 4 just to tag the layout. That changes the version gate (`settingsStore.ts:184-197`), touches every migration test, and buys nothing the table above does not already give. As `settingsStore.ts:377-387` documents, coercion is not persisted at hydration; the mapping is idempotent, so re-deriving it on each cold start is harmless.

`scripts/visual-audit/skip-onboarding-ios.sh:19` writes `onboardingStep: 0`. It still works and needs no change.

### 4.3 G1: per-row reciter audio preview

#### Behaviour

- Each reciter row with a preview source shows a 44 × 44 play/stop button. Rows without a source show no button (no disabled control).
- One preview at a time. Starting B while A is loading or playing stops A, and A's late network result is discarded.
- The sample is **Al-Fatiha** from that reciter's source, capped at **30 s** (`PREVIEW_MAX_SEC`), then it stops by itself.
- The preview stops on: tapping stop, starting another row, a step change (back or next), skip, finish, the step unmounting, the app going to the background, a remote stop or pause, the end of the queue, or a playback error.
- Failures show an Arabic toast through the root `ToastOverlay` (`app/_layout.tsx:476`, so it is visible over onboarding):
  - network or archive error → `تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.`
  - source has no mp3 → `لا تتوفر عيّنة صوتية لهذا القارئ`
- Selecting a reciter and previewing are separate controls. Previewing never changes `preferredReciterId`.

#### Architecture (keeps the single audio boundary)

```
ReciterStep ──▶ services/reciterPreview.ts  (UI-facing, never throws, Arabic toast)
     │                    │
     │ reads              ▼
     │        services/audioEngine.ts  startReciterPreview / stopReciterPreview / canPreviewAudio
     │                    │  (ONLY module importing react-native-track-player — unchanged rule)
     ▼                    ▼ drives
store/previewStore.ts  { reciterId, status: 'idle'|'loading'|'playing' }
                          ▲
services/audioEngine/syncBridge.ts — while a preview is active: suppress playerStore writes,
                                     route Playing → status 'playing', end/err → stop preview
```

- **`store/previewStore.ts` (new, small Zustand store).** Holds UI state only. Like `playerStore`, it is driven one way by the engine and never imports it. This follows CLAUDE.md's "prefer a new small Zustand store".
- **Engine (`services/audioEngine.ts`), new exports:**
  - `canPreviewAudio()`: `false` on web. Once the Expo Go guard lands it becomes `!isInert()` (see Expo Go below).
  - `startReciterPreview(reciter, archiveId)`:
    1. Bump a generation token and set `{ reciterId, status: 'loading' }`.
    2. If a **real** queue is playing, `TrackPlayer.pause()` and call `usePlayerStore.getState().setIsPlaying(false)` directly. That persists the lecture position through the existing `noteLectureTick` path (`playerStore.ts:117-137`), so it no longer depends on an async event that the preview flag would suppress.
    3. `setupPlayer()`, then `fetchItemMetadata(archiveId)` and `resolveEpisodes` (`services/archive/*`), then `pickPreviewEpisode(episodes)`.
    4. If the token changed meanwhile, return without touching the player.
    5. `TrackPlayer.reset()`, `add({ id: 'preview:<reciterId>', … })`, `play()`, then start the 30 s cap timer.
    6. Throws `NoAudioError` when there are no episodes, and lets `ArchiveError` propagate. On either, the store is cleared before the throw.
  - `stopReciterPreview()`: a **no-op when no preview is active**. It must never `reset()` a real lecture queue. Otherwise it clears the cap timer, clears the store, opens a 750 ms drain window (`PREVIEW_DRAIN_MS`), and calls `TrackPlayer.reset()`.
  - `playLecture` clears any active preview first, so a real play is never suppressed.
- **`pickPreviewEpisode` (pure, `services/archive/episodeResolver.ts`)** returns the episode with `trackNumber === 1`. Failing that, the first whose file name starts with `001` or `1` followed by a non-digit. Failing that, `episodes[0]`.
- **Bridge (`syncBridge.ts:30-67`)**, while `previewStore.reciterId !== null` **or** inside the drain window:
  - `ActiveTrackChanged` and `ProgressUpdated` are ignored. No MiniPlayer track change, and **no lecture tick into SQLite**.
  - `PlaybackState`:
    - `Playing` sets the preview status to `'playing'`.
    - `Paused`, `Stopped`, `Ended` or `None` call `stopReciterPreview()`, but **only while the status is `'playing'`**. The `None` that the preview's own `reset()` emits during `'loading'` is ignored.
  - `QueueEnded` calls `stopReciterPreview()` and never `playerStore.setTrack(null)`. That call would flush a `completed = 1` tick for the user's real lecture (`playerStore.ts:102-108`).
  - `PlaybackError` calls `stopReciterPreview()` and shows the preview toast once (not the generic one as well).
- **Restoring the user's MiniPlayer.** The preview never writes `playerStore.track`, so the restored or paused track stays in the MiniPlayer. After the preview resets the queue, the MiniPlayer's play button takes the existing "no queue" path in `togglePlayback` (`audioEngine.ts:188-207`): it rebuilds the series and resumes from the position saved in step 2. In normal first-run use no real queue exists. The only route back into onboarding with a live queue is the dev "reset onboarding" action (`app/(tabs)/more/settings.tsx:125-130`).
- **UI wiring.**
  - `SelectableRow` becomes a `PHYSICAL_ROW` `View` holding two siblings: an optional `PreviewButton`, and the existing select `Pressable` (tick + text). Siblings rather than nested because a `Pressable` is `accessible` by default and would hide a nested button from VoiceOver. The physical order comes from a new `SELECTABLE_ROW_ORDER = ['preview', 'select']` in `rtlContracts.ts` (`select` is the existing Pressable, whose inner order stays tick → text), so the preview control sits on the physical left (trailing in RTL) and the Arabic title keeps leading at the right edge. The card chrome (background, border, shadow, gold selected border) moves from the Pressable to the outer `View`.
  - `PreviewButton` (new): `PlayIcon` when idle, `ActivityIndicator` while loading, `PauseIcon` while playing. It is `accessibilityRole="button"`, labelled `استماع إلى عيّنة من تلاوة {name}` or `إيقاف العيّنة`, with `accessibilityState={{ busy }}`, at least `MIN_TOUCH_TARGET`.
  - `QiraaStep` passes no preview, so its rows are unchanged.
  - `ReciterStep` stops the preview in an unmount cleanup and on an `AppState` change away from `active`. `app/onboarding.tsx` also calls `stopPreview()` in `goTo` and `finish` as a second line of defence, since `router.replace` can keep the screen mounted through the transition.
- **Preview source resolution (G1a).** `previewArchiveIdFor(reciter) = reciter.archiveId ?? ONBOARDING_RECITER_PREVIEW_SOURCES[reciter.id] ?? null`, where the map lives in `constants/settings.ts`. **`Reciter.archiveId` is deliberately left unset in `data/content/quran.ts`.** Setting it would make the reciter surah list (`services/surahPlayback.ts` → `playLecture`) play the series from episode 0 whichever surah was tapped, which is a separate bug (§7). The map starts **empty**. Filling it is gated on Q1.

#### "Popular reciters"

**Chosen:** a curated, ordered constant `ONBOARDING_POPULAR_RECITER_IDS = ['r1', 'r2', 'r3', 'r12', 'r4', 'r7']` (Abdul-Basit, al-Husary, al-Minshawi, al-Afasy, al-Sudais, al-Muaiqly). It includes `r7`, the default `preferredReciterId` (`constants/settings.ts:102`). It is applied by the pure `selectOnboardingReciters(all, popularIds, selectedId)`:

- Popular ids are returned in curated order, skipping ids the data source lacks.
- If the user's current selection is not in the list, it is appended, so a resumed or replayed onboarding always shows the selected row.
- If none of the curated ids exist (for example, a future API with different ids), it falls back to the first 6 of `all`.

The full list stays available in Settings → القارئ (`app/settings-reciter.tsx`), which the step's subtitle already points to (`ReciterStep.tsx:29`).

**Rejected:** a `popular?: boolean` field on `Reciter` (`types/content.ts:53-64`). That is a content-contract change for a backend that does not exist yet (`services/api/httpAdapter.quran.ts:47`), and it would need mock and API coordination for an editorial choice the client may still change (Q4).

#### Expo Go / inert engine

On this base, `services/audioEngine.ts:13-17` imports `react-native-track-player` directly. The Expo Go guard (`6e9d60d`, adding `services/audioEngine/rntp.ts` and `isInert()`) is only on `origin/fix/rntp-expo-go-guard` and **is not an ancestor of this branch**. The design therefore:

- adds **no new import site** of RNTP (preview lives in `audioEngine.ts` and the bridge, which the guard already rewrites);
- hides the preview button when `canPreviewAudio()` is false, rather than showing a dead button or a toast;
- includes a conditional reconciliation task: if the guard is merged first, `canPreviewAudio = () => !isInert()`, the start and stop functions short-circuit on `isInert()`, and a case is added to `inert.test.ts`.

### 4.4 G3: `FoundationMark` instead of `LogoBadge`. Accepted deviation, recorded.

The card says "LogoBadge + Wordmark + mission". `LogoBadge` is a generic octagon with an Amiri "خر" monogram and is not the foundation's mark. `FoundationMark` is the real asset, and the Home header renders it too. The criterion's intent ("foundation identity") is met more faithfully with the real mark, and `__tests__/fontScaleChrome.test.ts:84-91` pins the choice. **No change.** The deviation is recorded here and in the PR description.

## 5. Data, route and store changes

| Area | Change |
|---|---|
| Routes | None. `app/onboarding.tsx` stays the single root-stack route (`app/_layout.tsx:333`). |
| `constants/settings.ts` | `ONBOARDING_STEPS`, derived `ONBOARDING_STEP_COUNT` (4), `LEGACY_ONBOARDING_STEP_COUNT` (8), `ONBOARDING_POPULAR_RECITER_IDS`, `ONBOARDING_RECITER_PREVIEW_SOURCES` (starts `{}`), `PREVIEW_MAX_SEC` (30). |
| `store/settingsStore.ts` | The `onboardingStep` coercion (:266-274) gains the legacy mapping. No schema bump. Storage key unchanged. |
| `store/previewStore.ts` | New, not persisted. |
| `services/audioEngine.ts` | `canPreviewAudio`, `startReciterPreview`, `stopReciterPreview`, `isPreviewSuppressing` (store-active or drain window). `playLecture` clears the preview. |
| `services/audioEngine/syncBridge.ts` | Preview suppression and routing. |
| `services/archive/episodeResolver.ts` | `pickPreviewEpisode`. |
| `services/reciterPreview.ts` | New UI facade: `toggleReciterPreview`, `stopPreview`, `previewArchiveIdFor`. |
| `services/onboardingReciters.ts` | New, pure: `selectOnboardingReciters`. |
| `constants/rtlContracts.ts` | `SELECTABLE_ROW_ORDER`. |
| Components | `SelectableRow`, `ReciterStep`, `WelcomeStep`, new `PreviewButton`; `FeatureStep` removed; `index.ts` barrel. |
| Dependencies | **None added.** RNTP, AppState and ActivityIndicator are already in use. |

## 6. RTL considerations

- The selectable row keeps physical left → right order: `[preview?] [select: check? → text]`, so the title stays flush to the physical right. It uses `PHYSICAL_ROW`, never `row-reverse`. `SelectableRow.tsx`, `ReciterStep.tsx`, the new `PreviewButton.tsx` and `WelcomeStep.tsx` are all in `__tests__/rtlPhysicalContract.test.ts` `PINNED_SCREENS`. WelcomeStep is added because its highlight rows place a bullet at a physical edge.
- Welcome highlight rows use `PHYSICAL_ROW`, authored `[text, bullet]`, so the bullet sits at the physical right, before the Arabic line. The text spreads `RTL_TEXT`.
- The play glyph is not mirrored. A media "play" triangle points right in Arabic UIs too, so `PlayIcon` gets no `mirrored` treatment.
- The slide direction (`app/onboarding.tsx:132-136`) is untouched.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Preview events leak into the MiniPlayer or SQLite progress (fake lecture session, or a real lecture marked complete). | Bridge suppression, the drain window, and `setIsPlaying(false)` before the preview starts. Unit-tested, and checked on device in QA §B. |
| Preview `reset()` kills a real lecture queue. | Stop is a no-op when idle. Start pauses and persists the real position first, and the MiniPlayer resumes through the existing cold-restart path. QA §B covers it. |
| No reciter has a source, so the button never appears (G1a). | Q1. Until it is answered the criterion stays **PARTIAL** on device, and the PR must say so. The mechanism ships tested. |
| Third-party recordings and attribution. | Q1 requires the user to approve each source id before it is added. |
| RNTP shows a lock-screen or notification entry for the 30 s preview. | Accepted. The title is `سورة الفاتحة — عيّنة` and the artist is the reciter. Remote stop and pause end the preview. |
| Exposing `archiveId` later triggers the reciter-screen "always episode 0" bug. | Out of scope here. Recorded so the reciter-screen ticket fixes `surahAsLecture` and `playLecture` start-index before `Reciter.archiveId` is populated. |
| The Welcome screen is taller with highlights. | It already scrolls. QA at 320 pt × font scale 1.7 (`scripts/visual-audit/screen-matrix.mjs`). |

## 8. Open questions (each has a default so work proceeds)

1. **Q1: preview audio source.** The foundation's archive has no per-reciter recitations. Which source should previews use?
   **Default:** public Internet Archive items. archive.org is the only audio host the app already talks to, and it reuses `archiveClient` and `episodeResolver`. The implementer proposes one verified id per curated reciter in the PR. Verified means `curl https://archive.org/metadata/<id>` lists an mp3 with `track` 1 that is Al-Fatiha by that reciter. The ids go into `ONBOARDING_RECITER_PREVIEW_SOURCES` **only after user approval**. Without approval the map ships empty, the buttons stay hidden, and the ticket is reported PARTIAL for "audio previews".
2. **Q2: was there a product reason for the 4 feature screens?** Commit `d74bfc1` gives only the intent. **Default:** follow the card (4 screens) and fold the highlights into Welcome.
3. **Q3: delete `FeatureStep.tsx`?** It becomes unused. **Default:** delete it (git keeps it). It is not on the CLAUDE.md legacy list.
4. **Q4: who are the "popular" reciters?** **Default:** r1, r2, r3, r12, r4, r7, in that order. Changing the list is a one-line constant edit.
5. **Q5: merge order with `fix/rntp-expo-go-guard`.** **Default:** build on the current base. Implementation Task 11 is the conditional reconciliation.

## 9. Out of scope

- Fixing the reciter surah list playing episode 0 for any surah (`services/reciterNavigation.ts:33-43` → `playLecture` start index).
- Populating `Reciter.archiveId` in `data/content/quran.ts`, or any reciter catalogue or API work.
- Audio previews in Settings → القارئ (`app/settings-reciter.tsx`).
- Swapping `FoundationMark` for `LogoBadge` (G3 is accepted).
- Any change to the transition animation, the redirect gate, the legacy-flag reconciliation, `ChannelsStep`, or `QiraaStep` content.
- Merging or rebasing the Expo Go guard branch itself.
- New dependencies of any kind.
