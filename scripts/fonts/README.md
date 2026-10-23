# Static Noto Sans Arabic faces

`assets/fonts/NotoSansArabic-{Regular,SemiBold,Bold}.ttf` are static instances
cut from the variable font `assets/fonts/NotoSansArabic-VF.ttf` (Noto Sans
Arabic 2.012, 1,711 glyphs, axes `wght` 100-900 and `wdth` 62.5-100).

## Why static

- iOS: expo-font registers one face per family, so Fabric always picks that
  face and ignores `fontWeight`. A variable font therefore always rendered at
  wght 400, and there is no synthetic bold.
- Android: expo-font registers an alias only in the NORMAL typeface slot. With
  `fontWeight: '700'` the BOLD slot is empty, so Android falls back to the
  system bold (Noto Naskh for Arabic), a different typeface than regular text.

So each weight is its own family, and the weight lives in the face. Never pair
a registered custom family with a bold `fontWeight`; use `fontFace()` from
`constants/typography.ts`.

Each file has a unique PostScript name. expo-font on iOS silently ignores a
font whose PostScript name duplicates one already registered.

## Reproduce

fontTools 4.67.0 (run through `uvx --from fonttools`):

```
gen() { uvx --from fonttools fonttools varLib.instancer \
  assets/fonts/NotoSansArabic-VF.ttf wght=$1 wdth=100 --static \
  --update-name-table -o assets/fonts/NotoSansArabic-$2.ttf; }
gen 400 Regular
gen 600 SemiBold
gen 700 Bold
```

## Outputs

| File | PostScript name | usWeightClass | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| NotoSansArabic-Regular.ttf | NotoSansArabic-Regular | 400 | 194336 | `591d069703dc653417b1a302f1622380fd3173ecb0e592de44bd5f01ad6ebfdd` |
| NotoSansArabic-SemiBold.ttf | NotoSansArabic-SemiBold | 600 | 194656 | `d8ffdfa088879c5acdcc5ef4762473e6fc6d9513ffcaf697d0314deb09e361c0` |
| NotoSansArabic-Bold.ttf | NotoSansArabic-Bold | 700 | 194520 | `e974390b0ff9cab2e56a4f1aa694010dbd1bc1288bb6ee570714c864bb45f58f` |

## Licence

Noto Sans Arabic is licensed under the SIL Open Font License 1.1, Copyright
2022 The Noto Project Authors (https://github.com/notofonts/arabic). The
licence text is `assets/fonts/OFL.txt`. Noto declares no Reserved Font Name, so
the instanced files may keep the Noto name.
