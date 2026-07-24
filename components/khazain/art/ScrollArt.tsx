import React from 'react';
import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';

// Scroll + stacked books illustration used in the Muhammad ﷺ hero.
// 100×120 viewBox — port of design_source/app/home.jsx ScrollArt.
export function ScrollArt({ width = 100, height = 120 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 120" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* stacked books */}
      <Rect x={10} y={94} width={82} height={8} rx={1} fill="#8E6630" />
      <Rect x={14} y={86} width={78} height={7} rx={1} fill="#A67C3F" />
      <Rect x={8} y={78} width={85} height={7} rx={1} fill="#6B4423" />
      {/* scroll */}
      <G transform="translate(14 10)">
        <Rect x={-2} y={4} width={6} height={58} rx={3} fill="#6B4423" />
        <Rect x={68} y={4} width={6} height={58} rx={3} fill="#6B4423" />
        <Rect
          x={4}
          y={8}
          width={64}
          height={50}
          rx={2}
          fill="#F6E8C9"
          stroke="#A88051"
          strokeWidth={0.8}
        />
        <SvgText
          x={36}
          y={35}
          fontFamily="Amiri-Bold"
          fontSize={18}
          fontWeight={700}
          fill="#184B75"
          textAnchor="middle"
        >
          ﷺ
        </SvgText>
        <SvgText
          x={36}
          y={48}
          fontFamily="Amiri"
          fontSize={7}
          fill="#8E6630"
          textAnchor="middle"
        >
          صلى الله عليه وسلم
        </SvgText>
        <Circle cx={1} cy={4} r={2.5} fill="#A88051" />
        <Circle cx={1} cy={62} r={2.5} fill="#A88051" />
        <Circle cx={71} cy={4} r={2.5} fill="#A88051" />
        <Circle cx={71} cy={62} r={2.5} fill="#A88051" />
      </G>
    </Svg>
  );
}
