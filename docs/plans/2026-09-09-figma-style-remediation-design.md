# Figma Style Remediation — Design Specification

**Date:** 2026-09-09  
**Status:** Proposed — ready for user review  
**Scope:** React Native iOS and Android presentation parity for the Mobile page in `KHAZAYIN.fig`

## 1. Goal

Bring the shipping React Native UI into visual and structural parity with the 28 top-level mobile frames in the supplied Figma file while preserving working product features, live data behavior, accessibility, and support for phones of different sizes.

Parity means:

- the same physical RTL placement of navigation, icons, text, rails, and controls;
- the same visual hierarchy, component density, color, radius, shadow, pattern, and typography intent;
- the same route/state coverage as the Figma prototype;
- no clipping or unusable controls on supported iPhone and Android phone widths;
- dynamic data may differ in API mode, but the offline/mock adapter must reproduce the Figma reference content closely enough for deterministic screenshots.

## 2. Source of truth

Use sources in this order:

1. `/Users/ahmedelhadarey/Downloads/KHAZAYIN.fig`, page `Mobile` (`2001:134`) — geometry, ordering, copy, assets, and screen inventory.
2. The public Figma prototype — transitions and intended navigation between those frames.
3. Existing React Native behavior — retained where the Figma file is silent, especially settings, notes, notifications, and audio behavior.
4. Existing theme tokens — only when they agree with the Figma values.

The `design_source/` directory referenced by `CLAUDE.md` is absent in this checkout and is not an implementation authority for this work.

## 3. Audited baselines

| Baseline | Logical size | Purpose |
|---|---:|---|
| Figma splash | 393 × 852 | Launch sequence reference |
| Figma standard content frame | 393 × 844 | Pixel/geometry reference |
| Figma Home scroll frame | 393 × 1321 | Full Home content/order |
| Figma Library scroll frame | 393 × 1891 | Full Library content/order |
| iPhone 16 simulator | 393 × 852 pt | Exact-width iOS validation |
| Pixel 7 emulator | ~411 × 914 dp | Wider/taller Android validation |

Additional responsive validation widths: 320, 360, 375, 393, 411, 430, and 480 dp/pt.

### 3.1 Visual audit evidence

The complete 78-image audit record is stored in [`docs/audit/2026-09-09`](../audit/2026-09-09/README.md). These images are normative evidence for this specification and must remain unchanged during remediation.

- [Key comparison sheet](../audit/2026-09-09/key-comparisons.png) — fastest overview of the largest visual differences.
- [All 28 Figma reference frames](../audit/2026-09-09/figma-reference/) — authoritative frame exports, named by sequence and node ID.
- [App route/state captures](../audit/2026-09-09/app-captures/) — running-app evidence captured during the audit.
- [Side-by-side comparisons](../audit/2026-09-09/comparisons/) — direct Figma-versus-app evidence for comparable routes.
- [iPhone 16 and Pixel 7 captures](../audit/2026-09-09/device-captures/) — device-level safe-area and responsive evidence.
- [Figma contact sheet](../audit/2026-09-09/figma-contact-sheet.png) and [app contact sheet](../audit/2026-09-09/app-contact-sheet.png) — complete visual inventories.

Each screen requirement in section 6 must be evaluated against its numbered PNG in `figma-reference/`. Where a matching file exists in `comparisons/`, that pair records the audited starting condition. New screenshots produced while implementing fixes must be stored separately and must not overwrite this evidence baseline.

## 4. Selected implementation approach

### Recommended: shared-primitives-first remediation

Fix physical RTL behavior, tab navigation, headers, typography, spacing, and card primitives before changing individual routes. Most audited differences are repeated primitive failures; fixing screens independently would create divergent rules.

Alternatives considered:

- **Disable RTL style swapping globally:** smaller local diffs in some places, but high regression risk across settings, notes, legacy screens, and third-party navigation.
- **Remove global `forceRTL` and make every screen local RTL:** clean long-term semantics but unnecessarily broad for an Arabic-only app.

Decision: retain global RTL and make physical row order deterministic inside shared primitives. Do not change `I18nManager.swapLeftAndRightInRTL` globally in this track.

## 5. Global design contract

### 5.1 RTL and physical placement

- Arabic text always uses `writingDirection: 'rtl'` and the Figma-specified alignment.
- Physical layout order must not depend on React Native automatically flipping `flexDirection: 'row'`.
- Containers whose child order is authored left-to-right must set an explicit physical direction (`direction: 'ltr'`) while their text remains RTL.
- Prefer logical `start`/`end` positioning for semantically leading/trailing content. Use physical `left`/`right` only inside a container whose `direction` is explicitly controlled.
- Required physical orders:
  - Bottom navigation, left → right: More, Sections, Library, Home.
  - Section/list cards, left → right: back/disclosure, text, icon badge.
  - Letter index: physical right edge.
  - Standard inline header: title at physical right with RTL back chevron immediately to its right.
  - Mushaf footer, left → right: Index, Go to bookmark, Save bookmark.
- Back affordances point right for RTL navigation.
- These orders must match on iOS, Android, cold reload, Fast Refresh, and web smoke rendering.

### 5.2 Standard geometry

At the 393-point Figma reference width:

| Element | Specification |
|---|---|
| Screen gutter | 16 pt unless a frame explicitly uses 14 or 18 |
| Standard vertical gap | 8 pt |
| Inline header content row | 44 pt |
| Search control | 40 pt high, 12 pt radius |
| Section/root list card | 96 pt high, 64 pt icon disc, 20 pt radius |
| Standard lecture card | 64–68 pt visual height |
| Reciter/Qiraa row | 56–64 pt visual height |
| Bottom navigation | 83 pt total: 49 pt controls + 34 pt iPhone safe-area reference |
| Active navigation item | 67 × 49 pt, radius 8 |
| Active navigation fill | `rgba(215, 185, 149, 0.16)` |
| Active navigation indicator | 40 × 4 pt, `#C1A584` |
| Navigation background | `#184B76` |
| Navigation icon | 24 pt |

Card height may grow only when real text requires wrapping. Mock/reference content must reproduce the Figma height.

### 5.3 Typography

- Display/header Arabic: Amiri family where shown in Figma.
- UI labels and body: TheSansArabic/TheMixArab design families.
- Current Noto Sans aliases are an interim fallback, not final pixel parity.
- Final typography acceptance is blocked until licensed font files are supplied or the user explicitly accepts Noto Sans as the permanent substitute.
- Until then:
  - keep family aliases centralized in `app/_layout.tsx`;
  - tune sizes/line heights against the fallback without renaming every component;
  - do not use platform-system Arabic fonts unintentionally;
  - apply at most two text lines where Figma uses two and ellipsize only where Figma does.

### 5.4 Color, border, shadow, and patterns

- Canonical page background: `#F8F2ED` unless the frame has a specialized Mushaf surface.
- Canonical navigation navy: `#184B76`.
- Cards should use the Figma cream/near-white fill and a subtle border; Android elevation must not create the heavy gray outline visible in the audit.
- Patterns must match Figma opacity and coverage. Do not tile the ornament at high contrast across an entire screen when Figma uses a faint corner/header treatment.
- Shadows must remain visible but must not increase the perceived card height or create dark separators.

### 5.5 Responsive behavior

- Never set a screen or primary card to a fixed width of 393.
- Use full available width minus gutters through 480 dp/pt.
- At widths below 375:
  - reduce horizontal gaps before font size;
  - preserve 44 × 44 minimum touch targets;
  - allow approved text wrapping;
  - keep icon and disclosure columns fixed so text cannot push controls off-screen.
- At widths above 430, content may expand to 480 and center; do not scale icons or type proportionally with screen width.
- Every scroll screen must reserve the measured bottom-navigation/safe-area height exactly once.
- Font-scale validation:
  - 1.0: visual parity target;
  - 1.3: no overlap, clipping, or unreachable content;
  - larger accessibility sizes may reflow and need not remain pixel-identical.

### 5.6 Loading, empty, and dynamic data

- Screenshot parity is evaluated after async mock content reaches `success`.
- Skeletons must occupy approximately the final component geometry so the page does not jump dramatically.
- Empty states are valid only when the reference dataset is genuinely empty.
- Offline/mock content must contain the rows needed by all 28 design frames.
- API-backed content may use different names/counts, but must preserve component geometry and RTL placement.

## 6. Screen-by-screen specification

### 6.1 Splash sequence

| Node | Required result |
|---|---|
| `2001:835` | Initial patterned launch state. Must not flash Home before fonts/settings hydrate. |
| `2001:888` | Background/wordmark phase reproduced as part of the cold-start sequence. |
| `2001:914` | Center emblem phase; current `splash-khazain.png` is the closest asset. |
| `2007:511` | Exit/hold phase transitions to Home without a white or black flash. |

Implementation specification:

- Keep a native static splash for instant startup.
- Add a lightweight React Native launch overlay for the Figma multi-state sequence after the root view is ready.
- Run only on a cold app start, not every tab return or Fast Refresh.
- Respect Reduce Motion by showing one final splash state and fading directly to Home.
- Total post-native sequence target: 600–1200 ms; it must never delay app readiness longer than required data/font hydration.

### 6.2 Home and Library

| Node | Route | Required result |
|---|---|---|
| `2001:940` | `/` | Match header, first Quran hero, Prophet hero composition, section headers, horizontal cards, quick chips, Dawah carousel, and navigation. Replace or crop the Prophet hero to the Figma composition. Dynamic Hijri date is allowed. |
| `2031:4659` | `/library` | Restore the full Figma hierarchy: header/search → three summary cards → daily Wird → quick note/recent notes → count/filter group → audiobook progress → smart reminders. Preserve newer history/insight functionality below the reference sections or behind its existing filter; it must not displace the initial Figma viewport. |

Home acceptance:

- Quran hero bounds and artwork crop differ by no more than 4 pt at width 393.
- Prophet hero uses the same visual balance as Figma; no extra dominant artwork.
- Bottom navigation uses the exact physical order and selected-state geometry in §5.2.

Library acceptance:

- Top summary cards appear in the same RTL order as Figma.
- The daily Wird card is compact enough that Quick Note begins at the same approximate scroll position.
- Additional product metrics do not appear between Figma-defined sections.

### 6.3 Sections and Quran flows

| Node | Route/state | Required result |
|---|---|---|
| `2031:5675` | `/sections` | Nine section cards in Figma order; icon right, disclosure left, text right-aligned. Mock titles/counts match Figma. |
| `2031:6193` | `/sections/reciter`, default tab | Header/search/tabs/list/letter rail remain at the top with no vertical void. |
| `2102:3187` | `/sections/reciter`, Murattal tab | Same shell; Murattal selected and its reference rows visible. |
| `2207:5270` | New reciter-audio Surah state | Selecting a reciter opens an audio-oriented Surah list tied to that reciter instead of redirecting to the general Mushaf. |
| `2207:17898` | `/sections/mushaf` | Reading index rows match Figma geometry and physical placement. |
| `2349:829` | Mushaf reader loading/transition | Provide a stable page-background/loading state without flashing Sections or unrelated content. |
| `2349:982` | `/sections/mushaf?surah=<id>` | Header metadata and footer match Figma. Real ayah text replaces the prototype's black media area when available. Footer physical order is Index / Go to bookmark / Save bookmark. |
| `2457:954` | `/sections/qiraat` | Sheet handle/title and ten Qiraa rows match the Figma list density, RTL adornment placement, and selected/default styling. |

Quran-specific behavior:

- `SegmentTabs` must use a non-growing horizontal scroller.
- Reciter selection passes a real reciter ID to the next route.
- Reciter-audio Surah rows remain distinct from Mushaf reading rows.
- Loading, no-audio, and empty states cannot silently reroute to Sections.

### 6.4 Content-list screens

| Node | Route/state | Required result |
|---|---|---|
| `2102:2975` | `/sections/scholar` | Right-side alphabet rail, compact scholar cards, Figma header/search placement. |
| `2465:1911` | `/sections/prophet` | Compact 64–68 pt lecture rows with Prophet badge on right and duration on left. |
| `2510:1990` | `/sections/scholar/s1` | Figma scholar identity hierarchy, search field, and lecture rows. Mock content matches the reference state. |
| `2589:1772` | `/sections/queen` | Compact rows, crown badge on right, duration on left. |
| `2597:2552` | `/sections/books` | Use the Figma lecture/book row content and icon treatment in mock mode; retain real API titles when API mode is active. |
| `2606:3830` | `/sections/radio` | Compact radio rows with mic badge on right and duration on left. |
| `2869:2088` | New `/sections/audiobooks` | Implement the Figma audiobook list; route from Sections and Home quick chip. |
| `2869:2306` | New `/sections/exclusive` | Implement title/search/right-side letter rail and exclusive-content rows; route from Sections and Home quick chip. |

All lecture-like screens share a single density specification; do not create per-screen padding forks unless the Figma frame differs.

### 6.5 Dawah screens

| Node | Route/state | Required result |
|---|---|---|
| `2120:942` | `/sections/dawah` | Six month rows in reference order and compact geometry. Pattern opacity/coverage matches Figma. |
| `2120:1857` | `/sections/dawah/shawwal-ramadan` | Four poster/action rows appear in mock mode. Do not show the current incorrect empty state. |

Data requirement: add `shawwal-ramadan` poster records or normalize the route slug to the populated month key. Title and data key must not disagree.

### 6.6 More screens

| Node | Route | Required result |
|---|---|---|
| `2102:2711` | `/more` | Figma rows begin with Website, YouTube, Telegram, WhatsApp, SoundCloud, Archive, Contact, About. Settings and Progress Settings remain available but move after the Figma-defined group so the initial viewport matches. |
| `2106:2598` | `/more/contact` | Inline RTL header, two contact methods, form, and button match reference spacing and physical icon placement. Keyboard avoidance remains functional. |
| `2106:2712` | `/more/about` | Match title, two introductory paragraphs, Vision card, and Mission card. Reduce pattern strength and excess whitespace. |
| `2558:1334` | `/more/archive` | Header/search plus Scholars, Scientific Books, and Audiobooks rows. Icon right, disclosure left. |

### 6.7 Implemented screens without top-level Figma frames

The following features are preserved and receive the global RTL, typography, safe-area, color, and responsive fixes, but are excluded from pixel-parity signoff until designs are supplied:

- onboarding steps;
- search results;
- settings and progress settings;
- Qiraa, reciter, font-size, notification, prayer, Wird-goal, and reminder settings;
- note editor and notes viewer;
- Telegram, YouTube, and share sheets;
- legacy hidden routes and development sandbox.

They must not be deleted or hidden merely because the Mobile page has no reference frame.

## 7. Accessibility specification

- Interactive targets are at least 44 × 44 pt/dp even when the visual card is compact.
- Every icon-only control has an Arabic accessibility label.
- Selected tabs expose `accessibilityState.selected`.
- Text contrast meets WCAG AA for normal text.
- Focus order follows the visual RTL reading order.
- Reduce Motion bypasses non-essential splash and card animations.

## 8. Verification and acceptance gates

### Automated gates

- Jest tests pass.
- TypeScript passes with `npx tsc --noEmit --pretty false`.
- No new lint violations in touched files.
- Tests cover physical order contracts, route availability, month-data integrity, and responsive width calculations.

### Visual gates

- Capture every mapped app route/state at iPhone 16 and Pixel 7 sizes.
- Compare against all 28 Figma nodes; mask only OS status/navigation indicators and dynamic time/date.
- At width 393, major landmarks must be within 4 pt of Figma.
- No reversed physical order remains.
- No clipped text, controls, or rails at widths 320–480.
- No loading skeleton remains indefinitely in the offline/mock adapter.

### Definition of done

- All 28 Figma rows in the screen matrix are `PASS`, or have a documented user-approved exception.
- Extra non-Figma screens pass the global responsive/RTL checklist.
- Final side-by-side contact sheets are reviewed on both platforms.
- Proprietary font status is explicitly recorded as supplied, substituted with approval, or still blocking exact typography parity.

## 9. Assumptions requiring confirmation before final pixel signoff

The plan proceeds with these defaults unless the user changes them:

1. Preserve newer app features that are not present in Figma; reposition them rather than delete them.
2. Implement the four splash frames as a native splash plus short React Native launch overlay.
3. Add deterministic mock records for missing Figma states until backend content exists.
4. Keep Noto Sans aliases during implementation, but treat licensed TheSansArabic/TheMixArab files as required for exact final typography.

## 10. Out of scope

- Tablet-specific redesign; tablets receive centered phone-width content until tablet frames exist.
- Backend API design or content-management workflows.
- Rewriting navigation or state management unrelated to the audited presentation issues.
- Deleting legacy routes.
- Changing audio-engine behavior except where a missing Figma route needs to invoke the existing player boundary.
