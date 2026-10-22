/**
 * store/communityStores.ts
 * ------------------------
 * Community read stores (design §9). In-memory only: other people's content
 * is never persisted, so there is no SWR and no cache domain.
 *
 * Imports `communityService` from the index only; that file alone decides
 * whether the mock exists (§3.2).
 */
import { createAsyncStore } from './createAsyncStore';
import { createPaginatedStore } from './paginated';
import { communityService } from '../services/community';
import { contentService } from '../services/contentService';
import { isNotModified } from '../services/api/types';
import type { Group, Post, ThreadSummary } from '../types/community';

export type GroupDetail = Awaited<ReturnType<typeof communityService.groups.get>>;

type GroupDetailStore = ReturnType<typeof createAsyncStore<GroupDetail | null>>;
type SummariesStore = ReturnType<typeof createAsyncStore<ThreadSummary[]>>;
type PostsStore = ReturnType<typeof createPaginatedStore<Post>>;

export const useMyGroupsStore = createAsyncStore<Group[]>({
  name: 'community-groups',
  initialData: [],
  fetcher: () => communityService.groups.listMine(),
  isEmpty: (d) => d.length === 0,
});

const groupDetails = new Map<string, GroupDetailStore>();
const threadSummaries = new Map<string, SummariesStore>();
const threadPosts = new Map<string, PostsStore>();

export function useGroupDetailStore(id: string): GroupDetailStore {
  let store = groupDetails.get(id);
  if (!store) {
    store = createAsyncStore<GroupDetail | null>({
      name: `community-group-${id}`,
      initialData: null,
      fetcher: () => communityService.groups.get(id),
    });
    groupDetails.set(id, store);
  }
  return store;
}

/** Post counts for every lecture of one scholar. */
export function useThreadSummariesStore(scholarId: string): SummariesStore {
  let store = threadSummaries.get(scholarId);
  if (!store) {
    store = createAsyncStore<ThreadSummary[]>({
      name: `community-summaries-${scholarId}`,
      initialData: [],
      fetcher: async () => {
        const res = await contentService.scholars.listLectures(scholarId);
        const lectures = isNotModified(res) ? [] : res.data;
        if (lectures.length === 0) return [];
        return communityService.threads.summaries(lectures.map((l) => l.id));
      },
      isEmpty: (d) => d.length === 0,
    });
    threadSummaries.set(scholarId, store);
  }
  return store;
}

/** Posts of one lecture's thread, keyed by `Lecture.id`. */
export function useThreadPostsStore(lectureId: string): PostsStore {
  let store = threadPosts.get(lectureId);
  if (!store) {
    store = createPaginatedStore<Post>({
      name: `community-posts-${lectureId}`,
      fetcher: async (cursor) => ({ data: await communityService.threads.posts(lectureId, cursor), etag: null }),
      isEmpty: (items) => items.length === 0,
    });
    threadPosts.set(lectureId, store);
  }
  return store;
}

/** Existing thread store only; patchers must not create stores for unopened threads. */
export function peekThreadPostsStore(lectureId: string): PostsStore | undefined {
  return threadPosts.get(lectureId);
}

/** Existing group detail store only. */
export function peekGroupDetailStore(id: string): GroupDetailStore | undefined {
  return groupDetails.get(id);
}

let generation = 0;
/** Bumped by every reset; async writers capture it and skip their write when it moved. */
export const communityGeneration = (): number => generation;
export const bumpCommunityGeneration = (): void => {
  generation += 1;
};

/** Forgets a cached group detail (the member left that group). */
export function dropGroupDetailStore(id: string): void {
  groupDetails.delete(id);
}

/** Drops every keyed store and empties my groups. Called after the account data is wiped. */
export function resetCommunityStores(): void {
  bumpCommunityGeneration();
  groupDetails.clear();
  threadSummaries.clear();
  threadPosts.clear();
  useMyGroupsStore.setState({ data: [], status: 'idle', error: null });
}

const visibleCache = new WeakMap<Post[], { muted: string[]; hidden: string[]; result: Post[] }>();

/**
 * Posts without muted authors or locally hidden posts. Memo-friendly: the same
 * array comes back while `items`, `muted` and `hidden` keep their references.
 */
export function visiblePosts(items: Post[], muted: string[], hidden: string[]): Post[] {
  const hit = visibleCache.get(items);
  if (hit && hit.muted === muted && hit.hidden === hidden) return hit.result;
  const result = items.filter((p) => !muted.includes(p.author.memberId) && !hidden.includes(p.id));
  visibleCache.set(items, { muted, hidden, result });
  return result;
}
