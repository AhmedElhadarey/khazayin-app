/**
 * The Mushaf reader's meta strip, `DIV-47` (2349:994): physically
 * "صفحة ١ من ٦٠٤ • ٧ آيات • مكية", a centred line of parts 16 apart.
 *
 * It is a READING_GRID authored مكية, ٧ آيات, صفحة, so the revelation type
 * sits at the physical right and a wrap at 320dp / large type moves the page
 * (read last) to the next line. Each part owns the `•` that introduces it
 * (node 2349:982 separates the parts with `•`; a middle dot is easily read as
 * a `٠` between two Arabic-Indic numerals).
 *
 * A wrapped line must not start with a bullet, so every part is measured and
 * `metaDotsVisible` decides which dots are drawn. A hidden dot is made
 * transparent, not removed: removing it would narrow its part, which could
 * then fit back on the line above, bring its dot back and wrap again.
 *
 * Wrapped lines stay centred, as the single line is centred by design.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { READING_GRID, READING_ROW } from '@/constants/layout';
import type { MushafMetaSlot } from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { META_GAP } from '@/services/mushafChrome';
import {
  metaDotsVisible,
  surahMetaA11yLabel,
  surahMetaRow,
  type MetaParts,
} from '@/services/mushafNavigation';

type Frame = { y: number; height: number };

export function MushafMetaStrip({ parts, paddingTop }: { parts: MetaParts; paddingTop: number }) {
  const items = surahMetaRow(parts);
  const [frames, setFrames] = useState<Partial<Record<MushafMetaSlot, Frame>>>({});
  const onItemLayout = useCallback((slot: MushafMetaSlot, e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setFrames((prev) => {
      const old = prev[slot];
      return old && old.y === y && old.height === height ? prev : { ...prev, [slot]: { y, height } };
    });
  }, []);
  const dots = metaDotsVisible(items.map((item) => frames[item.slot]));

  return (
    <View
      accessible
      accessibilityLabel={surahMetaA11yLabel(parts)}
      style={[styles.metaRow, { columnGap: META_GAP, paddingTop }]}
    >
      {items.map((item, i) => (
        <View
          key={item.slot}
          onLayout={(e) => onItemLayout(item.slot, e)}
          style={[styles.metaItem, { columnGap: META_GAP }]}
        >
          {item.leadingDot ? (
            <Text style={[styles.metaDot, dots[i] ? null : styles.dotHidden]}>•</Text>
          ) : null}
          <Text style={styles.metaText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

const metaText = textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' });

const styles = StyleSheet.create({
  // The top pad is set at render; it lands the line's centre 54 below the
  // status bar inset.
  metaRow: {
    ...READING_GRID,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  // One part and the `•` that introduces it, the dot read first (physical
  // right). It may shrink, so a part longer than the line wraps inside itself.
  metaItem: {
    ...READING_ROW,
    alignItems: 'center',
    flexShrink: 1,
  },
  metaText: { ...metaText, flexShrink: 1 },
  metaDot: metaText,
  dotHidden: { opacity: 0 },
});
