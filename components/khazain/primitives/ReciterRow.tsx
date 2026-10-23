import { CARD_DENSITY, LIST_ROW_TEXT, PHYSICAL_ROW } from '@/constants/layout';
import { textStyle } from '@/constants/typography';
import {
  listRowAccessibilityLabel,
  RECITER_ROW_ORDER,
  type ReciterRowSlot,
} from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '../icons/FigmaIcon';
import { QuranBadge } from './QuranBadge';

// Reciter / Quran-list row used on pages 13/14 (reciter tabs list) and
// page 16 (qiraat sheet — `chevron` only, no subtitle).
//
// `DIV-139` on 2031:6193 and 2457:954: 56 tall at radius 12, `#FCFAF8` behind
// a 1pt `#D9D6D3` hairline, inset 8, and casting no shadow.
//
// Physical order (left → right) is disclosure, text, Quran badge — Figma
// nodes 2031:6193 and 2457:954, driven by RECITER_ROW_ORDER so the row cannot
// reverse under forceRTL. The previous absolute head/chevron blocks are gone:
// they pinned the two clusters to opposite edges and left the middle empty.
export function ReciterRow({
  title,
  subtitle,
  onPress,
  isDefault,
}: {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isDefault?: boolean;
}) {
  const slots: Record<ReciterRowSlot, React.ReactNode> = {
    // `vuesax/bulk/arrow-right` at 20, mirrored — 10 instances on 2457:954 and
    // 7 on 2031:6193, every one of them carrying `transform.m00: -1`. This
    // replaces a hand-drawn stroked chevron, which was both the wrong shape
    // (an outline where the file draws a filled wedge) and the wrong size.
    disclosure: (
      <FigmaIcon name="Back" size={20} color={KhazainColors.inkTitle} mirrored />
    ),
    text: (
      <View style={styles.textCol}>
        <Text style={[styles.title, subtitle ? styles.titleWithSubtitle : null]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {isDefault ? <Text style={styles.defaultBadge}>الافتراضي</Text> : null}
      </View>
    ),
    quranBadge: <QuranBadge size={CARD_DENSITY.lectureBadgeDisc} />,
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={listRowAccessibilityLabel({ title, subtitle })}
      style={({ pressed }) => [
        styles.row,
        isDefault ? styles.rowDefault : null,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {RECITER_ROW_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    // 1 + 3 + 48 + 3 + 1 = 56: the 24 + 4 + 20 text column fills the row.
    paddingVertical: LIST_ROW_TEXT.paddingVertical,
    paddingHorizontal: CARD_DENSITY.lectureCardPaddingHorizontal,
    gap: 8,
    borderRadius: CARD_DENSITY.reciterRowRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: LIST_ROW_TEXT.borderWidth,
    borderColor: KhazainColors.hairlineWarm,
    alignItems: 'center',
  },
  rowDefault: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  defaultBadge: {
    ...textStyle('label', { color: KhazainColors.goldAccent }),
    marginTop: 2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    // Full width, not shrink-wrapped (Android 15); text styles are right-aligned.
    alignItems: 'stretch',
    alignSelf: 'stretch',
    gap: 0,
  },
  // `H3-145` is TheMixArab Regular 14, `P-148` TheMixArab Regular 12.
  title: textStyle('bodyCompactLoose', { color: KhazainColors.inkTitle }),
  titleWithSubtitle: { marginBottom: LIST_ROW_TEXT.titleGap },
  subtitle: { ...textStyle('caption', { color: KhazainColors.ink500 }), lineHeight: LIST_ROW_TEXT.subtitleLineHeight },
});
