# Splash rebuild — design

**Date:** 2026-09-09 · **Branch:** `007-splash-rebuild`
**Spec:** `docs/KHAZAYIN.fig` nodes `2001:888` (background + wordmark), `2001:914` (centre
emblem), `2007:511` (exit hold).

> **Correction (2026-09-10):** this document previously said node `2001:835` "is not a
> splash frame" because its export shows Home. Reading the node itself out of the `.fig`
> shows it *is* one — named "Splash", 393 x 852, holding the emblem, the tagline
> `تأخـذ بيـــدك إلى الجنـة` and the wordmark. The manifest is right; the rendered export
> `01-2001-835.png` is the file that is wrong.

## Why rebuild

The shipped `LaunchSequence` does not render the Figma splash. It draws an SVG octagon
badge carrying a `خر` monogram (`primitives/LogoBadge`) over a corner arabesque, with the
foundation name set in Amiri as live text. The Figma splash is a full-bleed cream frame
carrying an 8-fold star-and-cross tessellation, the navy-and-gold Khazain emblem at centre,
and the foundation wordmark as gold calligraphy at the bottom edge. Nothing but the
background colour is shared.

Two further defects:

1. **The sequence cannot signal loading.** `app/_layout.tsx` returns `null` until
   `navigatorReady`, so the overlay only mounts *after* fonts and settings have resolved.
   It then plays a fixed 1000 ms. Any "loading" motion would be theatre — it would run
   after the wait it claims to represent.
2. **The native splash cannot fit every screen.** `assets/images/splash-khazain.png` is a
   flat 393×852 composite shown with `resizeMode: cover`. On any aspect ratio other than
   the reference the bottom wordmark crops, and Android 12+ replaces the whole thing with a
   centred icon on a colour regardless.

## Layer decomposition

The Figma splash is four layers. All source art was recovered from `docs/KHAZAYIN.fig`
(a ZIP; `images/` holds the originals keyed by content hash) rather than derived from a
flattened export.

| Layer | Source | Display |
|---|---|---|
| Gradient | stated stops (2001:888 / 2007:511) | vertical linear, `#D9C0A1` → `#F8EDE1` @55.3% → `#D8BE9D` (stated; was measured `#D8BFA1`/`#F4E7DA`@52%/`#D8BE9D`). Step 4 fades to `#E5D5C1`/`#F8EDE1`/`#E5D5C1` |
| Pattern | `images/e2364e38…` 1934² | 1040 pt, first tile at (-149, -93.5), repeated on larger screens (was 735 from 0,0) |
| Emblem | frame `images/1ddc58b3…` 681×945 + calligraphy `images/201c4e64…` 445×527 + tagline `images/d8d88636…` 433×58 | 131 × 181 pt, screen centre |
| Wordmark | node 2183:4304, 72 SOLID `#7F613D` vectors | SVG path, 220 × 35.06 pt, centred, 24 pt above the bottom edge (was a fitted raster `images/61202191…`) |

Derivations that were fitted rather than read off:

- **Emblem layer offsets.** The `.fig` keeps the emblem as three layers but the only
  flattened reference is `assets/khazain/brand/emblem-khazain-ar-rahman.webp` (262×362),
  which `home/FoundationMark` also uses. Calligraphy and tagline were located inside it by
  alpha-weighted template match over scale and position (r = 0.91 and 0.89), then rescaled
  onto the 681-wide frame. The repo previously carried the frame and the calligraphy as
  loose files as well; both were byte-identical to the `.fig` images named above and have
  been deleted as unreferenced, so those hashes are the provenance now.
- **The light rim.** The flattened export carries a rim the frame layer does not. It is
  recovered as the alpha the export holds beyond the frame's own alpha, painted `#FDF9F3`
  and laid underneath.
- **Pattern scale and origin — superseded 2026-10-23 (735 was wrong).** The estimate
  above (735 pt, tiled from 0,0, rolled by a fitted phase) was fitted from a flattened
  export. The file states it: node 2001:889 (the same in all four Splash frames) is
  690 × 853 at (-149, -1), image STRETCH with paint transform m00 0.6633, m11 0.8206,
  m12 0.0890, so the image is 690/0.6633 = 1040 pt wide, 853/0.8206 = 1039.5 pt tall, with its
  top-left at x = -149, y = -1 - (0.0890/0.8206) × 853 = -93.5. The 735 tile made the
  strapwork 0.707× too small. The asset is now unrolled, 1040 px (@2x: 1400 px), and
  `launchTiming.PATTERN_ORIGIN` places it. Regenerate with `node scripts/figma/extract-splash.js`.
- **OVERLAY approximation.** The node is blend mode OVERLAY; React Native has no blend
  modes, so the blend is baked: colour overlay(G, s) at the source alpha, where G is the
  stated steps 1–3 gradient sampled at each row's frame y. Exact on the 393 × 852 frame.
- **Wordmark.** Superseded: the wordmark is the file's 72 SOLID `#7F613D` vectors
  (node 2183:4304), generated as an SVG path (`launch/generated/launchWordmark.ts`), not a
  fitted raster.

**Verification.** The four layers were recomposed into a full 393×852 frame and diffed
against the Figma export: **mean absolute difference 5.99 / 255 (2.4%)**, worst pixel 223 at
an emblem edge. This is the check that the layer model is right; it is not a claim about
what the app renders, which only an on-device capture can establish.

## Animation

The emblem grows as the loading signal, and the growth is tied to real readiness rather
than to a timer:

1. **Scale-in** — 1.0 → 1.08 over `GROW_MS`, eased.
2. **Breathe** — if the app is still not ready, loop 1.04 ↔ 1.10 so the wait reads as
   progress rather than a freeze.
3. **Settle and fade** — on ready (and never before `MIN_VISIBLE_MS`, so a fast boot does
   not blink), settle to 1.0 and cross-fade to the app.

Reduce Motion renders one static state and fades only.

## Native splash handover

Native becomes a solid `#F4E7DA` (the gradient's colour at centre, where the emblem sits)
with the composed emblem centred at `imageWidth: 131` — the same size and position the JS
overlay starts at, so the emblem does not move at handover on any screen. Pattern, gradient
and wordmark fade in around it, then it grows. This is also the only shape Android 12+
renders faithfully, since its system splash honours a centred icon on a colour and nothing
else.

`SplashScreen.hideAsync()` moves onto the overlay's emblem `onLoad`, so the native layer is
held until the JS emblem has actually decoded. `onError` and a hard cap both also hide, or a
decode failure would leave the app stuck behind the native splash forever. The existing
`navigatorReady` hide stays as well — a double hide is idempotent, and it covers the path
where the overlay never mounts.

## Constraints kept

- `navigatorReady` still gates the root `<Stack>`; the overlay renders beside it, not
  inside it, so it can mount on the first JS frame. The design §6.1 invariant — Home never
  appears before fonts *and* settings resolve — is unchanged.
- `shouldRunLaunchSequence()` still makes this a cold-start-only experience.
- The overlay is raster-only. It names no font family, so it is safe to render before
  `useFonts` resolves.
- `LogoBadge` and `Wordmark` are **not** touched: About and Archive still use them.
- No new dependency. `expo-splash-screen` is already wired as a config plugin;
  `react-native-splash-screen` is unmaintained and bare-RN, and `react-native-bootsplash`
  would replace working infrastructure without supplying the readiness-driven animation,
  which is ours either way.

## Assets

Written to `assets/khazain/splash/`. Emblem ships 1x/2x/3x as lossless WebP. The pattern
(updated 2026-10-23) ships 1x/2x as near-lossless WebP at quality 60 (within 2 levels of
lossless): 1040 px and 1400 px (about 1.35 px/pt at @2x). The wordmark raster is gone; it is
an SVG path.

Why 1400 px and not the 1934 px source: a 1934 px RGBA bitmap decodes to about 15 MB, against
7.8 MB at 1400 px, and low-end Android (Realme Note 50 class) pays that decode on the launch
path. The texture is low-contrast (about 29% alpha, +-7/255 amplitude), so the upsample is
not visible.

The OVERLAY bake is exact for steps 1-3 at 852 pt height and within about 5/255 elsewhere,
where the gradient stretches differently.

The generator is checked in at `scripts/figma/extract-splash.js`. `sharp` is a
devDependency. `--check` verifies the generated wordmark module, and a jest test runs it.

## Not covered

- `resizeMode="repeat"` is unsupported on React Native Web; the pattern falls back to
  `cover` there.
- The emblem's source art tops out at 681 px, so a 3x render of a 131 pt emblem (393 px) is
  at the edge of the source. It is sharp at 2x and acceptable at 3x; nothing better exists
  in the `.fig`.
