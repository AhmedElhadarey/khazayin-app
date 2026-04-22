import { ChevronIcon, DetailHeader, SearchPill } from '@/components/khazain';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { KhazainColors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const GROUPS = [
  { t: 'من رمضان إلى شوال', c: '٣٢ تصميم' },
  { t: 'من شوال إلى ذي القعدة', c: '١٨ تصميم' },
  { t: 'من ذي القعدة إلى ذي الحجة', c: '٢٥ تصميم' },
  { t: 'من محرم إلى صفر', c: '١٤ تصميم' },
  { t: 'من ربيع الأول إلى ربيع الآخر', c: '٢١ تصميم' },
  { t: 'من جمادى الأولى إلى الآخرة', c: '١٥ تصميم' },
];

const CHIP_COLORS = [KhazainColors.teal600, '#8E6630', '#1A3557', '#6B4423'];

export default function DawahScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <DetailHeader
        title="تصميمات دعوية"
        onBack={() => router.back()}
        bg="transparent"
      />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="ابحث في التصميمات.." />
      </View>
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {GROUPS.map((g, i) => (
          <Pressable
            key={i}
            onPress={() =>
              router.push({
                pathname: '/share-sheet' as any,
                params: {
                  tone: CHIP_COLORS[i % CHIP_COLORS.length],
                  title: g.t,
                  body: g.c,
                },
              })
            }
            style={({ pressed }) => [
              styles.row,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <View style={[styles.chip, { backgroundColor: CHIP_COLORS[i % CHIP_COLORS.length] }]}>
              <Text style={styles.chipText}>﷽</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {g.t}
              </Text>
              <Text style={styles.rowMeta}>{g.c}</Text>
            </View>
            <ChevronIcon size={12} color={KhazainColors.ink400} direction="start" />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 18, paddingBottom: 10 },
  list: {
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: KhazainColors.cream50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.08)',
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'Amiri-Bold',
    fontSize: 16,
    fontWeight: '700',
    color: KhazainColors.gold200,
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
