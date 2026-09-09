import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { skipNext, skipPrev, togglePlayback } from '@/services/audioEngine';
import { usePlayerStore } from '@/store/playerStore';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { LogoBadge } from './LogoBadge';

// Compact MiniPlayer — Figma page-09.
// Cream card, 64px tall content area + bottom progress bar; cover artwork on
// the RIGHT (RTL leading edge), title + reciter to its left, transport
// controls on the FAR LEFT (skip-back, navy circle play/pause, skip-forward).
export function MiniPlayer() {
  // Atomic selectors: the player store's `progress` updates ~1Hz during
  // playback; subscribing to the whole store here would re-render the SVG
  // transport glyphs every tick. The progress bar is isolated into
  // <ProgressFill/> so only it re-renders on a tick (T3.3).
  const track = usePlayerStore((s) => s.track);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isVisible = usePlayerStore((s) => s.isVisible);

  if (!isVisible || !track) return null;

  return (
    <View style={[styles.shell, KhazainShadows.card]}>
      <View style={styles.row}>
        {/* JSX-first lands on the right under forceRTL+row.
            Visual RTL right → left: [cover][text][transport]. */}
        <View style={styles.cover}>
          <LogoBadge size={56} />
        </View>

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.reciter} numberOfLines={1}>
            {track.reciter}
          </Text>
        </View>

        <View style={styles.transport}>
          {/* JSX-first → right of the transport cluster under forceRTL.
              Visual RTL right → left: [skipBack][playPause][skipFwd]. */}
          <SkipButton dir="back" onPress={skipPrev} label="السابق" />
          <Pressable
            onPress={() => togglePlayback()}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            hitSlop={10}
            style={({ pressed }) => [styles.playBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
          </Pressable>
          <SkipButton dir="fwd" onPress={skipNext} label="التالي" />
        </View>
      </View>

      {/* Progress bar pinned to the bottom of the card */}
      <View style={styles.progressTrack}>
        <ProgressFill />
      </View>
    </View>
  );
}

// Isolated so a ~1Hz progress tick re-renders only this fill, not the parent
// MiniPlayer and its SVG transport glyphs (T3.3).
function ProgressFill() {
  const progress = usePlayerStore((s) => s.progress);
  const pct = Math.max(0, Math.min(1, progress));
  return <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />;
}

// Pressable wrapper around the pure SkipGlyph SVG — wires prev/next transport.
function SkipButton({ dir, onPress, label }: { dir: 'back' | 'fwd'; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <SkipGlyph dir={dir} />
    </Pressable>
  );
}

// Triangle + bar skip-back / skip-forward glyphs (small, gold/copper outline-ish per Figma).
function SkipGlyph({ dir }: { dir: 'back' | 'fwd' }) {
  // back = play triangle pointing left, with a vertical bar to its left
  // fwd  = play triangle pointing right, with a vertical bar to its right
  const stroke = KhazainColors.ink400;
  return (
    <Svg width={20} height={16} viewBox="0 0 20 16" fill="none">
      {dir === 'back' ? (
        <>
          <Rect x={2} y={3} width={1.5} height={10} fill={stroke} rx={0.5} />
          <Polygon points="17,2 17,14 5,8" fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
        </>
      ) : (
        <>
          <Polygon points="3,2 3,14 15,8" fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
          <Rect x={16.5} y={3} width={1.5} height={10} fill={stroke} rx={0.5} />
        </>
      )}
    </Svg>
  );
}

function PlayGlyph() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Polygon points="3,2 3,10 10,6" fill="#FFFFFF" />
    </Svg>
  );
}

function PauseGlyph() {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path d="M3 2v8M9 2v8" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const MIN_BAR_HEIGHT = 80;
const COVER = 56;

const styles = StyleSheet.create({
  shell: {
    minHeight: MIN_BAR_HEIGHT,
    borderRadius: KhazainRadius.lg,
    overflow: 'hidden',
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  row: {
    minHeight: COVER,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: KhazainRadius.sm,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  reciter: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '400',
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: 'rgba(24,75,118,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: KhazainColors.navy800,
  },
  // 2-px progress track at the bottom of the card.
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(24,75,118,0.12)',
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: 4,
    backgroundColor: KhazainColors.navy800,
  },
});
