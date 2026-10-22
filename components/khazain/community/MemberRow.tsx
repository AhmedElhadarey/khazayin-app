/**
 * One member in the group detail list. Physical left to right: the opted-in
 * figure (when the member shares one), then the name block at the right edge.
 * Contract-only, like `GroupRow`; the name keeps `RTL_TEXT` inside the pinned row.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

export function MemberRow({
  name,
  isOwner,
  isMe,
  figure,
}: {
  name: string;
  isOwner: boolean;
  isMe: boolean;
  /** The member's own counts, present only when they opted in. */
  figure?: string;
}) {
  const badges: string[] = [];
  if (isMe) badges.push(COMMUNITY_COPY.youBadge);
  if (isOwner) badges.push(COMMUNITY_COPY.ownerBadge);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={[name, ...badges, figure].filter(Boolean).join('، ')}
    >
      {figure ? <Text style={styles.figure}>{figure}</Text> : null}
      <View style={styles.nameBox}>
        <Text style={styles.name}>{name}</Text>
        {badges.length > 0 ? <Text style={styles.badge}>{badges.join(' · ')}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: KhazainRadius.md,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  figure: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.ink900 }), flexShrink: 0 },
  // alignItems 'flex-end' is the physical right: the box is pinned ltr.
  nameBox: { ...PHYSICAL_BOX, flex: 1, minWidth: 0, alignItems: 'flex-end' },
  name: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  badge: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.goldAccent }) },
});
