# Pending copy: add ONLY when the feature ships and is verified on a release build

The shipped `.txt` files make **no** claim about reading the Mushaf or listening to recitations, and they pass `node scripts/store/validate-copy.mjs` today. Each block below names the exact file, the exact place, and the exact line. Add a block only after its gate is verified on device. Then re-run the validator and `npx jest __tests__/storeCopy.test.ts`.

## Release blocker: the user decides

The Mushaf does not contain the Quran text in v1. `data/content/quran.ts` `AYAT_BY_SURAH` holds only surah `002` (Al-Baqarah 1–5), and every other surah shows «لا توجد آيات لهذه السورة». Only 30 of 114 surahs are listed. Reciter → surah playback shows «لا يتوفر تسجيل صوتي لهذه المادة» because no reciter has an `archiveId`. Submitting a Quran-themed app in this state is a guideline 2.1 / 4.2 risk regardless of the copy. Until the gates below pass:
- Do not lead the screenshot set with the Mushaf or a reciter list.
- Never write «المصحف كاملًا», «٦٠٤ صفحات», «اقرأ القرآن كاملًا», «استمع إلى التلاوات», or «تلاوات مسموعة».

---

## Block A: `PENDING_FULL_QURAN_TEXT`

**Gate:** all 114 surahs render their full text in the Mushaf on a release build (iOS and Android), page navigation covers pages 1–604, and the Quran-text licence/attribution (design §7 R2) is confirmed.

### A1. `app-store/ar-SA/description.txt`
Insert this as a new section **immediately before** the line `محاضرات العلماء والمشايخ`, followed by a blank line:

```
القرآن الكريم
• قراءة المصحف الشريف كاملًا في ٦٠٤ صفحات، مع حفظ موضع القراءة والعلامة المرجعية.
• التحكم في حجم خط القرآن، وتدوين ملاحظاتك على الآيات.
```

### A2. `play/ar/full_description.txt`
Insert the same three lines, in the same position: before `محاضرات العلماء والمشايخ`, followed by a blank line.

### A3. `app-store/ar-SA/release_notes.txt`
Insert this as the **first** bullet, after the line `الإصدار الأول من مكتبة خزائن الرحمن، ويتضمّن:`:

```
• المصحف الشريف كاملًا في ٦٠٤ صفحات، مع العلامة المرجعية وحفظ موضع القراءة.
```

(If v1.0 has already shipped by then, put this in that version's notes instead, worded as «أُضيف المصحف الشريف كاملًا…».)

### A4. `app-store/ar-SA/keywords.txt`
Replace `,سنة` with `,مصحف`. The result must stay ≤ 100 units, and the validator checks it.

### A5. `app-store/ar-SA/promotional_text.txt` (optional; editable without a build)
Replace the whole text with:

```
المصحف الشريف كاملًا، ومحاضرات أهل العلم وشروحهم في التفسير والحديث والفقه والعقيدة، مع مكتبة خاصة لملاحظاتك ومتابعة وردك اليومي.
```

### A6. `play/ar/short_description.txt` (optional)
Keep it as it is, or replace it with this (check ≤ 80):

```
المصحف الشريف ومحاضرات العلماء وشروحهم، مع مكتبتك الخاصة وورد يومي
```

---

## Block B: `PENDING_RECITATION_AUDIO`

**Gate:** tapping a reciter → surah plays audio on a release build for every reciter listed, and the recording rights are confirmed (design §7 R2).

### B1. `app-store/ar-SA/description.txt` and `play/ar/full_description.txt`
Under `القرآن الكريم` (Block A), or as a new section before `محاضرات العلماء والمشايخ` if Block A has not shipped, add:

```
• الاستماع إلى تلاوات القرّاء: المصحف المجوَّد، والمرتَّل، والمعلِّم.
```

Add the following only if the قراءات tab plays audio:

```
• تلاوات بالقراءات المتواترة.
```

### B2. `app-store/ar-SA/keywords.txt`
Replace `,علم` with `,تلاوة`. If the قراءات tab plays audio, also replace `,كتاب` with `,قراءات`. The result must stay ≤ 100 units.

### B3. `app-store/ar-SA/release_notes.txt`
Add this bullet:

```
• الاستماع إلى تلاوات القرّاء.
```

### B4. Foreground-service demo video
`privacy/play-foreground-service-declaration.md` can then use a surah recitation instead of a lecture. No change is needed otherwise.

---

## After adding either block

- [ ] `node scripts/store/validate-copy.mjs` passes, with headroom.
- [ ] The screenshot set (design §6) shows the newly shipped screen with real content.
- [ ] Re-read `rating/` and `privacy/`. Neither block adds a data type, and Quran audio streams from the same or a similar host. If the host is new, add it to privacy policy §7 and §13.
- [ ] Remove the block from this file.
