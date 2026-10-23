import { PHYSICAL_ROW, SEGMENT_TABS, physicalTabOrder } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

// The reciter tab strip — node "\u0661" on 2031:6193. Four 84 x 45 tabs 8
// apart on `#EDE0D1`, each labelled in the display face at 10 in navy, with a
// 70 x 4 navy bar pinned to the bottom edge of the selected one.
//
// The file draws the bar on every tab, because it only ever models the strip
// in one state; keeping it on the active tab alone is what makes the control
// legible, and the label colour stays navy either way, as stated.
//
// `tabs` are authored in RTL reading order (right-most first, so the default
// tab is index 0). `physicalTabOrder` reverses that into left → right and
// PHYSICAL_ROW pins it, so the strip cannot flip between iOS and Android.
//
// The strip never grows vertically: a horizontal ScrollView defaults to
// flexGrow 1 and used to swallow the whole gap between the search field and
// the list.
export function SegmentTabs<T extends string>({
  tabs,
  active,
  onChange,
  style,
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (k: T) => void;
  /** Outer strip style, e.g. the tablet reading column. */
  style?: StyleProp<ViewStyle>;
}) {
  // `style` goes on a wrapper: a column's side borders on the ScrollView
  // itself would offset its content, which iOS applies twice.
  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.scroll}
      >
        {/* iOS only announces `tab` children ("tab, 2 of 4", selected) inside
            a `tablist` container; without it VoiceOver read plain groups. */}
        <View style={styles.row} accessibilityRole="tablist">
          {physicalTabOrder(tabs).map((t) => {
            const isActive = t.key === active;
            return (
              <Pressable
                key={t.key}
                onPress={() => onChange(t.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t.label}
                style={({ pressed }) => [
                  styles.tab,
                  isActive ? styles.tabActive : null,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                {/* The file sets every label navy, selected or not — the bar is
                    the whole of the selected state. */}
                <Text style={styles.label}>{t.label}</Text>
                {isActive ? <View style={styles.underline} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    ...SEGMENT_TABS.strip,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: SEGMENT_TABS.stripPaddingVertical,
  },
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'flex-end',
    gap: SEGMENT_TABS.gap,
  },
  tab: {
    minHeight: SEGMENT_TABS.tabHeight,
    paddingHorizontal: 7,
    paddingTop: SEGMENT_TABS.tabLabelPaddingTop,
    minWidth: SEGMENT_TABS.minTabWidth,
    alignItems: 'center',
    borderRadius: SEGMENT_TABS.tabRadius,
    backgroundColor: KhazainColors.heroCream,
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: KhazainColors.heroCream,
  },
  label: {
    ...textStyle('labelSmall', { textAlign: 'center' }),
    color: KhazainColors.navy800,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: SEGMENT_TABS.underlineWidth,
    height: SEGMENT_TABS.underlineHeight,
    backgroundColor: KhazainColors.navy800,
  },
});
