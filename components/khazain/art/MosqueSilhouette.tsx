import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Mosque silhouette used across dawah posters.
// 154×54 viewBox — port of design_source/app/home.jsx DawahPoster inline svg.
export function MosqueSilhouette({
  width = 154,
  height = 54,
  color = '#C7A877',
  opacity = 0.65,
}: {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 154 54" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path
        d="M0 54 L0 36 L18 36 L18 26 Q26 24 26 18 Q26 24 34 26 L34 36 L48 36 L48 28
           Q54 24 54 18 L54 12 Q58 10 58 6 Q58 10 62 12 L62 18 Q62 24 70 28 L70 36 L85 36 L85 26
           Q94 24 94 18 Q94 24 103 26 L103 36 L120 36 L120 28 Q128 26 128 18 Q128 26 135 28 L135 36 L154 36 L154 54 Z"
        fill={color}
        opacity={opacity}
      />
    </Svg>
  );
}
