import { DetailHeader, PlayIcon } from '@/components/khazain';
import { GeoNavyPattern } from '@/components/khazain/patterns';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SURAHS = [
  { n: '١', name: 'الفاتحة', ayat: '٧ آيات' },
  { n: '٢', name: 'البقرة', ayat: '٢٨٦ آية' },
  { n: '٣', name: 'آل عمران', ayat: '٢٠٠ آية' },
  { n: '٤', name: 'النساء', ayat: '١٧٦ آية' },
  { n: '٥', name: 'المائدة', ayat: '١٢٠ آية' },
  { n: '٦', name: 'الأنعام', ayat: '١٦٥ آية' },
  { n: '٧', name: 'الأعراف', ayat: '٢٠٦ آية' },
];

export default function ReciterScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader
        title="الشيخ عبد الباسط عبد الصمد"
        onBack={() => router.back()}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <GeoNavyPattern style={styles.heroCard} opacity={0.15}>
            <View style={styles.monogram}>
              <Text style={styles.monogramText}>ع.ب</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>مكّي النبرة</Text>
              <Text style={styles.heroMeta}>١١٤ سورة · التلاوة المحدرة</Text>
            </View>
          </GeoNavyPattern>
        </View>
        <View style={styles.list}>
          {SURAHS.map((s) => (
            <View key={s.n} style={styles.row}>
              <Pressable
                onPress={() => {}}
                accessibilityLabel={`تشغيل سورة ${s.name}`}
                style={({ pressed }) => [styles.playBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <PlayIcon size={12} color={KhazainColors.gold300} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>سورة {s.name}</Text>
                <Text style={styles.rowMeta}>{s.ayat} · التلاوة المحدرة</Text>
              </View>
              <Text style={styles.rowNumber}>{s.n}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  heroBlock: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 14 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
  },
  monogram: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: KhazainColors.navy900,
    borderWidth: 1,
    borderColor: KhazainColors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontFamily: 'Amiri-Bold',
    color: KhazainColors.gold300,
    fontSize: 20,
    writingDirection: 'rtl',
  },
  heroTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: KhazainColors.gold300,
    writingDirection: 'rtl',
  },
  heroMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  list: {
    paddingHorizontal: 14,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
  },
  playBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowMeta: {
    fontSize: 11,
    color: KhazainColors.ink500,
    marginTop: 2,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowNumber: {
    fontFamily: 'Amiri',
    fontSize: 16,
    color: KhazainColors.gold500,
    width: 28,
    textAlign: 'center',
  },
});
