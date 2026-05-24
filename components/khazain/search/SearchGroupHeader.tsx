import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Group header: "العنوان (count)" + thin gold rule beneath.
// RTL: text right-aligned; rule full-width below.
//
// Track: khazain-search_20260510  T7

type Props = {
  title: string;
  count: number;
};

export function SearchGroupHeader({ title, count }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {title} ({count})
      </Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'TheMixArab',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  rule: {
    height: 1,
    marginTop: 4,
    backgroundColor: KhazainColors.gold200,
    opacity: 0.5,
  },
});
