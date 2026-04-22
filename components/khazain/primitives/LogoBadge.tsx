import React from 'react';
import Svg, { Polygon, Text as SvgText } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

type Props = {
  size?: number;
  width?: number;
  height?: number;
  monogram?: string;
};

// Octagonal navy badge with a gold inset frame and the "خر" monogram in gold Amiri.
// Points at 30/70/100 ratios of the width/height per handoff §6.
export function LogoBadge({ size = 40, width, height, monogram = 'خر' }: Props) {
  const w = width ?? size;
  const h = height ?? size;
  const r = 3; // inset for inner frame in px at default 40
  const insetScale = Math.min(w, h) / 40;
  const inset = r * insetScale;

  // Outer octagon points (0..w, 0..h) at 30%, 70%, 100%
  const pts = (W: number, H: number) =>
    [
      [W * 0.3, 0],
      [W * 0.7, 0],
      [W, H * 0.3],
      [W, H * 0.7],
      [W * 0.7, H],
      [W * 0.3, H],
      [0, H * 0.7],
      [0, H * 0.3],
    ]
      .map(([x, y]) => `${x},${y}`)
      .join(' ');

  const fontSize = Math.round(Math.min(w, h) * 0.42);

  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Polygon points={pts(w, h)} fill={KhazainColors.navy800} />
      <Polygon
        points={pts(w - inset * 2, h - inset * 2)}
        transform={`translate(${inset},${inset})`}
        fill="none"
        stroke={KhazainColors.gold300}
        strokeWidth={1}
      />
      <SvgText
        x={w / 2}
        y={h / 2 + fontSize * 0.35}
        fill={KhazainColors.gold300}
        fontFamily="Amiri-Bold"
        fontSize={fontSize}
        textAnchor="middle"
      >
        {monogram}
      </SvgText>
    </Svg>
  );
}
