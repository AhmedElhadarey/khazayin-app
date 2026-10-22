/**
 * Community gate (design §3.1) and limits (§7.5-7.6).
 *
 * Pure: the gate takes its environment as arguments, so no native module loads.
 */
import {
  GUIDELINES_VERSION,
  communityAccess,
  communityMode,
  type DeletionState,
} from '@/services/community/gate';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';

const none: DeletionState = { state: 'none' };
const pending: DeletionState = {
  state: 'pending',
  attempts: 1,
  nextAttemptAt: 0,
  lastError: null,
};

describe('communityMode', () => {
  it('is mock in dev', () => {
    expect(communityMode({ isDev: true })).toBe('mock');
  });
  it('is off in production', () => {
    expect(communityMode({ isDev: false })).toBe('off');
  });
  it('is off during a visual audit, even in dev', () => {
    expect(communityMode({ isDev: true, visualAudit: '1' })).toBe('off');
    expect(communityMode({ isDev: false, visualAudit: '1' })).toBe('off');
  });
});

describe('communityAccess', () => {
  const opted = { optedIn: true, guidelinesVersion: GUIDELINES_VERSION, deletion: none };

  it('is hidden when the mode is off', () => {
    expect(communityAccess('off', opted)).toBe('hidden');
  });
  it('is intro until the member opts in', () => {
    expect(communityAccess('mock', { ...opted, optedIn: false })).toBe('intro');
  });
  it('is intro when the accepted guidelines are older than the current ones', () => {
    expect(communityAccess('mock', { ...opted, guidelinesVersion: GUIDELINES_VERSION - 1 })).toBe('intro');
  });
  it('is open once opted in on the current guidelines', () => {
    expect(communityAccess('mock', { ...opted, guidelinesVersion: GUIDELINES_VERSION })).toBe('open');
  });
  it('is hidden while a deletion is pending', () => {
    expect(communityAccess('mock', { ...opted, deletion: pending })).toBe('hidden');
  });
});

describe('COMMUNITY_LIMITS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(COMMUNITY_LIMITS)).toBe(true);
  });
  it('freezes each range', () => {
    expect(Object.isFrozen(COMMUNITY_LIMITS.post)).toBe(true);
  });
  it('carries the design §7.6 values', () => {
    expect(COMMUNITY_LIMITS).toEqual({
      post: { min: 1, max: 1000 },
      displayName: { min: 2, max: 24 },
      groupName: { min: 3, max: 40 },
      challengeTitle: { min: 3, max: 40 },
      reportNote: { min: 0, max: 300 },
      joinCodeLength: 6,
      members: { max: 50 },
      groupsPerMember: { max: 5 },
      wirdPages: { min: 1, max: 604 },
      wirdDays: { min: 1, max: 60 },
    });
  });
});
