import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** The system Reduce Motion flag, kept current. `false` until the first read lands. */
export function useReduceMotion(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    // A change event is newer than the initial read, so it wins a race.
    let settled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive && !settled) setOn(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      settled = true;
      setOn(v);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}
