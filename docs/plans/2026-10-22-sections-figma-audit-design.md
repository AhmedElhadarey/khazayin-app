# Sections root — fixes from the 22-10 device audit

**Date:** 2026-10-22
**Branch:** `fix/sections-figma-audit-2026-10-22` (off `origin/main` 78e0b72)
**Evidence:** `docs/22-10-audit/` — Android photos of the Figma prototype next to the app (2026-09-23).
**Spec:** `docs/KHAZAYIN.fig`, frame **2031:5675** (Sections root). The `assets/figma/KHAZAYIN.fig`
the user added on 2026-10-22 decodes to the same 24,709 nodes and 181 images, so it adds nothing yet.

The splash screen is out of scope here and has its own ticket item.

---

## What the audit found, checked against the file

Each row was verified in the node graph, not only by eye.

| # | Audit item | What the file says | Root cause in the app | Fix |
|---|---|---|---|---|
| 1–3 | Corner ornaments and background pattern missing | `Vector Smart Object` 392×549 at the top edge, and two `Shape 2 copy` motifs (96×94 at (84,−17), 37×36 at (356,36)), all `OVERLAY` | `HeaderArt` draws exactly this and is on every More screen and on Dawah, but the Sections root never mounted it | Mount `<HeaderArt />` on `app/(tabs)/sections/index.tsx`, as `more/index.tsx` does |
| 4 | Icon disc has a brown ring | `DIV-58` has a `#A88051` 1pt stroke paint, but it is **`visible: false`**. The archive card's disc (2558:1334) is the same | `ListRowCard` `chipSection` draws `borderWidth: 1, borderColor: goldAccent`. The 2026-09-11 QA read the stroke and missed the visibility flag | Remove the border. The disc is the 16% `#D7B995` fill alone |
| 5 | Cards look taller | `DIV-43` is 361×96. `CARD_DENSITY.sectionCardHeight` is already 96 | **Measured on device:** iOS is 96.0, Android is 99.4–99.8. On Android the three text lines lay out at their full raised leading (24 / 21.3 / 18.3). iOS lays them out about 1pt short (22.7 / 20 / 17). The raise comes from `MIN_LINE_HEIGHT_RATIO` in `constants/typography.ts`, which is app-wide. The audit phone is also smaller than the frame, and may run a font scale above 1 | None here. An Android-only leading change is an app-wide typography decision with a diacritic-clipping risk, so it gets its own item |
| 6 | Search icon is beige | All 24 `vuesax/bulk/search-normal` instances override both vectors to navy `#184B76`. The circle layer sits at 40% opacity | `SearchPill` tints the glyph `inkPlaceholder` | Light-mode icon colour → `KhazainColors.navy`. The generated path already carries the 0.4 on the circle |
| 7 | أنتِ ملكة mark is the wrong shape | Vector 2589:2458 carries `transform` m11 = −1, a vertical flip. The tulip head sits on top | `extract-icons.js` walks the root from identity, so it drops the root's own transform. The mark rendered upside down, as leaves pointing up | `collectPaths` honours a pure axis reflection on the root, inside its own box. Regenerate. Only `SectionQueen` changes. `LibraryProgressRing` (a 90° rotation) is left alone on purpose |
| 8 | Copy and counts differ | ٣٤ حلقة · ١٢٨ حلقة · ٤٥ تصميم · "محتوى بصري ومرئي للدعوة" · "مَلِكةٌ أنتِ لا سِواكِ" · "محتوى حصري ومميز" | `data/content/sections.ts` | Use the file's strings. Update `sectionPresentation.test.ts` |

Unchanged on purpose: the titles, including the file's `القرآن حــياة` kashida, which the existing test and app
already render as `القرآن حياة`.

## Blast radius

- `HeaderArt` on Sections: only this screen.
- Disc ring: the `section` **and** `archive` variants (More → Archive). Both files hide the stroke, so both change.
- Search icon: every light `SearchPill` (Home, Library, Sections, sub-screens, Search). All 24 instances in the file are navy, so this is a fix everywhere, not a regression.
- Queen mark: only `CrownSectionIcon`, which is used only on the Sections root.

## Plan (one commit each, test first)

1. `fix(sections): lay the header art over the Sections root`. Extend the `HeaderArt` screen list in `__tests__/figmaIcons.test.ts` with `app/(tabs)/sections/index.tsx`.
2. `fix(list-row): drop the disc ring the file hides`. Add a test that `chipSection` sets no border.
3. `fix(search): tint the search glyph navy as every instance does`. Add a test that the light icon colour is `KhazainColors.navy`.
4. `fix(icons): honour a root node's own reflection`. Add a unit test on `collectPaths` with a synthetic flipped root, plus a check that the queen mark's head is in its top half. Regenerate `figmaIcons.ts` and confirm `--check` passes.
5. `fix(sections): use the file's copy and counts`. Update the fixture test first.
6. QA: `npx tsc --noEmit`, `npx jest`, then paired captures of the Sections root on iOS and Android against frame 2031:5675.
