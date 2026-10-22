/**
 * Opt-in / rename flow (design §4.1, §4.2, §7.4): adab-check the name, call the
 * service, and only then let access reach `open`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { arabicCopyForCode, makeApiError } from '@/services/api/errors';
import { runDeletionIfDue } from '@/services/community/deletionRunner';
import { enrollMember } from '@/services/community/enrollment';
import { communityAccess, GUIDELINES_VERSION } from '@/services/community/gate';
import { mockCommunityAdapter as mock } from '@/services/community/mockAdapter';
import { resetMutations } from '@/store/communityMutations';
import { resetCommunityStores } from '@/store/communityStores';
import { defaultCommunity, ledgerPort, useCommunityLocalStore } from '@/store/communityLocalStore';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
jest.mock('@/services/community', () => ({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  communityService: require('@/services/community/mockAdapter').mockCommunityAdapter,
}));

const NOW = 1_800_000_000_000;
const st = () => useCommunityLocalStore.getState();
const run = (name: string, accepted = true) => enrollMember({ name, accepted, now: NOW });

beforeEach(() => {
  mock.mockDelay = 0;
  mock.simulateError = false;
  ledgerPort.write(() => ({ posts: [], groups: [], memberships: [], challenges: [], responses: {} }));
  useCommunityLocalStore.setState({ ...defaultCommunity() });
  resetMutations();
  resetCommunityStores();
});
afterEach(() => jest.restoreAllMocks());

describe('enrollMember', () => {
  it('refuses without the acceptance and touches nothing', async () => {
    const register = jest.spyOn(mock.members, 'register');
    expect(await run('أبو عبد الله', false)).toMatchObject({ ok: false, reason: 'notAccepted' });
    expect(register).not.toHaveBeenCalled();
    expect(st().profile).toBeNull();
    expect(st().prefs.optedIn).toBe(false);
  });

  it('shows the filter reason for a refused name and never calls the service', async () => {
    const register = jest.spyOn(mock.members, 'register');
    expect(await run('ا')).toEqual({
      ok: false,
      reason: 'name',
      message: COMMUNITY_COPY.filterReason.tooShort,
    });
    expect(await run('زورونا t.me/x')).toEqual({
      ok: false,
      reason: 'name',
      message: COMMUNITY_COPY.filterReason.link,
    });
    expect(register).not.toHaveBeenCalled();
    expect(st().profile).toBeNull();
  });

  it('refuses a review-tier name with the pick-another-name copy', async () => {
    const register = jest.spyOn(mock.members, 'register');
    expect(await run('يا كافر')).toEqual({
      ok: false,
      reason: 'name',
      message: COMMUNITY_COPY.pickAnotherName,
    });
    expect(await run('يا كلب')).toEqual({
      ok: false,
      reason: 'name',
      message: COMMUNITY_COPY.filterReason.term,
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('opts in, registers and then records the acceptance', async () => {
    const register = jest.spyOn(mock.members, 'register');
    expect(await run('  أبو عبد الله  ')).toEqual({ ok: true });
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'أبو عبد الله', guidelinesVersion: GUIDELINES_VERSION }),
    );
    expect(st().profile?.displayName).toBe('أبو عبد الله');
    expect(st().prefs).toMatchObject({ optedIn: true, guidelinesVersion: GUIDELINES_VERSION, acceptedAt: NOW });
  });

  it('pauses and clears the profile when register fails, never reaching open', async () => {
    mock.simulateError = true;
    expect(await run('أبو عبد الله')).toEqual({
      ok: false,
      reason: 'request',
      message: arabicCopyForCode('server'),
    });
    expect(st().profile).toBeNull();
    expect(st().prefs).toMatchObject({ optedIn: false, guidelinesVersion: 0 });
  });

  it('renames through the service before the stored name changes, for a returning member', async () => {
    useCommunityLocalStore.setState({
      profile: { memberId: 'm1', displayName: 'القديم', serverIssued: false },
      prefs: { optedIn: false, guidelinesVersion: GUIDELINES_VERSION, acceptedAt: 1, shareMyProgress: false },
    });
    let nameDuringCall = '';
    const register = jest.spyOn(mock.members, 'register');
    jest.spyOn(mock.members, 'rename').mockImplementation(async (i) => {
      nameDuringCall = st().profile!.displayName;
      return { memberId: 'm1', displayName: i.displayName, isOwner: false };
    });
    expect(await run('الجديد')).toEqual({ ok: true });
    expect(nameDuringCall).toBe('القديم');
    expect(register).not.toHaveBeenCalled();
    expect(st().profile).toMatchObject({ memberId: 'm1', displayName: 'الجديد' });
    expect(st().prefs.optedIn).toBe(true);
  });

  it('keeps the old name and the member id when a rename fails', async () => {
    useCommunityLocalStore.setState({
      profile: { memberId: 'm1', displayName: 'القديم', serverIssued: false },
      prefs: { optedIn: false, guidelinesVersion: GUIDELINES_VERSION, acceptedAt: 1, shareMyProgress: false },
    });
    mock.simulateError = true;
    expect(await run('الجديد')).toMatchObject({ ok: false, reason: 'request' });
    expect(st().profile).toMatchObject({ memberId: 'm1', displayName: 'القديم' });
    expect(st().prefs.optedIn).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S1: an unregistered member must never reach `open`
// ---------------------------------------------------------------------------

const access = () => {
  const s = st();
  return communityAccess('mock', {
    optedIn: s.prefs.optedIn,
    guidelinesVersion: s.prefs.guidelinesVersion,
    deletion: s.deletion,
  });
};
const gated = () => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  return { gate, release };
};

describe('enrollMember races', () => {
  it('double submit: one register, no rename, one shared result, never open meanwhile', async () => {
    const { gate, release } = gated();
    const register = jest.spyOn(mock.members, 'register').mockImplementation(async (i) => {
      await gate;
      throw makeApiError('server');
    });
    const rename = jest.spyOn(mock.members, 'rename');
    const a = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 1 });
    const b = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 1 });
    expect(access()).toBe('intro');
    release();
    const [ra, rb] = await Promise.all([a, b]);
    expect(rb).toEqual(ra);
    expect(register).toHaveBeenCalledTimes(1);
    expect(rename).not.toHaveBeenCalled();
    expect(st().profile).toBeNull();
    expect(access()).toBe('intro');
  });

  it('a new attempt after the first settled is not swallowed by single-flight', async () => {
    expect(await run('أبو عبد الله')).toEqual({ ok: true });
    expect(await run('أبو عبد الله')).toEqual({ ok: true });
  });

  it('killed mid-register: a profile with no acceptance registers, it does not rename', async () => {
    // What the next launch sees: optIn persisted, register never answered.
    useCommunityLocalStore.setState({
      profile: { memberId: 'half', displayName: 'نصف', serverIssued: false },
      prefs: { optedIn: true, guidelinesVersion: 0, acceptedAt: 0, shareMyProgress: false },
    });
    const register = jest.spyOn(mock.members, 'register');
    const rename = jest.spyOn(mock.members, 'rename');
    expect(await run('أبو عبد الله')).toEqual({ ok: true });
    expect(register).toHaveBeenCalledTimes(1);
    expect(rename).not.toHaveBeenCalled();
    expect(st().profile).toMatchObject({ memberId: 'half', displayName: 'أبو عبد الله' });
    expect(st().prefs.acceptedAt).toBe(NOW);
  });

  it('killed mid-register, then register fails: nothing is left half-registered', async () => {
    useCommunityLocalStore.setState({
      profile: { memberId: 'half', displayName: 'نصف', serverIssued: false },
      prefs: { optedIn: true, guidelinesVersion: 0, acceptedAt: 0, shareMyProgress: false },
    });
    mock.simulateError = true;
    expect(await run('أبو عبد الله')).toMatchObject({ ok: false, reason: 'request' });
    expect(st().profile).toBeNull();
    expect(st().prefs.optedIn).toBe(false);
  });

  it('a stale guidelines version is zeroed before the new-member opt-in', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'm', displayName: i.displayName, isOwner: false };
    });
    useCommunityLocalStore.setState({
      prefs: { optedIn: false, guidelinesVersion: GUIDELINES_VERSION, acceptedAt: 0, shareMyProgress: false },
    });
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: NOW });
    expect(st().prefs.optedIn).toBe(true);
    expect(access()).toBe('intro');
    release();
    await p;
    expect(access()).toBe('open');
  });

  it('deletion finishing mid-register: the wiped store is not written to', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'm', displayName: i.displayName, isOwner: false };
    });
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 5 });
    st().beginDeletion(2);
    await runDeletionIfDue(2, { force: true });
    release();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    expect(st().profile).toBeNull();
    expect(st().prefs).toEqual(defaultCommunity().prefs);
    expect(access()).toBe('intro');
  });

  it('deletion pending (not yet done) mid-register: no acceptance is recorded', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'm', displayName: i.displayName, isOwner: false };
    });
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 5 });
    st().beginDeletion(2);
    release();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    expect(st().prefs.acceptedAt).toBe(0);
    expect(access()).toBe('hidden');
  });
});

// ---------------------------------------------------------------------------
// B1: the window between wipe() and the generation bump
// ---------------------------------------------------------------------------

/**
 * wipe() resets the store (deletion.state is 'none' again) and then awaits
 * removeItem; the runner bumps the generation only after that. The answer is
 * released from inside that await, so enrollment resumes in the window.
 */
const releaseInsideWipe = (release: () => void) => {
  // The mock's removeItem is already a jest.fn, so spyOn returns that same fn:
  // the original cannot be kept and called. multiRemove does the real removal.
  return jest.spyOn(AsyncStorage, 'removeItem').mockImplementation(async (key) => {
    release();
    await new Promise((r) => setTimeout(r, 5));
    await AsyncStorage.multiRemove([key]);
  });
};
const deleteNow = async () => {
  st().beginDeletion(2);
  await runDeletionIfDue(2, { force: true });
};

describe('enrollMember inside the wipe window', () => {
  it('a rename resolving in the window does not recreate a profile', async () => {
    useCommunityLocalStore.setState({
      profile: { memberId: 'm1', displayName: 'القديم', serverIssued: false },
      prefs: { optedIn: false, guidelinesVersion: GUIDELINES_VERSION, acceptedAt: 1, shareMyProgress: false },
    });
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'rename').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'm1', displayName: i.displayName, isOwner: false };
    });
    releaseInsideWipe(release);
    const p = enrollMember({ name: 'الجديد', accepted: true, now: 9 });
    const d = deleteNow();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    await d;
    expect(st().profile).toBeNull();
    expect(st().prefs).toEqual(defaultCommunity().prefs);
    expect(access()).toBe('intro');
    expect(await AsyncStorage.getItem('@khazain/community')).toBeNull();
  });

  it('a register resolving in the window records nothing', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'x', displayName: i.displayName, isOwner: false };
    });
    releaseInsideWipe(release);
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 9 });
    const d = deleteNow();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    await d;
    expect(st().profile).toBeNull();
    expect(st().prefs).toEqual(defaultCommunity().prefs);
    expect(await AsyncStorage.getItem('@khazain/community')).toBeNull();
  });

  it('a register failing in the window writes nothing back', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async () => {
      await gate;
      throw makeApiError('server');
    });
    releaseInsideWipe(release);
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 9 });
    const d = deleteNow();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    await d;
    expect(st().profile).toBeNull();
    expect(await AsyncStorage.getItem('@khazain/community')).toBeNull();
  });
});

describe('enrollMember and an explicit pause', () => {
  it('a register resolving after a pause does not reopen access', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'x', displayName: i.displayName, isOwner: false };
    });
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 9 });
    st().pause();
    release();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    expect(st().prefs).toMatchObject({ optedIn: false, acceptedAt: 0 });
    expect(access()).toBe('intro');
  });

  it('a failed register after a pause keeps the pause and writes nothing else', async () => {
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'register').mockImplementation(async () => {
      await gate;
      throw makeApiError('server');
    });
    const p = enrollMember({ name: 'أبو عبد الله', accepted: true, now: 9 });
    st().pause();
    release();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    expect(st().prefs.optedIn).toBe(false);
  });

  it('a rename resolving after a change of participation keeps the old name', async () => {
    useCommunityLocalStore.setState({
      profile: { memberId: 'm1', displayName: 'القديم', serverIssued: false },
      prefs: { optedIn: true, guidelinesVersion: GUIDELINES_VERSION, acceptedAt: 1, shareMyProgress: false },
    });
    const { gate, release } = gated();
    jest.spyOn(mock.members, 'rename').mockImplementation(async (i) => {
      await gate;
      return { memberId: 'm1', displayName: i.displayName, isOwner: false };
    });
    const p = enrollMember({ name: 'الجديد', accepted: true, now: 9 });
    st().pause();
    release();
    expect(await p).toMatchObject({ ok: false, reason: 'aborted' });
    expect(st().prefs.optedIn).toBe(false);
    expect(st().profile?.displayName).toBe('القديم');
  });
});
