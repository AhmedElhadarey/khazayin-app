/**
 * Tests for `services/horizonRefreshTask.ts` (track 004, T115).
 *
 * The native task modules and the orchestrator are fully mocked — this verifies
 * the wiring (task definition, one-shot registration, handler delegation), not
 * the OS scheduler, which cannot be exercised off-device.
 */

const mockAssemble = jest.fn<Promise<void>, []>(async () => undefined);
const mockRegister = jest.fn<Promise<void>, unknown[]>(async () => undefined);
const mockIsRegistered = jest.fn<Promise<boolean>, [string]>(async () => false);
// No initializers: `import` is hoisted above these declarations, so a `= ''`
// initializer would run AFTER module load and clobber the captured values.
let mockCapturedName: string | undefined;
let mockCapturedExec: (() => Promise<number>) | undefined;

jest.mock('@/services/horizonOrchestrator', () => ({
  __esModule: true,
  assembleAndReconcile: () => mockAssemble(),
  setPrayerTimesProvider: jest.fn(),
}));

jest.mock('expo-task-manager', () => ({
  __esModule: true,
  defineTask: (name: string, exec: () => Promise<number>) => {
    mockCapturedName = name;
    mockCapturedExec = exec;
  },
  isTaskRegisteredAsync: (name: string) => mockIsRegistered(name),
}));

jest.mock('expo-background-task', () => ({
  __esModule: true,
  registerTaskAsync: (...args: unknown[]) => mockRegister(...args),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  BackgroundTaskStatus: { Restricted: 1, Available: 2 },
}));

import {
  HORIZON_REFRESH_TASK,
  registerHorizonRefreshTaskAsync,
} from '@/services/horizonRefreshTask';

beforeEach(() => {
  mockAssemble.mockClear();
  mockRegister.mockClear();
  mockIsRegistered.mockClear();
  mockIsRegistered.mockResolvedValue(false);
});

describe('horizonRefreshTask module load', () => {
  it('defines the task under the exported name', () => {
    expect(mockCapturedName).toBe(HORIZON_REFRESH_TASK);
    expect(typeof mockCapturedExec).toBe('function');
  });
});

describe('the task executor', () => {
  it('calls assembleAndReconcile and reports Success', async () => {
    const result = await mockCapturedExec?.();
    expect(mockAssemble).toHaveBeenCalledTimes(1);
    expect(result).toBe(1); // BackgroundTaskResult.Success
  });

  it('reports Failed when the reconcile throws', async () => {
    mockAssemble.mockRejectedValueOnce(new Error('boom'));
    const result = await mockCapturedExec?.();
    expect(result).toBe(2); // BackgroundTaskResult.Failed
  });
});

describe('registerHorizonRefreshTaskAsync', () => {
  it('registers the task when it is not already registered', async () => {
    mockIsRegistered.mockResolvedValue(false);
    await registerHorizonRefreshTaskAsync();
    expect(mockRegister).toHaveBeenCalledTimes(1);
    expect(mockRegister.mock.calls[0][0]).toBe(HORIZON_REFRESH_TASK);
  });

  it('does not re-register when already registered', async () => {
    mockIsRegistered.mockResolvedValue(true);
    await registerHorizonRefreshTaskAsync();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('never throws even if registration fails', async () => {
    mockIsRegistered.mockResolvedValue(false);
    mockRegister.mockRejectedValueOnce(new Error('nope'));
    await expect(registerHorizonRefreshTaskAsync()).resolves.toBeUndefined();
  });
});
