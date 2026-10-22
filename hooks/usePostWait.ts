/**
 * Live post cooldown for the composer (design §7.5): the wait left from the
 * times this member posted, re-read each second while there is one.
 */
import { useEffect, useState } from 'react';
import { postWait, type PostWait } from '@/services/community/postForm';

export function usePostWait(postTimes: readonly number[]): PostWait | null {
  const [now, setNow] = useState(() => Date.now());
  // A new post: re-read the clock before this render commits, so a `now` left stale by a
  // long idle stretch cannot count old posts into the hour window for a second.
  const [seen, setSeen] = useState(postTimes);
  let at = now;
  if (seen !== postTimes) {
    at = Date.now();
    setSeen(postTimes);
    setNow(at);
  }
  const wait = postWait(postTimes, at);
  const waiting = wait !== null;
  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [waiting]);
  return wait;
}
