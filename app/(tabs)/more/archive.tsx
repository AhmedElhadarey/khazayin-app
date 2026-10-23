import { InlineHeader, ListRowCard, SearchPill } from '@/components/khazain';
import {
  BookSectionIcon,
  HeadphonesSectionIcon,
  ScholarSectionIcon,
} from '@/components/khazain/icons/sections';
import { HeaderArt, headerBandHeight } from '@/components/khazain/patterns';
import { CARD_DENSITY } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { ARCHIVE_ROWS, type ArchiveRow } from '@/data/content/archive';
import { openSearch } from '@/services/searchNavigation';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';

// Node 2558:1334. The three cards are `DIV-59` — the Sections root's card at a
// looser density (112 rather than 96, inset 22 rather than 14) with the same
// radius 20, the same flat `#FCFAF8` with no stroke or shadow, the same 64pt
// gold-ringed disc and the same three lines of display type.
//
// The app had been drawing its own card here: radius 18, a wide shadow, a 56pt
// disc, and three hand-drawn glyphs. The file reuses three of the nine section
// marks instead, so this reuses them too — the archive is a second door onto
// those sections, and the design says so by drawing the same mark.
const GLYPH_BY_ID: Record<ArchiveRow['id'], React.ReactNode> = {
  scholars: <ScholarSectionIcon />,
  books: <BookSectionIcon />,
  audio: <HeadphonesSectionIcon />,
};

export default function ArchiveScreen() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt bandHeight={headerBandHeight(insets.top, 'search', fontScale)} />
      <InlineHeader title="الأرشيف" onBack={() => router.back()} style={columnStyle} />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 24 }, columnStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchBlock}>
          <SearchPill placeholder="بحث.." onPress={openSearch} />
        </View>
        <View style={styles.list}>
          {ARCHIVE_ROWS.map((it) => (
            <ListRowCard
              key={it.id}
              variant="archive"
              title={it.title}
              subtitle={it.subtitle}
              count={it.count}
              icon={GLYPH_BY_ID[it.id]}
              onPress={() => router.push(it.route as any)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  container: { paddingTop: 0 },
  // `Inputs` ends at 129 and `DIV-59` starts at 148.
  searchBlock: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 19 },
  list: {
    paddingHorizontal: 16,
    // `DIV-59` ends at 260 and `DIV-75` starts at 268.
    gap: CARD_DENSITY.listGap,
  },
});
