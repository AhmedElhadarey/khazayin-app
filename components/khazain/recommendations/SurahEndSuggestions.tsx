import { PHYSICAL_BOX } from '@/constants/layout';
import { RECOMMENDATION_COPY } from '@/constants/recommendations';
import { surahName } from '@/constants/progress';
import { nextSurahParams } from '@/services/mushafNavigation';
import { recommendationTarget } from '@/services/recommendations/target';
import type { Recommendation } from '@/services/recommendations/types';
import { useRecommendations } from '@/services/recommendations/useRecommendations';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RibbonCard } from '../primitives/RibbonCard';
import { RecommendationRow } from './RecommendationRow';
import { useScreenReaderOn } from './useScreenReaderOn';

// The Mushaf end block (design §6.4): at most two rows, inline after the notes
// footer. No save gesture: the Mushaf is a NOTE surface.
//   1. the next surah, replacing the route params (C1) so Back does not walk
//      back through every surah read; omitted for 114, not dismissible;
//   2. one tafsir recommendation, only once the catalogue load has settled.
// A Mushaf-surface target never plays (the MiniPlayer is hidden here): a
// lecture opens its scholar, and a lecture with no scholar shows no row.
export function SurahEndSuggestions({ surahNumber }: { surahNumber: number }) {
  const router = useRouter();
  const screenReaderOn = useScreenReaderOn();
  // The hook returns nothing while the kill switch is off, leaving the next-surah row.
  const { items, catalogueStatus } = useRecommendations(3, surahNumber);

  const nextParams = nextSurahParams(surahNumber);
  const settled = catalogueStatus === 'ready' || catalogueStatus === 'aborted';

  // The first recommendation that has somewhere to go.
  let shown: Recommendation | undefined;
  let href: string | undefined;
  if (settled) {
    for (const rec of items) {
      const target = recommendationTarget(rec, 'mushaf');
      if (target && target.kind === 'route') {
        shown = rec;
        href = target.href;
        break;
      }
    }
  }

  const open = () => {
    // NAVIGATE reuses the route when it is already the current one and
    // otherwise pushes, so a scholar or book screen opens over the reader and
    // Back returns here. A Mushaf target never plays, so it is always a route.
    if (href) router.navigate(href as any);
  };

  return (
    <View style={styles.box}>
      {nextParams ? (
        <RibbonCard
          title={RECOMMENDATION_COPY.nextSurah(surahName(surahNumber + 1))}
          onPress={() => router.setParams({ surah: nextParams.surah, ayah: undefined })}
        />
      ) : null}
      {shown ? <RecommendationRow rec={shown} onPress={open} screenReaderOn={screenReaderOn} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { ...PHYSICAL_BOX, paddingTop: 16, gap: 12 },
});
