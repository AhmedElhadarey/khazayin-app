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

```bash
npm run capture:ios      -- --out /tmp/khazayin-capture/ios
npm run capture:android  -- --out /tmp/khazayin-capture/android
```

Options: `--out`, `--scheme`, `--settle` (milliseconds to wait after navigation,
raise it if async mock content has not reached `success`), plus `--device` on
iOS and `--serial` on Android.

Each run writes `capture-summary.json` beside the PNGs, listing every captured
frame with its reference image, every skipped frame with the reason, and the
mask regions for that platform.

## What is not captured automatically

| Kind | Frames | Why |
|---|---|---|
| `skip` — transition | `2001:835`, `2001:888`, `2001:914`, `2007:511`, `2349:829` | Launch and reader transitions. Capture from a cold-start screen recording. |
| `skip` — missing-route | `2207:5270`, `2869:2088`, `2869:2306` | No app route exists yet; these flip to `deep-link` once Tasks 4.1 and 4.5 land. |
| `manual` | `2102:3187` | Segmented-tab state is in-screen interaction, not a URL. |

### Manual tap sequences

- **`2102:3187` — Reciters, Murattal tab:** open `khazayinapp:///sections/reciter`,
  wait for the list to settle, tap the second tab from the physical right
  (`المصحف المرتل`), then screenshot.
- **Splash frames `2001:835` → `2007:511`:** force-quit the app, start a screen
  recording, cold-launch, and extract the four states from the recording.
- **`2349:829` — Mushaf reader transition:** record while opening
  `khazayinapp:///sections/mushaf?surah=1` and extract the loading frame.

## Masking

Only device chrome is masked — status bar, home indicator, Android navigation
bar — expressed as a fraction of screen height in `capture-summary.json`. App
content, loading failures, RTL placement, and missing controls are never masked.
