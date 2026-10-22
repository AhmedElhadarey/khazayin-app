/**
 * Community domain types (design §5.1).
 *
 * Threads are keyed by `Lecture.id` (types/content.ts), never `PlayerTrack.id`.
 */

export type ISODay = string;

export type ModerationStatus = 'visible' | 'pending' | 'hidden' | 'removed';
export type ModerationState = { status: ModerationStatus; updatedAt: number };

export type MemberSummary = { memberId: string; displayName: string; isOwner: boolean };

export type Group = {
  id: string;
  name: string;
  joinCode: string;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  createdAt: number;
  activeChallengeId: string | null;
};

export type Membership = {
  groupId: string;
  memberId: string;
  role: 'owner' | 'member';
  joinedAt: number;
  shareMyProgress: boolean;
};

export type ChallengeKind =
  | { kind: 'khatm' } // group goal: 604 pages total
  | { kind: 'daily-wird'; pagesPerDay: number; days: number }; // bounds: COMMUNITY_LIMITS.wirdPages / wirdDays

export type Challenge = ChallengeKind & {
  id: string;
  groupId: string;
  title: string;
  startsOn: ISODay;
  createdBy: string;
};

/** Leaves the device. Counts only. */
export type ProgressReport = {
  challengeId: string;
  memberId: string;
  computedAt: number;
  pagesCovered: number;
  daysMet: number;
};

/**
 * Computed per viewer by the server (mock today). `totals` is null unless the
 * viewer can't isolate anyone: >= 2 reporters besides the viewer who do not
 * share. Rounded to 10.
 */
export type GroupProgress = {
  reporters: number;
  totals: { pages: number; daysMet: number } | null;
  shared: { member: MemberSummary; pagesCovered: number; daysMet: number }[]; // opted-in only
};

export type ThreadSummary = {
  lectureId: string;
  postCount: number;
  lastPostAt: number | null;
};

export type Post = {
  id: string;
  lectureId: string;
  author: MemberSummary;
  body: string;
  createdAt: number;
  moderation: ModerationState;
  isMine: boolean;
};

export type ReportReason =
  | 'offensive'
  | 'sectarian'
  | 'misinformation'
  | 'spam'
  | 'privacy'
  | 'other';
