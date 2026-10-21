import React, { useState } from 'react';
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
 * Border widths of the row frame. The radio's padding and the preview's inset
 * add these, so the content sits where it did when the border was on the
 * radio itself — the frame and the insets must never disagree.
 */
const BORDER = { idle: 1, selected: 1.5 } as const;

/**
 * Internal selectable list row for onboarding selection steps (track 003).
 * Mirrors the gold-bordered + check-icon pattern used by `app/settings-qiraa.tsx`
 * and `app/settings-reciter.tsx` so onboarding and Settings selection match.
 *
 * Structure (design 2026-10-21 §4.3): the outer View is the card (background,
 * shadow, radius, minHeight). Its slots run in `SELECTABLE_ROW_ORDER`: the
 * optional `preview` control, then the radio `select` Pressable, which keeps
 * the tick → text order. The preview is a SIBLING of the radio, not nested in
 * it, so screen readers reach it as its own focus stop.
 *
 * The border is an overlay `frame` drawn after the slots, not a border on the
 * card. At 0635ea1 the bordered view WAS the radio, so its origin sat on the
 * pixel grid and the border acted as padding. A 1.5pt border on the card puts
 * the radio's origin on a half pixel at 3x, and the tick rasterised one device
 * pixel lower. With the overlay, and without a preview, the radio starts at
 * the card's origin and pads by `12/16 + border`, so the row without a preview
 * (the qira'a step) is pixel-identical to the base row.
 *
 * Press feedback also matches the base row: the radio reports its press state
 * (`onPressIn`/`onPressOut`) and the whole card — frame, shadow and content —
 * scales to 0.98, as the bordered Pressable did at 0635ea1.
 */
export function SelectableRow({
  title,
  subtitle,
  selected,
  onPress,
  preview,
}: Props): React.ReactElement {
  const [pressed, setPressed] = useState(false);
  const slots: Record<SelectableRowSlot, React.ReactNode> = {
    preview: preview ? (
      <View style={selected ? styles.previewSlotSelected : styles.previewSlot}>{preview}</View>
    ) : null,
    select: (
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={subtitle ? `${title}، ${subtitle}` : title}
        style={[styles.select, selected ? styles.selectSelected : styles.selectIdle]}
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
    <View style={[styles.card, KhazainShadows.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {SELECTABLE_ROW_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.frame, selected ? styles.frameSelected : null]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Physical left -> right: [preview?] [select]. No border here (see
    // `frame`), so minHeight 64 gives max(64, 2 * border + 24 + content) —
    // the base row's height, where the bordered view carried minHeight.
    ...PHYSICAL_ROW,
    alignItems: 'center',
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
  },
  frame: {
    // Absolutely positioned, so the border takes no layout space and the
    // radio's origin stays on the pixel grid; rendered last so it paints over
    // the slots.
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: BORDER.idle,
    borderColor: KhazainColors.cardBorder,
  },
  frameSelected: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: BORDER.selected,
  },
  select: {
    // Physical left -> right: the selected tick, then the text column, so the
    // Arabic title leads at the right edge. `row-reverse` rendered the mirror
    // of this, because under `forceRTL` the row is already RTL.
    ...PHYSICAL_ROW,
    flex: 1,
    // Fill the card's full height (the card centres its children), so the
    // radio's touch target is the full row height.
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
  },
  // The base row's 12 / 16 padding, plus the frame border it sat inside. The
  // border term matters on edges that touch the frame; with a preview, the
  // radio's left edge sits beside the preview, not the border.
  selectIdle: {
    paddingVertical: 12 + BORDER.idle,
    paddingHorizontal: 16 + BORDER.idle,
  },
  selectSelected: {
    paddingVertical: 12 + BORDER.selected,
    paddingHorizontal: 16 + BORDER.selected,
  },
  previewSlot: {
    // Physical left inset, 12pt inside the frame border — legal inside the
    // pinned card row.
    marginLeft: 12 + BORDER.idle,
  },
  previewSlotSelected: {
    marginLeft: 12 + BORDER.selected,
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
