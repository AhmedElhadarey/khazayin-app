import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { useSavedStore, useToastStore } from '@/store';
import type { SavedSnapshot, SavedType } from '@/types/content';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookmarkIcon } from '../icons';

/**
 * BookmarkButton — single bookmark affordance for all 5 saveable surfaces
 * (ScholarCard, BookCard, DawahPoster, SurahRow, LectureCard).
 *
 * Visual contract:
 *   - 32x32 hit area, 18x18 icon
 *   - gold500 (darker, distinct from gold200 accent) when saved
 *     — Board condition #7
 *   - 3 variants for host contrast:
 *       light    — for cream surfaces (BookCard, SurahRow, LectureCard)
 *       dark     — for navy surfaces (ScholarCard)
 *       floating — for image surfaces (DawahPoster); semi-opaque bubble + shadow
 *
 * Behaviour:
 *   - save     → toast 'تمت الإضافة إلى المحفوظات' (3s) with 'تراجع' undo
 *                — Board condition #3 (symmetric undo)
 *   - unsave   → toast 'تم الحذف من المحفوظات'    (5s) with 'تراجع' undo
 *                — Board condition #6 (5s for Arabic readers)
 *
 * Track: khazain-saved_20260511  T6
 */
type Props = {
  type: SavedType;
  entityId: string;
  snapshot: SavedSnapshot;
  variant?: 'light' | 'dark' | 'floating';
  hitSize?: number;
  onChange?: (saved: boolean) => void;
};

export function BookmarkButton({
  type,
  entityId,
  snapshot,
  variant = 'light',
  hitSize = 32,
  onChange,
}: Props) {
  // Inline-predicate selector — see design §3.3 / §7.3 for the rationale.
  const saved = useSavedStore((s) =>
    s.items.some((it) => it.type === type && it.entityId === entityId),
  );

  const onPress = () => {
    if (saved) {
      const removed = useSavedStore.getState().unsave(type, entityId);
      if (removed !== null) {
        useToastStore.getState().show({
          message: 'تم الحذف من المحفوظات',
          durationMs: 5000, // Board condition #6
          action: {
            label: 'تراجع',
            onPress: () => {
              useSavedStore.getState().save(removed.type, removed.entityId, removed.snapshot);
            },
          },
        });
      }
      onChange?.(false);
    } else {
      useSavedStore.getState().save(type, entityId, snapshot);
      useToastStore.getState().show({
        message: 'تمت الإضافة إلى المحفوظات',
        durationMs: 3000,
        action: {
          // Board condition #3: symmetric undo on save (mis-tap regret-window).
          label: 'تراجع',
          onPress: () => {
            useSavedStore.getState().unsave(type, entityId);
          },
        },
      });
      onChange?.(true);
    }
  };

  // Colour picks per variant + saved state.
  // Board condition #7: gold500 (darker, more saturated) when saved.
  const iconColor =
    saved
      ? KhazainColors.gold500
      : variant === 'dark'
        ? KhazainColors.cream100
        : variant === 'floating'
          ? '#ffffff'
          : KhazainColors.navy800;

  const containerStyle =
    variant === 'floating'
      ? [styles.floatingBubble, KhazainShadows.input]
      : styles.bubble;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'إزالة من المحفوظات' : 'حفظ في المكتبة'}
      hitSlop={8}
      style={({ pressed }) => [
        { width: hitSize, height: hitSize, opacity: pressed ? 0.7 : 1 },
        styles.touchTarget,
      ]}
    >
      <View style={containerStyle}>
        <BookmarkIcon size={18} color={iconColor} filled={saved} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(20,64,100,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
