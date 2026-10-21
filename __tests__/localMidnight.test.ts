import { msUntilNextLocalMidnight } from '@/constants/progress';

describe('msUntilNextLocalMidnight', () => {
  it('T-LM-1: 23:59:00 local is 60s from midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 9, 21, 23, 59, 0, 0))).toBe(60_000);
  });
  it('T-LM-2: exactly 00:00 local returns a full day, never 0', () => {
    const now = new Date(2026, 9, 21, 0, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(new Date(2026, 9, 22).getTime() - now.getTime());
  });
  it('T-LM-3: crosses a month/year boundary', () => {
    const now = new Date(2026, 11, 31, 12, 0, 0, 0);
    expect(msUntilNextLocalMidnight(now)).toBe(new Date(2027, 0, 1).getTime() - now.getTime());
  });
});
