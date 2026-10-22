import { InlineHeader } from '@/components/khazain';
import { Composer, PostRow, PreviewBanner } from '@/components/khazain/community';
import { HeaderArt } from '@/components/khazain/patterns';
import { PillButton } from '@/components/khazain/primitives';
import { AsyncContent } from '@/components/khazain/state/AsyncContent';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { Colors, KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { usePostWait } from '@/hooks/usePostWait';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { arabicCopyForCode, isApiError } from '@/services/api/errors';
import { communityService } from '@/services/community';
import {
  newGuard,
  openOnce,
  previewReview,
  postBusy,
  runDeletePost,
  runMute,
  runSubmitPost,
  threadListPlan,
  waitCopy,
} from '@/services/community/threadActions';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { useScholarLecturesStore } from '@/store';
import { removePost, runMutation } from '@/store/communityMutations';
import { communityGeneration, useThreadPostsStore, visiblePosts } from '@/store/communityStores';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { formatRelativeAr } from '@/store/notesStore';
import { useToastStore } from '@/store/toastStore';
import type { Post } from '@/types/community';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const errorCopy = (e: unknown) => arabicCopyForCode(isApiError(e) ? e.code : 'unknown');
const toast = (message: string) => useToastStore.getState().show({ message, durationMs: 4000 });
/** Others never get a pending or hidden post; the author's own carry a badge. */
const rowStatus = (p: Post) =>
  p.moderation.status === 'pending' || p.moderation.status === 'hidden' ? p.moderation.status : 'visible';

/**
 * One lecture's thread (design §8.2, §8.4): «استمع للدرس», the posts newest
 * first, and the composer pinned above the keyboard. The thread is keyed on
 * `Lecture.id`; the scholar comes along only to find the lecture.
 */
export default function LectureDiscussionScreen() {
  const allowed = useCommunityGuard('open');
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const params = useLocalSearchParams<{ lectureId?: string | string[]; scholarId?: string | string[] }>();
  const lectureId = typeof params.lectureId === 'string' ? params.lectureId : '';
  const scholarId = typeof params.scholarId === 'string' ? params.scholarId : '';

  // Keyed cache lookups, not hooks that vary per render.
  const useLectures = useScholarLecturesStore(scholarId);
  const lectures = useLectures((s) => s.data);
  const fetchLectures = useLectures((s) => s.fetch);
  const lecture = useMemo(() => lectures.find((l) => l.id === lectureId), [lectures, lectureId]);

  // Looked up per render, unlike the group detail store: thread stores are dropped only by
  // `resetCommunityStores()` after access has left 'open', and a re-opt-in must get a fresh one.
  const usePosts = useThreadPostsStore(lectureId);
  const items = usePosts((s) => s.items);
  const status = usePosts((s) => s.status);
  const error = usePosts((s) => s.error);
  const hasMore = usePosts((s) => s.hasMore);
  const fetchingMore = usePosts((s) => s.fetchingMore);
  const fetchPosts = usePosts((s) => s.fetch);
  const fetchMore = usePosts((s) => s.fetchMore);
  const refreshPosts = usePosts((s) => s.refresh);

  const muted = useCommunityLocalStore((s) => s.mutedMemberIds);
  const hidden = useCommunityLocalStore((s) => s.locallyHiddenPostIds);
  const postTimes = useCommunityLocalStore((s) => s.postTimes);
  const wait = usePostWait(postTimes);

  const posts = useMemo(
    () => visiblePosts(items, muted, hidden).filter((p) => p.moderation.status !== 'removed'),
    [items, muted, hidden],
  );
  const plan = threadListPlan({ status, count: posts.length, hasMore });
  // No lecture id in the route: nothing will ever load, so say so instead of showing a skeleton.
  const missingParam = lectureId === '';

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [heldForReview, setHeldForReview] = useState(false);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Refs, not state: two taps in one frame both read the same closure.
  const submitGuard = useRef(newGuard());
  const deleteGuard = useRef(newGuard());
  const reportLatch = useRef({ open: false });
  const listRef = useRef<FlatList<Post>>(null);

  // The filter is cheap, but the notice should not hold up typing.
  const deferredText = useDeferredValue(text);
  const reviewNotice = useMemo(() => previewReview(deferredText), [deferredText]);

  useEffect(() => {
    if (!allowed) return;
    if (lectureId) void fetchPosts();
    if (scholarId) void fetchLectures();
  }, [allowed, lectureId, scholarId, fetchPosts, fetchLectures]);

  useEffect(() => {
    if (actionError) void AccessibilityInfo.announceForAccessibility(actionError);
  }, [actionError]);

  // Coming back from the report sheet releases the latch.
  useFocusEffect(
    useCallback(() => {
      reportLatch.current.open = false;
    }, []),
  );

  const submit = () => {
    const gen = communityGeneration();
    return runSubmitPost(
      submitGuard.current,
      { text, postTimes: useCommunityLocalStore.getState().postTimes, now: Date.now() },
      {
        perform: (body, review) =>
          runMutation('createPost', lectureId, { body, review }, (requestId) =>
            communityService.threads.createPost({ requestId, lectureId, body, review }),
          ),
        record: (now) => useCommunityLocalStore.getState().recordPost(now),
        isCurrent: () => gen === communityGeneration(),
        onRefused: setComposeError,
        onStart: () => {
          setBusy(true);
          setComposeError(null);
        },
        onPosted: (post) => {
          setText('');
          setHeldForReview(post.moderation.status === 'pending');
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        },
        onError: (e) => setComposeError(errorCopy(e)),
        onSettled: () => setBusy(false),
      },
    );
  };

  const doDelete = (post: Post) => {
    const gen = communityGeneration();
    return runDeletePost(
      deleteGuard.current,
      { lectureId, postId: post.id },
      {
        perform: () =>
          runMutation('deletePost', post.id, {}, (requestId) =>
            communityService.threads.deletePost({ requestId, postId: post.id }),
          ),
        remove: removePost,
        isCurrent: () => gen === communityGeneration(),
        onStart: () => {
          setBusyPostId(post.id);
          setActionError(null);
        },
        onError: (e) => setActionError(errorCopy(e)),
        onSettled: () => setBusyPostId(null),
      },
    );
  };

  const confirmDelete = (post: Post) => {
    if (deleteGuard.current.busy) return;
    Alert.alert(COMMUNITY_COPY.deletePostTitle, COMMUNITY_COPY.deletePostBody, [
      { text: COMMUNITY_COPY.cancel, style: 'cancel' },
      { text: COMMUNITY_COPY.deletePost, style: 'destructive', onPress: () => void doDelete(post) },
    ]);
  };

  const confirmMute = (post: Post) => {
    Alert.alert(COMMUNITY_COPY.muteConfirmTitle, COMMUNITY_COPY.muteConfirm, [
      { text: COMMUNITY_COPY.cancel, style: 'cancel' },
      {
        text: COMMUNITY_COPY.muteButton,
        style: 'destructive',
        onPress: () =>
          runMute(post.author.memberId, {
            mute: (id) => useCommunityLocalStore.getState().mute(id),
            notify: toast,
          }),
      },
    ]);
  };

  const openReport = (post: Post) =>
    openOnce(reportLatch.current, () =>
      router.push({ pathname: '/community-report-sheet' as any, params: { postId: post.id } }),
    );

  if (!allowed) return null;

  const header = (
    <View style={styles.head}>
      <PreviewBanner />
      {lecture ? (
        <PillButton
          label={COMMUNITY_COPY.listenToLecture}
          variant="cream"
          onPress={() => void startLecturePlayback(lecture)}
        />
      ) : null}
      {actionError ? (
        <Text style={styles.error} accessibilityRole="alert">
          {actionError}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader
        title={lecture?.title ?? COMMUNITY_COPY.screenTitle}
        onBack={() => router.back()}
        style={columnStyle}
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={({ item: p }) => (
            <PostRow
              authorName={p.author.displayName}
              body={p.body}
              timeLabel={formatRelativeAr(p.createdAt)}
              status={rowStatus(p)}
              isMine={p.isMine}
              busy={postBusy({ isMine: p.isMine, postId: p.id, busyPostId })}
              onDelete={() => confirmDelete(p)}
              onReport={() => openReport(p)}
              onMute={() => confirmMute(p)}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <AsyncContent
              status={missingParam ? 'empty' : plan.emptyStatus}
              error={error}
              onRetry={() => void refreshPosts()}
              emptyMessage={COMMUNITY_COPY.emptyThread}
              style={styles.body}
            >
              {null}
            </AsyncContent>
          }
          ListFooterComponent={
            plan.footerRetry ? (
              <PillButton label={COMMUNITY_COPY.retryNow} variant="cream" onPress={() => void fetchMore()} />
            ) : fetchingMore ? (
              <ActivityIndicator color={KhazainColors.navy800} />
            ) : null
          }
          onEndReached={() => {
            if (plan.canLoadMore) void fetchMore();
          }}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          style={styles.flex}
          contentContainerStyle={[styles.content, columnStyle]}
          showsVerticalScrollIndicator={false}
        />
        <View style={[styles.inputRow, columnStyle]}>
          <Composer
            value={text}
            onChangeText={(next) => {
              setText(next);
              setComposeError(null);
              setHeldForReview(false);
            }}
            onSubmit={() => void submit()}
            sendDisabled={busy || text.trim() === '' || wait !== null}
            notice={reviewNotice || heldForReview ? COMMUNITY_COPY.reviewNotice : null}
            wait={wait ? waitCopy(wait) : null}
            error={composeError}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  flex: { flex: 1 },
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },
  head: { ...PHYSICAL_BOX, gap: 12 },
  // The fade wrapper is a real box; pinned so the state texts inside it align right.
  body: { ...PHYSICAL_BOX, gap: 12 },
  // The composer, fixed above the keyboard; the reading column applies on tablets.
  inputRow: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingVertical: 12 },
  // Legacy palette: the Khazain tokens carry no error colour.
  error: { ...RTL_TEXT, ...textStyle('label', { color: Colors.light.error }) },
});
