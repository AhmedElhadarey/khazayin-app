import { CARTOUCHE_PHYSICAL_ORDER } from '@/constants/rtlContracts';
import { PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { toArabicDigits } from '@/constants/progress';
import { KhazainColors } from '@/constants/theme';
import { BASMALA_TEXT, basmalaShown } from '@/services/mushafChrome';
import { useLineClamp } from '@/hooks/useLineClamp';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

/**
 * The surah header band and, under it, the plain basmala line (MUSHAF-04).
 * The frame is a vector stand-in drawn in the page-art brown and gold; real
 * client art replaces it behind the same props. No third-party page image is
 * used.
 */
export function SurahCartouche({
  surahNumber,
  name,
  ayahCount,
  basmalaType,
}: {
  surahNumber: number;
  name: string;
  /** The reader's type scale (`mushafType`), so the basmala grows with the ayat below it. */
  basmalaType?: { fontSize: number; lineHeight: number };
  /** Left out of the band while unknown rather than printed as a placeholder. */
  ayahCount?: number;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const oneLine = useLineClamp(1);
  const parts = {
    order: <Side key="order" text={`ترتيبها ${toArabicDigits(surahNumber)}`} />,
    name: (
      <Text key="name" style={styles.name} numberOfLines={oneLine}>
        {`سورة ${name}`}
      </Text>
    ),
    ayahs: ayahCount ? (
      <Side key="ayahs" text={`آياتها ${toArabicDigits(ayahCount)}`} />
    ) : (
      <View key="ayahs" style={styles.side} />
    ),
  };
  return (
    <View style={styles.wrap}>
      <View
        style={styles.band}
        // One element for a screen reader, in reading order: the row is a
        // PHYSICAL_ROW (ltr), so its children would be read left to right.
        accessible
        accessibilityLabel={`سورة ${name}، ترتيبها ${toArabicDigits(surahNumber)}${
          ayahCount ? `، آياتها ${toArabicDigits(ayahCount)}` : ''
        }`}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
        }}
      >
        {size ? (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
            <Rect
              x={1}
              y={1}
              width={size.w - 2}
              height={size.h - 2}
              rx={8}
              fill={KhazainColors.cream200}
              stroke={KhazainColors.gold500}
              strokeWidth={2}
            />
            <Rect
              x={5}
              y={5}
              width={size.w - 10}
              height={size.h - 10}
              rx={5}
              fill="none"
              stroke={KhazainColors.inkBrown}
              strokeWidth={1}
              opacity={0.7}
            />
          </Svg>
        ) : null}
        <View style={styles.row}>{CARTOUCHE_PHYSICAL_ORDER.map((slot) => parts[slot])}</View>
      </View>
      {basmalaShown(surahNumber) ? <Text style={[styles.basmala, basmalaType]}>{BASMALA_TEXT}</Text> : null}
    </View>
  );
}

function Side({ text }: { text: string }) {
  return (
    <View style={styles.side}>
      <Text style={styles.sideText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  band: { minHeight: 56, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  row: { ...PHYSICAL_ROW, alignItems: 'center' },
  side: { flex: 1, alignItems: 'center' },
  sideText: {
    ...RTL_TEXT,
    textAlign: 'center',
    fontFamily: 'Amiri',
    fontSize: 13,
    color: KhazainColors.inkBrown,
  },
  name: {
    ...RTL_TEXT,
    textAlign: 'center',
    flex: 2,
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '400',
    color: KhazainColors.inkBrown,
  },
  basmala: {
    ...RTL_TEXT,
    textAlign: 'center',
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    lineHeight: 40,
    fontWeight: '400',
    color: KhazainColors.mushafInk,
    paddingTop: 12,
  },
});
