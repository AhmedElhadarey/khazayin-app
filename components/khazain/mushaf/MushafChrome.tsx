import { KhazainColors } from '@/constants/theme';
import {
  CHROME_SCRIM,
  chromeFadeMs,
  chromeIsUp,
} from '@/services/mushafChrome';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The reader's header and footer over a 24% black scrim (frame 2349:982),
 * absolutely positioned so the page underneath never moves. The page pads its
 * scroll content by the heights reported here.
 *
 * The scrim never takes a touch; the page's tap gate shows and hides the chrome.
 * `visible` is the tap state; a screen reader pins the chrome up regardless and
 * drops the scrim, which would otherwise stand between it and the text.
 */
export function MushafChrome({
  visible,
  screenReaderOn,
  reduceMotion,
  onTopHeight,
  onBottomHeight,
  top,
  topArt,
  bottom,
}: {
  visible: boolean;
  screenReaderOn: boolean;
  reduceMotion: boolean;
  /** Height of the header block including the top safe area. */
  onTopHeight: (h: number) => void;
  /** Height of the footer block including the bottom safe area. */
  onBottomHeight: (h: number) => void;
  top: React.ReactNode;
  /** Art laid behind the header block from its very top edge (under the status bar). */
  topArt?: React.ReactNode;
  bottom: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const up = chromeIsUp(visible, screenReaderOn);
  const opacity = useRef(new Animated.Value(up ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: up ? 1 : 0,
      duration: chromeFadeMs(reduceMotion),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [up, reduceMotion, opacity]);

  // A hidden chrome must be neither tappable nor reachable by a screen reader.
  const a11yHidden = !up;
  return (
    <>
      {!screenReaderOn ? (
        <Animated.View
          style={[styles.fill, { opacity, backgroundColor: CHROME_SCRIM }]}
          // Visual only: touches fall through to the page, so scrolling, the
          // ayah long-press (NOTE) and the tap gate (`chromeAfterTap`, both ways)
          // behave the same with the chrome up or down.
          pointerEvents="none"
          accessibilityElementsHidden={a11yHidden}
          importantForAccessibility={a11yHidden ? 'no-hide-descendants' : 'auto'}
        />
      ) : null}
      <Animated.View
        style={[styles.top, { opacity }]}
        pointerEvents={up ? 'box-none' : 'none'}
        accessibilityElementsHidden={a11yHidden}
        importantForAccessibility={a11yHidden ? 'no-hide-descendants' : 'auto'}
      >
        <View
          style={[styles.block, { paddingTop: insets.top }]}
          onLayout={(e) => onTopHeight(e.nativeEvent.layout.height)}
        >
          {topArt}
          {top}
        </View>
      </Animated.View>
      <Animated.View
        style={[styles.bottom, { opacity }]}
        pointerEvents={up ? 'box-none' : 'none'}
        accessibilityElementsHidden={a11yHidden}
        importantForAccessibility={a11yHidden ? 'no-hide-descendants' : 'auto'}
      >
        <View
          style={[styles.block, { paddingBottom: insets.bottom }]}
          onLayout={(e) => onBottomHeight(e.nativeEvent.layout.height)}
        >
          {bottom}
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  // Both edges set: symmetrical, so forced RTL has nothing to swap.
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  block: { backgroundColor: KhazainColors.pageBg },
});
