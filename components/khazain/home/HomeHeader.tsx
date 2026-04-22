import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import { SearchPill } from '../primitives';
import { FoundationMark } from './FoundationMark';

// Home header row: bell chip (leading end), greeting + Hijri date + FoundationMark (trailing end),
// then SearchPill below. Matches design_source/app/home.jsx HomeHeader.
export function HomeHeader({
  greeting = 'سبحان الله',
  hijriDate = '٤ جمادى الآخرة ١٤٤٧ هـ',
  onBellPress,
  onSearchFocus,
}: {
  greeting?: string;
  hijriDate?: string;
  onBellPress?: () => void;
  onSearchFocus?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          onPress={onBellPress}
          hitSlop={6}
          accessibilityLabel="الإشعارات"
          style={({ pressed }) => [styles.bell, { opacity: pressed ? 0.8 : 1 }]}
        >
          <BellGlyph />
        </Pressable>
        <View style={styles.greetBlock}>
          <View style={styles.greetText}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.hijri}>{hijriDate}</Text>
          </View>
          <FoundationMark />
        </View>
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
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 54,
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
  greetBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greetText: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontFamily: 'Amiri',
    fontSize: 16,
    lineHeight: 17,
    color: KhazainColors.ink900,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  hijri: {
    fontFamily: 'Amiri',
    fontSize: 14,
    lineHeight: 15,
    color: KhazainColors.inkSubtle,
    marginTop: 4,
    writingDirection: 'rtl',
  },
});
