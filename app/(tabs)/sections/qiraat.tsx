import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KhazainColors } from '@/constants/theme';
import { ChevronIcon, DetailHeader, PlayIcon } from '@/components/khazain';

const QIRAAT = [
  'قراءة حفص عن عاصم',
  'قراءة ورش عن نافع',
  'قراءة قالون عن نافع',
  'قراءة الدوري عن أبي عمرو',
  'قراءة شعبة عن عاصم',
  'قراءة خلف عن حمزة',
];

export default function QiraatScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader title="اختر القراءة" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {QIRAAT.map((q, i) => (
          <Pressable
            key={i}
            onPress={() => {}}
            style={({ pressed }) => [
              styles.row,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View style={styles.playBtn}>
              <PlayIcon size={11} color={KhazainColors.gold300} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {q}
            </Text>
            <ChevronIcon size={12} color={KhazainColors.ink400} direction="start" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  list: {
    paddingHorizontal: 14,
    paddingTop: 4,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
