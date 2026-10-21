/**
 * T-DR — `refreshIfLocalDayChanged` (audit gap 2, design
 * docs/plans/2026-10-21-daily-wird-reminders-design.md §3.4): an app left in
 * memory overnight must re-hydrate the wird + progress stores when the local
 * day changes, so the Library ring resets.
 */

const mockProgressHydrate = jest.fn(async () => undefined);
const mockWirdHydrate = jest.fn(async () => undefined);
jest.mock('@/store/progressStore', () => ({
  useProgressStore: { getState: () => ({ hydrate: mockProgressHydrate }) },
}));
const mockWirdState = { snapshotDay: '2026-10-21', hydrate: mockWirdHydrate };
jest.mock('@/store/wirdStore', () => ({ useWirdStore: { getState: () => mockWirdState } }));

import { refreshIfLocalDayChanged } from '@/services/dayRollover';

beforeEach(() => {
  mockProgressHydrate.mockClear();
  mockWirdHydrate.mockClear();
  mockWirdState.snapshotDay = '2026-10-21';
});

it('T-DR-1: same local day ⇒ no DB work', async () => {
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 21, 23, 0))).toBe(false);
  expect(mockWirdHydrate).not.toHaveBeenCalled();
  expect(mockProgressHydrate).not.toHaveBeenCalled();
});
it('T-DR-2: a new local day re-hydrates BOTH stores (ring resets to the new day)', async () => {
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 22, 0, 0, 1))).toBe(true);
  expect(mockProgressHydrate).toHaveBeenCalledTimes(1);
  expect(mockWirdHydrate).toHaveBeenCalledTimes(1);
});
it('T-DR-3: concurrent calls coalesce into one refresh', async () => {
  const d = new Date(2026, 9, 22, 8, 0);
  await Promise.all([refreshIfLocalDayChanged(d), refreshIfLocalDayChanged(d)]);
  expect(mockWirdHydrate).toHaveBeenCalledTimes(1);
});
it('T-DR-4: never throws — a hydrate failure is swallowed (dbFailed drives the retry banner)', async () => {
  mockWirdHydrate.mockRejectedValueOnce(new Error('db'));
  await expect(refreshIfLocalDayChanged(new Date(2026, 9, 22, 8, 0))).resolves.toBe(true);
});
it('T-DR-5: a never-hydrated store (snapshotDay "") is left to boot hydration', async () => {
  mockWirdState.snapshotDay = '';
  expect(await refreshIfLocalDayChanged(new Date(2026, 9, 22, 8, 0))).toBe(false);
  expect(mockWirdHydrate).not.toHaveBeenCalled();
});
