import React from 'react';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

// 39×54 shield-shaped foundation mark used in the home header.
// Polygon matches design_source/app/home.jsx: 50% 0, 93% 15%, 100% 50%, 93% 85%, 50% 100%, 7% 85%, 0 50%, 7% 15%.
export function FoundationMark({
  width = 39,
  height = 54,
  monogram = 'خر',
}: {
  width?: number;
  height?: number;
  monogram?: string;
}) {
  const pts = (W: number, H: number) =>
    [
      [W * 0.5, 0],
      [W * 0.93, H * 0.15],
      [W, H * 0.5],
      [W * 0.93, H * 0.85],
      [W * 0.5, H],
      [W * 0.07, H * 0.85],
      [0, H * 0.5],
      [W * 0.07, H * 0.15],
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(' ');

  const inset = 3;
  const fontSize = Math.round(Math.min(width, height) * 0.3);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polygon points={pts(width, height)} fill={KhazainColors.navy800} />
      <Polygon
        points={pts(width - inset * 2, height - inset * 2)}
        transform={`translate(${inset},${inset})`}
        fill="none"
        stroke="#D7B995"
        strokeOpacity={0.7}
        strokeWidth={1}
      />
      <SvgText
        x={width / 2}
        y={height / 2 + fontSize * 0.38}
        fill="#D7B995"
        fontFamily="Amiri-Bold"
        fontSize={fontSize}
        textAnchor="middle"
      >
        {monogram}
      </SvgText>
    </Svg>
  );
}
