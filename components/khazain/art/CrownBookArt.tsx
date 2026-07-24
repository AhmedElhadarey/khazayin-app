import React from 'react';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

// Crown + stacked book illustration for the "أنتِ ملكة" card.
// 130×80 viewBox — port of design_source/app/home.jsx CrownBookArt.
export function CrownBookArt({
  width = 130,
  height = 80,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 130 80" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* book stack */}
      <Rect x={24} y={52} width={90} height={8} rx={1.5} fill="#8E6630" />
      <Rect x={28} y={45} width={82} height={8} rx={1.5} fill="#A88051" />
      <Rect x={32} y={38} width={74} height={8} rx={1.5} fill="#D7B995" />
      {/* crown */}
      <G transform="translate(70 20)">
        <Path
          d="M-26 12 L-22 -12 L-12 0 L0 -16 L12 0 L22 -12 L26 12 Z"
          fill="#D7B995"
          stroke="#8E6630"
          strokeWidth={0.9}
          strokeLinejoin="round"
        />
        <Rect x={-26} y={12} width={52} height={5} fill="#B8864A" />
        <Circle cx={-22} cy={-10} r={2} fill="#184B75" />
        <Circle cx={0} cy={-14} r={2.5} fill="#184B75" />
        <Circle cx={22} cy={-10} r={2} fill="#184B75" />
        <Circle cx={-12} cy={2} r={1.2} fill="#C1A584" />
        <Circle cx={12} cy={2} r={1.2} fill="#C1A584" />
      </G>
    </Svg>
  );
}
