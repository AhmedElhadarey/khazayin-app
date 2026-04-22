import React from 'react';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';

export * from './sections';

export type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const defaults = (size?: number, color?: string) => ({
  size: size ?? 24,
  color: color ?? '#281E13',
});

// ---- Line icons (stroke-based, 24x24) --------------------------------

export function BellIcon({ size, color, strokeWidth = 1.8 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 8a6 6 0 0 1 12 0v4l1.5 3h-15L6 12V8Z"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 18a2 2 0 0 0 4 0"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SearchIcon({ size, color, strokeWidth = 1.8 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={d.color} strokeWidth={strokeWidth} />
      <Line
        x1={16}
        y1={16}
        x2={21}
        y2={21}
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function PlayIcon({ size, color }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Polygon points="7,4 7,20 20,12" fill={d.color} />
    </Svg>
  );
}

export function PauseIcon({ size, color }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Rect x={6} y={5} width={4} height={14} rx={1} fill={d.color} />
      <Rect x={14} y={5} width={4} height={14} rx={1} fill={d.color} />
    </Svg>
  );
}

export function ChevronIcon({
  size,
  color,
  strokeWidth = 2,
  direction = 'start',
}: IconProps & { direction?: 'start' | 'end' | 'up' | 'down' }) {
  const d = defaults(size, color);
  // In RTL, "start" is right-pointing (toward the user's leading edge visually on LTR = left).
  // The component is layout-direction agnostic; callers use direction to get the visual they want.
  const map: Record<string, string> = {
    start: 'M15 6 L9 12 L15 18', // chevron pointing left
    end: 'M9 6 L15 12 L9 18', // chevron pointing right
    up: 'M6 15 L12 9 L18 15',
    down: 'M6 9 L12 15 L18 9',
  };
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d={map[direction]}
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BookmarkIcon({
  size,
  color,
  strokeWidth = 1.8,
  filled,
}: IconProps & { filled?: boolean }) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3h12v18l-6-4-6 4V3Z"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill={filled ? d.color : 'none'}
      />
    </Svg>
  );
}

export function HouseIcon({
  size,
  color,
  strokeWidth = 1.8,
  filled,
}: IconProps & { filled?: boolean }) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11.5 L12 4 L21 11.5 V20 a1 1 0 0 1 -1 1 h-5 v-6 h-4 v6 h-5 a1 1 0 0 1 -1 -1 Z"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        fill={filled ? d.color : 'none'}
      />
    </Svg>
  );
}

export function GridIcon({
  size,
  color,
  strokeWidth = 1.8,
  filled,
}: IconProps & { filled?: boolean }) {
  const d = defaults(size, color);
  const fill = filled ? d.color : 'none';
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={8} height={8} rx={1.5} stroke={d.color} strokeWidth={strokeWidth} fill={fill} />
      <Rect x={13} y={3} width={8} height={8} rx={1.5} stroke={d.color} strokeWidth={strokeWidth} fill={fill} />
      <Rect x={3} y={13} width={8} height={8} rx={1.5} stroke={d.color} strokeWidth={strokeWidth} fill={fill} />
      <Rect x={13} y={13} width={8} height={8} rx={1.5} stroke={d.color} strokeWidth={strokeWidth} fill={fill} />
    </Svg>
  );
}

export function MenuLinesIcon({ size, color, strokeWidth = 2 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Line x1={4} y1={7} x2={20} y2={7} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4} y1={12} x2={20} y2={12} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={4} y1={17} x2={20} y2={17} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function ShareIcon({ size, color, strokeWidth = 1.8 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Circle cx={18} cy={5} r={3} stroke={d.color} strokeWidth={strokeWidth} />
      <Circle cx={6} cy={12} r={3} stroke={d.color} strokeWidth={strokeWidth} />
      <Circle cx={18} cy={19} r={3} stroke={d.color} strokeWidth={strokeWidth} />
      <Line x1={8.5} y1={10.5} x2={15.5} y2={6.5} stroke={d.color} strokeWidth={strokeWidth} />
      <Line x1={8.5} y1={13.5} x2={15.5} y2={17.5} stroke={d.color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function WhatsAppIcon({ size, color }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a9 9 0 0 0 -7.7 13.7 L3 21 l4.5 -1.2 A9 9 0 1 0 12 3 Z"
        fill={d.color}
      />
      <Path
        d="M8.5 8.5 c0 4 3 7 7 7 l-1 -2 -2 1 c-1.5 -0.8 -2.7 -2 -3.5 -3.5 l1 -2 -1.5 -0.5 Z"
        fill="#fff"
      />
    </Svg>
  );
}

export function TelegramIcon({ size, color }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4 L2 11.5 l6 2 l2 6.5 l3 -3 l5 4 L21 4 Z"
        fill={d.color}
      />
    </Svg>
  );
}

export function YouTubeIcon({ size, color }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.5 7.5 a3 3 0 0 0 -2.1 -2.1 C17.4 5 12 5 12 5 s-5.4 0 -7.4 0.4 A3 3 0 0 0 2.5 7.5 C2.1 9.5 2.1 12 2.1 12 s0 2.5 0.4 4.5 a3 3 0 0 0 2.1 2.1 C6.6 19 12 19 12 19 s5.4 0 7.4 -0.4 a3 3 0 0 0 2.1 -2.1 C21.9 14.5 21.9 12 21.9 12 s0 -2.5 -0.4 -4.5 Z"
        fill={d.color}
      />
      <Polygon points="10,9 16,12 10,15" fill="#fff" />
    </Svg>
  );
}

export function CopyIcon({ size, color, strokeWidth = 1.8 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={12} height={13} rx={2} stroke={d.color} strokeWidth={strokeWidth} />
      <Path
        d="M16 8 V5 a2 2 0 0 0 -2 -2 H6 a2 2 0 0 0 -2 2 v10 a2 2 0 0 0 2 2 h2"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DownloadIcon({ size, color, strokeWidth = 1.8 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={4} x2={12} y2={15} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M7 11 L12 16 L17 11"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={4} y1={20} x2={20} y2={20} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size, color, strokeWidth = 2 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12 L10 17 L19 7"
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size, color, strokeWidth = 2 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Line x1={6} y1={6} x2={18} y2={18} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={18} y1={6} x2={6} y2={18} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size, color, strokeWidth = 2 }: IconProps) {
  const d = defaults(size, color);
  return (
    <Svg width={d.size} height={d.size} viewBox="0 0 24 24" fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={d.color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}
