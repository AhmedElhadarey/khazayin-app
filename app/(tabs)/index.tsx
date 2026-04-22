import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';
import {
  BookCard,
  DAWAH_QUOTES,
  DawahPoster,
  HeroProphet,
  HeroQuran,
  HomeHeader,
  HomeSectionHeader,
  QueenCard,
  QuickChip,
  ScholarCard,
} from '@/components/khazain';

const SCHOLARS = [
  'عبد العزيز بن عبد الله بن باز',
  'محمد بن صالح العثيمين',
  'عبد المحسن العباد البدر',
];

const BOOKS = [
  'إضاءات على طريق العباد',
  'شرح رياض الصالحين',
  'تفسير آيات الأحكام',
];

export default function HomeScreen() {
  const router = useRouter();

  const goToSections = () => router.push('/sections');

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />

        {/* Hero 1 — القرآن حياة */}
        <View style={styles.heroPad}>
          <HeroQuran onMore={goToSections} />
        </View>

        {/* Hero 2 — محمد رسول الله ﷺ */}
        <View style={[styles.heroPad, { marginTop: 24 }]}>
          <HeroProphet onMore={goToSections} />
        </View>

        {/* Scholars */}
        <View style={{ marginTop: 24 }}>
          <HomeSectionHeader title="العلماء والمشايخ" onViewAll={goToSections} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollerPad}
          >
            {SCHOLARS.map((name) => (
              <View key={name} style={styles.scrollerItem}>
                <ScholarCard name={name} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Books */}
        <View style={{ marginTop: 24 }}>
          <HomeSectionHeader title="الكتب العلمية" onViewAll={goToSections} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollerPad}
          >
            {BOOKS.map((name) => (
              <View key={name} style={styles.scrollerItem}>
                <BookCard name={name} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* أنتِ ملكة */}
        <View style={[styles.heroPad, { marginTop: 24 }]}>
          <QueenCard onMore={goToSections} />
        </View>

        {/* Quick chips */}
        <View style={styles.quickChipsRow}>
          <QuickChip label="حصريات خزائن الرحمن">
            <StarGlyph />
          </QuickChip>
          <QuickChip label="برامج إذاعية">
            <MicGlyph />
          </QuickChip>
          <QuickChip label="كتب صوتية">
            <HeadphonesGlyph />
          </QuickChip>
        </View>

        {/* Dawah posters */}
        <View style={{ marginTop: 24 }}>
          <HomeSectionHeader title="تصميمات دعوية" onViewAll={goToSections} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollerPad}
          >
            {DAWAH_QUOTES.map((q, i) => (
              <View key={i} style={styles.scrollerItem}>
                <DawahPoster
                  quote={q}
                  onPress={() =>
                    router.push({
                      pathname: '/share-sheet' as any,
                      params: { tone: q.tone, title: q.t, body: q.b },
                    })
                  }
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Quick-chip badge glyphs (small inline SVGs, ported verbatim from home.jsx) ────

function StarGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path
        d="M8 1.5l1.85 3.75 4.15.6-3 2.9.7 4.1L8 10.9 4.3 12.85 5 8.75 2 5.85l4.15-.6L8 1.5z"
        fill="#D7B995"
      />
    </Svg>
  );
}

function MicGlyph() {
  return (
    <Svg width={10} height={14} viewBox="0 0 10 14" fill="none">
      <Rect x={3} y={0.5} width={4} height={8} rx={2} fill="#fff" />
      <Path
        d="M1 7a4 4 0 0 0 8 0M5 11v2"
        stroke="#fff"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function HeadphonesGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path
        d="M1 8V7a6 6 0 0 1 12 0v1M1 8v2a1.5 1.5 0 0 0 1.5 1.5H3V8H1zm12 0v2a1.5 1.5 0 0 1-1.5 1.5H11V8h2z"
        stroke="#fff"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KhazainColors.pageBg,
  },
  container: {
    paddingTop: 0,
  },
  heroPad: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  scrollerPad: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
    flexDirection: 'row',
  },
  scrollerItem: {
    // Margin-based gap not yet supported on old RN; add manual spacing with paddingRight on all but last.
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
});
