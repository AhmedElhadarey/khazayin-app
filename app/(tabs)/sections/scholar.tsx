import { ChevronIcon, CornerOrnament, DetailHeader } from '@/components/khazain';
import { GeoNavyPattern } from '@/components/khazain/patterns';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LECTURES = [
  { t: 'كل الشرح', d: 'ساعتان ١٥ دقيقة' },
  { t: 'شرح كتاب التوحيد', d: '٣٣ دقيقة' },
  { t: 'شرح الأصول الثلاثة', d: '٤٥ دقيقة' },
  { t: 'شرح الأربعين النووية', d: '٥٢ دقيقة' },
  { t: 'شرح رياض الصالحين', d: '١ ساعة ٨ دقائق' },
  { t: 'شرح بلوغ المرام', d: '٢٨ دقيقة' },
];

export default function ScholarScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader title="فضيلة الشيخ" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroBlock}>
          <GeoNavyPattern
            style={styles.heroCard}
            opacity={0.12}
          >
            <CornerOrnament pos="tl" />
            <CornerOrnament pos="tr" />
            <CornerOrnament pos="bl" />
            <CornerOrnament pos="br" />
            <Text style={styles.heroPretitle}>فضيلة الشيخ</Text>
            <Text style={styles.heroName}>عبد المحسن العباد البدر</Text>
            <Text style={styles.heroMeta}>حفظه الله · ٢٥٣ محاضرة</Text>
          </GeoNavyPattern>
        </View>
        <Text style={styles.sectionTitle}>المحاضرات والدروس</Text>
        <View style={styles.list}>
          {LECTURES.map((l, i) => (
            <Pressable
              key={i}
              onPress={() => {}}
              style={({ pressed }) => [
                styles.row,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={styles.indexChip}>
                <Text style={styles.indexChipText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {l.t}
                </Text>
                <Text style={styles.rowMeta}>{l.d}</Text>
              </View>
              <ChevronIcon size={12} color={KhazainColors.ink400} direction="start" />
            </Pressable>
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
    padding: 22,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: KhazainColors.gold400,
    alignItems: 'center',
  },
  heroPretitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  heroName: {
    fontFamily: 'Amiri-Bold',
    fontSize: 26,
    fontWeight: '700',
    color: KhazainColors.gold300,
    lineHeight: 31,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  heroMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 10,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
  },
  sectionTitle: {
    paddingHorizontal: 18,
    marginTop: 14,
    marginBottom: 8,
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
  },
  indexChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(26,53,87,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: KhazainColors.navy800,
    fontFamily: 'TheSansArabic',
  },
  rowTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '600',
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
});
