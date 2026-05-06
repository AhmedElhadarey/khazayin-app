import {
    AsyncContent,
    BellIcon,
    BookmarkIcon,
    CheckIcon,
    ChevronIcon,
    CloseIcon,
    CopyIcon,
    DownloadIcon,
    EmptyState,
    ErrorState,
    GeoNavyPattern,
    GridIcon,
    HeroPattern,
    HouseIcon,
    IconChip,
    LogoBadge,
    MenuLinesIcon,
    OrnamentPattern,
    PauseIcon,
    PillButton,
    PlayIcon,
    PlusIcon,
    SearchIcon,
    SearchPill,
    SectionHeader,
    ShareIcon,
    SkeletonCard,
    SkeletonCardList,
    SkeletonPoster,
    SkeletonRibbon,
    SkeletonRibbonList,
    SkeletonRow,
    SkeletonRowList,
    Star8Pattern,
    TelegramIcon,
    Toggle,
    WhatsAppIcon,
    Wordmark,
    YouTubeIcon,
} from '@/components/khazain';
import type { LoadState } from '@/types/content';
import { KhazainColors } from '@/constants/theme';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Dev-only smoke-render route for the Foundations track.
// Open /foundations-sandbox in Expo Go. Delete this file once Track 1 is accepted.
export default function FoundationsSandbox() {
  const [on, setOn] = useState(false);
  const [devState, setDevState] = useState<LoadState>('loading');
  const [errorFlip, setErrorFlip] = useState(false);
  const handleRetry = useCallback(() => setErrorFlip((f) => !f), []);

  const allIcons = [
    { name: 'Bell', node: <BellIcon /> },
    { name: 'Search', node: <SearchIcon /> },
    { name: 'Play', node: <PlayIcon /> },
    { name: 'Pause', node: <PauseIcon /> },
    { name: 'Chevron (start)', node: <ChevronIcon direction="start" /> },
    { name: 'Chevron (end)', node: <ChevronIcon direction="end" /> },
    { name: 'Chevron (down)', node: <ChevronIcon direction="down" /> },
    { name: 'Bookmark', node: <BookmarkIcon /> },
    { name: 'House', node: <HouseIcon /> },
    { name: 'Grid', node: <GridIcon /> },
    { name: 'MenuLines', node: <MenuLinesIcon /> },
    { name: 'Share', node: <ShareIcon /> },
    { name: 'WhatsApp', node: <WhatsAppIcon color={KhazainColors.teal600} /> },
    { name: 'Telegram', node: <TelegramIcon color={KhazainColors.navy700} /> },
    { name: 'YouTube', node: <YouTubeIcon color="#CD201F" /> },
    { name: 'Copy', node: <CopyIcon /> },
    { name: 'Download', node: <DownloadIcon /> },
    { name: 'Check', node: <CheckIcon color={KhazainColors.gold500} /> },
    { name: 'Close', node: <CloseIcon /> },
    { name: 'Plus', node: <PlusIcon /> },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: KhazainColors.pageBg }}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Foundations sandbox</Text>
        <Text style={styles.p}>
          Dev-only smoke-render of all Khazain design primitives. Delete `app/_foundations.tsx`
          when Track 1 is accepted.
        </Text>

        <SectionHeader title="Patterns" />
        <View style={styles.grid}>
          <GeoNavyPattern style={styles.patternTile}>
            <Text style={styles.patternLabel}>GeoNavy</Text>
          </GeoNavyPattern>
          <OrnamentPattern style={styles.patternTile}>
            <Text style={[styles.patternLabel, { color: KhazainColors.ink700 }]}>Ornament</Text>
          </OrnamentPattern>
          <HeroPattern
            style={[styles.patternTile, { backgroundColor: KhazainColors.heroCream }]}
          >
            <Text style={[styles.patternLabel, { color: KhazainColors.ink700 }]}>Hero</Text>
          </HeroPattern>
          <Star8Pattern
            style={[styles.patternTile, { backgroundColor: KhazainColors.cream200 }]}
          >
            <Text style={[styles.patternLabel, { color: KhazainColors.ink700 }]}>Star8</Text>
          </Star8Pattern>
        </View>

        <SectionHeader title="Wordmark + LogoBadge" onSeeAll={() => {}} />
        <View style={styles.centerRow}>
          <LogoBadge size={32} />
          <LogoBadge size={40} />
          <LogoBadge width={39} height={54} />
        </View>
        <Wordmark />

        <SectionHeader title="SearchPill" />
        <SearchPill />
        <View style={{ backgroundColor: KhazainColors.navy900, padding: 12, borderRadius: 12 }}>
          <SearchPill dark />
        </View>

        <SectionHeader title="IconChip" />
        <View style={styles.rowGap}>
          <IconChip>
            <BellIcon size={18} color={KhazainColors.navy800} />
          </IconChip>
          <IconChip bg={KhazainColors.heroHeaderBg}>
            <ShareIcon size={18} color={KhazainColors.navy800} />
          </IconChip>
          <IconChip onPress={() => {}}>
            <BookmarkIcon size={18} color={KhazainColors.navy800} />
          </IconChip>
        </View>

        <SectionHeader title="PillButton" seeAllLabel="عرض الكل" onSeeAll={() => {}} />
        <View style={styles.rowGap}>
          <PillButton label="المزيد" variant="navy" size="lg" onPress={() => {}} />
          <PillButton label="عرض الكل" variant="ghost" size="sm" onPress={() => {}} />
          <PillButton label="حفظ" variant="cream" size="sm" onPress={() => {}} />
        </View>

        <SectionHeader title="Toggle" />
        <View style={styles.rowGap}>
          <Toggle on={on} onChange={setOn} />
          <Text style={styles.p}>{on ? 'on' : 'off'}</Text>
        </View>

        <SectionHeader title="Icons (18)" />
        <View style={styles.iconGrid}>
          {allIcons.map((i) => (
            <View key={i.name} style={styles.iconCell}>
              {i.node}
              <Text style={styles.iconLabel}>{i.name}</Text>
            </View>
          ))}
        </View>

        {/* ----------------------------------------------------------------
            State primitives — visual QA panel for Phase 3.
            C3 RTL shimmer direction must be verified on a real device.
            The shimmer light must travel right-to-left.
        ---------------------------------------------------------------- */}
        <SectionHeader title="State primitives — مكونات الحالة" />

        <Text style={[styles.p, { marginBottom: 4 }]}>SkeletonRow</Text>
        <SkeletonRow />

        <Text style={[styles.p, { marginBottom: 4 }]}>SkeletonRowList (count=2)</Text>
        <SkeletonRowList count={2} />

        <Text style={[styles.p, { marginBottom: 4 }]}>SkeletonCard (count=3)</Text>
        <SkeletonCardList count={3} />

        <Text style={[styles.p, { marginBottom: 4 }]}>SkeletonRibbon</Text>
        <SkeletonRibbon />

        <Text style={[styles.p, { marginBottom: 4 }]}>SkeletonRibbonList (count=2)</Text>
        <SkeletonRibbonList count={2} />

        <Text style={[styles.p, { marginBottom: 4 }]}>SkeletonPoster</Text>
        <SkeletonPoster />

        <Text style={[styles.p, { marginBottom: 4 }]}>EmptyState</Text>
        <EmptyState message="لا يوجد علماء" />

        <Text style={[styles.p, { marginBottom: 4 }]}>ErrorState</Text>
        <ErrorState
          message="تعذر تحميل المحتوى. حاول مجدداً."
          onRetry={handleRetry}
        />

        <Text style={[styles.p, { marginBottom: 4 }]}>
          AsyncContent — حدد الحالة
        </Text>
        <View style={[styles.rowGap, { marginBottom: 8, flexWrap: 'wrap' }]}>
          {(['idle', 'loading', 'empty', 'error', 'success'] as const).map((s) => (
            <PillButton
              key={s}
              label={s}
              variant={devState === s ? 'navy' : 'cream'}
              size="sm"
              onPress={() => setDevState(s)}
            />
          ))}
        </View>
        <AsyncContent
          status={devState}
          error={errorFlip ? new Error('خطأ تجريبي') : null}
          onRetry={handleRetry}
          emptyMessage="لا يوجد محتوى (تجريبي)"
        >
          <View
            style={{
              padding: 16,
              backgroundColor: KhazainColors.cardBg,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: KhazainColors.cardBorder,
            }}
          >
            <Text
              style={[styles.p, { textAlign: 'right', writingDirection: 'rtl' }]}
            >
              النجاح! تم تحميل المحتوى بنجاح.
            </Text>
          </View>
        </AsyncContent>

        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 28,
    color: KhazainColors.navy900,
  },
  p: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink500,
    lineHeight: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  patternTile: {
    width: '47%',
    height: 96,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternLabel: {
    fontFamily: 'TheSansArabic',
    fontWeight: '600',
    color: KhazainColors.cream100,
    fontSize: 13,
  },
  centerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconCell: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 9,
    color: KhazainColors.ink500,
  },
});
