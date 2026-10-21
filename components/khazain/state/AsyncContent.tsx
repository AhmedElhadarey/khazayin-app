/**
 * AsyncContent — generic async-state wrapper.
 *
 * C5 conditions:
 *   (a) status === 'idle' renders skeleton, same code path as 'loading'.
 *   (b) When skeleton prop is omitted, falls back to <SkeletonRowList count={3} />.
 *   (c) fadeIn?: boolean (default true) — wraps success children in Animated.View
 *       with opacity 0 → 1 over 200ms via Reanimated withTiming.
 *
 * Track: khazain-content-service_20260506  Phase 3 / T3.3
 */
import { isApiError } from '@/services/api/errors';
import type { LoadState } from '@/types/content';
import React, { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { resolveAsyncView } from './asyncView';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { SkeletonRowList } from './SkeletonRow';

export type AsyncContentProps = {
  /** Current load state from the Zustand store. */
  status: LoadState;
  /** Error object from the store, shown in ErrorState. */
  error?: Error | null;
  /** Passed to ErrorState's retry button. */
  onRetry?: () => void;
  /** Custom skeleton node. Defaults to <SkeletonRowList count={3} /> (C5b). */
  skeleton?: React.ReactNode;
  /** Custom empty node. Defaults to <EmptyState message={emptyMessage} />. */
  empty?: React.ReactNode;
  /** Arabic copy for default EmptyState. */
  emptyMessage?: string;
  /**
   * Arabic copy for default ErrorState (overrides an ApiError's message;
   * non-ApiError messages are never shown).
   */
  errorMessage?: string;
  /**
   * When true (default), success children fade in with 200ms Reanimated
   * opacity transition (C5c). Set to false for instant render.
   */
  fadeIn?: boolean;
  /**
   * Applied to the view that actually holds the children.
   *
   * The fade wrapper is a real layout box, so a `gap` on the container *around*
   * an `<AsyncContent>` spaces the wrapper from its siblings and never reaches
   * the rows inside it. That has now silently flattened three lists — the
   * qiraat rows, the dawah months, and the More rows, which stepped 82 where
   * the frame states 94. Pass the gap here instead.
   */
  style?: StyleProp<ViewStyle>;
  /** Rendered when status === 'success'. */
  children: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Internal fade-in wrapper (C5c)
// ---------------------------------------------------------------------------

type FadeInViewProps = {
  children: React.ReactNode;
  enabled: boolean;
  style?: StyleProp<ViewStyle>;
};

function FadeInView({ children, enabled, style }: FadeInViewProps) {
  const opacity = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (enabled) {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [enabled, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

// ---------------------------------------------------------------------------
// AsyncContent
// ---------------------------------------------------------------------------

export function AsyncContent({
  status,
  error,
  onRetry,
  skeleton,
  empty,
  emptyMessage,
  errorMessage,
  fadeIn = true,
  style,
  children,
}: AsyncContentProps) {
  // resolveAsyncView stays pure and the render stays side-effect free; the
  // dev-only diagnostic lives in an effect. A non-ApiError's text is hidden
  // from the user, so tell the developer once per status/error change.
  useEffect(() => {
    if (__DEV__ && status === 'error' && error && !isApiError(error)) {
      console.warn(
        '[AsyncContent] non-ApiError reached the error state; showing the Arabic default instead of:',
        error,
      );
    }
  }, [status, error]);

  const view = resolveAsyncView(status, { error, errorMessage });

  switch (view.kind) {
    // C5a: idle is treated identically to loading
    case 'skeleton':
      return <>{skeleton ?? <SkeletonRowList count={3} />}</>;
    case 'empty':
      return <>{empty ?? <EmptyState message={emptyMessage} />}</>;
    case 'error':
      return <ErrorState message={view.message} onRetry={onRetry} />;
    case 'content':
      return (
        <FadeInView enabled={fadeIn} style={style}>
          {children}
        </FadeInView>
      );
  }
}
