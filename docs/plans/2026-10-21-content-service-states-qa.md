# Content service states — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro at
`fix/content-service-reciter-states` @ a7beef8. Baseline: same build at 0635ea1.

## Visual — framed routes, mock adapter (no `EXPO_PUBLIC_API_BASE`)

`npm run capture:ios` on both builds, compared per pixel (threshold 16/channel,
status bar and home indicator excluded): **23 of 23 captured frames at 0.000%**
(the other 5 are transition frames the harness always skips). The data path in mock mode is unchanged.

## States — Task 7 Step 3 (QA-only stub API on 127.0.0.1:8787, not committed)

Metro was started with `EXPO_PUBLIC_API_BASE=http://127.0.0.1:8787`. G1–G3 each begin
from a fresh install (onboarding flag written by `scripts/visual-audit/skip-onboarding-ios.sh`).

| Row | Setup | Route | Result |
|---|---|---|---|
| a | mock mode, no stub | `sections/reciter/zzz` | ✅ «لم يتم العثور على هذا القارئ», no retry |
| b | G1 · `hang` | `sections/reciter/r1` | ✅ 8 shimmer ribbons under the search pill |
| c | G1 · `hang` → timeout | `sections/reciter/r1` | ✅ «انتهت مهلة الطلب. يرجى المحاولة مجدداً.» + «حاول مجدداً»; retry returns to the skeleton |
| d | G1 · `hang` | `sections/reciter` | ✅ tabs, 6 ribbons, letter rail at the physical right |
| e | G1 · `fail500` | `sections/reciter` | ✅ «حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل.» about 1 s after retry, in the list column clear of the rail |
| f | G1 · `fail500` → `data` → retry | `sections/reciter/r1` | ✅ one tap recovers both stores: 2 surahs, header «الشيخ عبد الباسط عبد الصمد» |
| g | G2 · `tabEmpty` | `sections/reciter`, tab المصحف المرتل | ✅ Tajweed tab lists 2; the other shows «لا يوجد قراء في هذا التصنيف», rail visible |
| h | G2 · `surahsEmpty` | `sections/reciter/r1` | ✅ header with the reciter's name, «لا توجد سور متاحة لهذا القارئ», no retry |
| i | G3 · `listEmpty` | `sections/reciter` | ✅ «لا يوجد قراء حالياً» on every tab checked (المجوّد, المعلّم) |
| j | G3 · `listEmpty` | `sections/reciter/r1` | ✅ «لم يتم العثور على هذا القارئ» |
| k | n/a | n/a | Not captured: the simulated mock error is not toggleable at runtime; covered by `__tests__/contentServiceErrors.test.ts` |

Gates on a7beef8: `npx jest` 78 suites, 906 passed / 1 skipped; `npx tsc --noEmit` clean.

Not run in this pass: Android emulator.
