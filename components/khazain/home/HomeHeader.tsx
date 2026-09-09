import { KhazainColors } from '@/constants/theme';
import { todayHijriArabic } from '@/lib/hijriDate';
import React from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SearchPill } from '../primitives';
import { FoundationMark } from './FoundationMark';

// Home header row: bell chip (leading end), greeting + Hijri date + FoundationMark (trailing end),
// then SearchPill below. Matches design_source/app/home.jsx HomeHeader.
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
  // RTL visual layout (right → left): [FoundationMark][greeting block]   [bell]
  // Use an explicit direction so native and web agree on the visual order.
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.greetBlock}>
          <FoundationMark />
          <View style={styles.greetText}>
            <Text style={styles.greeting}>{greeting}</Text>
            {/* Omit the line entirely when the date is unavailable. Showing a
                placeholder would mean displaying a Hijri date that is wrong. */}
            {hijriDate ? <Text style={styles.hijri}>{hijriDate}</Text> : null}
          </View>
        </View>
        <Pressable
          onPress={onBellPress}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="الإشعارات"
          style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.8 : 1 }]}
        >
          <BellGlyph />
        </Pressable>
      </View>
      <View style={{ marginTop: 8 }}>
        <SearchPill placeholder="بحث.." onPress={onSearchOpen} />
      </View>
    </View>
  );
}

function BellGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.44 17.29c-.78 0-1.22-1.05-.66-1.62l1.12-1.12c.3-.3.48-.75.48-1.2v-3.24c0-3.95 3.21-7.16 7.16-7.16 3.94 0 7.16 3.21 7.16 7.16v3.24c0 .45.18.9.48 1.2l1.12 1.12c.57.57.17 1.62-.66 1.62H3.44z"
        fill={KhazainColors.navy800}
        opacity={0.4}
      />
      <Path
        d="M13.88 4.15a1.88 1.88 0 1 1-3.76 0A1.88 1.88 0 0 1 13.88 4.15z"
        fill={KhazainColors.navy800}
      />
      <Path
        d="M14.83 18.3a2.85 2.85 0 0 1-5.66 0"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const ROW_DIR: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row' : 'row-reverse';

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    // Note: bottom gap to HeroQuran is owned by `heroPad.marginTop: 8` in
    // app/(tabs)/index.tsx so the search pill→hero gap is exactly 8px (G4).
    paddingBottom: 0,
  },
  row: {
    minHeight: 54,
    flexDirection: ROW_DIR,
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
  // RTL visual order: [FoundationMark][greetText] anchored to the right edge.
  // JSX order matches: FoundationMark first → renders on the right under forceRTL.
  greetBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: ROW_DIR,
    alignItems: 'center',
    gap: 8,
  },
  greetText: {
    flexShrink: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  greeting: {
    fontFamily: 'TheMixArab',
    fontSize: 16,
    color: KhazainColors.ink900,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  hijri: {
    fontFamily: 'TheMixArab',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    marginTop: 4,
    writingDirection: 'rtl',
  },
});
