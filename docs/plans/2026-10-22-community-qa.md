# Community & social features — QA record

**Date:** 2026-10-22
**Branch:** `feat/community-2026-10-22`
**SHA:** `b244ea19da16c3e0fedee7e08411ee85fe901a20` at the start and at the end of the first pass (no commits during QA)
**Final HEAD (last code commit):** `c21ff98` (see "Final checks" for which SHA each check ran on)
**Design:** `docs/plans/2026-10-22-community-design.md`. Cases: design §11.4.
**Captures:** `docs/audit/2026-10-22-community/` (untracked; `docs/audit/` is in `.gitignore`).

Spec authority: no frame in `docs/KHAZAYIN.fig` covers the community screens, so nothing below
claims "matches Figma". Layout was checked against the design's own rules (§6, §7, §8, §10) and the
`constants/*` contracts (`RTL_TEXT`, `PHYSICAL_ROW`/`PHYSICAL_BOX`, frozen copy in
`constants/communityCopy.ts`).

Everything runs on the `__DEV__` mock adapter (`services/community/mockAdapter.ts`, `mockDelay` 300).
The content mock has ayat only for surah 002, a single Mushaf page (page 2), which bounds case 4.

## Devices

| Device | Build | Orientation | Notes |
|---|---|---|---|
| iPhone 16 sim, iOS 26.5 (393pt) | dev client | portrait | full pass, cases 2–7, 10, 11 |
| Realme Note 50-class AVD, API 36 (360×800dp) | dev client | portrait | font scale 1.0 and 1.3 (cold restart), reset to 1.0 after |
| iPad Pro 13-inch (M5) sim (1032×1376pt) | dev client | portrait, landscape | |
| Pixel Tablet AVD, API 36 (800×1280dp) | dev client | portrait, landscape | left in portrait (`user_rotation 1`) |

## Cases (design §11.4)

| # | Case | iPhone | Realme 360dp | iPad | Pixel Tablet | Capture |
|---|---|---|---|---|---|---|
| 1 | Release build: community absent | ✓ (iPhone 17, Release) | ✓ (Pixel 7 AVD, release APK) | — | — | Run after the first pass, at `07b483e`: see "Release builds" |
| 2 | First open: More row, intro, guidelines, opt-in, empty hub | ✓ | ✓ | ✓ | ✓ | `ios-02-more-row`, `ios-02-intro`, `ios-02-guidelines`, `ios-02-hub-empty`, `realme-02-*`, `ipad-02-*`, `pixeltab-02-*` |
| 3 | Join `KHZ7Q2` (totals hidden + «…بعد مشاركة مزيد من الأعضاء…»), `NUR4M8` (rounded «نحو ٢٠٠ صفحة»), wrong code, Arabic-Indic digits, pasted `NUR-4M8` | ✓ | ✓ (F6) | ✓ | — | `ios-03-*`, `realme-03-*`, `ipad-03-*` |
| 4 | Create group + khatm; Mushaf +3 pages; push on background; share toggle; «مشاركة الرمز» | ✓ with F2 | — | — | — | `ios-04-created-group`, `ios-04-share-code-sheet`, `ios-04-own-progress-plus3`, `ios-04-nur4m8-stale-total-after-push` |
| 5 | Posts: link / phone / block-term refusals inline, review phrase → «قيد المراجعة», 1000 counter, cooldown copy | ✓ | ✓ | — | — | `ios-05-*`, `realme-05-*` |
| 6 | Quran fixture phrase («…كَمَثَلِ الْكَلْبِ…») posts as visible | ✓ | — | — | — | `ios-06-quran-fixture-visible` |
| 7 | Report sheet (6 reasons, «سبب آخر» note field), submit hides post + toast; mute; unmute from Settings › المجتمع | ✓ with F4 | sheet only (F4) | — | — | `ios-07-*`, `realme-08-report-*` |
| 8 | 360dp at 1.3×: hub, group detail, join, create, thread, report sheet; one pass at 1.0 | — | ✗ F6, F7, F8 | — | — | `realme-08-*`, `realme-03-join-khz7q2-toggle-truncated` |
| 9 | Tablets: reading column centred; scholar landscape split shows discussions entry in side panel, portrait in list | — | — | ✓ portrait + landscape | ✓ portrait + landscape (F8) | `ipad-09-*`, `pixeltab-09-*` |
| 10 | Delete my data with `simulateError`: pending row with next attempt + error, retry, clear error → completes, clean intro | ✓ | — | — | — | `ios-10-delete-confirm`, `ios-10-deletion-pending-error`, `ios-10-deletion-complete-settings`, `ios-10-hub-clean-intro` |
| 11 | Accessibility labels via `describe` | ✓ with F1 | ✓ with F1 | spot-checked | spot-checked | — |

"—" means not repeated on that device. The behaviour is platform-independent JS and was run on the
iPhone, or the case names specific devices. Case 3 ran on the iPhone, Realme and one tablet (iPad), as
§11.4 asks.

Checked on every community screen visited:
- **RTL:** text right-aligned. Post rows read avatar → name/time/body from the physical right, with actions at the physical left. Member rows and list rows put the icon at the right and the chevron at the left. The share toggle row is ordered toggle · text · icon chip, left to right.
- **Long-press:** a long-press on a post row does nothing, on the iPhone and on the Realme.
- **Tab bar and MiniPlayer:** nested community routes drop the tab bar like other nested routes, and the MiniPlayer dock behaves as it does app-wide.

### Case details

- **2.** More row reads «المجتمع، مجموعات القراءة · الختمات · نقاشات الدروس». The guidelines screen lists 9 items. «الانضمام إلى المجتمع» stays disabled until there is a name and the checkbox is ticked. The checkbox exposes a checked state on both platforms.
- **3.**
  - `ABC123` gives «رمز غير صحيح أو منتهٍ».
  - The code field normalises input on every device: lower case `khz7q2` → `KHZ7Q2`; «KHZ٧Q٢» → `KHZ7Q2`; pasted «NUR-4M8» and «NUR-٤M٨» → `NUR4M8`. The error clears when the code changes.
  - `KHZ7Q2` shows «يظهر مجموع المجموعة بعد مشاركة مزيد من الأعضاء في التحدي», no total, and «الأعضاء · ٤ أعضاء» with the own row «…، أنت».
  - `NUR4M8` shows «نحو ٢٠٠ صفحة» (raw 202) with «مجموع ما قرأه الأعضاء منذ بدء التحدي».
- **4.**
  - Created «ختمة العائلة» (code `QLA5DU`), khatm starting 2026-10-22.
  - The share text is «انضم إلى مجموعتي «ختمة العائلة» في تطبيق خزائن الرحمن برمز: QLA5DU».
  - Own progress reached «صفحاتك: ٣ من ٦٠٤». Page 2 was recorded by real 8s dwell in the Mushaf; pages 3 and 4 went through `useProgressStore.getState().notePageRead`, because the mock has one page.
  - The first background push was throttled, as designed (`THROTTLE_MS` 1h). With `lastReported.at` aged by 2h, a background push wrote `pagesCovered: 3` for all three joined challenges into `mockLedger.progress`.
  - The group screen did not show the new total (F2).
- **5.**
  - Refusals, on both phones:
    - link → «لا يُسمح بالروابط في المشاركات»
    - phone → «لا يُسمح بأرقام الهواتف حفاظًا على الخصوصية»
    - «يا حمار» → «يُرجى مراجعة الصياغة بما يليق بأدب الحوار»
    - repetition → «يُرجى تجنّب تكرار الأحرف أو الكلمات»
  - Review: «انت كافر بهذا القول» shows the pre-send notice «ستُراجَع مشاركتك قبل ظهورها», then posts with «قيد المراجعة — لن تظهر للآخرين حتى تُعتمد» and only «حذف» as an action.
  - Cooldown: «يمكنك المشاركة مجددًا بعد ٢٩ ثانية» counts down to «٧ ثوانٍ» and «٣ ثوانٍ».
  - Counter: a 1010-character paste stops at 1000, «الحروف المتبقية: ٠». The 90% screen-reader announcement is not visible on screen and was not walked live.
- **7.**
  - The report sheet lists 6 radios, each with a checked state. «سبب آخر» reveals «تفاصيل إضافية (اختياري)» with a ٠/٣٠٠ counter.
  - Submit hides the post and shows «شكرًا لك، تم الإبلاغ وإخفاء المشاركة عنك».
  - Mute asks «كتم هذا العضو؟ / لن تظهر لك مشاركات هذا العضو.». It then shows «تم كتم العضو. يمكنك إلغاء الكتم من الإعدادات.» and hides that member's posts.
  - Settings › المجتمع › «الأعضاء المكتومون، ١» expands to «عضو مكتوم ١، إلغاء الكتم». Numbered rows are intentional: names are never stored (design App B, `mutedMemberLabel`).
  - Tapping the row unmutes at once and the member's posts return. The reported post stays hidden.
- **10.**
  - The confirm Alert carries `deleteConfirmBody`. With `simulateError = true`, the section shows «جارٍ حذف بياناتك في المجتمع، المحاولة القادمة ٠٨:٣١، حدث خطأ في الخادم. يرجى المحاولة مجدداً بعد قليل.» and «إعادة المحاولة الآن». The participate toggle and muted list are hidden while deletion is pending.
  - A retry with the error still set moved the next attempt to ٠٨:٣٥ (`attempts: 2`).
  - With the error cleared, a retry completed: the section shows «الانضمام إلى المجتمع», and the store has `profile: null`, `deletion: none`, empty muted/hidden/postTimes and an empty `mockLedger`. The hub opens on a clean intro with an empty name and an unticked checkbox.
- **11.**
  - Progress bar exposes its value on iOS («نحو ٢٠٠ صفحة» value 33%).
  - Radios and the checkbox expose checked state; the share toggle is a switch on Android and a button with value 0/1 on iOS.
  - The join code is spelled out («رمز المجموعة K H Z 7 Q 2»).
  - Post rows read name, time, status, body («أبو خالد، الآن، قيد المراجعة — …، انت كافر بهذا القول»).
  - Report and mute actions are labelled buttons («الإبلاغ عن مشاركة فاطمة (تجريبي)», «كتم فاطمة (تجريبي)»).
  - Primary pill actions are not buttons (F1).

## Findings

None of these were fixed during the first pass. Fixes landed afterwards in `b244ea1..0eff18c`; the
results are in the "Re-check" and "Final checks" sections at the end.

| # | Status after re-check | Fix commit(s) |
|---|---|---|
| F1 | Fixed | `fa3e878` |
| F2 | Fixed, including the own-progress card (R1) | `e9e51bd`; R1 `fa27036`, guard factory `3201aa4`; follow-up `e94b778` not exercised |
| F3 | Fixed | `e9e51bd` |
| F4 | Fixed, including the iOS keyboard case (R2) | `6131bc8`; R2 `334d90c` |
| F5 | Fixed for 3–99 weeks (R3). Follow-ups, not fixed: no months or years, and «منذ ٢٣ د» next to «قبل …» | `7b38f89`; R3 `f371720` |
| F6 | Fixed | `b6838b3` |
| F7 | Fixed | `e9e51bd`, `2503387`, `0eff18c` (one line with a 60% shrink floor; see "Final checks") |
| F8 | Fixed | `fa3e878` |

| # | Severity | Finding | Repro | Where (best guess) | Capture |
|---|---|---|---|---|---|
| F1 | Medium (a11y, §10) | Every primary pill action is exposed without a button role or disabled state. iOS describes them as `AXGroup`; Android as `ViewGroup [clickable,disabled]`. Affected: «الانضمام إلى المجتمع», «إنشاء مجموعة», «الانضمام برمز», «انضمام», «مشاركة الرمز», «مغادرة المجموعة», «استمع للدرس», «إرسال», «إرسال البلاغ» | Open any community screen and run `describe` | `components/khazain/primitives/PillButton.tsx` has no `accessibilityRole="button"` or `accessibilityState={{ disabled }}` on the `Pressable`. It is a shared primitive, so the fix can be global or scoped via props | — |
| F2 | Medium | Group detail never refreshes after a progress push. The total stays «نحو ٢٠٠ صفحة» while `communityService.groups.get` returns 210, and the own member row stays «الصفحات: ٠» while «صفحاتك: ٣» shows on the same screen | iPhone: join `NUR4M8` (shows 200) → read 3 Mushaf pages → background the app so the push lands → reopen the group from the hub | `store/communityStores.ts` ~35-46: `createAsyncStore.fetch` skips unless status is `idle`. `app/(tabs)/more/community/group/[id].tsx` ~66-90 fetches once on mount; `useFocusEffect` only pushes. Nothing re-fetches after `progressSync` succeeds | `ios-04-own-progress-plus3`, `ios-04-nur4m8-stale-total-after-push` |
| F3 | Low (copy) | Discussion counts count posts but use the «نقاش/نقاشات» forms. A single thread with 3 posts reads «شرح صحيح البخاري، ٣ نقاشات», and the scholar entry «نقاشات دروس الشيخ، ٣ نقاشات» sums posts across lectures | Scholar s1 → discussions entry → index | `components/khazain/community/ScholarDiscussionsEntry.tsx` (sum of `postCount`), the discussion index rows, and `discussionsLabel` in `constants/communityCopy.ts` | `ios-05-scholar-entry`, `ios-05-discussion-index` |
| F4 | Low (UX) | With «سبب آخر» selected, the note field lands below the fold of the sheet's 50%-height ScrollView, behind the submit area. There is no scroll indicator and no auto-scroll. On the Realme the label «تفاصيل إضافية (اختياري)» crowds the submit button. With the keyboard open on iOS, the sheet title and banner are pushed under the status bar | Thread → «إبلاغ» on any post → «سبب آخر» | `app/community-report-sheet.tsx` (ScrollView `maxHeight: height * 0.5`, `showsVerticalScrollIndicator={false}`) | `ios-07-report-other-note-overlap`, `ios-07-report-note-keyboard`, `realme-08-report-other-note-below-fold` |
| F5 | Low (copy, pre-existing helper) | Post times read «قبل ٧ أسبوع», which should be «أسابيع». Recent posts mix «منذ ٢ د» with «قبل …» | Any seeded post | `store/notesStore.ts` `formatRelativeAr` ~line 145 (shared with notes; not introduced by this branch) | `ios-05-thread`, `realme-05-counter-cap-1000` |
| F6 | Medium (360dp) | The privacy control's label is truncated at 1.0 font scale on 360dp: «إظهار تقدّمي لأعضاء المجم…». At 1.3× it truncates further. iPhone (393pt) and tablets fit | Realme: join any group → group detail | `components/khazain/settings/SettingsToggleRow.tsx` title `numberOfLines={1}`, used inside the group screen's padded column (`group/[id].tsx` ~180). Allow 2 lines, or use a shorter label | `realme-03-join-khz7q2-toggle-truncated`, `realme-08-group-detail-1.3x` |
| F7 | Medium (Android 15+) | At 1.3× on the Realme, the join code chip wraps mid-code: «NUR4M» / «8». The box has room for one line, so this is the Android 15 line-break measurement mismatch on a centred, shrink-wrapped Text, made worse by `letterSpacing: 6`. A code split across lines is easy to misread when shared aloud | Realme, font scale 1.3, cold start → hub → «حلقة التدبر» | `app/(tabs)/more/community/group/[id].tsx` ~299-306 (`codeBox` `alignItems: 'center'`, `code` `letterSpacing: 6`). Stretch the Text (`alignSelf: 'stretch'` + `textAlign: 'center'`), or `numberOfLines={1}` + `adjustsFontSizeToFit` | `realme-08-group-code-wraps-1.3x` |
| F8 | Medium (Android 15+) | Pill labels lose their last word: «إنشاء مجموعة» → «إنشاء», «إرسال البلاغ» → «إرسال». The a11y label stays whole. Seen at 1.0 on the Realme create screen, at 1.3 on the report sheet, and after rotation on the Pixel Tablet (hub and create) | Pixel Tablet: rotate portrait → landscape on the hub; or Realme 1.3× → thread → «إبلاغ» | `components/khazain/primitives/PillButton.tsx`: fixed-height pill with a shrink-wrapped centred Text. Android draws a second line and the pill height clips it. Same mechanism as the known `useBoundsForWidth` issue fixed for `RibbonCard` in `28e18fe` on the recommendations branch | `realme-08-create-wird-1.0x`, `realme-08-report-sheet-1.3x`, `pixeltab-09-create-landscape-button-last-word`, `pixeltab-09-hub-landscape-button-last-word` |

Known issue, not counted as a new finding: the scholar-detail header on the Pixel Tablet in landscape
renders «عبد المحسن العباد» without «البدر» (the a11y text is whole). This is the Android 15 last-word
clipping already recorded as pre-existing in `2026-10-22-personalized-recommendations-qa.md` finding 7.

## Observations (no change requested)

- **Join screen spacing:** the label «رمز المجموعة» and its error sit at the top while the field is pinned at the bottom. On the iPad that is most of the screen apart.
- **Progress bar a11y:** for 3/604 pages the bar's value reads "0%", so the visible label carries the real figure.
- **Intro keyboard:** on the iPhone the keyboard covers the checkbox and join button. Tapping outside dismisses it.
- **Toasts:** they cover the composer for 4s.
- **Review notice lingers:** after a held post is sent, «ستُراجَع مشاركتك قبل ظهورها» stays above the now-empty composer until the next edit.
- **Composer placeholder at 1.3×:** on the Realme the placeholder is cut at «…شارك فائدة أو سؤالًا حول».
- **Truncated row subtitles:** at 360dp the More row subtitles end in an ellipsis («…نقا»), the same as the existing «الإعدادات» row.
- **Native confirm Alert:** the deletion Alert title is left-aligned on iOS. This is app-wide behaviour of the native Alert under `forceRTL`.
- **Deletion error copy:** the error line shows the mapped server message, not the mock's own text. This is expected from `services/api/errors.ts`.
- **LogBox warnings:** the banner seen on the Realme after cold restarts (and on the Pixel Tablet in the re-check) is pre-existing dev noise: the `EXPO_PUBLIC_API_BASE` mock-adapter notice, a require cycle through `components/khazain/index.ts`, TrackPlayer sleep-timer signatures, and "Background tasks are not supported on iOS simulators". None comes from the community code. On the Pixel Tablet the banner sits over the join composer until dismissed.
- **MiniPlayer after the Mushaf:** on this branch, opening the Mushaf leaves the MiniPlayer hidden app-wide afterwards. That is pre-existing `main` behaviour; the `mushafPlayerVisibility` fix lives on the recommendations branch.
- **Tooling:**
  - The iPhone simulator drops taps under ~1s apart.
  - Arabic text has to be pasted; the keyboard tool cannot type it.
  - On the rotated Pixel Tablet, argent taps were mis-mapped, so taps went through `adb shell input tap` at the frames the element tree reported.
  - On the Android emulators, Gboard's stylus tutorial opens over the first focused field.

## Not run in this pass

- **Case 1:** not in this pass; run later, see "Release builds".
- **Live screen readers:** VoiceOver and TalkBack were not walked live. Labels, roles and states were read with `describe`. The composer's 90% announcement, the «ستُراجَع…» live notice and toast announcements were not heard.
- **Three real Mushaf pages:** the mock content has one page, so two of the three page reads in case 4 were recorded through `notePageRead` rather than by reading.
- **Case 4 on other devices:** progress push and own-progress were not repeated on the Realme or the tablets.
- **iPad Split View:** not exercised; rotation was.

## Re-check

**HEAD at the start:** `7b38f89` (fixes `b244ea1..7b38f89`). Each app's JS was reloaded or cold-started
against Metro on :8081 (the worktree). Two more commits landed during the re-check: `e94b778` (group
refresh skipped once the member has paused) and `334d90c` (report note kept visible when the iOS
keyboard opens). F4 on the iPhone was re-run after a reload at `334d90c`. Everything else below was
checked at `7b38f89`/`e94b778`; `334d90c` only touches the report sheet. The join code change
that followed (`2503387`) was checked in "Final checks". No source was modified and
nothing was committed. Realme font scale is back to 1.0 and the Pixel Tablet is in portrait
(`user_rotation 1`).

| # | Device(s) | Result | What was seen | Captures |
|---|---|---|---|---|
| F1 | iPhone, Realme | Pass | iOS: the intro's disabled «الانضمام إلى المجتمع» reports the `button` and `notEnabled` traits. The hub, share, leave and listen pills are `AXButton`. Android: «إرسال البلاغ» is `Button [clickable,disabled]` until a reason is picked, then `Button [clickable]`; «إنشاء مجموعة» and «انضمام» are `Button [clickable,disabled]` when empty | `recheck-ios-F1-intro-join-disabled-button`, `recheck-realme-F1-F8-report-submit-disabled-1.0`, `recheck-realme-F1-thread-send-disabled-button` |
| F2 | iPhone | Pass, with residual R1 | In `NUR4M8`, joining pushed and the total moved 200 → «نحو ٢١٠». After 3 more pages and a background push, the ledger had `pagesCovered: 6`. The open group screen updated the member row to «أبو أحمد، أنت، الصفحات: ٦». After reopening from the hub, the screen reads «صفحاتك: ٦ من ٦٠٤» | `recheck-ios-F2-after-push-member-row-6-own-card-3`, `recheck-ios-F2-reopen-own-6-total-210` |
| F3 | iPhone | Pass | Scholar entry: «نقاشات دروس الشيخ، نقاش واحد». Index: «شرح صحيح البخاري، ٣ مشاركات». `postsLabel` gives 1 «مشاركة واحدة», 2 «مشاركتان», 10 «١٠ مشاركات», 11 «١١ مشاركة»; `discussionsLabel(11)` gives «١١ نقاشًا» | `recheck-ios-F3-scholar-entry-one-thread`, `recheck-ios-F3-index-3-posts` |
| F4 | iPhone (keyboard), Realme 1.0 and 1.3× | Pass at `334d90c` (failed at `7b38f89`, R2) | «سبب آخر» scrolls the list to the end. The label, field and «٠ / ٣٠٠» counter are in view, with a clear gap above «إرسال البلاغ» on both phones and at 1.3×. At `334d90c`, focusing the note with the keyboard up keeps the field in view, and the title and banner stay below the status bar. On the Realme the stylus toolbar opens instead of a soft keyboard, so the Android keyboard path was not exercised | `recheck-ios-F4-other-reason-note-in-view`, `recheck-ios-F4-keyboard-note-visible-334d90c`, `recheck-realme-F4-other-reason-note-in-view-1.0`, `recheck-realme-F4-other-reason-note-in-view-1.3x`; R2 evidence: `recheck-ios-F4-keyboard-open-note-hidden`, `recheck-ios-F4-keyboard-after-manual-scroll` |
| F5 | iPhone | Pass for the reported case, with residual R3 | Thread posts read «قبل ٧ أسابيع». A note backdated 21 days reads «قبل ٣ أسابيع» in Library › آخر الملاحظات (temporary note, deleted afterwards). `formatRelativeAr` gives 7d «قبل أسبوع», 14d «قبل أسبوعين», 21d «قبل ٣ أسابيع», 49d «قبل ٧ أسابيع» | `recheck-ios-F5-thread-7-weeks-plural`, `recheck-ios-F5-notes-3-weeks` |
| F6 | Realme 1.0 and 1.3× | Pass | The share toggle title wraps to two lines, «إظهار تقدّمي لأعضاء / المجموعة», with no ellipsis. The Toggle is vertically centred on the title block (centres equal in the tree at both scales). `settings-notifications` is unchanged: one-line titles with subtitles, toggles centred | `recheck-realme-F6-F7-group-toggle-code-1.0`, `recheck-realme-F6-toggle-two-lines-1.3x`, `recheck-realme-F6-settings-notifications-1.0`, `recheck-realme-F6-settings-notifications-1.3x` |
| F7 | Realme 1.3× | Pass | The `NUR4M8` chip stays on one line at 1.3× after a cold restart, and at 1.0 | `recheck-realme-F7-code-one-line-1.3x` |
| F8 | Realme 1.0 and 1.3×, Pixel Tablet portrait and landscape, iPhone | Pass | Realme: «إنشاء مجموعة» (hub and create), «الانضمام برمز», «انضمام», «مشاركة الرمز» and «إرسال البلاغ» are whole at both scales. Pixel Tablet: the hub, create and join pills are whole in portrait, after rotating to landscape, and after rotating back. iPhone, non-community screens: book detail («استمع إلى الشرح», «إضافة ملاحظة») and the foundations sandbox's intrinsic-width pills («المزيد», «عرض الكل», «حفظ») render centred, one line, and sized as before | `recheck-realme-F8-hub-1.0`, `recheck-realme-F8-create-1.0`, `recheck-realme-F8-join-1.0`, `recheck-realme-F8-hub-1.3x`, `recheck-realme-F8-create-1.3x`, `recheck-realme-F8-report-submit-1.3x`, `recheck-pixeltab-F8-hub-portrait`, `recheck-pixeltab-F8-create-portrait`, `recheck-pixeltab-F8-create-after-rotate-landscape`, `recheck-pixeltab-F8-hub-landscape`, `recheck-pixeltab-F8-join-landscape`, `recheck-pixeltab-F8-hub-back-to-portrait`, `recheck-pixeltab-F8-join-portrait`, `recheck-ios-F8-book-detail-pills`, `recheck-ios-F8-sandbox-intrinsic-pills` |

### Issues found in the re-check

| # | Severity | Issue | Repro | Where (best guess) |
|---|---|---|---|---|
| R1 | Low; fixed by `fa27036` (see Final checks) | After a background push lands while the group screen is open, the member row updates to the new pages but the «تقدّمي» card on the same screen keeps the old figure («صفحاتك: ٣ من ٦٠٤» next to «الصفحات: ٦»). It catches up when the screen is refocused | iPhone: open `NUR4M8` → read pages elsewhere → return to the group → background the app with a push due → foreground it | `app/(tabs)/more/community/group/[id].tsx`: own counts come from `ownCounts` inside `useFocusEffect` only, and returning from background does not refocus the screen |
| R2 | Medium at `7b38f89`; fixed by `334d90c` | With «سبب آخر» picked, tapping the note field raised the keyboard and shrank the list, but the list kept its offset, so the focused field sat under the keyboard. Text typed into it was invisible until the user scrolled the short list by hand | iPhone at `7b38f89`: thread → «إبلاغ» → «سبب آخر» → tap the note → type | `app/community-report-sheet.tsx`. Re-checked at `334d90c`: the field stays in view |
| R3 | Low (copy); 11+ weeks fixed by `f371720`, the rest are follow-ups | `formatRelativeAr` beyond 10 weeks: 77d «قبل ١١ أسبوع» and 84d «قبل ١٢ أسبوع» should take the accusative singular «أسبوعًا», as `discussionsLabel(11)` already does («١١ نقاشًا»). There are no months or years either: 400d reads «قبل ٥٧ أسبوع». Fresh posts still read «منذ ٢٣ د» next to «قبل ٧ أسابيع» | `debugger-evaluate`: `formatRelativeAr(Date.now() - 77*864e5)`; or any own post next to a seeded one | `store/notesStore.ts` `formatRelativeAr` |

## Final checks

The iPhone JS was reloaded and the Realme app was cold-started at each font scale. These checks
ran on pre-rewrite SHAs: R1 at `9ed3a77`, F7 at `e228b78` (which still passed `minimumFontSize: 12`).
The branch was then rewritten before the PR:
- `e228b78` became `2503387`. It drops `minimumFontSize`, because React Native 0.81 never sends that
  prop to native (it is not in the Text `validAttributes`). What rendered here was therefore
  `numberOfLines={1}` + `adjustsFontSizeToFit` with no floor.
- A review then found that `2503387` had also dropped `minimumFontScale={0.6}`, which *is* a Fabric
  Text attribute. `0eff18c` restores it. It only bounds how far the code may shrink, and no code
  shrank in these checks, so the render is unchanged.
- `9ed3a77` became `fa27036`, with the same R1 logic.
- `3201aa4` moves the screen's own-progress guard into a tested factory. It does not change behaviour.

Final HEAD: `0eff18c`.

| Check | Device | SHA | Result | What was seen | Captures |
|---|---|---|---|---|---|
| R1, own progress after a push | iPhone | `9ed3a77` (now `fa27036`) | Pass | Open `NUR4M8`: «صفحاتك: ٦ من ٦٠٤». Pages 8, 9 and 10 were recorded through `notePageRead` while the screen stayed open; the sync throttle was reset and `lastReported.at` aged by 2h. The card still read ٦ before the push. After backgrounding and returning, without leaving the screen: the card reads «صفحاتك: ٩ من ٦٠٤», the member row reads «أبو أحمد، أنت، الصفحات: ٩», the ledger has `pagesCovered: 9`, and the total is «نحو ٢١٠» | `final-ios-R1-before-push-own-6`, `final-ios-R1-after-push-own-card-9-member-row-9` |
| F7, join code chip | Realme 1.3× and 1.0 (cold start each) | `e228b78` (now `2503387`) | Pass | `NUR4M8` and `KHZ7Q2` stay on one line at 1.3× and at 1.0, at full size with spacing intact. A 6-character code did not need to shrink, so the 12pt floor was never reached | `final-realme-F7-code-one-line-1.3x-e228b78`, `final-realme-F7-khz7q2-one-line-1.3x-e228b78`, `final-realme-F7-code-one-line-1.0-e228b78` |
| R3, accusative after 11 | iPhone (`debugger-evaluate`) | `f371720` (in `fa27036`) | Pass | 21d «قبل ٣ أسابيع», 70d «قبل ١٠ أسابيع», 77d «قبل ١١ أسبوعًا», 84d «قبل ١٢ أسبوعًا» | — |

**Follow-ups (recorded, not fixed):**
- `formatRelativeAr` has no months or years: 400 days reads «قبل ٥٧ أسبوعًا».
- Recent times use «منذ» (`formatRelativeAr(now − 23 min)` → «منذ ٢٣ د»), older ones «قبل …». The two sit side by side in a thread.

**Not run in the final checks:**
- F7 was not re-captured at `0eff18c`. Its chip props (`numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}`) are exactly those of `7b38f89`, which passed the re-check on the Realme at 1.3× and 1.0 (`recheck-realme-F7-code-one-line-1.3x`).
- Final checks on the iPad and Pixel Tablet. Their JS was not reloaded at the final HEAD.
- `e94b778` (group refresh skipped once the member has paused): no paused-member scenario was exercised.
- The Android keyboard path of the report sheet: the Realme opens the Gboard stylus toolbar instead of a soft keyboard. (Run in the final device pass below; it found F9.)

End state: Realme font scale 1.0, Pixel Tablet in portrait (`user_rotation 1`), all apps running, no source
modified and nothing committed by QA.

## Final device pass

Every device was cold-started against Metro serving the worktree. The join-code chip and smoke checks
ran at `aa81487` (code identical to `0eff18c`); the report-sheet keyboard checks ran on the F9 fix,
committed as `c21ff98`. Captures are prefixed `final2-` (first run), `final3-` (first F9 attempt) and
`final4-` (F9 as committed). To get a soft keyboard on the emulators, Gboard's
`stylus_handwriting_enabled` was set to 0 and `show_ime_with_hard_keyboard` to 1 during the run;
both were restored afterwards.

| Check | iPhone 16 | iPad Pro 13 | Realme 360dp | Pixel Tablet |
|---|---|---|---|---|
| Join code on one line, whole (`0eff18c`) | ✓ portrait | ✓ portrait + landscape | ✓ 1.0 and 1.3 (cold start each) | ✓ portrait + landscape |
| Smoke: hub, guidelines, create, join, group, discussion index, thread, report sheet | ✓ | ✓ | ✓ | ✓, pill labels whole across rotations |
| Report note field with the keyboard open, sheet back in place after dismiss | ✓ | not run | ✓ after F9 | ✓ portrait + landscape after F9 |
| Live screen reader | not possible (no VoiceOver on the simulator) | not possible | ✓ TalkBack: focus covers the code chip (label «رمز المجموعة N U R 4 M 8») and «مشاركة الرمز» | not run |
| iPad Split View | — | not run: neither argent nor `simctl` can open it; it needs a dock drag with a second app | — | — |

| # | Severity | Finding | Fix |
|---|---|---|---|
| F9 | Medium (Android) | With «سبب آخر» picked, focusing the note field left it under the keyboard. The sheet is a `transparentModal` over an edge-to-edge window, so Android never resizes it, and `KeyboardAvoidingView` ran on iOS only. A first attempt (`behavior="padding"` on both platforms, `final3-`) lifted the sheet but left it ~56–92dp too high after the keyboard closed | `c21ff98`: on Android the wrapper pads by the tracked `keyboardHeight`, which `keyboardDidHide` resets to 0. On the Realme and on the Pixel in both orientations, the field and typed text sit ~16dp above the keyboard and the title returns to its exact y after BACK or the hide key. The iPhone is unchanged (`final4-*`) |

Observed, out of scope: on Android the scholar list rows 2–3 and the scholar-detail header drop the last
word «البدر». This is the known Android 15 line-breaking case listed in CLAUDE.md, and it needs an RN upgrade.

## Release builds

Built from the worktree at `07b483e` after `expo prebuild` (native folders are gitignored):
`./gradlew assembleRelease` (JDK 17; the bundled JDK 25 fails the React Native settings plugin) and
`xcodebuild -configuration Release -sdk iphonesimulator` with the JS bundle embedded and no Metro.
Installed on spare devices (Pixel 7 AVD, iPhone 17 sim).

| Check | Android release | iOS Release |
|---|---|---|
| Launches to Home, no red box, dev menu or LogBox | ✓ | ✓ |
| More has no «المجتمع» row; other rows present | ✓ | ✓ |
| Scholar page has no «نقاشات دروس الشيخ» entry | ✓ | ✓ |
| `khazayinapp:///more/community` | ✓ redirects to More | ✓ redirects to More |
| `khazayinapp:///sections/discussion` | ✓ redirects to Sections | ✓ redirects to Sections |
| Home, Mushaf, Library smoke | ✓ | ✓ |

The community screens are compiled into the release bundle but unreachable. The mock adapter
and seed are not in it (the §3.2 grep). Captures: `release-android-*`, `release-ios-*`.

## iPad windowing (iPadOS 26)

Every community screen (hub, group, discussion index, thread, report sheet) was walked on the iPad
Pro 13 sim at about ⅓ and ½ width, portrait and landscape: ✓, no overlap. The window controls
covering the top headers were fixed on the tablet branch (`3222e49`, PR #17), which this branch
inherits on merge. Captures: `splitview-p2-*`.

