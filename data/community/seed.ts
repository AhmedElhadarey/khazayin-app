/**
 * data/community/seed.ts
 * ----------------------
 * Dev-only fixtures for the community mock adapter (design §5.4). Only
 * `services/community/mockAdapter.ts` may import this file; a source scan
 * enforces it, and `index.ts` keeps both out of production bundles.
 *
 * Every display name and group name ends «(تجريبي)» so nobody mistakes seeded
 * content for real people. Seeded text is short and fully within adab.
 */
import type { ModerationStatus } from '@/types/community';

/**
 * ASCII on purpose: Hermes bytecode may store non-ASCII strings as UTF-16,
 * where an Arabic grep would silently miss. The mock stamps it into every
 * seeded group id so the release check can see it (§3.2).
 */
export const SEED_SENTINEL = 'KHZ_COMMUNITY_SEED';

export const JOIN_CODES = {
  /** Two sharing reporters and one non-sharer: a joining viewer must see `totals: null`. */
  leak: 'KHZ7Q2',
  /** Three non-sharing reporters: `totals` is shown, rounded to 10. */
  visible: 'NUR4M8',
  /** A daily-wird group. */
  wird: 'HDY9P3',
} as const;

export type SeedMember = { memberId: string; displayName: string };

export type SeedReport = {
  memberId: string;
  shareMyProgress: boolean;
  pagesCovered: number;
  daysMet: number;
};

export type SeedGroup = {
  /** Unprefixed; the mock prepends `${SEED_SENTINEL}:`. */
  id: string;
  name: string;
  joinCode: string;
  ownerId: string;
  createdAt: number;
  memberIds: string[];
  challenge: {
    id: string;
    title: string;
    startsOn: string;
    createdBy: string;
    spec: { kind: 'khatm' } | { kind: 'daily-wird'; pagesPerDay: number; days: number };
  };
  /** One per member; carries the member's sharing choice for this group. */
  reports: SeedReport[];
};

export type SeedPost = {
  id: string;
  lectureId: string;
  authorId: string;
  body: string;
  createdAt: number;
  status: Extract<ModerationStatus, 'visible' | 'pending'>;
};

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0);
const HOUR = 3600e3;

export const SEED_MEMBERS: SeedMember[] = [
  { memberId: 'seed-m1', displayName: 'عبد الله (تجريبي)' },
  { memberId: 'seed-m2', displayName: 'أم يوسف (تجريبي)' },
  { memberId: 'seed-m3', displayName: 'محمد (تجريبي)' },
  { memberId: 'seed-m4', displayName: 'فاطمة (تجريبي)' },
  { memberId: 'seed-m5', displayName: 'خالد (تجريبي)' },
  { memberId: 'seed-m6', displayName: 'مريم (تجريبي)' },
];

export const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'seed-g1',
    name: 'ختمة رمضان (تجريبي)',
    joinCode: JOIN_CODES.leak,
    ownerId: 'seed-m1',
    createdAt: T0,
    memberIds: ['seed-m1', 'seed-m2', 'seed-m3'],
    challenge: {
      id: 'seed-c1',
      title: 'ختمة المجموعة (تجريبي)',
      startsOn: '2026-09-01',
      createdBy: 'seed-m1',
      spec: { kind: 'khatm' },
    },
    reports: [
      { memberId: 'seed-m1', shareMyProgress: true, pagesCovered: 120, daysMet: 0 },
      { memberId: 'seed-m2', shareMyProgress: true, pagesCovered: 85, daysMet: 0 },
      { memberId: 'seed-m3', shareMyProgress: false, pagesCovered: 47, daysMet: 0 },
    ],
  },
  {
    id: 'seed-g2',
    name: 'حلقة التدبر (تجريبي)',
    joinCode: JOIN_CODES.visible,
    ownerId: 'seed-m4',
    createdAt: T0 + HOUR,
    memberIds: ['seed-m4', 'seed-m1', 'seed-m5', 'seed-m6'],
    challenge: {
      id: 'seed-c2',
      title: 'ختمة التدبر (تجريبي)',
      startsOn: '2026-09-01',
      createdBy: 'seed-m4',
      spec: { kind: 'khatm' },
    },
    reports: [
      { memberId: 'seed-m4', shareMyProgress: false, pagesCovered: 33, daysMet: 0 },
      { memberId: 'seed-m1', shareMyProgress: true, pagesCovered: 40, daysMet: 0 },
      { memberId: 'seed-m5', shareMyProgress: false, pagesCovered: 58, daysMet: 0 },
      { memberId: 'seed-m6', shareMyProgress: false, pagesCovered: 71, daysMet: 0 },
    ],
  },
  {
    id: 'seed-g3',
    name: 'ورد الفجر (تجريبي)',
    joinCode: JOIN_CODES.wird,
    ownerId: 'seed-m2',
    createdAt: T0 + 2 * HOUR,
    memberIds: ['seed-m2', 'seed-m3', 'seed-m5', 'seed-m6'],
    challenge: {
      id: 'seed-c3',
      title: 'ورد يومي (تجريبي)',
      startsOn: '2026-09-15',
      createdBy: 'seed-m2',
      spec: { kind: 'daily-wird', pagesPerDay: 5, days: 30 },
    },
    reports: [
      { memberId: 'seed-m2', shareMyProgress: true, pagesCovered: 60, daysMet: 12 },
      { memberId: 'seed-m3', shareMyProgress: false, pagesCovered: 45, daysMet: 9 },
      { memberId: 'seed-m5', shareMyProgress: false, pagesCovered: 70, daysMet: 14 },
      { memberId: 'seed-m6', shareMyProgress: false, pagesCovered: 35, daysMet: 7 },
    ],
  },
];

// Lecture ids of the first two scholars' first series (data/content/scholars.ts).
export const SEED_POSTS: SeedPost[] = [
  { id: 'seed-p1', lectureId: 'sl1-1', authorId: 'seed-m1', body: 'جزاكم الله خيرًا على هذه الفائدة', createdAt: T0 + 3 * HOUR, status: 'visible' },
  { id: 'seed-p2', lectureId: 'sl1-1', authorId: 'seed-m2', body: 'شرح مبارك، نفع الله بكم', createdAt: T0 + 4 * HOUR, status: 'visible' },
  { id: 'seed-p3', lectureId: 'sl1-1', authorId: 'seed-m4', body: 'هل من تلخيص للدرس الأول؟', createdAt: T0 + 5 * HOUR, status: 'visible' },
  { id: 'seed-p4', lectureId: 'sl1-1', authorId: 'seed-m3', body: 'أسأل الله أن يتقبل منا ومنكم', createdAt: T0 + 6 * HOUR, status: 'pending' },
  { id: 'seed-p5', lectureId: 'sl2-1', authorId: 'seed-m5', body: 'بارك الله في الشيخ ورفع قدره', createdAt: T0 + 7 * HOUR, status: 'visible' },
  { id: 'seed-p6', lectureId: 'sl2-1', authorId: 'seed-m6', body: 'استفدت كثيرًا من هذا الباب', createdAt: T0 + 8 * HOUR, status: 'visible' },
];
