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
import type { LoadState } from '@/types/content';
import React, { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
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
  /** Arabic copy for default ErrorState (overrides error.message). */
  errorMessage?: string;
  /**
   * When true (default), success children fade in with 200ms Reanimated
   * opacity transition (C5c). Set to false for instant render.
   */
  fadeIn?: boolean;
  /** Rendered when status === 'success'. */
  children: React.ReactNode;
};

// ---------------------------------------------------------------------------
// Internal fade-in wrapper (C5c)
// ---------------------------------------------------------------------------

type FadeInViewProps = { children: React.ReactNode; enabled: boolean };

function FadeInView({ children, enabled }: FadeInViewProps) {
  const opacity = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (enabled) {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [enabled, opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={animStyle}>{children}</Animated.View>;
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
  children,
}: AsyncContentProps) {
  // C5a: idle is treated identically to loading
  if (status === 'idle' || status === 'loading') {
    return <>{skeleton ?? <SkeletonRowList count={3} />}</>;
  }

  if (status === 'empty') {
    return <>{empty ?? <EmptyState message={emptyMessage} />}</>;
  }

  if (status === 'error') {
    return (
      <ErrorState
        message={errorMessage ?? error?.message}
        onRetry={onRetry}
      />
    );
  }

  // status === 'success'
  return <FadeInView enabled={fadeIn}>{children}</FadeInView>;
}
