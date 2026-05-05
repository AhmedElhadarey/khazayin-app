import { ReciterRow } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Page 16: آختر القراءة — 10 qira'at rows (bottom-sheet style).
// Each row uses ReciterRow without subtitle.
const QIRAAT = [
  'قراءة حفص عن عاصم',
  'قراءة ورش عن نافع',
  'قراءة قالون عن نافع',
  'الدوري عن أبي عمرو',
  'السوسي عن أبي عمرو',
  'شعبة عن عاصم',
  'البزي عن ابن كثير',
  'نبل عن ابن كثير',
  'الدوري عن الكسائي',
  'خلف عن حمزة',
];

export default function QiraatScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* sheet-like handle + centered title */}
      <View style={styles.handleWrap}>
        <View style={styles.handle} />
      </View>
      <Text style={styles.title}>آختر القراءة</Text>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {QIRAAT.map((q, i) => (
          <ReciterRow key={i} title={q} onPress={() => router.back()} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(40,30,19,0.18)',
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    paddingTop: 6,
    paddingBottom: 12,
    writingDirection: 'rtl',
  },
  list: {
    paddingHorizontal: 16,
    gap: 8,
  },
});
