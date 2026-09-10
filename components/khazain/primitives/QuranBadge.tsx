import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// The Quran mark inside a cream-tinted circular tile — node `quran-01` inside
// `DIV-58` on 2031:6193, 2102:3187, 2457:954 and 2031:5675.
//
// The file draws an open book: a narrower leaf above a wider one, both stroked
// `#A88051`, inside a disc that carries a 1pt stroke of the same gold. The
// previous mark was a pair of downward chevrons, which read as a scroll-down
// affordance rather than a book.
export function QuranBadge({ size = 48 }: { size?: number }) {
  return (
    <View style={[styles.disc, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.6} height={size * 0.55} viewBox="0 0 26 24" fill="none">
        {/* The upper leaf — 20.48 x 11.52 in the file, centred over the lower. */}
        <Path
          d="M13 6 C10.5 3.4 7.3 2.4 4 2.6 L4 12 C7.3 11.8 10.5 12.8 13 15.4 C15.5 12.8 18.7 11.8 22 12 L22 2.6 C18.7 2.4 15.5 3.4 13 6 Z"
          stroke={KhazainColors.goldAccent}
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
        {/* The lower leaf — 25.6 x 15.36, the cover the pages sit in. */}
        <Path
          d="M13 15.4 L13 21.6 M1.5 8.5 L1.5 18 C1.5 19.4 2.6 20.4 4 20.3 C7.4 20.1 10.6 21 13 21.6 C15.4 21 18.6 20.1 22 20.3 C23.4 20.4 24.5 19.4 24.5 18 L24.5 8.5"
          stroke={KhazainColors.goldAccent}
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: KhazainColors.iconChipBg,
    borderWidth: 1,
    borderColor: KhazainColors.goldAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
