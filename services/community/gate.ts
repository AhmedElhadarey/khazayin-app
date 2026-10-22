/**
 * Community gate (design §3.1). Pure: the environment arrives as arguments,
 * `config.ts` is the only module that reads `__DEV__` and the env flag.
 *
 * v1 has exactly two modes. Production is `off`: no community UI, no mock.
 */
import type { ApiErrorCode } from '@/services/api/types';

/** Bump when the guidelines text changes; members must re-accept (§7.4). */
export const GUIDELINES_VERSION = 1;

export type CommunityMode = 'mock' | 'off';
export type CommunityAccess = 'hidden' | 'intro' | 'open';

export type DeletionState =
  | { state: 'none' }
  | {
      state: 'pending';
      attempts: number;
      nextAttemptAt: number;
      lastError: ApiErrorCode | null;
    };

export function communityMode(env: {
  isDev: boolean;
  visualAudit?: string;
}): CommunityMode {
  // Visual-audit captures must never show community UI (S4).
  if (env.visualAudit === '1') return 'off';
  return env.isDev ? 'mock' : 'off';
}

export function communityAccess(
  mode: CommunityMode,
  p: { optedIn: boolean; guidelinesVersion: number; deletion: DeletionState },
): CommunityAccess {
  if (mode === 'off' || p.deletion.state !== 'none') return 'hidden';
  return p.optedIn && p.guidelinesVersion >= GUIDELINES_VERSION ? 'open' : 'intro';
}
