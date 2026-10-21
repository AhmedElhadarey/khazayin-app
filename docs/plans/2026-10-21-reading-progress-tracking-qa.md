# Reading & listening progress tracking — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro at
`feat/progress-page-tracking` @ cc26497 (plus 07a9f90, the credit-copy fix below), fresh install.
Baseline: same build at 0635ea1.

## Visual — framed routes (V1, V5)

`npm run capture:ios` on both builds, compared per pixel (threshold 16/channel,
status bar and home indicator excluded): **23 of 23 captured frames at 0.000%**.
These include Library frame 06 (first viewport unchanged; the new row is below the fold) and Mushaf
frame 14. The reader (`/sections/mushaf?surah=2`) keeps its header, the meta line «مدنية • ٥ آية • صفحة ٢ من ٦٠٤»
and the footer. The body is now one text block per page, and the al-Baqarah 1–5 mock is a single segment.

## New UI (no Figma frame — governed by `constants/layout.ts`, `typography.ts`, `rtlContracts.ts`)

| # | Check | Result |
|---|---|---|
| V2 | Library, scrolled to the bottom: new stats row under التذكيرات الذكية | ✅ physical left→right محاضرات مسموعة / الأجزاء المكتملة / صفحات مقروءة; zero states «لم تستمع بعد» / «٠ من ٣٠» / «لم تبدأ بعد»; «محاضرات مكتملة» gone. Note: «محاضرات مسموعة» wraps to two lines in its 115 pt card, which is still the same height as its neighbours |
| V7 | About: مصادر البيانات card | ✅ after fix 07a9f90. The first render showed the credit's parentheses reordered around the Latin text («Quran) Tanzil.net»). The credit now has no brackets («…بيانات Tanzil.net، إصدار Quran Metadata 1.0 لعامي ٢٠٠٨–٢٠٠٩») and reads in order. A test pins the no-brackets rule |
| V7 | Tap «الرخصة: CC BY 3.0» | ✅ opens creativecommons.org/licenses/by/3.0 (Attribution 3.0 Unported) |

## Functional

| Step | Check | Result |
|---|---|---|
| 3 | Open البقرة, stay 10 s on the page | ✅ صفحات مقروءة «صفحة واحدة»; wird ring 10 %; «آخر قراءة: اليوم — سورة البقرة — صفحة ٢»; streak «يوم واحد متتالي» |
| 9 | Restart the app | ✅ all values kept |
| 10 | إعدادات التقدّم → إعادة تعيين التقدّم → تأكيد المسح | ✅ ring 0 %, «لم تبدأ بعد», wird card back to «سورة الفاتحة — صفحة ١» |
| 2, 4–6 | Fling records nothing; blur and background pause the timer; same-day re-read moves the wird card | Covered deterministically by `mushafPageTracking` / dwell-tracker / progressStore tests; not repeated by hand (the mock text has a single readable page) |
| 7–8 | Juz completion toast and lectures listened | Not run on device: they need the seeding SQL / 60 s+ of playback. Covered by the juz-range, `listenedCount` and shim tests |

Gates on 07a9f90: `npx jest` 81 suites, 898 passed / 1 skipped; `npx tsc --noEmit` clean.

## Release note (for the changelog / tester notes)

"Quran reading is now counted page by page as you read, instead of one page per surah
opened. Days recorded by earlier builds are kept as they are: each surah opened back then
counted one page — its first — whether or not it was read. Those entries still count
towards streaks, the 28-day trend and 'pages read'. Use المزيد → إعدادات التقدّم →
إعادة تعيين التقدّم to start clean."

Demo-visible change (design §7): with mock content only page 2 is readable, so the wird ring
reaches at most 10 % a day against the default 10-page goal.

Not run in this pass: Android emulator; largest Dynamic Type size (V4).
