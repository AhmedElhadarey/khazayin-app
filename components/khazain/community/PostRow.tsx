/**
 * One post in a lecture thread (design §8.5, §10). Physical order, left to
 * right, comes from `COMMUNITY_POST_ORDER` inside a `PHYSICAL_ROW`: the row's
 * actions, the text block, then the author's avatar at the right edge. The
 * text block is one accessibility element; the actions stay separate buttons.
 * No long-press anywhere: SAVE and NOTE own it elsewhere (CLAUDE.md).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_COPY, muteA11y, postA11y, reportA11y } from '@/constants/communityCopy';
import { MIN_TOUCH_TARGET, PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { COMMUNITY_POST_ORDER, type CommunityPostSlot } from '@/constants/rtlContracts';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import type { PostDisplayStatus } from '@/types/community';

export type PostRowStatus = PostDisplayStatus;

function ActionButton({
  label,
  a11y,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  a11y: string;
  onPress?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.action, { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      <Text style={[styles.actionText, danger ? styles.actionDanger : null]}>{label}</Text>
    </Pressable>
  );
}

export function PostRow({
  authorName,
  body,
  timeLabel,
  status,
  isMine,
  busy,
  onDelete,
  onReport,
  onMute,
}: {
  authorName: string;
  body: string;
  timeLabel: string;
  status: PostRowStatus;
  isMine: boolean;
  /** A write on this post is in flight: the actions are disabled. */
  busy?: boolean;
  onDelete?: () => void;
  onReport?: () => void;
  onMute?: () => void;
}) {
  const badge =
    status === 'pending' ? COMMUNITY_COPY.pendingBadge : status === 'hidden' ? COMMUNITY_COPY.hiddenBadge : null;
  const initial = [...authorName.trim()][0] ?? '•';

  const slots: Record<CommunityPostSlot, React.ReactNode> = {
    actions: (
      <View style={styles.actions}>
        {isMine ? (
          <ActionButton
            label={COMMUNITY_COPY.deletePost}
            a11y={COMMUNITY_COPY.deletePost}
            onPress={onDelete}
            disabled={busy}
            danger
          />
        ) : (
          <>
            <ActionButton
              label={COMMUNITY_COPY.report}
              a11y={reportA11y(authorName)}
              onPress={onReport}
              disabled={busy}
            />
            <ActionButton
              label={COMMUNITY_COPY.muteMember}
              a11y={muteA11y(authorName)}
              onPress={onMute}
              disabled={busy}
            />
          </>
        )}
      </View>
    ),
    text: (
      <View
        style={styles.textCol}
        accessible
        accessibilityLabel={postA11y({ name: authorName, time: timeLabel, status, body })}
      >
        <Text style={styles.name} numberOfLines={1}>
          {authorName}
        </Text>
        <Text style={styles.time}>{timeLabel}</Text>
        {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        <Text style={styles.body}>{body}</Text>
      </View>
    ),
    avatar: (
      <View style={styles.avatar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.initial}>{initial}</Text>
      </View>
    ),
  };

  return (
    <View style={styles.card}>
      {COMMUNITY_POST_ORDER.map((slot) => (
        <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...PHYSICAL_ROW,
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: KhazainRadius.md,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  actions: { ...PHYSICAL_BOX, alignItems: 'flex-start', flexShrink: 0 },
  action: { minHeight: MIN_TOUCH_TARGET, minWidth: MIN_TOUCH_TARGET, paddingHorizontal: 6, justifyContent: 'center' },
  actionText: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.navy800 }) },
  // Legacy palette: the Khazain tokens carry no error colour.
  actionDanger: { color: KhazainColors.danger },
  // alignItems 'flex-end' is the physical right: the box is pinned ltr.
  textCol: { ...PHYSICAL_BOX, flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  name: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  time: { ...RTL_TEXT, ...textStyle('caption', { color: KhazainColors.ink500 }) },
  badge: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.goldAccent }) },
  body: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.ink900 }), marginTop: 4 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  initial: textStyle('bodyCompact', { color: KhazainColors.navy800, textAlign: 'center' }),
});
