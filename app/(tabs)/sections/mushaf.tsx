import { DetailHeader } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const MUSHAF_BG = '#FBF3DF';
const FOOTER_BG = '#F3E4BE';

// First five ayat of Al-Baqarah for the demo mushaf page.
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
  const setVisible = usePlayerStore((s) => s.setVisible);

  // Hide MiniPlayer while mushaf is mounted. Restore on unmount.
  useEffect(() => {
    setVisible(false);
    return () => setVisible(true);
  }, [setVisible]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <DetailHeader title="سورة البقرة" onBack={() => router.back()} bg={MUSHAF_BG} />
      <ScrollView
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Surah ornament header */}
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
        {/* Ayat flow */}
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

      {/* Footer controls */}
      <View style={styles.footer}>
        <MushafBtn label="حفظ علامة" icon={<BookmarkGlyph />} />
        <MushafBtn label="الفهرس" icon={<MenuGlyph />} />
        <MushafBtn label="الإعدادات" icon={<ClockGlyph />} />
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
    <Pressable
      style={({ pressed }) => [styles.footerBtn, { opacity: pressed ? 0.7 : 1 }]}
    >
      {icon}
      <Text style={styles.footerBtnLabel}>{label}</Text>
    </Pressable>
  );
}

function BookmarkGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path
        d="M5 3v14l5-4 5 4V3H5z"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MenuGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Path
        d="M3 4h14M3 10h14M3 16h14"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ClockGlyph() {
  return (
    <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7} stroke={KhazainColors.navy800} strokeWidth={1.5} />
      <Path
        d="M10 6v4l3 2"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: MUSHAF_BG },
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
