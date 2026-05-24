import { KhazainColors } from '@/constants/theme';
import { todayHijriArabic } from '@/lib/hijriDate';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SearchPill } from '../primitives';
import { FoundationMark } from './FoundationMark';

// Home header row: bell chip (leading end), greeting + Hijri date + FoundationMark (trailing end),
// then SearchPill below. Matches design_source/app/home.jsx HomeHeader.
export function HomeHeader({
  greeting = 'سبحان الله',
  hijriDate = todayHijriArabic(),
  onBellPress,
  onSearchFocus,
}: {
  greeting?: string;
  hijriDate?: string;
  onBellPress?: () => void;
  onSearchFocus?: () => void;
}) {
  // RTL visual layout (right → left): [FoundationMark][greeting block]   [bell]
  // We use absolute positioning so we don't depend on flex auto-flip
  // (which is unreliable on web / stale dev reloads — see CLAUDE.md).
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.greetBlock}>
          <FoundationMark />
          <View style={styles.greetText}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.hijri}>{hijriDate}</Text>
          </View>
        </View>
        <Pressable
          onPress={onBellPress}
          hitSlop={10}
          accessibilityLabel="الإشعارات"
          style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.8 : 1 }]}
        >
          <BellGlyph />
        </Pressable>
      </View>
      <View style={{ marginTop: 8 }}>
        <SearchPill placeholder="بحث.." onFocus={onSearchFocus} />
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

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    // Note: bottom gap to HeroQuran is owned by `heroPad.marginTop: 8` in
    // app/(tabs)/index.tsx so the search pill→hero gap is exactly 8px (G4).
    paddingBottom: 0,
  },
  row: {
    height: 54,
    position: 'relative',
    justifyContent: 'center',
  },
  bell: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.heroHeaderBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  // RTL visual order: [FoundationMark][greetText] anchored to the right edge.
  // JSX order matches: FoundationMark first → renders on the right under forceRTL.
  greetBlock: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetText: {
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
