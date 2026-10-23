import { PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useWindowControlsInset } from '@/hooks/useResponsiveLayout';
import { todayHijriArabic } from '@/lib/hijriDate';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '../icons/FigmaIcon';
import { SearchPill } from '../primitives';
import { FoundationMark } from './FoundationMark';

// Home header row (Figma node 2001:940). The bell is `Frame 3` 2001:16819: a 32pt
// #ECDED0 chip holding the vuesax/bulk/notification-bing instance at 24, which
// the instance recolours to #184B76 (body at 40%).
//
// Physical left → right: [bell chip] ......... [greeting + Hijri date][mark]
// Authored in that order inside PHYSICAL_ROW containers so the bell cannot
// swap to the right under forceRTL.
export function HomeHeader({
  greeting = 'سبحان الله',
  hijriDate = todayHijriArabic(),
  onBellPress,
  onSearchOpen,
}: {
  greeting?: string;
  /** `null` when the device cannot compute a Hijri date — render nothing. */
  hijriDate?: string | null;
  onBellPress?: () => void;
  onSearchOpen?: () => void;
}) {
  // In an iPad window the system's window controls sit over the header's top corner.
  const controls = useWindowControlsInset();
  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { paddingLeft: controls.left, paddingRight: controls.right }]}>
        <Pressable
          onPress={onBellPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="الإشعارات"
          style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.8 : 1 }]}
        >
          <FigmaIcon name="Notification" size={24} />
        </Pressable>
        <View style={styles.greetBlock}>
          <View style={styles.greetText}>
            <Text style={styles.greeting}>{greeting}</Text>
            {/* Omit the line entirely when the date is unavailable. Showing a
                placeholder would mean displaying a Hijri date that is wrong. */}
            {hijriDate ? <Text style={styles.hijri}>{hijriDate}</Text> : null}
          </View>
          <FoundationMark />
        </View>
      </View>
      <View style={{ marginTop: 8 }}>
        <SearchPill placeholder="بحث.." onPress={onSearchOpen} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    // Note: bottom gap to HeroQuran is owned by `heroPad.marginTop: 8` in
    // app/(tabs)/index.tsx so the search pill→hero gap is exactly 8px (G4).
    paddingBottom: 0,
  },
  row: {
    ...PHYSICAL_ROW,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.heroHeaderBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    flexShrink: 0,
  },
  // Physical order inside the right-hand group: [greetText][FoundationMark].
  greetBlock: {
    ...PHYSICAL_ROW,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  greetText: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  greeting: {
    ...textStyle('body', { color: KhazainColors.ink900 }),
  },
  hijri: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkSubtle }),
    marginTop: 2,
  },
});
