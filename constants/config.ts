/**
 * Only https URLs survive. A regex, not `new URL()`: React Native's URL
 * polyfill throws on `.protocol`. Returns null (never '') when unusable.
 */
export function normalizePrivacyPolicyUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const url = raw.trim();
  return /^https:\/\/[^\s/?#]+[^\s]*$/i.test(url) ? url : null;
}

export const KhazainConfig = Object.freeze({
  /** Set via EXPO_PUBLIC_PRIVACY_POLICY_URL (inlined at build time). */
  privacyPolicyUrl: normalizePrivacyPolicyUrl(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL),
});
