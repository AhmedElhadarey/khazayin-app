/** T2.1 — safeParseJson never throws; returns fallback on bad/missing input. */
import { safeParseJson } from '../db/safeParse';

describe('safeParseJson (T2.1)', () => {
  it('parses valid JSON', () => {
    expect(safeParseJson('123', 0)).toBe(123);
    expect(safeParseJson('"x"', '')).toBe('x');
    expect(safeParseJson('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('returns fallback for malformed JSON without throwing', () => {
    expect(safeParseJson('not json', 7)).toBe(7);
    expect(safeParseJson('{bad', null)).toBeNull();
  });

  it('returns fallback for null/undefined', () => {
    expect(safeParseJson(null, 5)).toBe(5);
    expect(safeParseJson(undefined, 'fb')).toBe('fb');
  });
});
