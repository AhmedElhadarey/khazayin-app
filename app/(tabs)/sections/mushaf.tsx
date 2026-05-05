import { InlineHeader, SearchPill, SurahRow } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const MUSHAF_BG = '#FBF3DF';
const FOOTER_BG = '#F3E4BE';

// All 9 surahs visible in Figma page 21 (قراءة القرآن).
const SURAHS = [
  { id: '٠١', name: 'سورة الفاتحة', meta: 'مكية · ٧ آيات' },
  { id: '٠٢', name: 'سورة البقرة', meta: 'مدنية · ٢٨٦ آية' },
  { id: '٠٣', name: 'سورة آل عمران', meta: 'مدنية · ٢٠٠ آية' },
  { id: '٠٤', name: 'سورة النساء', meta: 'مدنية · ١٧٦ آية' },
  { id: '٠٥', name: 'سورة المائدة', meta: 'مدنية · ١٢٠ آية' },
  { id: '٠٦', name: 'سورة الأنعام', meta: 'مكية · ١٥٤ آية' },
  { id: '٠٧', name: 'سورة الأعراف', meta: 'مكية · ٢٠٤ آية' },
  { id: '٠٨', name: 'سورة الأنفال', meta: 'مدنية · ٧٥ آية' },
  { id: '٠٩', name: 'سورة التوبة', meta: 'مدنية · ١٢٩ آية' },
];

// First five ayat of Al-Baqarah for the demo mushaf reading page.
const AYAT = [
  { n: '١', text: 'الٓمٓ' },
  { n: '٢', text: 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ' },
  { n: '٣', text: 'ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ وَمِمَّا رَزَقْنَٰهُمْ يُنفِقُونَ' },
  {
    n: '٤',
    text: 'وَٱلَّذِينَ يُؤْمِنُونَ بِمَآ أُنزِلَ إِلَيْكَ وَمَآ أُنزِلَ مِن قَبْلِكَ وَبِٱلْءَاخِرَةِ هُمْ يُوقِنُونَ',
  },
  { n: '٥', text: 'أُو۟لَٰٓئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُو۟لَٰٓئِكَ هُمُ ٱلْمُفْلِحُونَ' },
];

export default function MushafScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ surah?: string }>();
  const setVisible = usePlayerStore((s) => s.setVisible);

  // Hide MiniPlayer while mushaf is mounted. Restore on unmount.
  useEffect(() => {
    setVisible(false);
    return () => setVisible(true);
  }, [setVisible]);

  // Reading view (page 22/23) when a surah is selected, otherwise list (page 21).
  if (params.surah) {
    return <ReadingView onBack={() => router.back()} />;
  }
  return (
    <ListView
      onBack={() => router.back()}
      onPick={(id) => router.push(`/sections/mushaf?surah=${id}` as any)}
    />
  );
}

function ListView({ onBack, onPick }: { onBack: () => void; onPick: (id: string) => void }) {
  return (
    <SafeAreaView style={styles.listScreen} edges={['top']}>
      <InlineHeader title="قراءة القرآن" onBack={onBack} />
      <View style={styles.searchBlock}>
        <SearchPill placeholder="بحث.." />
      </View>
      <ScrollView
        contentContainerStyle={[styles.surahList, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {SURAHS.map((s) => (
          <SurahRow
            key={s.id}
            index={s.id}
            name={s.name}
            meta={s.meta}
            showChevron={false}
            onPress={() => onPick(s.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadingView({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {/* Page 23 header: title + small ▶ disclosure with subtitle line below. */}
      <View style={[styles.headerBg, { backgroundColor: MUSHAF_BG }]}>
        <InlineHeader title="سورة البقرة" onBack={onBack} />
        <Text style={styles.subtitle}>مكية  ·  ٧ آيات  ·  صفحة ١ من ٦٠٤</Text>
      </View>
      <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
        <View style={styles.ornamentWrap}>
          <LinearGradient
            colors={['#F3E0B6', '#EAD19A']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.ornamentInnerFrame} />
          <Text style={styles.basmala}>﷽</Text>
          <Text style={styles.surahMeta}>سورة البقرة · مدنية · ٢٨٦ آية</Text>
        </View>
        <Text style={styles.ayatBody}>
          {AYAT.map((a, i) => (
            <React.Fragment key={a.n}>
              {a.text}
              <AyahNum n={a.n} />
              {i < AYAT.length - 1 ? ' ' : ''}
            </React.Fragment>
          ))}
        </Text>
      </ScrollView>
      {/* Footer order RTL: حفظ علامة (right), الانتقال للعلامة (center), الفهرس (left). */}
      <View style={styles.footer}>
        <MushafBtn label="الفهرس" icon={<MenuGlyph />} />
        <MushafBtn label="الانتقال للعلامة" icon={<BookmarkFilledGlyph />} />
        <MushafBtn label="حفظ علامة" icon={<BookmarkGlyph />} />
      </View>
    </SafeAreaView>
  );
}

function AyahNum({ n }: { n: string }) {
  return (
    <Text style={styles.ayahNum}>
      {'  '}
      {n}
      {'  '}
    </Text>
  );
}

function MushafBtn({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Pressable style={({ pressed }) => [styles.footerBtn, { opacity: pressed ? 0.7 : 1 }]}>
      {icon}
      <Text style={styles.footerBtnLabel}>{label}</Text>
    </Pressable>
  );
}

function BookmarkGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 3v14l5-4 5 4V3H5z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BookmarkFilledGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 3v14l5-4 5 4V3H5z"
        fill={KhazainColors.navy800}
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuGlyph() {
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Path
        d="M4 5h12M4 10h12M4 15h12"
        stroke={KhazainColors.navy800}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
      <Path
        d="M2 5h0.5M2 10h0.5M2 15h0.5"
        stroke={KhazainColors.navy800}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MUSHAF_BG },
  listScreen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  searchBlock: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  surahList: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  headerBg: {
    paddingBottom: 8,
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.gold600,
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingTop: 6,
    writingDirection: 'rtl',
  },
  pageContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  ornamentWrap: {
    borderWidth: 2,
    borderColor: KhazainColors.gold500,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 14,
    overflow: 'hidden',
  },
  ornamentInnerFrame: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: KhazainColors.gold600,
    borderRadius: 6,
    opacity: 0.6,
  },
  basmala: {
    fontFamily: 'Amiri-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: KhazainColors.navy900,
    writingDirection: 'rtl',
  },
  surahMeta: {
    fontFamily: 'Amiri',
    fontSize: 12,
    color: KhazainColors.gold600,
    marginTop: 3,
    writingDirection: 'rtl',
  },
  ayatBody: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    lineHeight: 48,
    color: KhazainColors.ink900,
    fontWeight: '700',
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  ayahNum: {
    fontSize: 14,
    color: KhazainColors.gold600,
    fontFamily: 'Amiri-Bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(141,107,52,0.15)',
    backgroundColor: FOOTER_BG,
  },
  footerBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  footerBtnLabel: {
    fontSize: 11,
    fontFamily: 'TheSansArabic',
    fontWeight: '600',
    color: KhazainColors.navy800,
  },
});
