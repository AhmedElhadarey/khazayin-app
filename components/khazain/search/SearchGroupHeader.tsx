import { toArabicDigits } from '@/constants/progress';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
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
        {`${title} (${toArabicDigits(count)})`}
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
  title: textStyle('sectionTitle', { color: KhazainColors.ink900 }),
  rule: {
    height: 1,
    marginTop: 4,
    backgroundColor: KhazainColors.hairlineWarm,
  },
});
