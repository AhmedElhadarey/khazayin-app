/**
 * The one-row entry to a scholar's lecture discussions (design §8.3), shown on
 * the scholar detail. Renders nothing unless the community is open, and starts
 * no fetch before that: the data hook lives in the inner row, which only
 * mounts for an open community.
 */
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { COMMUNITY_COPY, discussionThreadCount, discussionsLabel } from '@/constants/communityCopy';
import { useCommunityAccess } from '@/hooks/useCommunityGuard';
import { useThreadSummariesStore } from '@/store/communityStores';
import { ListRowCard } from '../primitives/ListRowCard';
import { DiscussionGlyph } from './DiscussionGlyph';

export function ScholarDiscussionsEntry({
  scholarId,
  style,
}: {
  scholarId: string;
  style?: StyleProp<ViewStyle>;
}) {
  const access = useCommunityAccess();
  if (access !== 'open') return null;
  return <EntryRow scholarId={scholarId} style={style} />;
}

function EntryRow({ scholarId, style }: { scholarId: string; style?: StyleProp<ViewStyle> }) {
  const router = useRouter();
  // A keyed cache lookup, not a hook that varies per render (same shape as the scholar lectures store).
  const useSummaries = useThreadSummariesStore(scholarId);
  const summaries = useSummaries((s) => s.data);
  const status = useSummaries((s) => s.status);
  const fetch = useSummaries((s) => s.fetch);
  useEffect(() => {
    void fetch();
  }, [fetch]);
  // Threads (lectures with posts), not posts: the label counts discussions.
  const total = useMemo(() => discussionThreadCount(summaries), [summaries]);

  return (
    <View style={style}>
      <ListRowCard
        variant="more"
        title={COMMUNITY_COPY.scholarDiscussions}
        subtitle={status === 'success' || status === 'empty' ? discussionsLabel(total) : ''}
        icon={<DiscussionGlyph />}
        onPress={() => router.push({ pathname: '/(tabs)/sections/discussion' as any, params: { scholarId } })}
      />
    </View>
  );
}
