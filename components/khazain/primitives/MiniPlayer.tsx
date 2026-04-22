import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PauseIcon, PlayIcon } from '../icons';
import { GeoNavyPattern } from '../patterns';
import { LogoBadge } from './LogoBadge';

// Persistent audio bar above the tab bar. 64 tall, navy800 w/ subtle geo overlay.
// Per handoff §6: 2px gold progress bar on top, cover 48×48, title/reciter column, play/pause 36×36 gold circle.
export function MiniPlayer() {
  const { track, isPlaying, progress, isVisible, togglePlay } = usePlayerStore();

  if (!isVisible || !track) return null;

  const pct = Math.max(0, Math.min(1, progress));

  return (
    <GeoNavyPattern style={styles.shell} opacity={0.08}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <View style={styles.cover}>
          <LogoBadge size={36} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.reciter} numberOfLines={1}>
            {track.reciter}
          </Text>
        </View>
        <Pressable
          onPress={togglePlay}
          accessibilityLabel={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          hitSlop={8}
          style={({ pressed }) => [styles.playBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          {isPlaying ? (
            <PauseIcon size={18} color={KhazainColors.navy900} />
          ) : (
            <PlayIcon size={18} color={KhazainColors.navy900} />
          )}
        </Pressable>
      </View>
    </GeoNavyPattern>
  );
}

const BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  shell: {
    height: BAR_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    // Floating lift above the tab bar (iOS + Android).
    shadowColor: '#0E2942',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    zIndex: 2,
  },
  progressFill: {
    height: 2,
    backgroundColor: KhazainColors.gold300,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: KhazainRadius.sm,
    backgroundColor: KhazainColors.cream100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '600',
    color: KhazainColors.cream100,
    writingDirection: 'rtl',
  },
  reciter: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '400',
    color: KhazainColors.cream300,
    writingDirection: 'rtl',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: KhazainColors.gold400,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
