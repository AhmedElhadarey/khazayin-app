# docs/store: store listing, privacy and rating deliverables (v1.0.0)

Design: `docs/plans/2026-10-24-store-submission-design.md` (§0 v2 is authoritative; §3 data practices; §5 copy).
Validate after **any** edit:

```
node scripts/store/validate-copy.mjs          # table, or a report and exit 1
npx jest __tests__/storeCopy.test.ts
```

The validator measures UTF-16 length after trimming one trailing newline. It also checks the keyword rules, flags emoji and promotional terms in the Play title and short description, and rejects the misspelled publisher name (the form ending in ‑عالمية; the correct one is «العلمية») anywhere under `app-store/`, `play/`, `privacy/`, `rating/` and `listing.json`. It lists the open Foundation placeholders, but these are not violations.

## Index

| File | Console field / use |
| --- | --- |
| `app-store/ar-SA/name.txt` | App Store name (equals `app.json` `expo.name`; the test pins this) |
| `app-store/ar-SA/subtitle.txt` | Subtitle |
| `app-store/ar-SA/keywords.txt` | Keywords |
| `app-store/ar-SA/promotional_text.txt` | Promotional text (editable without a new build) |
| `app-store/ar-SA/description.txt` | Description |
| `app-store/ar-SA/release_notes.txt` | What's New (v1.0) |
| `app-store/ar-SA/support_url.txt` | Support URL (**placeholder**) |
| `app-store/ar-SA/marketing_url.txt` | Marketing URL |
| `app-store/ar-SA/copyright.txt` | Copyright |
| `play/ar/title.txt` | Play app name |
| `play/ar/short_description.txt` | Play short description |
| `play/ar/full_description.txt` | Play full description |
| `listing.json` | Categories, tags, contact, price, availability (with the GCC/MENA list), EU DSA status, rating summary |
| `privacy/privacy-policy.ar.md` | Privacy policy, source text |
| `privacy/privacy-policy.ar.html` | The same text as a standalone RTL page to host on khazayin.com. It has no external assets and uses the system Arabic font stack and light/dark modes. Regenerate it if the `.md` changes |
| `privacy/app-store-privacy-label.md` | App Store Connect → App Privacy answers |
| `privacy/play-data-safety.md` | Play → Data safety answers |
| `privacy/play-foreground-service-declaration.md` | Play → Foreground service (media playback), with the demo-video shot list |
| `privacy/play-exact-alarm-note.md` | Why there is no exact-alarm declaration in v1, plus draft text for later |
| `rating/apple-age-rating.md` | Apple's 2025 age-rating questionnaire → 4+ |
| `rating/play-iarc.md` | IARC questionnaire, plus Target audience, App access, Ads, Financial, Health, Government, News |
| `PENDING.md` | Gated Mushaf and recitation lines (release blocker), with exact insert positions |
| `assets/` | Store images (another task owns these) |

## What the copy claims, and what it deliberately does not

Every feature line was checked against the source on 2026-10-24:

- **Claimed (true in v1):**
  - streaming of scholar lecture series from archive.org: 36 series with an `archiveId` in `data/content/scholars.ts`, covering hadith commentaries (البخاري، مسلم، السنن الأربع، بلوغ المرام، رياض الصالحين), tafsir, fiqh, aqidah and «نور على الدرب»
  - background and lock-screen playback, and resume position
  - the 9 sections, as browsable sections ("content is added progressively")
  - dawah designs grouped by Hijri month
  - saving with a long-press, local notes with text export, progress stats and streak, the daily wird goal and the local wird reminder
  - visible prayer times: More → Settings → مواقيت الصلاة, computed on the device with a choice of method and madhab
  - unified search (scholars, books, lectures)
  - phone and tablet support
  - no ads, accounts or tracking
- **Not claimed:**
  - **Quran recitation audio.** Every reciter → surah tap shows «لا يتوفر تسجيل صوتي لهذه المادة» (no `archiveId` in `data/content/quran.ts`; see `services/surahPlayback.ts`). The coordinator confirmed this on the production bundle.
  - **Reading the Mushaf.** The mock adapter, which ships, returns `AYAT_BY_SURAH` from `data/content/quran.ts`: 30 surahs are listed, and the text holds only Al-Baqarah 1–5. "604 pages" is the page/juz metadata in `constants/quranPageData.ts`, not text. No other Quran-text source exists in the repo (checked for bundled JSON/SQLite and Uthmani strings). Re-verify on device before adding any Mushaf line.
  - **Qira'at.** The qira'at list is a selection setting only.
  - **Prayer notifications / adhan.** These are off in v1 (RELEASE-READINESS §5).
  - **Adhkar.** There is no adhkar feature, only one lecture titled «فقه الأدعية والأذكار».
  - **Downloads or offline listening.** Poster download shows "قريبًا", and audio streams. The copy says listening needs an internet connection.
  - **Community.** It is dev-only.

### Full Mushaf text and recitation audio pending: add copy when they ship

**Release blocker, the user decides.** The exact lines to add, with their target files and positions, are in **`PENDING.md`**:
- Block A, `PENDING_FULL_QURAN_TEXT`: Mushaf reading
- Block B, `PENDING_RECITATION_AUDIO`: listening to recitations

Each block has a verification gate. The shipped `.txt` files carry neither claim. Until the gates pass, do not lead the screenshot set (design §6) with the Mushaf or a reciter surah list, because they show content the app cannot deliver (guidelines 2.3.1 and 2.1). A Quran-themed section whose Mushaf and reciters are empty is a guideline 2.1 / 4.2 review risk whatever the copy says. Design §7 R4 should list it.

## Keyword choices (App Store)

`تفسير,فقه,عقيدة,فتاوى,دروس,شرح,شيخ,سنة,سيرة,قرآن,صحيح,بخاري,دعوة,ورد,مواقيت,صلاة,إسلام,كتاب,علم` (95/100)

- **Indexed already, so not repeated:** the name gives مكتبة/خزائن/الرحمن, and the subtitle gives محاضرات/العلماء/شروح/الحديث. The validator compares words after stripping diacritics and a leading «و», «ال» or «وال», so «علماء» or «حديث» would be caught. Apple combines words across the name, subtitle and keywords, so «شرح» + «الحديث», «تفسير» + «قرآن», «صحيح» + «بخاري», and «مواقيت» + «صلاة» each form a high-intent phrase without spending characters on the phrase itself.
- **Content-backed only:**
  - تفسير، فقه، عقيدة، فتاوى، شرح، صحيح، بخاري: playable lecture series exist
  - قرآن: the «القرآن حياة» section and the tafsir lectures
  - سيرة: the «رسول الله ﷺ» section and «مختصر زاد المعاد»
  - دعوة: the dawah designs
  - ورد: the wird goal and reminder
  - مواقيت، صلاة: the visible prayer times
  - كتاب: the scientific-books section
  - علم، دروس، شيخ، إسلام: general intent for Islamic learning
- **Singular forms, with one deliberate exception.** Arabic broken plurals are separate tokens; Apple does not stem them as it does English «-s». So the form people actually type wins: «دروس» and «فتاوى» are the common search forms, while «شيخ» and «كتاب» are kept singular.
- **Excluded:**
  - مصحف، تلاوة، قراء، قراءات: misleading in v1 (guideline 2.3.7)
  - أذكار: no such feature
  - خزائن: in the name
  - scholar names such as ابن باز and العثيمين: Apple's keyword guidance discourages names of people, and they could read as endorsement
  - competitor names
  - «مجاني»
- Look up the live rankings in App Store Connect / Search Ads two weeks after launch, then replace the weakest tokens (likely candidates: سنة, علم). Keywords change only with a new version.

Subtitle «محاضرات العلماء وشروح الحديث» (28/30) carries the two strongest intents for what plays today: lectures and hadith commentary. The Play title stays the bare name, since Play discourages keyword stuffing in titles. Its short description (70/80) carries the intents in a natural sentence.

## Copyright: Latin digits

`© 2026 مؤسسة «خزائن الرحمن» العلمية`. App Store Connect accepts Arabic text in the field. Apple's own help shows the year in Latin digits, and some ASC and third-party tooling parses a leading `© YYYY`, so Latin digits are the safe choice. The validator enforces `© YYYY ` at the start.

## Placeholders still to fill (Foundation)

| Where | Placeholder |
| --- | --- |
| `app-store/ar-SA/support_url.txt` | Support page URL (for example a page on khazayin.com) |
| `listing.json` `contact.email` | Public contact email (also the IARC certificate email in `rating/play-iarc.md`) |
| `listing.json` `contact.supportUrl` | Support page URL |
| `listing.json` `contact.privacyPolicyUrl` | Privacy policy URL (https). The same value goes in `EXPO_PUBLIC_PRIVACY_POLICY_URL` (eas.json) and in both consoles, and `privacy/app-store-privacy-label.md` §1 |
| `listing.json` `contact.playAddress` | Legal address (public on Play if trader) |
| `listing.json` `euDigitalServicesAct.traderStatus` | `DECISION_REQUIRED`: trader or non-trader, decided with counsel |
| privacy policy §0 header | Effective date |
| privacy policy §1 | Legal address, country of registration, privacy/DPO email |
| privacy policy §3 | Confirm "Prevent storing IP addresses" is on in the Sentry project; the Sentry retention period |
| privacy policy §9 | Contact email; WhatsApp number (the `+20 111 142 4312` number is unconfirmed) |
| privacy policy §13 | Confirm the Sentry DPA is accepted |
| privacy policy §14 | Sentry retention; correspondence retention |
| privacy policy §16 | Privacy/DPO email |
| `privacy/play-data-safety.md` | Deletion-request URL, only if the Foundation answers "Yes" |
| `rating/apple-age-rating.md` | The Foundation confirms whether any lecture narrates violence graphically (4+ or 9+) |
| `rating/play-iarc.md` | IARC email |

The HTML policy carries the same 12 placeholders as the `.md`, highlighted. Fill the `.md`, then regenerate the HTML. **Do not host the policy until every placeholder in it is filled.**
