/**
 * Dev-only banner shown at the top of every community screen (design §3.2).
 * Renders nothing unless the community mode is `mock`, which production
 * builds never are.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { COMMUNITY_MODE } from '@/services/community/config';
import type { CommunityMode } from '@/services/community/gate';

export function PreviewBanner({ mode = COMMUNITY_MODE }: { mode?: CommunityMode }) {
  if (mode !== 'mock') return null;
  return (
    <View style={styles.box} accessibilityRole="text">
      <Text style={styles.text}>{COMMUNITY_COPY.previewBanner}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    ...PHYSICAL_BOX,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: KhazainRadius.md,
    backgroundColor: KhazainColors.cream200,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  text: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.ink900 }) },
});
