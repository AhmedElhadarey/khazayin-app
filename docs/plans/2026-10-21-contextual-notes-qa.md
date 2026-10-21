# Contextual notes — QA record (2026-10-21)

Device: iPhone 16 simulator (iOS 26.5), Debug build loading JS from Metro
(`EXPO_PUBLIC_VISUAL_AUDIT=1`, mock adapter), branch `feat/contextual-notes`.
Framed routes were captured at 3448b35. Interactive rows ran at 190f055 and f25cfc5, which
change only `app/note-editor.tsx` (no Figma frame). Baseline: same build at 0635ea1.

**Mock-data substitution:** the mock Mushaf carries al-Baqarah 1–5 only, so the 2:255 / 2:286
rows ran on 2:4 and 2:2. The behaviour under test (chip label, line lookup, ordering,
highlight) does not depend on the ayah number.

## Blocker found and fixed during QA

**The note editor hid its own input behind the keyboard.** `app/note-editor.tsx` auto-focuses
its input, but its `KeyboardAvoidingView` sat *inside* the content-sized sheet, so it could only
squeeze the sheet's content and never move the sheet. After a long-press on an ayah the user
could not see what they typed or reach «حفظ». The same happens on 0635ea1 (checked on the base
build), but this branch makes it the main way into the editor.

- **190f055:** the KAV now wraps the full-screen backdrop, so the bottom-anchored sheet rides
  above the keyboard.
- **f25cfc5:** the dim colour moved onto the KAV, so the strip under the keyboard stays
  dimmed, and the redundant wrapper View was removed.

On device: title, ref chip, input and toolbar sit above the keyboard; the sheet scrolls to reveal
«حفظ»; saving works.

## Visual — framed routes (rows 1–6)

`npm run capture:ios` at 3448b35, compared per pixel with the 0635ea1 captures (threshold
16/channel, status bar and home indicator excluded): 22 of 23 captured frames at 0.000%. The 5
transition frames (row 2's frame 15 among them) are always skipped.

- **16 `/sections/mushaf?surah=2`, 0.136%:** rows 1875–1920 of 2556 only, which is the new hint
  «اضغط مطولًا على آية لإضافة ملاحظة» at the end of the reading surface. Header, meta and footer
  are identical. ✅ row 1
- Rows 3–6 (frames 14, 06, 05, 19): 0.000%. ✅

## Interactive rows

| # | Check | Result |
|---|---|---|
| 7 | Long-press an ayah | ✅ the editor opens with the chip «مرتبطة بـ البقرة: ٤» (and «… البقرة: ٢» for ayah 2) |
| 8 | Reader with notes on two ayat | ✅ «ملاحظاتك على هذه السورة» replaces the hint, ordered 2 then 4, with the text at the physical right and the time at the left. Against frame 16, only rows 1875–2109 differ (the notes section): header, meta and footer are identical |
| 9 | VoiceOver rotor action on a segment | Not run (no VoiceOver on the simulator). See the accessibility follow-up below |
| 10 | Viewer with linked and plain notes | ✅ linked notes show their label under the title; the plain note has no second line. The unknown-type case was not seeded on device (covered by the `noteRefs` tests) |
| 11 | Viewer link «البقرة: ٢», then back | ✅ the sheet closes and the reader opens with ayah 2 highlighted; no duplicate Library. **Observation:** back lands on **Home**, not on Library. The Sections stack holds only the reader when it is entered from another tab, so back falls to the tab navigator's first route. This happens app-wide for cross-tab navigation |
| 12 | Follow a note from the reader's own section | ✅ the highlight moves to the other ayah in place, without a remount |
| `?ayah=` | Deep link `/sections/mushaf?surah=2&ayah=4` | ✅ scrolls and highlights exactly ayah 4's two lines |
| 13 | MiniPlayer note button and long-press on the title | ✅ the MiniPlayer reads, left to right: transport, note button «إضافة ملاحظة عند هذه اللحظة», title, cover. The button at 4:33 opened the editor with «مرتبطة بـ محاضرة شرح صحيح مسلم — ٤:٣٣», and the note saved. A long-press on the title opened the same editor at the then-current second (٦:٠٦) |
| 14 | Viewer link on a lecture note | ✅ the sheet closes. The player keeps the same episode (`094_20210730/001.mp3`) and seeks from about 6:10 to 274.07 s, with no restart from 0 |
| 15 | Library in-progress «إضافة ملاحظة» | ✅ the «تقدم الكتب المسموعة» card (8%) opens the editor at the saved second: «… — ٤:٥٦», with the player paused at 296.6 s. «آخر الملاحظات» rows show the title and time only, with no link label |
| 16 | Scholar detail | ✅ with no lecture note, the rows match frame 19 (0.000%). Long-press on a lecture row opens no note. The "saves" half belongs to the saved-content branch (#7), which this branch does not contain. With a lecture note, the footer «ملاحظاتي على هذه الدروس» lists «فائدة من المحاضرة» with its link «محاضرة شرح صحيح مسلم — ٤:٣٣» |
| 17 | Book detail `/sections/book/bk2` | ✅ order: cover, meta, «استمع إلى الشرح», then «ملاحظاتي» with the «إضافة ملاحظة» pill. The chip reads «مرتبطة بـ كتاب شرح رياض الصالحين»; the saved note appears in the section; the viewer link lands back on this screen |
| 18 | Downgrade | ✅ with 4 notes on this build (2 ayah-linked, 1 book-linked, 1 plain), the 0635ea1 build shows all 4 with no crash. One was edited and saved there. Back on this build, all 3 links are intact, the edited one included |
| 19 | Upgrade | ✅ 2 notes created on a fresh 0635ea1 install appear on this build, unlinked |
| 20 | Android spot check | Not run (no Android emulator in this pass) |

**Audio rows:** these used the one archive.org episode that loads in reasonable time. archive.org metadata was very slow during this pass (327 KB not done in 120 s), and a Bukhari play attempt failed with «تعذّر التشغيل». That is network, not this branch: the same path works once the file resolves.

Gates at f25cfc5: `npx jest` 101 suites, 1168 passed / 1 skipped; `npx tsc --noEmit` clean; the plan's lint grep prints nothing.

## Follow-ups (not in this branch)

- **Sheet accessibility (pre-existing, every sheet built this way):** the full-screen backdrop
  `Pressable accessibilityLabel="إغلاق"` is itself an accessible element, so iOS groups the whole
  sheet under it. The editor and viewer contents are missing from the accessibility tree, the
  same as on 0635ea1. That blocks row 9 and VoiceOver use of the sheets; it needs its own fix
  across the sheets.
- **Android keyboard:** `edgeToEdgeEnabled` is on, so `adjustResize` may not lift the editor on
  Android either. Check it with row 20.
- **Back after a cross-tab jump** lands on Home (row 11). If "back to Library" is wanted, the
  reader must be pushed over a Sections anchor or the tabs' `backBehavior` changed; that is an
  app-wide navigation decision.
