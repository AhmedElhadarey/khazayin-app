import React, { useEffect, useRef } from 'react';
import { I18nManager, ScrollView, StyleProp, ViewStyle } from 'react-native';

// Horizontal scroller that always reads right-to-left:
// - first child sits at the visual right edge
// - swiping LEFT reveals the next child
//
// Implementation: forces row-reverse on the content container so children
// stack right-to-left in DOM, then scrollToEnd on mount so the user starts
// at the rightmost (= first JSX child) edge. Works on Expo web (where
// I18nManager.forceRTL is unreliable) and on native.
export function RtlCarousel({
  children,
  contentContainerStyle,
  style,
}: {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<ScrollView | null>(null);

  // After layout, jump to the visual-right edge so the user lands on the
  // first JSX child. Done with animated:false so it's invisible.
  const handleContentSizeChange = (_w: number, _h: number) => {
    if (!I18nManager.isRTL) {
      ref.current?.scrollToEnd({ animated: false });
    }
  };

  useEffect(() => {
    if (!I18nManager.isRTL) {
      // small delay so initial layout settles on web
      const t = setTimeout(() => ref.current?.scrollToEnd({ animated: false }), 0);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={handleContentSizeChange}
      style={style}
      contentContainerStyle={[
        // row-reverse renders the FIRST child on the right under LTR;
        // under native forceRTL it auto-flips back to row, which also
        // puts the first child on the right.
        { flexDirection: I18nManager.isRTL ? 'row' : 'row-reverse' },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}
