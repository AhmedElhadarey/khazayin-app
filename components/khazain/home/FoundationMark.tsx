import React from 'react';
import { Image } from 'react-native';

const EMBLEM = require('@/assets/khazain/brand/emblem-khazain-ar-rahman.png');

// 39×54 brand mark used in the home header. Renders the Khazain Al-Rahman
// emblem (navy + gold shield with calligraphy + tagline). The asset is the
// chroma-keyed transparent variant produced by scripts/generate-khazain-icons.ps1
// — it preserves the shield's natural aspect (~0.72:1) and drops cleanly onto
// the cream page background.
export function FoundationMark({
  width = 39,
  height = 54,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <Image
      source={EMBLEM}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="مؤسسة خزائن الرحمن"
    />
  );
}
