import React from 'react';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { KhazainColors } from '@/constants/theme';

// 34×34 section-listing icons, ported from design_source/app/sections.jsx ICONS map.
// Each: ({ size = 34 }) signature, colors baked in to match spec.

type Props = { size?: number };

export function QuranSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M8 8 h20 a4 4 0 0 1 4 4 v20 a2 2 0 0 1 -2 2 H10 a2 2 0 0 1 -2 -2 V8z"
        fill="#F5EDE0"
        stroke={KhazainColors.navy800}
        strokeWidth={1.3}
      />
      <Path
        d="M8 8 v24 a2 2 0 0 0 2 2"
        stroke={KhazainColors.navy800}
        strokeWidth={1.3}
        fill="none"
      />
      <Path
        d="M14 18 Q20 14 26 18"
        stroke={KhazainColors.gold500}
        strokeWidth={1.2}
        fill="none"
      />
      <Path d="M16 22 Q20 20 24 22 L24 26 Q20 28 16 26 Z" fill={KhazainColors.gold400} opacity={0.55} />
      <Circle cx={20} cy={14} r={1.2} fill={KhazainColors.gold500} />
    </Svg>
  );
}

export function ProphetSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Circle
        cx={20}
        cy={20}
        r={14}
        fill="none"
        stroke={KhazainColors.gold400}
        strokeWidth={1}
        strokeDasharray="1.2 1.8"
        opacity={0.8}
      />
      <SvgText
        x={20}
        y={26}
        fontFamily="Amiri-Bold"
        fontSize={20}
        fontWeight={700}
        fill={KhazainColors.navy800}
        textAnchor="middle"
      >
        ﷺ
      </SvgText>
    </Svg>
  );
}

export function ScholarSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M12 28 h10 v4 a2 2 0 0 1 -2 2 h-6 a2 2 0 0 1 -2 -2 z"
        fill={KhazainColors.navy800}
      />
      <Rect x={13} y={26} width={8} height={2.2} rx={1} fill={KhazainColors.navy900} />
      <Path
        d="M30 8 L16 26 L19 29 L33 11 Z"
        fill={KhazainColors.gold400}
        stroke={KhazainColors.navy800}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <Path
        d="M30 8 Q34 10 33 14"
        stroke={KhazainColors.navy800}
        strokeWidth={0.9}
        fill="none"
      />
      <Path
        d="M19 29 L21 31 L24 28"
        stroke={KhazainColors.navy800}
        strokeWidth={1}
        fill="none"
      />
    </Svg>
  );
}

export function BookSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect x={6} y={26} width={28} height={5} rx={1} fill={KhazainColors.navy800} />
      <Rect x={8} y={21} width={24} height={5} rx={1} fill={KhazainColors.gold500} />
      <Rect
        x={10}
        y={10}
        width={20}
        height={11}
        rx={1}
        fill="#F5EDE0"
        stroke={KhazainColors.navy800}
        strokeWidth={1}
      />
      <Path
        d="M14 14 h12 M14 17 h9"
        stroke={KhazainColors.navy800}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CrownSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 8 Q18 16 14 20 Q12 24 14 30 Q18 32 20 28 Q22 32 26 30 Q28 24 26 20 Q22 16 20 8 Z"
        fill={KhazainColors.gold400}
        stroke={KhazainColors.navy800}
        strokeWidth={1}
        strokeLinejoin="round"
      />
      <Path
        d="M20 12 Q19 18 17 22 M20 12 Q21 18 23 22"
        stroke={KhazainColors.navy900}
        strokeWidth={0.8}
        fill="none"
        opacity={0.5}
      />
    </Svg>
  );
}

export function HeadphonesSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect
        x={8}
        y={10}
        width={24}
        height={20}
        rx={2}
        fill="#F5EDE0"
        stroke={KhazainColors.navy800}
        strokeWidth={1.2}
      />
      <Rect x={8} y={10} width={24} height={4} fill={KhazainColors.gold500} opacity={0.8} />
      <Path d="M14 18 Q20 15 26 18 Q20 22 14 18 Z" fill={KhazainColors.navy800} />
      <Rect x={13} y={25} width={14} height={2} rx={1} fill={KhazainColors.navy800} opacity={0.5} />
    </Svg>
  );
}

export function SparkleSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Path
        d="M20 6 L22 14 L30 16 L22 18 L20 26 L18 18 L10 16 L18 14 Z"
        fill={KhazainColors.gold400}
        stroke={KhazainColors.navy800}
        strokeWidth={0.9}
        strokeLinejoin="round"
      />
      <Circle cx={30} cy={28} r={2} fill={KhazainColors.navy800} />
      <Circle cx={10} cy={30} r={1.5} fill={KhazainColors.gold500} />
    </Svg>
  );
}

export function MicSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect x={15} y={8} width={10} height={18} rx={5} fill={KhazainColors.navy800} />
      <Rect x={17} y={12} width={6} height={10} rx={3} fill={KhazainColors.gold400} opacity={0.7} />
      <Path
        d="M10 22 a10 10 0 0 0 20 0 M20 32 v4"
        stroke={KhazainColors.navy800}
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M15 36 h10"
        stroke={KhazainColors.navy800}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DesignSectionIcon({ size = 34 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Rect
        x={8}
        y={8}
        width={24}
        height={24}
        rx={2}
        fill="#F5EDE0"
        stroke={KhazainColors.navy800}
        strokeWidth={1.2}
      />
      <Rect
        x={11}
        y={11}
        width={18}
        height={18}
        rx={1}
        stroke={KhazainColors.gold500}
        strokeWidth={0.8}
        fill="none"
      />
      <Path
        d="M14 24 L18 19 L22 22 L26 16 L26 26 L14 26 Z"
        fill={KhazainColors.gold400}
        opacity={0.7}
      />
      <Circle cx={24} cy={14} r={1.6} fill={KhazainColors.navy800} />
    </Svg>
  );
}

export const SECTION_ICONS = {
  quran: QuranSectionIcon,
  prophet: ProphetSectionIcon,
  scholar: ScholarSectionIcon,
  book: BookSectionIcon,
  crown: CrownSectionIcon,
  headphones: HeadphonesSectionIcon,
  sparkle: SparkleSectionIcon,
  mic: MicSectionIcon,
  design: DesignSectionIcon,
} as const;

export type SectionIconKey = keyof typeof SECTION_ICONS;
