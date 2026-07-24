import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { I18nManager, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// Pill-segmented tabs with an active underline + bold title.
// Used on the reciter / mushaf tabs strip (page 13).
//
// `tabs` are listed in RTL visual order (right-most first). The component
// picks the correct flex direction based on `I18nManager.isRTL` so the
// first tab always appears on the right regardless of platform.
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
      contentContainerStyle={styles.scroll}
    >
      <View style={[styles.row, { flexDirection: ROW_DIR }]}>
        {tabs.map((t) => {
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

// In RTL native, plain 'row' visually flows right-to-left already, so the
// first JSX child sits on the right. On web (or LTR), 'row-reverse' achieves
// the same visual ordering.
const ROW_DIR: 'row' | 'row-reverse' = I18nManager.isRTL ? 'row' : 'row-reverse';

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  row: {
    alignItems: 'flex-end',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 8,
    minWidth: 88,
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
    writingDirection: 'rtl',
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
