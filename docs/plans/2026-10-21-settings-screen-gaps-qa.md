# Settings screen gaps — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro at
`fix/settings-privacy-build-number` @ 635fc9c. Baseline: same build at 0635ea1.

| # | Check | Result |
|---|---|---|
| 1 | About (`/settings-about`) shows **رقم البناء** next to الإصدار | ✅ shows `1` (baseline: row absent) |
| 2 | Value comes from the native binary | ✅ `ExpoApplication.nativeBuildVersion === "1"`, `nativeApplicationVersion === "1.0.0"` (debugger-evaluate) |
| 3 | Privacy row with `EXPO_PUBLIC_PRIVACY_POLICY_URL` unset | ✅ Arabic alert «سياسة الخصوصية ستُضاف قريبًا.» |
| 4 | Privacy row with a temporary URL (`https://khazayin.com`, Metro env only, not committed) | ✅ opens the in-app browser (SFSafariViewController) |
| 5 | More root frame 2102:2711 vs baseline | ✅ 0% pixel mismatch |
| 6 | Settings list (`/more/settings`) | ✅ unchanged rows; only the privacy handler changed |

Open, outside this branch:
- Privacy policy URL from the client → set `EXPO_PUBLIC_PRIVACY_POLICY_URL` and rebuild (inlined at bundle time; no OTA).
- Build number on an EAS preview APK (remote-managed versionCode > 1) — manual follow-up.
- Android emulator run not performed in this pass.
