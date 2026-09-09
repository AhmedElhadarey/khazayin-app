import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { RECITER_ROW_ORDER, type ReciterRowSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { QuranBadge } from './QuranBadge';

// Reciter / Quran-list row used on pages 13/14 (reciter tabs list) and
// page 16 (qiraat sheet — `chevron` only, no subtitle).
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
    disclosure: (
      <Svg width={12} height={14} viewBox="0 0 12 14">
        <Path
          d="M9 1 L3 7 L9 13"
          stroke={KhazainColors.navy800}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    ),
    text: (
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
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
    quranBadge: <QuranBadge size={44} />,
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle].filter(Boolean).join('، ')}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
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
    minHeight: 64,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
    alignItems: 'center',
  },
  rowDefault: {
    borderColor: KhazainColors.goldAccent,
    borderWidth: 1.5,
  },
  defaultBadge: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    fontWeight: '600',
    color: KhazainColors.goldAccent,
    ...RTL_TEXT,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 24,
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
});
