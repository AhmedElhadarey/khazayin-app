# Splash rebuild — design

**Date:** 2026-09-09 · **Branch:** `007-splash-rebuild`
**Spec:** `docs/KHAZAYIN.fig` nodes `2001:888` (background + wordmark), `2001:914` (centre
emblem), `2007:511` (exit hold). Node `2001:835` is mapped as a splash state in
`figma-mobile-screen-map.json` but its export is the Home screen; it is not a splash frame.

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
| Gradient | measured off the frame export | vertical linear, `#D8BFA1` → `#F4E7DA` @52% → `#D8BE9D` |
| Pattern | `images/e2364e38…` 1934² | tile 735 × 735 pt, repeated |
| Emblem | frame `images/1ddc58b3…` 681×945 + calligraphy `images/201c4e64…` 445×527 + tagline `images/d8d88636…` 433×58 | 131 × 181 pt, screen centre |
| Wordmark | `images/61202191…` 738×117 | 220 × 35 pt, centred, 24 pt above the bottom edge |

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
- **Wordmark colour.** The `.fig` ships the wordmark as a pale cream layer for use on navy;
  the splash paints it gold. The recolour is a per-channel linear ramp fitted against the
  frame export over 5182 opaque pixels, so the calligraphy's own shading survives instead
  of flattening to a single colour.
- **Pattern scale.** Autocorrelation is unusable here — the pattern's amplitude is ±7/255,
  below the frame's own dither. Two independent methods agree instead: the ratio of median
  strapwork band widths (reference 22 px @2x vs tile 30 px) gives a 709 pt tile, and a
  matched high-pass correlation over scale and phase peaks at 735 pt (r = 0.40, an interior
  optimum). 735 pt is used.
- **Pattern origin.** Figma's tiling origin is not the frame's top-left. The tile is rolled
  by the fitted phase so the app can tile from (0, 0) and still reproduce the frame; a
  cyclic roll of a seamless tile stays seamless.

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

Written to `assets/khazain/splash/` as lossless WebP (724 KB total, down from 2.0 MB as
PNG). Pattern ships at 1x/2x only — it is a soft 29%-opacity texture, so 2x upsamples
invisibly on a 3x screen while a 3x tile of that size costs 741 KB alone. Emblem and
wordmark ship 1x/2x/3x.

The generator is not checked in: it depends on `sharp`, which is not a project dependency
(it resolves only as a hoisted transitive install). Every measurement it applies is recorded
above, so the assets can be regenerated from `docs/KHAZAYIN.fig` without it.

## Not covered

- `resizeMode="repeat"` is unsupported on React Native Web; the pattern falls back to
  `cover` there.
- The emblem's source art tops out at 681 px, so a 3x render of a 131 pt emblem (393 px) is
  at the edge of the source. It is sharp at 2x and acceptable at 3x; nothing better exists
  in the `.fig`.
