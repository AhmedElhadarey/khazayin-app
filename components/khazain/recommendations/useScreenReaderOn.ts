import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** One screen-reader flag, owned by a section and handed to its rows, which read it at dismiss time. */
export function useScreenReaderOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    // A change event is newer than the initial read, so it wins a race.
    let settled = false;
    void AccessibilityInfo.isScreenReaderEnabled().then((v) => {
      if (alive && !settled) setOn(v);
    });
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (v) => {
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
