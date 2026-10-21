import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PHYSICAL_ROW } from '@/constants/layout';
import { SELECTABLE_ROW_ORDER, type SelectableRowSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  /** Optional control (the reciter audio preview) shown at the physical left. */
  preview?: React.ReactNode;
};

/**
 * Internal selectable list row for onboarding selection steps (track 003).
 * Mirrors the gold-bordered + check-icon pattern used by `app/settings-qiraa.tsx`
 * and `app/settings-reciter.tsx` so onboarding and Settings selection match.
 *
 * Structure (design 2026-10-21 §4.3): the outer View is the card and carries
 * only chrome (border, background, shadow, gold selected border). Its slots run
 * in `SELECTABLE_ROW_ORDER`: the optional `preview` control, then the radio
 * `select` Pressable, which keeps the row's padding and tick → text order
 * (minHeight stays on the card, beside the border). The preview is a SIBLING of the radio, not nested in it, so screen
 * readers reach it as its own focus stop. Without `preview` (the qira'a step)
 * the row renders as it did before.
 */
export function SelectableRow({
  title,
  subtitle,
  selected,
  onPress,
  preview,
}: Props): React.ReactElement {
  const slots: Record<SelectableRowSlot, React.ReactNode> = {
    preview: preview ? <View style={styles.previewSlot}>{preview}</View> : null,
    select: (
      <Pressable
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title}
        style={({ pressed }) => [styles.select, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        {selected ? (
          <Svg width={18} height={18} viewBox="0 0 18 18">
            <Path
              d="M4 9.5l3.5 3.5L14 5.5"
              stroke={KhazainColors.goldAccent}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        ) : null}
        <View style={styles.textCol}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
    ),
  };

  return (
    <View style={[styles.card, KhazainShadows.card, selected ? styles.cardSelected : null]}>
      {SELECTABLE_ROW_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Physical left -> right: [preview?] [select]. Chrome plus minHeight;
    // padding lives on `select`. minHeight must sit here, beside the border:
    // Yoga applies it to the border-box, so on `select` it made the card
    // 64 + 2 * border, ~2pt taller than the base row.
    ...PHYSICAL_ROW,
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  cardSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  select: {
    // Physical left -> right: the selected tick, then the text column, so the
    // Arabic title leads at the right edge. `row-reverse` rendered the mirror
    // of this, because under `forceRTL` the row is already RTL.
    ...PHYSICAL_ROW,
    flex: 1,
    // Fill the card's full height (the card centres its children), so the
    // radio's touch target is the whole row.
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  previewSlot: {
    // Physical left inset — legal inside the pinned card row.
    marginLeft: 12,
  },
  textCol: { flex: 1, gap: 2 },
  rowTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowSubtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
