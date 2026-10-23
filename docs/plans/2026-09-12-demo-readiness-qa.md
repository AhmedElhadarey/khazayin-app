# Demo-readiness QA — 2026-09-12

Goal as stated: *check every page icons fonts spacing style same as figma, then
go to the navigation make every nested pages has backbtn or go forward, then
make player works to make the app ready for the demo, validate everything on
both devices, then try the app on different screens.*

Devices: iOS 26.5 iPhone 16 (simulator `DBA53D90…`, 393 pt) and Android
`emulator-5554` (1080×2400 @ 420 dpi, 411 dp). Frame captures via
`scripts/visual-audit`, compared against `docs/audit/2026-09-09/figma-reference`.

## 0. A correction to the authority chain

`CLAUDE.md` names `design_source/` and `handoff.md` as the second and third
authorities. **Neither exists in this repo** — not on disk and not in git. So
for any screen without one of the 28 frames, the only authority is the file
itself plus the in-repo contracts (`constants/layout.ts`, `constants/typography.ts`,
`constants/rtlContracts.ts`). Nothing below claims "checked against Figma" for
a screen with no frame; those say which contract was used instead.

Frame coverage: 23 of the 28 frames are captureable (5 are launch/reader
transitions the harness skips by design). The 28 cover Home, Library, Sections
and its twelve sub-screens, and More and its three. They cover **none** of the
settings modals, the note screens, search, or the sheets.

## 1. RTL — the reported defect, and what it actually was

Reported as "all the headers on the more page is left sided not right". The
More screen was not the cause. **No root-level screen used the layout contract
at all** — the whole track-002 modal layer predates it. Two mechanisms:

* `alignItems: 'flex-end'` / `textAlign: 'right'` in a container whose
  direction is left to `forceRTL`. The container is RTL, so both resolve to the
  physical **left**.
* `flexDirection: 'row-reverse'` on an unpinned row. The row is already RTL, so
  `row-reverse` renders left→right and the JSX-first child — the label — lands
  on the left with its value on the right.

Fixed at the contract on 15 files: `PHYSICAL_BOX` on the parent of right-aligned
text, `PHYSICAL_ROW` plus children authored physical left→right for rows.
`row-reverse` is gone from all of them. Guarded by
`__tests__/rtlPhysicalContract.test.ts`.

Verified: 10 routes captured on both platforms after the fix. `settings-notifications`
was already correct — it delegates to `components/khazain/settings/*`, which is
what the contract-using screens all have in common.

## 2. Icons — orientation was the defect, not geometry

The file uses **one component in two orientations**, and the flip lives on the
INSTANCE (`transform.m00: -1`), never on the SYMBOL master the generator
copies. So the extracted geometry was correct and the direction was wrong,
which no name-based check could catch.

| Mark | Upright instances | Mirrored instances | What the app drew |
|---|---:|---:|---|
| `vuesax/bulk/arrow-right` | 23 — one per frame, the header back control | 42 — list-row disclosures: Sections 9, Qiraat 10, each reciter tab 6, Archive 3 | all 42 backwards |
| `vuesax/bulk/play` | 0 | 16 | MiniPlayer's hand-drawn one pointed right |
| `vuesax/outline/arrow-left-stick` | 12 | 2, both outside the 28 frames | n/a |

`FigmaIcon` gained `mirrored`, applied as an SVG `<G transform>` rather than an
RN `style.transform` so `forceRTL` has no opinion about it. Extraction is
unchanged and the `--check` invariant still holds.

Also replaced the last hand-drawn glyphs with the file's own: `ReciterRow`'s
stroked chevron (right direction, wrong shape and size — an outline where the
file fills a wedge) and the MiniPlayer's play/pause. `Pause` (2001:15578)
joined the manifest. Verified by re-cropping the disclosure out of the
reference | iPhone | Pixel composite: all three columns point left.

## 3. Fonts — measured, mostly unfixed, and this is the largest open item

The file's Arabic UI is **two faces only**, across 1,153 text nodes:
`TheSansArabic Bold` (labels and titles) and `TheMixArab Regular` (prose).
Everything else in the type table is device-chrome mockup (Product Sans, SF
Pro, Roboto, Intercom, Georgia).

`constants/typography.ts` already encodes exactly this, and the frame-backed
screens use it. **37 files do not.** They hand-assemble type and between them
set weights the design never uses (500, 600, and 400 on `TheSansArabic`, which
the file only ever pairs with Bold) and sizes it never states (11, 13, 15).

**Twelve of the 37 are now fixed** — the root-level modals (`settings-*`,
`note-editor`, `notes-viewer`, `search`, `share-sheet`), 53 styles, mapped by
the scale's own rule rather than by eye, and captured on both platforms after
the change. Sheet titles moved off `Amiri-Bold` (which appears nowhere in the
file) onto `bodyLarge`, the body face at 18 that every frame-backed page title
uses. Amiri is kept in four places where the thing drawn really is artwork: the
foundation wordmark, the reminder clock, the wird page count, and the font-size
preview labels.

**25 files remain** — onboarding, the library and search sub-components, and
several shared primitives. Deliberately left: they have no frame to verify
against, and because `TheSansArabic` and `TheMixArab` both still resolve to
`NotoSansArabic-VF.ttf` through `FONT_SUBSTITUTIONS`, the family half of the
fix is invisible until the licensed files land. What a wide rewrite buys today
is about one point of size and one weight step, against real layout-shift risk
across 25 files on the day of a demo. Top follow-up; do it when the fonts
arrive, and re-verify then.

## 4. Navigation — one real gap

A route-by-route audit of every live screen. Exactly one nested page had no
back or forward affordance: **`/more/settings`**, which drew a bare
`<Text>الإعدادات</Text>` and could only be left by the system gesture. It now
uses `InlineHeader`, like its four siblings.

Two apparent gaps were not: `/sections/audiobooks` and `/sections/exclusive`
render through `RailedLectureList`, which supplies `InlineHeader` + `onBack`.
The eight `settings-*` screens are `presentation: 'modal'` with a drag handle —
the platform's own dismiss. The `card`-presented routes are the legacy root
screens `CLAUDE.md` preserves, and all already call `router.back`.

## 5. Player — it works; two things stopped it being usable

Established on device, not from the code: the native module is present,
`MusicService` foregrounds, `MediaCodec` and `AudioTrack` run, and
`شرح صحيح البخاري` streams from archive.org.

**The player was invisible wherever it could be started.** The MiniPlayer lived
inside `CustomTabBar`, and the bar is a four-root control — so every screen
that can begin playback (a scholar's lectures, a reciter's surahs) was a screen
that could not show it. Tap a lecture, hear audio, and have nothing to pause.
`MiniPlayerDock` now renders the player where the bar is suppressed; it returns
null when nothing is playing, so a quiet nested screen measures no inset. Both
states checked on device.

**The metadata budget sat inside the origin's latency spread.** `archiveClient`
allowed 10 s. Measured against the real endpoint: 1.8, 2.6, 2.8, 5.2 and 10.3 s
warm, 17.5 s cold. A playable lecture would intermittently fail with
"تعذّر التشغيل". Raised to 30 s.

Content gaps, both documented and intentional, left alone: reciters carry no
`archiveId` (so a surah tap correctly says "no recording"), and archive-backed
scholar series carry `duration: ''` because per-episode duration resolves at
play time.

## 6. Screen sizes

Android at four widths spanning every profile `constants/layout.ts` defines —
320 dp (below the compact floor), 360 dp (compact), 411 dp (regular, native)
and 480 dp (wide). Home, Sections, Library and More at each: no horizontal
overflow, no clipped cards, tab bar intact, RTL held. Long subtitles ellipsize
at 320 dp, which is `numberOfLines={1}` behaving.

One caution for whoever repeats this: a capture taken too soon after
`wm density` shows the app laid out at the old width inside the new canvas, and
reads as truncation. Re-verified at native afterwards — full width, complete
tab labels.

iOS covers 393 pt only. No iPhone SE image is installed, there is no built
`.app` to install on another simulator, and a fresh `expo run:ios` was not worth
the demo clock.

### The one place the two devices disagreed

Library's daily-reminder card rendered differently: iOS showed the toggle on
with `التذكير القادم: اليوم ٨:٠٠ م`, Android showed it off with a gold
`التذكير متوقف: يلزم السماح بالإشعارات`. **Not a layout difference** — the
Android emulator had never been granted `POST_NOTIFICATIONS`, so it was drawing
the denied branch. After
`adb shell pm grant com.ahmed.elhadarey94.khazayinapp android.permission.POST_NOTIFICATIONS`
it matches iOS. Both branches render correctly; worth granting on any device
used for the demo so the card shows the scheduled time.

## 7. Deliberate deviations from the file, left in place

* `SurahRow` has a bookmark at the physical left of frame 2207:17898, where
  the left slot is empty (its play instance has opacity 0) — a pure app
  addition (savedContent G2 entry point). Documented in the component.
* Qiraat rows carry an `الافتراضي` badge and a gold selected border; the frame
  has neither. It reflects real app state.
* The reciter header stays `القرآن حياة` on both tabs. The file disagrees with
  itself here — 2031:6193 titles it `القرآن حــياة` and 2102:3187 titles it
  `المصحف المرتل` — and a title that changes with the tab is worse UX.
* `MIN_LINE_HEIGHT_RATIO` and `MIN_BODY_SIZE` still raise six roles above the
  file's stated values. Device constraints, already recorded in
  `constants/typography.ts`.

## 8. Open

1. **Typography drift in 37 files** (§3). Largest remaining parity item.
2. **`MiniPlayerDock` is not tap-verified on iOS.** The simulator here runs
   headless — `simctl` has no touch API, and the Simulator app exposes no
   window even after a clean `shutdown`/`boot`/`open -a Simulator`. It is
   verified by type, by shared code path, and on Android by device. Two things
   to check with one manual tap before the demo: that the dock appears on a
   nested route during playback, and that it does not overlap the last list
   row — the dock adds `8 + insets.bottom`, which is 34 pt on an iPhone 16
   against roughly 16 dp on the Android emulator, so iOS is where an overlap
   would show.
3. Reference exports for Archive (2558:1334), Exclusive (2869:2306) and the
   Mushaf reader (2349:982) are black or blank, so those three frames are
   compared structurally rather than pixel-wise. Known since the 2026-09-09 audit.
