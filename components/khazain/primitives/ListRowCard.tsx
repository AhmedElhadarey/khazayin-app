import { CARD_DENSITY, PHYSICAL_ROW } from '@/constants/layout';
import { LIST_ROW_ORDER, type ListRowSlot, listRowAccessibilityLabel } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { FigmaIcon } from '../icons/FigmaIcon';

/**
 * The two list rows the design draws with a leading chip, a text column and a
 * trailing disclosure.
 *
 * They are not one row with a density switch — the file draws them as
 * different objects, and the app's old `compact` flag hid that by borrowing
 * the *lecture* row's height for the More card. The visible cost was that the
 * More list (64) and Settings (96) disagreed about how tall a row is while
 * being one tap apart.
 *
 *  - `section` — node 2031:5675 `DIV-43`. 361 x 96 at radius 20, a flat
 *    `#FCFAF8` with no stroke and no shadow, inset 12, and a 64pt *circular*
 *    chip tinted `#D7B995` at 16%, with no stroke (the file hides the one it
 *    carries). Its three lines are the file's only place that titles a row in
 *    the display face.
 *  - `archive` — node 2558:1334 `DIV-59`. The same card 16 taller, the extra
 *    height spent on the inset rather than on the type.
 *  - `more` — node 2102:2711 `websiteLink-13`. 361 x 82 at radius 16, the
 *    same fill behind a 1pt `#F1E7DD` stroke and a 2pt shadow at y+1 (the one
 *    card in either frame that casts one), inset 16, and a 48pt rounded
 *    *square* chip with no stroke. Both its lines are body face at 14.
 *
 * At a large font scale the card grows with its text — every variant sets
 * `minHeight`, never `height` — and the title wraps to two lines.
 *
 * Physical order (left → right) is disclosure, text, icon badge, driven by
 * LIST_ROW_ORDER inside a PHYSICAL_ROW container so React Native cannot
 * reverse it under forceRTL.
 */
export type ListRowVariant = 'section' | 'archive' | 'more';

export function ListRowCard({
  icon,
  title,
  subtitle,
  count,
  chevron = true,
  variant = 'section',
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  count?: string | null;
  chevron?: boolean;
  variant?: ListRowVariant;
  onPress?: () => void;
}) {
  const isMore = variant === 'more';

  const slots: Record<ListRowSlot, React.ReactNode> = {
    // The two rows do not share a disclosure either: the section card
    // instances `vuesax/bulk/arrow-right` at 20, the More row
    // `vuesax/bulk/arrow-circle-left` at 24 — a bare chevron against a
    // circled one.
    //
    // `mirrored` on the bare chevron is not a style choice. Every one of the
    // section/archive instances carries `transform.m00: -1` — 9 on Sections,
    // 10 on Qiraat, 6 on each reciter tab, 3 on Archive — so the file draws
    // this arrow pointing LEFT, into the row. Only the header back control
    // (one per frame, `InlineHeader`) is left upright. The app had been
    // drawing the master unflipped, so every list disclosure pointed the
    // wrong way. `DisclosureCircle` has no mirrored instance and stays as-is.
    disclosure: chevron ? (
      isMore ? (
        <FigmaIcon name="DisclosureCircle" size={24} color={KhazainColors.navy800} />
      ) : (
        <FigmaIcon name="Back" size={20} color={KhazainColors.inkTitle} mirrored />
      )
    ) : null,
    text: (
      <View style={styles.textCol}>
        {/* Two lines, not one: at a large font scale a one-line title either
            ellipsized or, on Android 15, silently lost its last letter
            («الموقع الإلكترون»). At the default scale every title fits one. */}
        <Text style={isMore ? styles.titleMore : styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          // The section copy is longer than a 360dp column even at the default
          // scale («تلاوات وتفسير وتدبر القرآن الكريم»), so it wraps and the
          // card grows; the More row's one-liners keep ellipsizing.
          <Text style={isMore ? styles.subtitleMore : styles.subtitle} numberOfLines={isMore ? 1 : 2}>
            {subtitle}
          </Text>
        ) : null}
        {count ? <Text style={styles.count}>{count}</Text> : null}
      </View>
    ),
    iconBadge: (
      <View style={[styles.chipBase, isMore ? styles.chipMore : styles.chipSection]}>{icon}</View>
    ),
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title, subtitle, count })}
      style={({ pressed }) => [
        styles.cardBase,
        VARIANT_CARD[variant],
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {LIST_ROW_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </Pressable>
  );
}

/**
 * Room under each line for the glyphs that hang below its line box, cancelled
 * by an equal negative margin so the row measures exactly as before.
 *
 * Android 14+ converts `fontSize` and `lineHeight` through its non-linear font
 * scale curve, which grows a larger sp value by less. At font scale 1.7 the
 * 21 line height of a 14 role ends up ~1.26x the glyph size instead of 1.5x,
 * the half-leading goes negative, and the TextView clips the descenders of its
 * last line to its own bounds (the dots of ي and the tail of ع were cut off on
 * the 320dp matrix). Padding is inside that clip; the parent does not clip.
 */
const DESCENDER_SLACK = 8;
const descenderRoom = { paddingBottom: DESCENDER_SLACK, marginBottom: -DESCENDER_SLACK } as const;

/**
 * The More card's vertical inset. The file draws none — its two 21pt lines sit
 * centred in the 82 — so this only shows once the text outgrows the card:
 * 12 + 42 + 12 + 2 hairline = 68, inside the 82, so the default is unchanged.
 */
const MORE_CARD_MIN_INSET = 12;

const styles = StyleSheet.create({
  cardBase: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    // The text column ends 16 short of the chip in all three frames: 285 -> 301
    // on the section and archive cards, 296 -> 312 on the More row.
    gap: 16,
    backgroundColor: KhazainColors.cardBg,
  },
  cardSection: {
    minHeight: CARD_DENSITY.sectionCardHeight,
    paddingVertical: CARD_DENSITY.sectionCardPaddingVertical,
    paddingHorizontal: CARD_DENSITY.sectionCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.sectionCardRadius,
  },
  // `DIV-59` — the same card 16 taller, with the extra height spent on the
  // inset rather than on the type.
  cardArchive: {
    minHeight: CARD_DENSITY.archiveCardHeight,
    paddingVertical: CARD_DENSITY.archiveCardPaddingVertical,
    paddingHorizontal: CARD_DENSITY.sectionCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.sectionCardRadius,
  },
  // `websiteLink-13` is the one card in either the Sections or the More frames
  // that casts a shadow at all, and it is a much tighter one than the app's
  // `card` elevation.
  cardMore: {
    minHeight: CARD_DENSITY.moreCardHeight,
    paddingVertical: MORE_CARD_MIN_INSET,
    paddingHorizontal: CARD_DENSITY.moreCardPaddingHorizontal,
    borderRadius: CARD_DENSITY.moreCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.hairlineCream,
    ...KhazainShadows.listRow,
  },
  chipBase: {
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // `DIV-58` carries a 1pt `#A88051` stroke paint, but it is set
  // `visible: false` — the disc is its 16% fill alone.
  chipSection: {
    width: CARD_DENSITY.sectionIconDisc,
    height: CARD_DENSITY.sectionIconDisc,
    borderRadius: CARD_DENSITY.sectionIconDisc / 2,
  },
  // A squircle, not a disc, and the file gives it no stroke.
  chipMore: {
    width: CARD_DENSITY.moreChipSize,
    height: CARD_DENSITY.moreChipSize,
    borderRadius: CARD_DENSITY.moreChipRadius,
  },
  // Full width, never shrink-wrapped (Android 15 breaks lines by ink bounds,
  // RN 0.81 measures by advances); the text styles carry textAlign 'right'.
  // Stretched to the card's height too, so it re-centres its own lines.
  textCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  title: { ...textStyle('sectionTitle', { color: KhazainColors.inkTitle }), ...descenderRoom },
  // `H3-49` ends at y=186 and `P-52` starts at 192; `P-55` follows 2 later.
  subtitle: {
    ...textStyle('cardTitle', { color: KhazainColors.inkSubtle }),
    ...descenderRoom,
    marginTop: 6,
  },
  count: {
    ...textStyle('label', { color: KhazainColors.inkCount }),
    ...descenderRoom,
    marginTop: 2,
  },
  // `H3-18` and `P-21` are both TheMixArab Regular 14, set flush — the first
  // ends at y=146.5 and the second starts there.
  titleMore: { ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }), ...descenderRoom },
  subtitleMore: { ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }), ...descenderRoom },
});

const VARIANT_CARD = {
  section: styles.cardSection,
  archive: styles.cardArchive,
  more: styles.cardMore,
} satisfies Record<ListRowVariant, ViewStyle>;
