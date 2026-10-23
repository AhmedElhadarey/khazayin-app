import { InlineHeader } from '@/components/khazain';
import { ChallengeCard, MemberRow, PreviewBanner, ProgressBar } from '@/components/khazain/community';
import { HeaderArt } from '@/components/khazain/patterns';
import { PillButton } from '@/components/khazain/primitives';
import { SettingsToggleRow } from '@/components/khazain/settings';
import { AsyncContent } from '@/components/khazain/state/AsyncContent';
import {
  COMMUNITY_COPY,
  MEMBERS,
  codeA11y,
  daysMetApproxLabel,
  daysMetLabel,
  khatmLabel,
  memberDaysLabel,
  memberPagesLabel,
  ownPagesLabel,
  shareCodeMessage,
  wirdSummary,
} from '@/constants/communityCopy';
import { PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { PAGES_PER_QURAN } from '@/constants/progress';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { arabicCopyForCode, isApiError } from '@/services/api/errors';
import { communityService } from '@/services/community';
import { runLeave, type LeaveGuard } from '@/services/community/groupActions';
import { groupView, type OwnProgress } from '@/services/community/progressMath';
import { keepIfSame, loadOwnProgress, makeIsCurrent } from '@/services/community/ownProgress';
import { onGroupFocused, ownCounts } from '@/services/community/progressSync';
import { arabicCount } from '@/services/libraryStats';
import { runMutation } from '@/store/communityMutations';
import { communityGeneration, groupDetailStore } from '@/store/communityStores';
import type { Challenge, GroupProgress } from '@/types/community';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

const HUB = '/(tabs)/more/community';

/**
 * One group (design §8.2): its code, the challenge with the group bar, the
 * member's own progress, the sharing choice, the members, and leaving.
 */
export default function GroupDetailScreen() {
  const allowed = useCommunityGuard('open');
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const groupId = typeof params.id === 'string' ? params.id : '';
  // Resolved once per screen instance: a render after leaving must not re-create the dropped store.
  const [useDetail] = useState(() => groupDetailStore(groupId));
  const detail = useDetail((s) => s.data);
  const status = useDetail((s) => s.status);
  const error = useDetail((s) => s.error);
  const fetchDetail = useDetail((s) => s.fetch);
  const refreshDetail = useDetail((s) => s.refresh);

  const [own, setOwn] = useState<OwnProgress | null>(null);
  const [sharePending, setSharePending] = useState<boolean | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const leaveGuard = useRef<LeaveGuard>({ leaving: false, left: false });

  useEffect(() => {
    if (allowed && !leaveGuard.current.left) void fetchDetail();
  }, [allowed, fetchDetail]);

  const challenge = detail?.challenge ?? null;

  // Trigger (c): the group gained focus. The push is throttled inside onGroupFocused.
  useFocusEffect(
    useCallback(() => {
      if (!challenge) return;
      let live = true;
      const gen = communityGeneration();
      void onGroupFocused(challenge);
      void loadOwnProgress(challenge, {
        read: ownCounts,
        isCurrent: makeIsCurrent({
          live: () => live,
          left: () => leaveGuard.current.left,
          gen,
          currentGen: communityGeneration,
        }),
        apply: (counts) => setOwn((prev) => keepIfSame(prev, counts)),
      });
      return () => {
        live = false;
      };
    // Keyed on the id: a challenge is immutable, and a quiet refresh swaps the object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challenge?.id]),
  );

  // Own counts follow the data, not only focus: a background push refreshes `detail`
  // quietly while the screen stays mounted, and the card must catch up with it.
  useEffect(() => {
    if (!allowed || !detail?.challenge) return;
    const c = detail.challenge;
    let live = true;
    const gen = communityGeneration();
    void loadOwnProgress(c, {
      read: ownCounts,
      isCurrent: makeIsCurrent({
        live: () => live,
        left: () => leaveGuard.current.left,
        gen,
        currentGen: communityGeneration,
      }),
      apply: (counts) => setOwn((prev) => keepIfSame(prev, counts)),
    });
    return () => {
      live = false;
    };
  }, [allowed, detail]);

  const onShareCode = () => {
    if (!detail) return;
    // A dismissed or failed share sheet is not an error worth showing.
    void Share.share({ message: shareCodeMessage(detail.group.name, detail.group.joinCode) }).catch(() => {});
  };

  const onToggleShare = async (next: boolean) => {
    if (!detail || sharePending !== null) return;
    setSharePending(next);
    setActionError(null);
    const gen = communityGeneration();
    try {
      await runMutation('setShareMyProgress', groupId, { share: next }, (requestId) =>
        communityService.groups.setShareMyProgress({ requestId, groupId, share: next }),
      );
    } catch (e) {
      if (gen === communityGeneration()) setActionError(arabicCopyForCode(isApiError(e) ? e.code : 'unknown'));
    } finally {
      setSharePending(null);
    }
  };

  const leave = () => {
    setActionError(null);
    const gen = communityGeneration();
    return runLeave(leaveGuard.current, {
      perform: () => runMutation('leaveGroup', groupId, {}, (requestId) => communityService.groups.leave({ requestId, groupId })),
      isCurrent: () => gen === communityGeneration(),
      onStart: () => setLeaving(true),
      // runMutation has dropped the detail store; the screen keeps its own reference.
      onLeft: () => {
        if (router.canGoBack()) router.back();
        else router.replace(HUB as any);
      },
      onError: (e) => setActionError(arabicCopyForCode(isApiError(e) ? e.code : 'unknown')),
      onSettled: () => setLeaving(false),
    });
  };

  const onLeave = () => {
    if (leaveGuard.current.leaving || leaveGuard.current.left) return;
    Alert.alert(COMMUNITY_COPY.leaveConfirmTitle, COMMUNITY_COPY.leaveConfirmBody, [
      { text: COMMUNITY_COPY.cancel, style: 'cancel' },
      { text: COMMUNITY_COPY.leaveGroup, style: 'destructive', onPress: () => void leave() },
    ]);
  };

  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader
        title={detail?.group.name ?? COMMUNITY_COPY.screenTitle}
        onBack={() => router.back()}
        style={columnStyle}
      />
      <ScrollView contentContainerStyle={[styles.content, columnStyle]} showsVerticalScrollIndicator={false}>
        <PreviewBanner />
        <AsyncContent
          status={status}
          error={error}
          onRetry={() => void refreshDetail()}
          style={styles.body}
        >
          {detail ? (
            <>
              <View style={styles.card}>
                <Text style={styles.label}>{COMMUNITY_COPY.joinCodeLabel}</Text>
                <View style={styles.codeBox} accessible accessibilityLabel={codeA11y(detail.group.joinCode)}>
                  {/* One line, shrinking to at most 60% before it would wrap (a 6-character code does not shrink in practice). */}
                  <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {detail.group.joinCode}
                  </Text>
                </View>
                <PillButton label={COMMUNITY_COPY.shareCode} variant="cream" onPress={onShareCode} />
              </View>

              {challenge ? (
                <ChallengeSection
                  challenge={challenge}
                  memberCount={detail.group.memberCount}
                  progress={detail.progress}
                  own={own}
                />
              ) : (
                <Text style={styles.note}>{COMMUNITY_COPY.noChallenge}</Text>
              )}

              <SettingsToggleRow
                title={COMMUNITY_COPY.shareProgress}
                icon={<EyeGlyph />}
                value={sharePending ?? detail.me.shareMyProgress}
                onValueChange={(v) => void onToggleShare(v)}
                disabled={sharePending !== null}
              />
              <Text style={styles.note}>{COMMUNITY_COPY.resetHelp}</Text>

              <View style={styles.headingBox}>
                <Text style={styles.heading}>
                  {`${COMMUNITY_COPY.membersHeading} · ${arabicCount(detail.members.length, MEMBERS)}`}
                </Text>
              </View>
              <View style={styles.members}>
                {detail.members.map((m) => {
                  const shared = detail.progress.shared.find((s) => s.member.memberId === m.memberId);
                  const figure = shared
                    ? challenge?.kind === 'daily-wird'
                      ? memberDaysLabel(shared.daysMet)
                      : memberPagesLabel(shared.pagesCovered)
                    : undefined;
                  return (
                    <MemberRow
                      key={m.memberId}
                      name={m.displayName}
                      isOwner={m.isOwner}
                      isMe={m.memberId === detail.me.memberId}
                      figure={figure}
                    />
                  );
                })}
              </View>

              {actionError ? (
                <Text style={styles.error} accessibilityRole="alert">
                  {actionError}
                </Text>
              ) : null}
              <PillButton label={COMMUNITY_COPY.leaveGroup} variant="cream" onPress={onLeave} disabled={leaving} />
            </>
          ) : null}
        </AsyncContent>
      </ScrollView>
    </SafeAreaView>
  );
}

function ChallengeSection({
  challenge,
  memberCount,
  progress,
  own,
}: {
  challenge: Challenge;
  memberCount: number;
  progress: GroupProgress;
  own: OwnProgress | null;
}) {
  // The server's totals are rendered as sent; the label reads the same totals.
  const view = groupView(progress, memberCount, challenge);
  const totals = progress.totals;
  const isWird = challenge.kind === 'daily-wird';
  const totalsLabel = !view.totalsVisible
    ? ''
    : isWird
      ? daysMetApproxLabel(totals?.daysMet ?? 0, memberCount * challenge.days)
      : khatmLabel(view.pages);
  const summary = isWird ? wirdSummary(challenge.pagesPerDay, challenge.days) : COMMUNITY_COPY.khatmOption;

  return (
    <>
      <ChallengeCard title={challenge.title} summary={summary} view={view} totalsLabel={totalsLabel} />
      {own ? (
        <View style={styles.card}>
          <Text style={styles.label}>{COMMUNITY_COPY.ownProgress}</Text>
          {isWird ? (
            <ProgressBar
              fraction={challenge.days > 0 ? own.daysMet / challenge.days : 0}
              label={daysMetLabel(own.daysMet, challenge.days)}
            />
          ) : (
            <ProgressBar
              fraction={own.pagesCovered / PAGES_PER_QURAN}
              label={ownPagesLabel(own.pagesCovered, PAGES_PER_QURAN)}
            />
          )}
        </View>
      ) : null}
    </>
  );
}

function EyeGlyph() {
  const c = KhazainColors.navy800;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" stroke={c} strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={3} stroke={c} strokeWidth={1.5} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 60, gap: 12 },
  // The fade wrapper is a real box; pinned so the notes and errors inside it align right.
  body: { ...PHYSICAL_BOX, gap: 12 },
  card: {
    ...PHYSICAL_BOX,
    padding: 16,
    gap: 12,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  label: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  // The code is Latin and reads left to right; the box is pinned so it centres on every platform.
  codeBox: {
    ...PHYSICAL_BOX,
    // Stretch, not centre: a shrink-wrapped Text drops its last glyphs on Android 15+.
    alignItems: 'stretch',
    paddingVertical: 12,
    borderRadius: KhazainRadius.md,
    backgroundColor: KhazainColors.cream200,
  },
  code: { ...textStyle('sectionTitle', { color: KhazainColors.navy900 }), letterSpacing: 6, writingDirection: 'ltr', textAlign: 'center' },
  note: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.inkSubtle }) },
  headingBox: { ...PHYSICAL_BOX },
  heading: { ...RTL_TEXT, ...textStyle('sectionTitle', { color: KhazainColors.navy900 }) },
  members: { gap: 8 },
  error: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.danger }) },
});
