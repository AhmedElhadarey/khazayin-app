/**
 * Pure state selection for <AsyncContent>. No React Native imports, so it
 * runs under plain jest without a renderer (the repo has none in package.json).
 */
import { isApiError } from '@/services/api/errors';
import type { LoadState } from '@/types/content';

export type AsyncView =
  | { kind: 'skeleton' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string | undefined }
  | { kind: 'content' };

/**
 * Only ApiError messages are user-facing: they come from the Arabic table in
 * services/api/errors.ts. Any other Error may carry English developer text;
 * return undefined so ErrorState shows its Arabic default.
 */
export function userFacingErrorMessage(
  error: Error | null | undefined,
  override?: string,
): string | undefined {
  if (override) return override;
  return isApiError(error) ? error.message : undefined;
}

export function resolveAsyncView(
  status: LoadState,
  opts: { error?: Error | null; errorMessage?: string } = {},
): AsyncView {
  switch (status) {
    case 'idle':
    case 'loading':
      return { kind: 'skeleton' };
    case 'empty':
      return { kind: 'empty' };
    case 'error':
      return { kind: 'error', message: userFacingErrorMessage(opts.error, opts.errorMessage) };
    case 'success':
      return { kind: 'content' };
  }
}
