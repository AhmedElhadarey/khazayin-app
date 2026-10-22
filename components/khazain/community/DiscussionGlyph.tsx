import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

/** Speech-bubble badge glyph shared by the scholar entry and the discussion index rows. */
export function DiscussionGlyph({ size = 26 }: { size?: number }) {
  const c = KhazainColors.navy800;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H11l-4 3.5V16h-.5A2.5 2.5 0 014 13.5v-7z"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <Path d="M8.5 9h7M8.5 12h4.5" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
