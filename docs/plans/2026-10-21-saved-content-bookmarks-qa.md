# Saved content & bookmarks — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro
(`EXPO_PUBLIC_VISUAL_AUDIT=1`) at `fix/saved-lecture-bookmarks` @ 3f09b1e.
Baseline: same build at 0635ea1, captured before any change, with an empty library.

## Visual — 28 framed routes, unsaved state

`npm run capture:ios` on both builds, compared per pixel (threshold 16/channel,
status bar and home indicator excluded).

| Frames | Result |
|---|---|
| 01–05, 07–28 | ✅ 0.000% mismatch |
| 06 Library `2031:4659` | ✅ 0.324% — rows 743–1298 only: the empty state gains the one-line hint «لحفظ محاضرة، اضغط عليها مطوّلاً.» and the content below shifts by that line (design §8, Q5) |

Frame 14 (Mushaf) first showed 20% because the Mushaf auto-resume (FR-009) had
opened Al-Baqarah after earlier reading on the device. After «إعادة تعيين التقدّم»
it recaptured at 0.000%. This is a device-state artifact, not a regression from this branch.

## Functional

| # | Check | Result |
|---|---|---|
| 1 | Long-press a lecture row (`/sections/audiobooks`, الرحيق المختوم) | ✅ toast «تمت الإضافة إلى المحفوظات» + «تراجع»; bookmark appears between duration and title; row a11y value «محفوظة», label adds «إزالة من المحفوظات» |
| 2 | Save → «تراجع» within 3 s | ✅ row returns to unsaved |
| 3 | Long-press a saved row → «تراجع» within 5 s | ✅ toast «تم الحذف من المحفوظات»; undo restores the entry |
| 4 | Undo tapped after the 3 s save toast ends | ✅ no effect (the toast is gone; by design §7) |
| 5 | Save two lectures, restart the app | ✅ both persist |
| 6 | Library after restart | ✅ «محاضرات (2)», newest save first; chips «الكل ٢» / «المحفوظات ٢» |
| 7 | Remove both from Library | ✅ undo toast each time; empty state with the new hint returns (teardown) |

Gates on 3f09b1e: `npx jest` 77 suites, 872 passed / 1 skipped; `npx tsc --noEmit` clean.

Not run in this pass: Android emulator; VoiceOver custom action «حفظ في المكتبة»
(covered by `saveGestureProps` unit tests only).
