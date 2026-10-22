/**
 * The group screens' orchestration, pulled out of the components so it runs
 * without a renderer (design §8.4): leave once, and retry only the start.
 */
import type { Challenge, Group } from '@/types/community';
import { runCreateFlow, runLeave, type CreateFlowState, type LeaveGuard } from '@/services/community/groupActions';

const group = { id: 'g1' } as Group;
const challenge = { id: 'c1' } as Challenge;

describe('runLeave', () => {
  const deps = () => ({
    perform: jest.fn().mockResolvedValue(undefined),
    isCurrent: jest.fn().mockReturnValue(true),
    onStart: jest.fn(),
    onLeft: jest.fn(),
    onError: jest.fn(),
    onSettled: jest.fn(),
  });
  const guard = (): LeaveGuard => ({ leaving: false, left: false });

  it('navigates once when confirmed twice while the first leave runs', async () => {
    const d = deps();
    const g = guard();
    await Promise.all([runLeave(g, d), runLeave(g, d)]);
    expect(d.perform).toHaveBeenCalledTimes(1);
    expect(d.onLeft).toHaveBeenCalledTimes(1);
  });

  it('ignores a confirm after the group was left', async () => {
    const d = deps();
    const g = guard();
    await runLeave(g, d);
    await runLeave(g, d);
    expect(d.perform).toHaveBeenCalledTimes(1);
    expect(d.onLeft).toHaveBeenCalledTimes(1);
  });

  it('reports a failure, unlocks, and allows a retry', async () => {
    const d = deps();
    const boom = new Error('x');
    d.perform.mockRejectedValueOnce(boom);
    const g = guard();
    await runLeave(g, d);
    expect(d.onError).toHaveBeenCalledWith(boom);
    expect(d.onLeft).not.toHaveBeenCalled();
    expect(d.onSettled).toHaveBeenCalledTimes(1);
    await runLeave(g, d);
    expect(d.onLeft).toHaveBeenCalledTimes(1);
  });

  it('does nothing after a reset moved the generation', async () => {
    const d = deps();
    d.isCurrent.mockReturnValue(false);
    d.perform.mockRejectedValueOnce(new Error('x'));
    await runLeave(guard(), d);
    expect(d.onError).not.toHaveBeenCalled();
    const e = deps();
    e.isCurrent.mockReturnValue(false);
    await runLeave(guard(), e);
    expect(e.onLeft).not.toHaveBeenCalled();
  });
});

describe('runCreateFlow', () => {
  it('retries only the start after a failed start', async () => {
    const create = jest.fn().mockResolvedValue(group);
    const start = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(challenge);
    const state: CreateFlowState = { group: null };
    await expect(runCreateFlow(state, { create, start })).rejects.toThrow('x');
    expect(state.group).toBe(group);
    await expect(runCreateFlow(state, { create, start })).resolves.toEqual({ group, challenge });
    expect(create).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(2);
    expect(start).toHaveBeenLastCalledWith(group);
  });

  it('keeps no group when the create fails', async () => {
    const create = jest.fn().mockRejectedValue(new Error('x'));
    const start = jest.fn();
    const state: CreateFlowState = { group: null };
    await expect(runCreateFlow(state, { create, start })).rejects.toThrow();
    expect(state.group).toBeNull();
    expect(start).not.toHaveBeenCalled();
  });
});
