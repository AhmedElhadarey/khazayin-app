# Visual audit capture harness

Repeatable route captures for the Figma parity gates in
`docs/plans/2026-09-09-figma-style-remediation-implementation-plan.md`.

Both harnesses read the frozen frame manifest at
`docs/visual-regression/figma-mobile-screen-map.json` so the capture set can
never drift from the 28-frame contract.

## Safety rules

- **Never clears app data.** Neither script runs `simctl erase` or `pm clear`;
  the audited screens depend on persisted notes, progress, and settings.
- **Never writes into `docs/audit/2026-09-09`.** That directory is the immutable
  audited baseline. Captures go to `/tmp/khazayin-capture/...` by default, or to
  whatever `--out` you pass. Nothing is committed.
- **Exits non-zero** when no simulator/emulator is available, when a screenshot
  is missing, or when a run captured nothing.

## Prerequisites

Build and install the app on the target first — the harness only opens deep
links and screenshots what is already running:

```bash
npx expo run:ios --device 'iPhone 16'
npx expo run:android --device Pixel_7_API_36
```

`adb` is resolved from `PATH`, then `ANDROID_HOME` / `ANDROID_SDK_ROOT`, then
the default SDK location. Set `ANDROID_HOME` yourself if your SDK lives
elsewhere; no machine-specific path is committed.

## First run on a clean simulator

A fresh install lands on the onboarding gate, and `simctl` cannot tap through
it. Either complete onboarding by hand once, or run the simulator-only helper:

```bash
bash scripts/visual-audit/skip-onboarding-ios.sh
```

It writes the onboarding flag into the booted simulator's app container. It is
never called by a capture run — see the warning at the top of the script.

Content also comes from a 24-hour SWR cache, so after changing mock fixtures a
capture may still show the previous copy. Reinstall the app on the simulator
(`xcrun simctl uninstall`, then install the built `.app`) to force a refetch.

## Running

Start Metro in visual-audit mode so development-only LogBox toast overlays do
not cover the bottom navigation. This opt-in flag has no effect in production
or during an ordinary `npm start` session.

```bash
EXPO_PUBLIC_VISUAL_AUDIT=1 npm start
```

Then capture each device:

```bash
npm run capture:ios      -- --out /tmp/khazayin-capture/ios
npm run capture:android  -- --out /tmp/khazayin-capture/android
```

Options: `--out`, `--scheme`, `--node` (capture one manifest node), and
`--settle` (iOS fixed delay; Android maximum time to wait for the route-specific
visible marker), plus `--device`/`--bundle-id` on iOS and
`--serial`/`--package`/`--metro-port` on Android.

Each run writes `capture-summary.json` beside the PNGs, listing every captured
frame with its reference image, every skipped frame with the reason, and the
mask regions for that platform.

### Metro must be reachable, especially on Android

**A debug build that cannot reach Metro may not fail at deep-link launch.** It
can leave an unable-to-load view, the previous route, or cached code on screen
long enough for an unguarded screenshot command to succeed. That is not
hypothetical: an early Pixel 7 run in this track produced black, stale and
mislabeled captures that initially looked plausible in the contact sheet.

`capture-android.mjs` now runs `adb reverse tcp:8081 tcp:8081`, probes `/status`
from the device, cold-starts each deep link, and waits for route-specific text
before taking the screenshot. If the image has no `curl`, it verifies Metro on
the host after establishing the reverse tunnel; an unreachable Metro fails the
run either way. The iOS harness also cold-starts each route so scroll and
navigation state cannot leak between frames; the simulator shares the host's
loopback. Its default delay is eight seconds because it must cover a cold Metro
bundle load and the launch sequence before each still.

## Comparing and measuring

```bash
npm run compare:figma -- --ios <dir> --android <dir> --out <dir>
npm run measure:figma -- --app <dir> --label 'iPhone 16'
npm run measure:figma -- --app <dir> --label 'Pixel 7' --device-width-pt 412
```

`compare` writes `side-by-side/` (reference | iPhone | Pixel at one scale),
`overlay/` (reference over the iPhone capture at 50%), and one stacked
`contact-sheet.png`.

`measure` reports the deviation design section 8 asks about. Two things about
it are worth knowing before reading its numbers:

- **It refuses to guess.** Both images are reduced to a row profile — mean
  luminance per row — and aligned by cross-correlation. Where the export's
  content differs from the app's (a frame that repeats one placeholder row,
  the two that export blank, the dark reader) the correlation peak is noise, so
  any frame under `MIN_CORRELATION` reports `n/c`, not a failure. An early
  version of this tool lacked that gate and confidently reported a 65 pt drift
  on a frame with nothing to compare.
- **It only applies at the reference width.** Pass `--device-width-pt` for the
  capture device. At anything other than 393 pt the tool reports no number at
  all: the app is responsive, so a 412 dp Pixel *should* differ from a 393 pt
  frame, and scaling the capture onto the reference rect turns that into a
  uniform ~11 pt "offset" that is pure artefact. Android parity is verified
  from the side-by-side composition instead.

## What is not captured automatically

| Kind | Frames | Why |
|---|---|---|
| `skip` — transition | `2001:835`, `2001:888`, `2001:914`, `2007:511`, `2349:829` | Launch and reader transitions. Capture from a cold-start screen recording. |

### Manual tap sequences

- **Splash frames `2001:835` → `2007:511`:** force-quit the app, start a screen
  recording, cold-launch, and extract the four states from the recording.
- **`2349:829` — Mushaf reader transition:** record while opening
  `khazayinapp:///sections/mushaf?surah=2` and extract the loading frame.

## Masking

Only device chrome is masked — status bar, home indicator, Android navigation
bar — expressed as a fraction of screen height in `capture-summary.json`. App
content, loading failures, RTL placement, and missing controls are never masked.
