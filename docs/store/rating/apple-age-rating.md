# App Store Connect: Age Rating answers (2025 questionnaire)

App: مكتبة خزائن الرحمن · v1.0.0 · **Expected result: 4+**
Where: App Store Connect → App Information → **Age Rating** → Edit.

Apple's updated questionnaire (introduced 2025, with the 4+, 9+, 13+, 16+ and 18+ tiers) asks about capabilities first, then about content frequency. The answers below describe the production build. Community features are `__DEV__`-only and do not ship.

## Step 1. In-app controls

| Question | Answer | Why |
| --- | --- | --- |
| Parental Controls | **No** | The app has none |
| Age Assurance | **No** | No age gate or verification, and none is needed for this content |

## Step 2. Capabilities

| Question | Answer | Why |
| --- | --- | --- |
| Unrestricted Web Access | **No** | There is no in-app browser that can reach arbitrary sites. The app opens fixed links only (the Foundation website, its official channels, the privacy policy, the CC BY licence page) in the system browser or in the target app |
| User-Generated Content | **No** | No user content is shown to other users. Notes are private and local. Community is dev-only |
| Messaging and Chat | **No** | There is none |
| Advertising | **No** | There is none |

## Step 3. Mature themes

| Descriptor | Answer |
| --- | --- |
| Profanity or Crude Humor | None |
| Horror/Fear Themes | None |
| Alcohol, Tobacco, or Drug Use or References | None |
| Mature or Suggestive Themes | None |

## Step 4. Medical or wellness

| Descriptor | Answer |
| --- | --- |
| Medical or Treatment Information | None |
| Health or Wellness Topics | None |

## Step 5. Sexuality or nudity

| Descriptor | Answer |
| --- | --- |
| Sexual Content or Nudity | None |
| Graphic Sexual Content and Nudity | None |

## Step 6. Violence

| Descriptor | Answer |
| --- | --- |
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None (see caveat) |
| Prolonged Graphic or Sadistic Realistic Violence | None |
| Guns or Other Weapons | None (see caveat) |

## Step 7. Chance-based activities

| Descriptor | Answer |
| --- | --- |
| Simulated Gambling | None |
| Contests | None |
| Gambling (real money) | No |
| Loot Boxes | No |

## Step 8. Other

| Question | Answer |
| --- | --- |
| Made for Kids | **No**. The app is a general-audience scholarly library and is not built to the Kids category rules |
| Age rating override (higher than calculated) | Do not set one |

**Result:** 4+.

## Caveat: lectures with historical narratives

Some content is spoken narration of Islamic history and Prophetic biography, for example «غزوة بدر» and the سيرة lectures. These recount battles in a scholarly, non-graphic register, and there is no imagery. Apple treats infrequent, non-graphic references in educational spoken content as **None**. If the Foundation knows of a lecture that describes injuries, executions or punishments in vivid detail, answer **Realistic Violence: Infrequent/Mild**. That moves the rating to **9+**, which is acceptable, and it is better to over-rate than to be re-rated after review. Before submitting, the Foundation's content team should confirm which of the two answers applies: `«[يُستكمل: تأكيد المؤسسة لطبيعة المحتوى القصصي]»`.

The same applies if the Foundation adds a fatwa section on topics that Apple lists under "Mature or Suggestive Themes". Re-answer the questionnaire when that content ships.
