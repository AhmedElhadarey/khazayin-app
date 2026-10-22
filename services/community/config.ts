/**
 * Reads the build environment once and exports the resolved community mode.
 *
 * Expo inlines env values only on LITERAL `process.env.NAME` access (same as
 * `app/_layout.tsx`), so never index `process.env` dynamically here.
 */
import { communityMode, type CommunityMode } from './gate';

export const COMMUNITY_MODE: CommunityMode = communityMode({
  isDev: __DEV__,
  visualAudit: process.env.EXPO_PUBLIC_VISUAL_AUDIT,
});
