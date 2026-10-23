import { ChromeTapTracker, chromeAfterTap } from '@/services/mushafChrome';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

/**
 * The Mushaf reader's tap-to-show chrome gate (design 2026-10-23 D3): the
 * `chromeShown` state, the touch tracker, whether the page is scrolling, and
 * the reset on focus. Every rule lives in `services/mushafChrome`; this only
 * forwards raw events to it. The handlers are stable across a toggle, so the
 * memoised ayah tree below the page is not re-rendered by one.
 *
 * Web: a mouse click arrives as a touch-compatible responder event on
 * react-native-web, but a desktop pointer has no scroll-vs-tap ambiguity to
 * resolve; if no touch events arrive the chrome simply stays up.
 */
export function useMushafChromeGate(
  screenReaderOn: boolean,
  opts: { onUserScrollBegin?: () => void } = {},
) {
  const [chromeShown, setChromeShown] = useState(true);
  const [tap] = useState(() => new ChromeTapTracker());
  const scrollingRef = useRef(false);
  const onBeginRef = useRef(opts.onUserScrollBegin);
  useEffect(() => {
    onBeginRef.current = opts.onUserScrollBegin;
  });

  // Up on every visit. A blur can swallow a momentum-end event, and a stuck
  // "scrolling" flag would then veto every tap.
  useFocusEffect(
    useCallback(() => {
      setChromeShown(true);
      scrollingRef.current = false;
    }, []),
  );

  const pageTouchHandlers = useMemo(
    () => ({
      onTouchStart: (e: GestureResponderEvent) => {
        const t = e.nativeEvent;
        tap.start({
          x: t.pageX,
          y: t.pageY,
          ms: Date.now(),
          touches: t.touches?.length ?? 1,
          scrolling: scrollingRef.current,
        });
      },
      onTouchMove: (e: GestureResponderEvent) => {
        const t = e.nativeEvent;
        tap.move({ x: t.pageX, y: t.pageY, touches: t.touches?.length ?? 1 });
      },
      onTouchEnd: () => {
        if (tap.end({ ms: Date.now(), scrolling: scrollingRef.current })) {
          setChromeShown((shown) => chromeAfterTap(shown, screenReaderOn));
        }
      },
      onTouchCancel: () => tap.cancel(),
    }),
    [tap, screenReaderOn],
  );

  const scrollStateHandlers = useMemo(
    () => ({
      onScrollBeginDrag: () => {
        scrollingRef.current = true;
        onBeginRef.current?.();
      },
      // Momentum, when there is any, starts straight after and re-arms this.
      onScrollEndDrag: () => {
        scrollingRef.current = false;
      },
      onMomentumScrollBegin: () => {
        scrollingRef.current = true;
        onBeginRef.current?.();
      },
      onMomentumScrollEnd: () => {
        scrollingRef.current = false;
      },
    }),
    [],
  );

  // In-page controls bubble their touch to the page; marking it consumed keeps
  // it from toggling the chrome. Child touch-end handlers run first.
  const consumeTouch = useCallback(() => tap.consumeTouch(), [tap]);
  // An ayah's long-press (NOTE) fired during this touch: it never toggles.
  const noteLongPress = useCallback(() => tap.noteLongPress(), [tap]);

  return {
    chromeShown,
    setChromeShown,
    pageTouchHandlers,
    scrollStateHandlers,
    consumeTouch,
    noteLongPress,
  };
}
