import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
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
 * Like the matching section card (2355:1478), `DIV-58` here sets the words
 * خزائن الرحمن as a raster IMAGE paint over the disc. The disc and the vector
 * letterforms around it come from the file; the word is overlaid from the
 * archive's own art rather than redrawn.
 */
export function SparkleBadge({ size = BADGE_SIZE }: Props) {
  // `Frame 5` is 30 inside the 40pt disc, and the seal fills 42/46 of it.
  const seal = size * (30 / 40) * (42 / 46);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <FigmaIcon name="BadgeExclusive" size={size} />
      <Image
        source={require('@/assets/figma/seal-khazain.png')}
        style={{ position: 'absolute', width: seal, height: seal }}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
  );
}
