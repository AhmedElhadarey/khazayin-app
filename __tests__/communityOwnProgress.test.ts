import fs from 'fs';
import path from 'path';
import { keepIfSame, loadOwnProgress, makeIsCurrent } from '@/services/community/ownProgress';
import type { Challenge } from '@/types/community';

const challenge: Challenge = { id: 'c1', groupId: 'g1', title: 't', startsOn: '2026-10-20', createdBy: 'm', kind: 'khatm' };

describe('loadOwnProgress', () => {
  it('applies the counts it read while still current', async () => {
    const apply = jest.fn();
    await loadOwnProgress(challenge, { read: async () => ({ pagesCovered: 6, daysMet: 0 }), isCurrent: () => true, apply });
    expect(apply).toHaveBeenCalledWith({ pagesCovered: 6, daysMet: 0 });
  });

  it('drops the result when the screen blurred, left or was reset meanwhile', async () => {
    const apply = jest.fn();
    let current = true;
    await loadOwnProgress(challenge, {
      read: async () => {
        current = false;
        return { pagesCovered: 6, daysMet: 0 };
      },
      isCurrent: () => current,
      apply,
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('swallows a failed read and leaves the card as it was', async () => {
    const apply = jest.fn();
    await expect(
      loadOwnProgress(challenge, { read: async () => Promise.reject(new Error('db')), isCurrent: () => true, apply }),
    ).resolves.toBeUndefined();
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('keepIfSame', () => {
  it('keeps the previous object when the values match, so nothing re-renders', () => {
    const prev = { pagesCovered: 3, daysMet: 0 };
    expect(keepIfSame(prev, { pagesCovered: 3, daysMet: 0 })).toBe(prev);
  });
  it('takes the new one when a value moved or there was none', () => {
    const next = { pagesCovered: 6, daysMet: 0 };
    expect(keepIfSame({ pagesCovered: 3, daysMet: 0 }, next)).toBe(next);
    expect(keepIfSame(null, next)).toBe(next);
  });
});

describe('makeIsCurrent', () => {
  const base = { live: () => true, left: () => false, gen: 4, currentGen: () => 4 };

  it('is current only while live, not left, and the generation has not moved', () => {
    expect(makeIsCurrent(base)()).toBe(true);
  });
  it('is stale once the screen is no longer live', () => {
    expect(makeIsCurrent({ ...base, live: () => false })()).toBe(false);
  });
  it('is stale once the member left the group', () => {
    expect(makeIsCurrent({ ...base, left: () => true })()).toBe(false);
  });
  it('is stale once the community stores were reset', () => {
    expect(makeIsCurrent({ ...base, currentGen: () => 5 })()).toBe(false);
  });
  it('reads every condition at call time, not at creation', () => {
    let left = false;
    const isCurrent = makeIsCurrent({ ...base, left: () => left });
    expect(isCurrent()).toBe(true);
    left = true;
    expect(isCurrent()).toBe(false);
  });
});

describe('group screen wiring', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/(tabs)/more/community/group/[id].tsx'), 'utf8');
  it('re-reads own counts when the detail data changes, not only on focus', () => {
    expect(src).toMatch(/useEffect\(\(\) => \{[\s\S]*?loadOwnProgress\([\s\S]*?\}, \[[^\]]*\bdetail\b[^\]]*\]\)/);
  });
  it('builds both guards with makeIsCurrent from the live flag, the leave latch and the generation', () => {
    const uses = src.match(/makeIsCurrent\(\{[^}]*\}\)/g) ?? [];
    expect(uses).toHaveLength(2);
    for (const u of uses) {
      expect(u).toMatch(/live: \(\) => live,/);
      expect(u).toMatch(/left: \(\) => leaveGuard\.current\.left/);
      expect(u).toMatch(/gen,/);
      expect(u).toMatch(/currentGen: communityGeneration/);
    }
    // `gen` is captured when each effect starts, right before its read.
    const captured = src.match(/const gen = communityGeneration\(\);(?:(?!const gen)[\s\S]){0,300}?makeIsCurrent\(/g) ?? [];
    expect(captured).toHaveLength(2);
  });
});
