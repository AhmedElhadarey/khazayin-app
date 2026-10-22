/**
 * Community limits (design §7.5-7.6). Frozen; the server mirrors these later.
 *
 * Ranges are inclusive. Round-trip the constant, never inline the literal.
 */
import { MAX_WIRD, MIN_WIRD } from '@/constants/progress';

const range = (min: number, max: number) => Object.freeze({ min, max });

export const COMMUNITY_LIMITS = Object.freeze({
  post: range(1, 1000),
  displayName: range(2, 24),
  groupName: range(3, 40),
  challengeTitle: range(3, 40),
  reportNote: range(0, 300),
  joinCodeLength: 6,
  members: Object.freeze({ max: 50 }),
  groupsPerMember: Object.freeze({ max: 5 }),
  wirdPages: range(MIN_WIRD, MAX_WIRD),
  wirdDays: range(1, 60),
});

/** Client-side rates (§7.5). */
export const COMMUNITY_RATES = Object.freeze({
  postCooldownMs: 30_000,
  postsPerHour: 10,
  groupsCreatedPerDay: 3,
  joinsPerDay: 10,
  reportsPerDay: 20,
});
