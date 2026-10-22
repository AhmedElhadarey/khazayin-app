import { InlineHeader } from '@/components/khazain';
import { DiscussionGlyph, PreviewBanner } from '@/components/khazain/community';
import { HeaderArt } from '@/components/khazain/patterns';
import { ListRowCard } from '@/components/khazain/primitives';
import { AsyncContent } from '@/components/khazain/state/AsyncContent';
import { COMMUNITY_COPY, postsLabel } from '@/constants/communityCopy';
import { PHYSICAL_BOX } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useScholarLecturesStore } from '@/store';
import { useThreadSummariesStore } from '@/store/communityStores';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * One scholar's lectures with their post counts (design §8.2). A row opens that
 * lecture's thread. The thread key is `Lecture.id`, never a player track.
 */
export default function DiscussionIndexScreen() {
  const allowed = useCommunityGuard('open');
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const params = useLocalSearchParams<{ scholarId?: string | string[] }>();
  const scholarId = typeof params.scholarId === 'string' ? params.scholarId : '';

  // Keyed cache lookups, not hooks that vary per render.
  const useLectures = useScholarLecturesStore(scholarId);
  const lectures = useLectures((s) => s.data);
  const status = useLectures((s) => s.status);
  const error = useLectures((s) => s.error);
  const fetchLectures = useLectures((s) => s.fetch);
  const refreshLectures = useLectures((s) => s.refresh);
  const useSummaries = useThreadSummariesStore(scholarId);
  const summaries = useSummaries((s) => s.data);
  const summariesStatus = useSummaries((s) => s.status);
  const fetchSummaries = useSummaries((s) => s.fetch);

  useEffect(() => {
    if (!allowed || !scholarId) return;
    void fetchLectures();
    void fetchSummaries();
  }, [allowed, scholarId, fetchLectures, fetchSummaries]);

  // No scholar in the route: nothing will ever load, so say so instead of showing a skeleton.
  const missingParam = scholarId === '';
  const counts = useMemo(() => new Map(summaries.map((t) => [t.lectureId, t.postCount])), [summaries]);

  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader title={COMMUNITY_COPY.scholarDiscussions} onBack={() => router.back()} style={columnStyle} />
      <FlatList
        data={status === 'success' ? lectures : []}
        keyExtractor={(l) => l.id}
        renderItem={({ item: l }) => (
          <ListRowCard
            variant="more"
            title={l.title}
            subtitle={summariesStatus === 'success' || summariesStatus === 'empty' ? postsLabel(counts.get(l.id) ?? 0) : ''}
            icon={<DiscussionGlyph />}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/sections/discussion/[lectureId]' as any,
                params: { lectureId: l.id, scholarId },
              })
            }
          />
        )}
        ListHeaderComponent={<PreviewBanner />}
        ListEmptyComponent={
          <AsyncContent
            status={missingParam ? 'empty' : status}
            error={error}
            onRetry={() => void refreshLectures()}
            emptyMessage={COMMUNITY_COPY.noDiscussions}
            style={styles.body}
          >
            {null}
          </AsyncContent>
        }
        contentContainerStyle={[styles.content, columnStyle]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 12 },
  // The fade wrapper is a real box; pinned so the state texts inside it align right.
  body: { ...PHYSICAL_BOX, gap: 12 },
});
