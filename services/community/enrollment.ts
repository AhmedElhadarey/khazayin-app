/**
 * services/community/enrollment.ts
 * --------------------------------
 * Opt-in and rename (design §4.1, §4.2, §7.4). One path, so the hub never
 * touches the store and the service separately.
 *
 * Rules:
 *  - the guidelines must be accepted before anything happens;
 *  - the name is adab-checked first; a `review` hit is refused for names;
 *  - a new member is opted in locally first (the profile carries the member
 *    id the service needs), then registered. If registering fails the member
 *    is paused and the profile cleared, so access never reaches `open` with
 *    an unregistered member;
 *  - a returning member renames through the service BEFORE the stored name
 *    changes;
 *  - the guidelines acceptance is recorded last, so access stays `intro`
 *    until the service has said yes.
 */
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { arabicCopyForCode, isApiError } from '@/services/api/errors';
import { checkText } from '@/services/community/adabFilter';
import { communityService } from '@/services/community';
import { GUIDELINES_VERSION } from '@/services/community/gate';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { runMutation } from '@/store/communityMutations';
import { communityGeneration } from '@/store/communityStores';

export type EnrollResult =
  | { ok: true }
  | { ok: false; reason: 'notAccepted' | 'aborted' }
  | { ok: false; reason: 'name' | 'request'; message: string };

const requestFailure = (e: unknown): EnrollResult => ({
  ok: false,
  reason: 'request',
  message: arabicCopyForCode(isApiError(e) ? e.code : 'unknown'),
});

type EnrollInput = { name: string; accepted: boolean; now: number };

let inFlight: Promise<EnrollResult> | null = null;

/**
 * Single-flight: a second submit while one is running gets the same result
 * and sends nothing, so a double tap can never take the rename path while
 * register is still pending.
 */
export function enrollMember(input: EnrollInput): Promise<EnrollResult> {
  if (inFlight) return inFlight;
  const p = enroll(input).finally(() => {
    if (inFlight === p) inFlight = null;
  });
  inFlight = p;
  return p;
}

async function enroll(input: EnrollInput): Promise<EnrollResult> {
  if (!input.accepted) return { ok: false, reason: 'notAccepted' };

  const displayName = input.name.trim();
  const checked = checkText(displayName, 'name');
  if (!checked.ok) {
    return { ok: false, reason: 'name', message: COMMUNITY_COPY.filterReason[checked.reason] };
  }
  if (checked.review) return { ok: false, reason: 'name', message: COMMUNITY_COPY.pickAnotherName };

  const store = useCommunityLocalStore.getState();
  // Registered means the service said yes once: the acceptance is recorded
  // only after that. A profile alone (written by optIn before register
  // resolved, e.g. the app was killed mid-register) is NOT registered.
  const registered = store.profile !== null && store.prefs.acceptedAt > 0;
  const gen = communityGeneration();
  // Who this enrollment is for, and whether they participate. Captured when
  // the identity is settled (after optIn on the new-member path) so every
  // write below can check it is still the same member in the same state.
  let memberId = store.profile?.memberId ?? null;
  let optedIn = store.prefs.optedIn;
  // Anything that moved the store under us owns it now: write nothing.
  //  - a generation bump or a deletion in progress;
  //  - wipe() resets the store (deletion back to 'none') BEFORE the runner
  //    bumps the generation, so a changed or missing profile id catches that
  //    window;
  //  - a pause or resume made while the request was in flight.
  const stale = () => {
    const s = useCommunityLocalStore.getState();
    return (
      gen !== communityGeneration() ||
      s.deletion.state !== 'none' ||
      s.profile?.memberId !== memberId ||
      s.prefs.optedIn !== optedIn
    );
  };
  const aborted: EnrollResult = { ok: false, reason: 'aborted' };

  if (registered) {
    try {
      await runMutation('rename', '-', { displayName }, (requestId) =>
        communityService.members.rename({ requestId, displayName }),
      );
    } catch (e) {
      return stale() ? aborted : requestFailure(e);
    }
    if (stale()) return aborted;
    store.optIn(displayName);
    store.acceptGuidelines(GUIDELINES_VERSION, input.now);
    return { ok: true };
  }

  // New (or never-completed) member: no acceptance may be on record while
  // register is pending, or access could reach `open` unregistered.
  useCommunityLocalStore.setState((s) => ({ prefs: { ...s.prefs, guidelinesVersion: 0, acceptedAt: 0 } }));
  store.optIn(displayName);
  const opted = useCommunityLocalStore.getState();
  memberId = opted.profile?.memberId ?? null;
  optedIn = opted.prefs.optedIn;
  try {
    await runMutation('register', '-', { displayName, guidelinesVersion: GUIDELINES_VERSION }, (requestId) =>
      communityService.members.register({ requestId, displayName, guidelinesVersion: GUIDELINES_VERSION }),
    );
  } catch (e) {
    if (stale()) return aborted;
    store.pause();
    useCommunityLocalStore.setState({ profile: null });
    return requestFailure(e);
  }
  if (stale()) return aborted;
  store.acceptGuidelines(GUIDELINES_VERSION, input.now);
  return { ok: true };
}
