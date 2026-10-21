/**
 * TZ-pinned DST test for msUntilNextLocalMidnight.
 *
 * Jest runs each test file in a vm sandbox whose `process.env` is a plain
 * COPY of the worker's environment, so `process.env.TZ = '…'` in here never
 * reaches Node's TZ setter and the zone stays the host's. `vm.runInThisContext`
 * evaluates in the worker's own context, where `process` is the real one;
 * assigning TZ there resets V8's timezone cache for the whole isolate,
 * sandbox included. The original value is restored afterwards because the
 * worker goes on to run other test files.
 */
import vm from 'vm';
import { msUntilNextLocalMidnight } from '@/constants/progress';

const realEnv = vm.runInThisContext('process.env') as NodeJS.ProcessEnv;
const originalTz = realEnv.TZ;

beforeAll(() => {
  realEnv.TZ = 'America/New_York';
});
afterAll(() => {
  if (originalTz === undefined) delete realEnv.TZ;
  else realEnv.TZ = originalTz;
});

describe('msUntilNextLocalMidnight across DST (America/New_York)', () => {
  it('precondition: the TZ pin took effect', () => {
    // Fails loudly instead of passing vacuously if the runtime ignored TZ.
    expect(new Date(2026, 2, 7, 12).getTimezoneOffset()).not.toBe(new Date(2026, 2, 9, 12).getTimezoneOffset());
  });
  it('T-LM-DST-1: spring-forward day 2026-03-08 is 23h long', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 2, 8, 0, 0, 0, 0))).toBe(23 * 3600_000);
  });
  it('T-LM-DST-2: fall-back day 2026-11-01 is 25h long', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 10, 1, 0, 0, 0, 0))).toBe(25 * 3600_000);
  });
});
