import React from 'react';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';

// Rehl (Quran stand) illustration used in the Quran hero.
// 78×86 viewBox — port of design_source/app/home.jsx RehlArt.
export function RehlArt({ width = 78, height = 86 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 78 86">
      <Defs>
        <RadialGradient
          id="rehlGlow"
          cx="39"
          cy="30"
          r="30"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor="#FFE6A7" stopOpacity={0.85} />
          <Stop offset="1" stopColor="#FFE6A7" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={39} cy={30} r={28} fill="url(#rehlGlow)" />
      {/* rehl x-frame */}
      <Path d="M8 60 L34 42 L34 72 L8 86 Z" fill="#6B4423" />
      <Path d="M70 60 L44 42 L44 72 L70 86 Z" fill="#8B5A2B" />
      <Rect x={33} y={58} width={12} height={4} fill="#3D2817" />
      {/* open book */}
      <Path
        d="M6 38 Q39 30 72 38 L72 56 Q39 48 6 56 Z"
        fill="#FBF6EC"
        stroke="#8E6630"
        strokeWidth={0.8}
      />
      <Line x1={39} y1={34} x2={39} y2={52} stroke="#8E6630" strokeWidth={0.6} />
      <G stroke="#184B76" strokeWidth={0.5} strokeLinecap="round" opacity={0.55}>
        <Line x1={10} y1={42} x2={35} y2={41} />
        <Line x1={11} y1={45} x2={35} y2={44} />
        <Line x1={10} y1={48} x2={35} y2={47} />
        <Line x1={43} y1={41} x2={68} y2={42} />
        <Line x1={43} y1={44} x2={67} y2={45} />
        <Line x1={43} y1={47} x2={68} y2={48} />
      </G>
      {/* crest */}
      <Path transform="translate(39 26)" d="M0 -5 L3 0 L0 5 L-3 0 Z" fill="#A88051" />
    </Svg>
  );
}
