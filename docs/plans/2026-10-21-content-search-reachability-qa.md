# Content search reachability — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro
(`EXPO_PUBLIC_VISUAL_AUDIT=1`, mock adapter). Fresh install.
Branch: `fix/search-route-and-navigation`. Rows 1–12 were captured at b8775ea and
the interactive rows were run on bc9c774. bc9c774 changes only `app/content-search.tsx`,
which has no Figma frame. Baseline: same build at 0635ea1.

## Blocker found and fixed during QA

**Back button under the status bar.** With `presentation: 'fullScreenModal'`, the
native `SafeAreaView` on `/content-search` received a 0 top inset. As a result:
- `InlineHeader` («بحث» + back) drew under the status bar and Dynamic Island;
- its back button could not be tapped;
- a full-screen modal cannot be swiped away;

so on iOS the only way out of search was to pick a result.

**Fix, bc9c774:** the screen root pads itself by `useSafeAreaInsets()` top and bottom. It is pinned by
`__tests__/contentSearchSafeArea.test.tsx`, which also pins the `fullScreenModal`
registration. Re-checked on device: the header sits below the status bar and back
dismisses search.

## Visual — framed routes (rows 1–12)

`npm run capture:ios` on both builds, compared per pixel (threshold 16/channel,
status bar and home indicator excluded): **23 of 23 captured frames at 0.000%**.
The 5 transition frames are always skipped.

## Interactive rows

| # | Check | Result |
|---|---|---|
| 1 | Home pill → search; double tap on the pill | ✅ opens `/content-search` full-screen; a double tap mounts one search screen (component tree shows a single `InlineHeader`) |
| 8 | `البقره` → سورة البقرة | ✅ reader on البقرة, «مدنية • ٥ آية • صفحة ٢ من ٦٠٤» |
| 13 | Empty query, without and with recents | ✅ keyboard up, first suggestion chip «العقيدة» at the physical right; recents newest first, «مسح» at the physical left and «البحث الأخير» at the right |
| 14 | `ابن باز`, `البقره`, `العقيدة`, `عثيمين`, `التوحيد` | ✅ groups in the order سور / علماء / كتب / محاضرات, with counts; normalised match for «البقره» |
| 15 | Loading skeleton | Not run on device: the mock corpus loads synchronously. Covered by the `searchBodyState` / `isCorpusLoading` tests |
| 16 | `zzzz` | ✅ «لا توجد نتائج لـ "Zzzz"» + hint; chips start at the physical right; a chip tap runs that search; «الأقسام» → Sections root. Note: with the keyboard up the «الأقسام» button sits behind it (reachable after Return) |
| 17 | Book with a sharh (`التوحيد` → شرح كتاب التوحيد) | ✅ cover centred, title + «الشيخ ابن عثيمين» centred, «استمع إلى الشرح», no tab bar. The mock sharh has no audio, so the button shows «لا يتوفر تسجيل صوتي لهذه المادة» instead of playing (only scholar lectures carry archive audio in mock data) |
| 18 | Book without a sharh (`العقيدة` → إضاءات في العقيدة) | ✅ «لا يتوفر شرح صوتي لهذا الكتاب بعد», no button |
| 19 | Dynamic Type XXXL on rows 13 and 17 | ✅ no clipped Arabic and no horizontal overflow. Minor: on the detail cover, the larger title runs close to the bookmark icon |
| 20 | Back from a destination (surah opened from Home, book and scholar opened from Library and Sections) | ✅ back → **Sections root** each time; no duplicate screen. The `withAnchor` fallback was not needed |
| 21 | Taps with the keyboard up | ✅ one tap on a result navigates, one tap on a chip searches |
| 22 | Lecture without audio from search | ✅ search closes and the alert «لا يتوفر تسجيل صوتي لهذه المادة» shows over the screen beneath |

Gates on bc9c774: `npx jest` 87 suites, 954 passed / 1 skipped; `npx tsc --noEmit` clean.

Not run in this pass: Android emulator (★ rows); VoiceOver pass on book detail.
Follow-up (minor): the «الأقسام» button and the result rows are announced as groups, not buttons.
