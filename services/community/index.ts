/**
 * services/community/index.ts
 * ---------------------------
 * The single swap point for community data (design §3.2).
 *
 * `__DEV__` is the OUTERMOST test and the `require` sits inside it: in a
 * production transform `__DEV__` folds to false and the block is removed
 * before dependencies are collected, so the mock and its seed never ship.
 * Do not turn this into a ternary, put `__DEV__` second, or import the mock
 * statically; `communityInvariants.test.ts` fails any of those.
 */
import { COMMUNITY_MODE } from './config';
import { offAdapter, type CommunityService } from './communityService';

let selected: CommunityService = offAdapter;
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  if (COMMUNITY_MODE === 'mock') selected = require('./mockAdapter').mockCommunityAdapter;
}

export const communityService: CommunityService = selected;
