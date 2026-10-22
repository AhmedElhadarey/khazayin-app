/**
 * services/community/communityService.ts
 * --------------------------------------
 * The community port (design §5.2) and the production-safe `offAdapter`.
 * `index.ts` is the swap point; this file never imports an adapter.
 *
 * Every mutation carries a `requestId` (§5.3). Reads return plain data; the
 * community has no SWR cache (§4.2), so no ContentResult envelope.
 */

import { makeApiError } from '@/services/api/errors';
import type { Paged } from '@/services/api/types';
import type {
  Challenge,
  ChallengeKind,
  Group,
  GroupProgress,
  ISODay,
  MemberSummary,
  Membership,
  Post,
  ProgressReport,
  ReportReason,
  ThreadSummary,
} from '@/types/community';

export type Mut = { requestId: string };

/** What `groups.get` returns: the group as one viewer sees it. */
export type GroupDetail = {
  group: Group;
  members: MemberSummary[];
  challenge: Challenge | null;
  progress: GroupProgress;
  me: Membership;
};

export interface CommunityService {
  readonly kind: 'mock' | 'off';

  /** @devOnly Simulated latency in ms. Only the mock adapter carries it. */
  mockDelay?: number;
  /** @devOnly Makes every call fail with a retriable `server` error. */
  simulateError?: boolean;
  /** @devOnly Makes every own post `pending`. */
  holdForReview?: boolean;

  members: {
    register(i: Mut & { displayName: string; guidelinesVersion: number }): Promise<MemberSummary>;
    rename(i: Mut & { displayName: string }): Promise<MemberSummary>;
    deleteMe(i: Mut): Promise<void>;
  };
  groups: {
    listMine(): Promise<Group[]>;
    get(id: string): Promise<GroupDetail>;
    create(i: Mut & { name: string }): Promise<Group>;
    join(i: Mut & { code: string }): Promise<Group>;
    leave(i: Mut & { groupId: string }): Promise<void>;
    setShareMyProgress(i: Mut & { groupId: string; share: boolean }): Promise<Membership>;
  };
  challenges: {
    start(i: Mut & { groupId: string; title: string; startsOn: ISODay } & ChallengeKind): Promise<Challenge>;
    reportProgress(i: Mut & ProgressReport): Promise<void>;
  };
  threads: {
    summaries(lectureIds: string[]): Promise<ThreadSummary[]>;
    posts(lectureId: string, cursor: string | null): Promise<Paged<Post>>;
    /** `review` is the client filter's tier result; the mock honours it, a server re-classifies. */
    createPost(i: Mut & { lectureId: string; body: string; review: boolean }): Promise<Post>;
    deletePost(i: Mut & { postId: string }): Promise<void>;
    report(i: Mut & { postId: string; reason: ReportReason; note?: string }): Promise<void>;
  };
}

/**
 * What production builds get: every call is refused with `forbidden`, so a
 * deep link that got past the route guard shows Arabic error copy, never data.
 */
const deny = (): Promise<never> => Promise.reject(makeApiError('forbidden'));

export const offAdapter: CommunityService = {
  kind: 'off',
  members: { register: deny, rename: deny, deleteMe: deny },
  groups: { listMine: deny, get: deny, create: deny, join: deny, leave: deny, setShareMyProgress: deny },
  challenges: { start: deny, reportProgress: deny },
  threads: { summaries: deny, posts: deny, createPost: deny, deletePost: deny, report: deny },
};
