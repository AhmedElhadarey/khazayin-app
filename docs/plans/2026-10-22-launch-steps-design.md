# Launch — play the Figma splash steps, with no white or wrong frame

**Date:** 2026-10-22
**Branch:** `fix/app-icon-splash-2026-10-22` (off `origin/main` 78e0b72)
**Ticket:** "App Icon & Splash Screen" — https://trello.com/c/gy2M4Qqf
**User brief:** "check the figma design, follow the steps exactly, no white or fake image on start on android or ios".
**Spec:** `docs/KHAZAYIN.fig`, section **Splash** (2132:2371) on the Mobile page — frames 2001:888, 2001:914,
2001:835 and 2007:511, and the prototype links between them.
**Supersedes:** the animation and native-handover parts of `2026-09-09-splash-rebuild-design.md`. Its layer
decomposition and assets (gradient, pattern, emblem, wordmark) still stand and are reused unchanged.

**Status:** v2, after the architect review returned APPROVE WITH CHANGES. All ten required changes are in.
§5 lists each one and where it landed.

## User decisions (2026-10-22)

- **Timing: exact.** Use the prototype's durations: about 7.8 s on every cold start.
- **Icon: keep the current one** (navy ground, full emblem badge). Verify it, and fix only what fails.
- **Native projects: regenerate.** Run `expo prebuild --clean` for both platforms.

---

## 1. What the file says

Each frame links to the next with `AFTER_TIMEOUT` and `SMART_ANIMATE`. Easing is `OUT_CUBIC`, which the file
stores as `easingFunction: [0, 0, 0.5799999833, 1]` (float32 for 0.58). The last frame moves to Home (2001:940) with `MOVE_FROM_BOTTOM`.

| Step | Frame | Emblem (`Artboard 1 2`) | Hold | Then |
|---|---|---|---|---|
| 1 | 2001:888 | 130.7 × 181 at (130.7, −200): **above the top edge** | 0.8 s | smart-animate 2 s |
| 2 | 2001:914 | 130.7 × 181 at (131, 335): **centred** | 0.8 s | smart-animate 2 s |
| 3 | 2001:835 | 201.4 × 279 at (96, 286): **centred, ×1.541** | 0.3 s | smart-animate 0.8 s |
| 4 | 2007:511 | 70.6 × 97.7 at (161.4, −133.4): **×0.540, above the top edge** | 0.3 s | Home `MOVE_FROM_BOTTOM` 0.8 s |

Every frame has the same gradient, pattern (`OVERLAY`) and wordmark (220 × 35.1 at y 793, so 24 above the
bottom edge). Only the emblem moves. Steps 1 and 4 show **no emblem at all**. The rendered export of 2001:835
shows Home, which is the known bad export. The node graph is the authority for that step.

**Adapting the 852 pt frame to any screen height H.** "Centred" stays centred. The two off-screen poses keep
the file's distance from the top edge, so the emblem is just out of view on every phone:

- step 1: the emblem's bottom edge is 19 above the top, so `translateY = −(H/2 + 90.5 + 19)`. At 852 that is −535.5, as the file has it.
- step 4: the emblem's centre is 84.5 above the top, so `translateY = −(H/2 + 84.5)`. At 852 that is −510.5.

## 2. Why the launch is wrong today

1. **The "fake image" on Android is a stale native drawable.** `android/` (gitignored) still carries an old
   full-screen composite as `splashscreen_logo.png`. Android 12+ crops it into the icon area, which is the
   rounded pattern tile in the 22-10 audit photo. `app.json` moved on to `splash-emblem.png`, but prebuild never
   re-ran on this machine.
2. **The motion is not the file's.** `LaunchSequence` grows and breathes the emblem in the centre. The file
   drops it in, grows it, sends it out the top, then slides Home up.
3. **The native splash and step 1 disagree.** Native draws an emblem, but step 1 has none. iOS draws it at
   95 × 131 (aspect-fit into a 131 square), not 131 × 181.
4. **A white frame is possible.** `app.json` sets no root `backgroundColor`, so the root view is white
   wherever nothing is painted yet.

## 3. Design

### 3.1 Native splash = step 1 without its art

Both platforms show `#F4E7DA` and **nothing else**. Step 1 has no emblem, and Android 12+ can only draw one
centred icon on a solid colour, never the gradient, pattern or wordmark. So the only native frame that is
truthful on both platforms is the bare ground.

- `expo-splash-screen` gets a **fully transparent** image. On Android the plugin paints it onto a square filled
  with the splash colour, so it is invisible only because every ground colour is the same constant (R1).
- Below Android 12, the existing `withSplashWindowBackground` plugin already paints the same colour.
- Add a root `backgroundColor: "#F4E7DA"`. `expo-system-ui` is already a dependency and applies it to the
  root view, so no frame between native and JS can be white.

The JS overlay's first frame is the same flat colour. The gradient, pattern and wordmark fade up over it in
260 ms, inside step 1's 800 ms hold. The native layer is released once the pattern has decoded (cap 1.5 s),
so the two never trade places through a blank frame.

### 3.2 The timeline (pure, `launchTiming.ts`)

Times are from `t0`, when the overlay becomes visible. `ease` is `Easing.bezier(0, 0, 0.58, 1)`, the file's own
curve.

| t (ms) | What happens |
|---|---|
| 0 – 800 | step 1 hold. The backdrop fades up 0 → 1 over the first 260 |
| 800 – 2800 | emblem 1 → 2: `translateY` from off-top to 0 |
| 2800 – 3600 | step 2 hold |
| 3600 – 5600 | emblem 2 → 3: scale 1 → 1.541 |
| 5600 – 5900 | step 3 hold |
| 5900 – 6700 | emblem 3 → 4: scale 1.541 → 0.540 and `translateY` 0 → off-top, together |
| 6700 – 7000 | step 4 hold |
| 7000 – 7800 | Home slides in from the bottom (`translateY` H → 0), over the still splash |

**Readiness.** Home's slide starts at `max(7000, readyAt)`. While the app is not ready, the screen holds
step 4: the bare ground and wordmark. A boot that never reports ready is released at a hard cap of 15 s, as
the old 6 s cap released it. The old cap was below the new natural length, so it moves.

**Reduce Motion.** No travel and no scaling. The emblem is shown centred (step 2) from `t0`, and Home
cross-fades in over 320 ms at `max(900, readyAt)`.

### 3.3 Home slides up over the splash

`MOVE_FROM_BOTTOM` moves Home, not the splash. So the root draws the overlay **under** the navigator, and the
navigator sits in an `Animated.View` whose `translateY` starts at H while a launch is running and animates to
0 on exit. Under Reduce Motion it uses `opacity` 0 → 1 instead. After `onDone` the overlay unmounts, and the
wrapper is left at identity, so nothing about later navigation changes. When there is no launch (a warm
start, or a Fast Refresh), the wrapper starts at identity.

The invariant from the 2026-09-09 design stays: Home never renders before fonts and settings resolve,
because `navigatorReady` still gates the `<Stack>`.

### 3.4 App icon: verify only

- **iOS:** `icon-khazain.png` is 1024² with no alpha, as App Store icons must be. Expo generates every size
  from it.
- **Android adaptive icon:** the foreground's opaque pixels all sit inside the 66 dp safe circle. The
  farthest pixel is at 33.0 dp from the centre, and 0 of 246,201 opaque pixels fall outside it. The background
  is navy `#0F3C61`.
- **Small sizes:** to be checked on device at the launcher and in Settings.

## 5. v2: changes from the architect review

| # | Review finding | What the design now does |
|---|---|---|
| R1 | On Android, the plugin paints the "transparent" splash image onto a 288 dp square filled with the splash colour. It is only invisible if that colour matches the window colour exactly. §3.1's claim of a launcher-icon fallback was wrong for this plugin | One constant, `SPLASH_GROUND = '#F4E7DA'`, is used for the splash `backgroundColor`, the root `backgroundColor` and `withSplashWindowBackground`. A test fails if any of them drifts. No `iconBackgroundColor` is set (it would draw a visible circle) |
| R2 | iOS caches the launch snapshot, and Android 12+ launchers cache the splash icon | QA starts from a **clean install** (uninstall, then install) on both platforms before judging any frame |
| R3 | `expo-system-ui` must actually emit its colours | Checked after prebuild: `RCTRootViewBackgroundColor` in Info.plist, and `android:windowBackground` on AppTheme |
| R4 | `navigatorReady` comes true before the onboarding decision | The reveal waits for `navigatorReady && hydrated && reconciled`. On a first run it is **onboarding** that slides up, not Home |
| R5 | iOS presents modal routes outside the moving wrapper, so a deep link would pop a modal over the splash | A cold start opened by a deep link plays the **brief** path: a static centred emblem, then a fade at `max(900 ms, ready)`. A reminder tap opens no URL, so it plays the full sequence. Accepted |
| R6 | The native `SafeAreaView` works out its insets from where it sits on screen. Shifted down by H, it would jump when it lands | Home and onboarding (the two possible first screens) pad with `useSafeAreaInsets()`, whose provider sits above the wrapper |
| R7 | A moving Home must not take taps, and must not be read out while off screen | The wrapper has `pointerEvents="none"` and is hidden from accessibility until `onDone` |
| R8 | JS timers drift while the JS thread hydrates SQLite and mounts Home | Steps 1–4 are one Reanimated `withDelay`/`withSequence` on the UI thread, started when the overlay becomes visible. Only the start of the reveal waits on JS readiness, and it is then scheduled with `withDelay` too |
| R9 | Reanimated's default `ReduceMotion.System` turns the fades into hard cuts | The backdrop fade and the reveal fade pass `ReduceMotion.Never`. In the reduced and brief paths, the emblem fades in rather than appearing in one frame |
| R10 | The 15 s cap must not unmount the overlay onto an empty root | The cap only stops waiting for the onboarding decision. The reveal never starts before the `<Stack>` is mounted, and until then the overlay stays up |

**Found during implementation.** After `prebuild --clean`, the Android < 12 guard from
`withSplashWindowBackground` (`android:windowBackground` on `Theme.App.SplashScreen`) was missing.
`expo-splash-screen` rebuilds that style from scratch. A plugin listed earlier wraps its mod later, so ours
has to be listed **before** `expo-splash-screen`. The old `android/` only carried the guard as a hand edit.
`__tests__/splashConfig.test.ts` now pins the order.

**Found in device QA.** The pattern stopped 735 pt down on both platforms, leaving a bare band behind the
wordmark. React Native's `resizeMode="repeat"` drew the seamless 735 pt tile only once, while the frames carry
the pattern to every edge. The overlay now lays the tiles out itself (`patternTiles`). The 2026-09-09
implementation had the same band.

Also recorded: an Android restart after the system killed the app is a cold start, so it plays the full 7.8 s.
That is what the user chose ("every cold start").

## 4. Out of scope

- An Android 13 themed (monochrome) icon. The ticket does not ask for one.
- Changing the gradient or pattern. Their measured fit to the file is recorded in the 2026-09-09 doc.
- A tap-to-skip control. The user chose the exact timing.
