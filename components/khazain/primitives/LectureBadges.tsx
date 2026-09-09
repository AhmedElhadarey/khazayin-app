import { KhazainColors } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

// Cream-tinted circular discs used as the leading icon on LectureCard rows.
// Each badge is a 48px disc with an inner gold-stroked monoline glyph.
//
// Pages 25/33/34/35 of the Figma export — the variants seen in the spec:
//  - ProphetMedallionBadge → calligraphic ﷺ medallion (page 25 lectures)
//  - TulipBadge            → stylised tulip outline (page 33 أنتِ ملكة)
//  - OpenBookBadge         → open-book outline (page 34 الكتب العلمية)
//  - MicBadge              → mic + waves (page 35 برامج إذاعية)

const Disc = ({
  size,
  children,
  border,
}: {
  size: number;
  children: React.ReactNode;
  border?: boolean;
}) => (
  <View
    style={[
      styles.disc,
      { width: size, height: size, borderRadius: size / 2 },
      border && {
        borderWidth: 1,
        borderColor: KhazainColors.gold300,
      },
    ]}
  >
    {children}
  </View>
);

export function ProphetMedallionBadge({ size = 48 }: { size?: number }) {
  return (
    <Disc size={size} border>
      <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 36 36" fill="none">
        {/* dotted ring */}
        <Circle
          cx={18}
          cy={18}
          r={14}
          stroke={KhazainColors.gold400}
          strokeWidth={0.9}
          strokeDasharray="1.4 1.6"
          fill="none"
          opacity={0.85}
        />
        {/* inner ring */}
        <Circle
          cx={18}
          cy={18}
          r={11}
          stroke={KhazainColors.gold500}
          strokeWidth={0.6}
          fill="none"
          opacity={0.55}
        />
        {/* calligraphic ﷺ glyph (using the unicode glyph; falls back if font missing) */}
        <SvgText
          x={18}
          y={23}
          fontFamily="Amiri-Bold"
          fontSize={13}
          fontWeight={700}
          fill={KhazainColors.gold600}
          textAnchor="middle"
        >
          ﷺ
        </SvgText>
      </Svg>
    </Disc>
  );
}

export function TulipBadge({ size = 48 }: { size?: number }) {
  return (
    <Disc size={size}>
      <Svg width={size * 0.5} height={size * 0.6} viewBox="0 0 22 28" fill="none">
        {/* stem */}
        <Path
          d="M11 26 L11 14"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
        {/* left leaf */}
        <Path
          d="M11 22 C 6 21 4 18 4 15 C 7 16 10 18 11 21"
          stroke={KhazainColors.gold500}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* right leaf */}
        <Path
          d="M11 22 C 16 21 18 18 18 15 C 15 16 12 18 11 21"
          stroke={KhazainColors.gold500}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* tulip cup — 3 petals */}
        <Path
          d="M5 12 C 5 6 9 2 11 2 C 13 2 17 6 17 12 C 17 14 15 16 11 16 C 7 16 5 14 5 12 Z"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M11 2 L11 16"
          stroke={KhazainColors.gold500}
          strokeWidth={0.9}
          strokeLinecap="round"
          opacity={0.75}
        />
        <Path
          d="M7 7 C 8 11 9 14 11 16 M15 7 C 14 11 13 14 11 16"
          stroke={KhazainColors.gold500}
          strokeWidth={0.8}
          fill="none"
          opacity={0.55}
        />
      </Svg>
    </Disc>
  );
}

export function OpenBookBadge({ size = 48 }: { size?: number }) {
  return (
    <Disc size={size}>
      <Svg width={size * 0.6} height={size * 0.5} viewBox="0 0 30 24" fill="none">
        {/* spine */}
        <Path
          d="M15 5 L15 22"
          stroke={KhazainColors.gold500}
          strokeWidth={1.1}
          strokeLinecap="round"
        />
        {/* left page */}
        <Path
          d="M15 5 C 11 4 6 4 3 5 L3 20 C 6 19 11 19 15 20 Z"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinejoin="round"
          fill="none"
        />
        {/* right page */}
        <Path
          d="M15 5 C 19 4 24 4 27 5 L27 20 C 24 19 19 19 15 20 Z"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinejoin="round"
          fill="none"
        />
        {/* lines */}
        <Path
          d="M6 9 L12 9 M6 12 L12 12 M18 9 L24 9 M18 12 L24 12"
          stroke={KhazainColors.gold500}
          strokeWidth={0.7}
          strokeLinecap="round"
          opacity={0.55}
        />
      </Svg>
    </Disc>
  );
}

export function MicBadge({ size = 48 }: { size?: number }) {
  return (
    <Disc size={size}>
      <Svg width={size * 0.55} height={size * 0.6} viewBox="0 0 24 28" fill="none">
        {/* mic capsule */}
        <Path
          d="M9 4 a3 3 0 0 1 6 0 v8 a3 3 0 0 1 -6 0 z"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinejoin="round"
          fill="none"
        />
        {/* horseshoe */}
        <Path
          d="M5 11 a7 7 0 0 0 14 0"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinecap="round"
          fill="none"
        />
        {/* stand */}
        <Path
          d="M12 18 L12 22 M8 22 L16 22"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      </Svg>
    </Disc>
  );
}

/** Quill and inkwell — العلماء والمشايخ (Figma node 2102:2975). */
export function QuillBadge({ size = 48 }: { size?: number }) {
  return (
    <Disc size={size}>
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 19l3-3m0 0l8-8a3 3 0 014 4l-8 8H8v-1zM14 6l4 4"
          stroke={KhazainColors.gold500}
          strokeWidth={1.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M6 19h2"
          stroke={KhazainColors.gold500}
          strokeWidth={1.3}
          strokeLinecap="round"
        />
      </Svg>
    </Disc>
  );
}

/** Audio waveform — كتب صوتية (Figma node 2869:2088). */
export function AudioWaveBadge({ size = 48 }: { size?: number }) {
  const bars = [
    { x: 3, y: 10, h: 8 },
    { x: 7, y: 6, h: 16 },
    { x: 11, y: 2, h: 24 },
    { x: 15, y: 7, h: 14 },
    { x: 19, y: 11, h: 6 },
  ];
  return (
    <Disc size={size}>
      <Svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 28" fill="none">
        {bars.map((bar) => (
          <Path
            key={bar.x}
            d={`M${bar.x} ${bar.y} L${bar.x} ${bar.y + bar.h}`}
            stroke={KhazainColors.gold500}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        ))}
      </Svg>
    </Disc>
  );
}

/** Eight-point star — حصريات خزائن الرحمن (Figma node 2869:2306). */
export function SparkleBadge({ size = 48 }: { size?: number }) {
  return (
    <Disc size={size}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z"
          stroke={KhazainColors.gold500}
          strokeWidth={1.2}
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Disc>
  );
}

const styles = StyleSheet.create({
  disc: {
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
