import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { usePlayerStore, useToastStore } from '@/store';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * ToastOverlay — global toast surface. Mounted once in app/_layout.tsx as
 * a sibling to <Stack> so it overlays every route (including modals).
 *
 * pointerEvents="box-none" on the safe-area + animated wrap so the toast
 * does NOT block screen touches outside its own card.
 *
 * Bottom offset clears the floating MiniPlayer when audio is playing
 * (Board condition #4): when usePlayerStore.isVisible is true, padding
 * bottom bumps from 16 -> 80.
 *
 * Track: khazain-saved_20260511  T7
 */
export function ToastOverlay() {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);
  const playerVisible = usePlayerStore((s) => s.isVisible);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!current) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ]).start();
      return;
    }

    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();

    const duration = current.durationMs ?? 5000;
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      dismiss();
    }, duration);

    return () => {
      if (dismissTimerRef.current !== null) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
    // Watch the id so a new toast replacing an old one re-triggers the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;

  // Board condition #4: clear the MiniPlayer when visible.
  const bottomPad = playerVisible ? 80 : 16;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeArea} edges={['bottom']}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.wrap,
          { paddingBottom: bottomPad, opacity, transform: [{ translateY }] },
        ]}
      >
        <View style={[styles.card, KhazainShadows.card]}>
          <Text style={styles.message} numberOfLines={2}>
            {current.message}
          </Text>
          {current.action ? (
            <Pressable
              onPress={() => {
                current.action!.onPress();
                dismiss();
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.actionLabel}>{current.action.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrap: {
    paddingHorizontal: 16,
  },
  card: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.navy800,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    flex: 1,
    color: KhazainColors.cream50,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionLabel: {
    color: KhazainColors.gold200,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '700',
  },
});
