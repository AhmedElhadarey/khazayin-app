import { PHYSICAL_ROW, RTL_TEXT, SEGMENT_TABS, physicalTabOrder } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Pill-segmented tabs with an active underline + bold title.
// Used on the reciter / mushaf tabs strip (Figma nodes 2031:6193, 2102:3187).
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
}: {
  tabs: { key: T; label: string }[];
  active: T;
  onChange: (k: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.scroll}
    >
      <View style={styles.row}>
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
              <Text style={[styles.label, isActive ? styles.labelActive : styles.labelIdle]}>
                {t.label}
              </Text>
              {isActive ? <View style={styles.underline} /> : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    minWidth: SEGMENT_TABS.minTabWidth,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: KhazainColors.cream200,
    overflow: 'hidden',
  },
  tabActive: {
    backgroundColor: KhazainColors.cream200,
  },
  label: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    ...RTL_TEXT,
    textAlign: 'center',
  },
  labelIdle: {
    color: KhazainColors.ink700,
    fontWeight: '500',
  },
  labelActive: {
    color: KhazainColors.ink900,
    fontWeight: '700',
  },
  underline: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 0,
    height: 3,
    backgroundColor: KhazainColors.navy800,
    borderRadius: 2,
  },
});
