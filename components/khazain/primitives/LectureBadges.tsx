import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { PHYSICAL_BOX } from '@/constants/layout';
import { FigmaIcon, figmaIcon } from '../icons/FigmaIcon';

/**
 * The leading badge on a lecture row — node `DIV-58`, redrawn in ten of the
 * Sections frames.
 *
 * It is one node per section, not one node with a swapped glyph: the file
 * draws a different mark in each, and it draws the tinted disc as part of the
 * same node. So each badge here is the whole `DIV-58` — the `#D7B995` disc at
 * 16% and the `#A88051` mark inside it, in the proportions the file states —
 * rather than a drawn circle with a drawn glyph centred in it. The app's
 * previous badges were monoline approximations at a guessed inset, and three
 * of them (the waveform, the quill, the dawah mark) were the wrong subject.
 *
 * The `({ size })` signature is unchanged, so no call site moved.
 */
type Props = { size?: number };

/** `DIV-58` is 40 in every frame that draws it. */
const BADGE_SIZE = 40;

export const ProphetMedallionBadge = figmaIcon('BadgeProphet');
export const TulipBadge = figmaIcon('BadgeTulip');
export const OpenBookBadge = figmaIcon('BadgeOpenBook');
export const MicBadge = figmaIcon('BadgeMic');
export const QuillBadge = figmaIcon('BadgeQuill');
export const AudioWaveBadge = figmaIcon('BadgeAudioWave');
export const MoonMountainBadge = figmaIcon('BadgeMoonMountain');

/**
 * حصريات — the one badge whose mark is not wholly vector.
 *
 * `DIV-58` (2869:2374) → `Frame 5` (30 at 5,5) paints, in this order:
 *   1. the #A88051 disc (vector 2869:2450),
 *   2. the raster خزائن الرحمن seal (2869:2451, 27.39x30 at 0,0, STRETCH; its
 *      paint is scaled 1.0416 so it lands at about 26.3x30), then
 *   3. ON TOP, the letterforms 2869:2452 that write the word on the seal's
 *      white band, #A88051.
 *
 * Drawing the letters first hid them under the seal. The disc and letters come
 * from the file; the seal is overlaid from the archive's own art.
 */
export function SparkleBadge({ size = BADGE_SIZE }: Props) {
  const unit = size / 40;
  return (
    <View style={{ ...PHYSICAL_BOX, width: size, height: size }}>
      <FigmaIcon name="BadgeExclusive" size={size} />
      <Image
        source={require('@/assets/figma/seal-khazain.png')}
        style={{
          position: 'absolute',
          left: unit * 5,
          top: unit * 5,
          width: (size * 26.3) / 40,
          height: (size * 30) / 40,
        }}
        contentFit="fill"
        cachePolicy="memory-disk"
      />
      <View style={{ position: 'absolute', left: unit * (5 + 11.32), top: unit * (5 + 12.35) }}>
        <FigmaIcon name="BadgeExclusiveLetters" size={unit * 8.77} />
      </View>
    </View>
  );
}
