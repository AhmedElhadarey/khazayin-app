/**
 * services/community/groupForm.ts
 * -------------------------------
 * Pure parsing for the create-group form (design §7.6) and the join error copy.
 */
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { fromArabicDigits } from '@/constants/progress';
import { arabicCopyForCode } from '@/services/api/errors';
import type { ApiErrorCode, JoinConflictDetail } from '@/services/api/types';

/**
 * A whole number inside `[min, max]`, or `null`. Accepts Arabic-Indic digits
 * and surrounding spaces; anything else (decimals, signs, text) is `null`.
 */
export function parseBounded(text: string, range: { min: number; max: number }): number | null {
  const t = fromArabicDigits(text.trim());
  if (!/^\d{1,4}$/.test(t)) return null;
  const n = Number(t);
  return n >= range.min && n <= range.max ? n : null;
}

/**
 * Copy for a failed join. A wrong code and a full group have frozen copy. A
 * `conflict` means "full" or "at the 5-group cap" (design §5.2), told apart by
 * `detail`; without it the generic conflict text is the honest answer.
 */
export function joinErrorCopy(code: ApiErrorCode, detail?: JoinConflictDetail): string {
  if (code === 'notFound' || code === 'validation') return COMMUNITY_COPY.badCode;
  if (code === 'conflict') {
    if (detail === 'full') return COMMUNITY_COPY.full;
    if (detail === 'groupCap') return COMMUNITY_COPY.groupCap;
  }
  return arabicCopyForCode(code);
}

/**
 * A join code as typed or pasted: Arabic-Indic digits become ASCII, letters
 * are uppercased, separators and anything else are dropped, then it is cut to
 * the code length. Sanitise first, so `AB-12CD` yields `AB12CD`.
 */
export function normalizeJoinCode(text: string): string {
  return fromArabicDigits(text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, COMMUNITY_LIMITS.joinCodeLength);
}
