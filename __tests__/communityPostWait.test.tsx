import React from 'react';
import { usePostWait } from '@/hooks/usePostWait';
import type { PostWait } from '@/services/community/postForm';

// react-test-renderer ships with jest-expo but has no type declarations in the repo.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { update: (el: React.ReactElement) => void; unmount: () => void };
};

let seen: (PostWait | null)[] = [];
function Probe({ times }: { times: number[] }) {
  seen.push(usePostWait(times));
  return null;
}

describe('usePostWait', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('reads the clock again when a post is recorded after a long idle stretch', () => {
    const M = 1_000_000_000_000;
    const MIN = 60_000;
    jest.setSystemTime(M);
    // Nine posts 50 to 42 minutes before mount: in the hour window now, out of it half an hour later.
    const old = Array.from({ length: 9 }, (_, i) => M - (50 - i) * MIN);
    let r!: ReturnType<typeof create>;
    act(() => {
      r = create(<Probe times={old} />);
    });
    expect(seen.at(-1)).toBeNull();

    jest.setSystemTime(M + 30 * MIN);
    seen = [];
    act(() => r.update(<Probe times={[...old, M + 30 * MIN]} />));
    // Every render after the post, the first included, is the 30 s cooldown and never the hourly cap.
    expect(seen.every((w) => w?.kind === 'cooldown')).toBe(true);
    r.unmount();
  });

  it('counts down while waiting and stops ticking afterwards', () => {
    const T = 2_000_000_000_000;
    jest.setSystemTime(T);
    let r!: ReturnType<typeof create>;
    act(() => {
      r = create(<Probe times={[T - 10_000]} />);
    });
    expect(seen.at(-1)).toEqual({ kind: 'cooldown', ms: 20_000 });
    act(() => {
      jest.setSystemTime(T + 25_000);
      jest.advanceTimersByTime(1000);
    });
    expect(seen.at(-1)).toBeNull();
    r.unmount();
  });
});
