/**
 * services/privacyPolicy.ts
 * -------------------------
 * The سياسة الخصوصية row on Settings (app/(tabs)/more/settings.tsx).
 *
 * The URL comes from KhazainConfig.privacyPolicyUrl (EXPO_PUBLIC_PRIVACY_POLICY_URL).
 * While it is unset the row shows the Arabic "coming soon" alert; once set, the
 * policy opens in the in-app browser (expo-web-browser). The browser and the
 * alert are injected so `__tests__/privacyPolicy.test.ts` can assert every
 * branch without a renderer or native modules.
 */

/** Alert copy, verbatim from the screen before this logic was extracted. */
export const PRIVACY_POLICY_ALERTS = Object.freeze({
  pending: Object.freeze({ title: 'سياسة الخصوصية', body: 'سياسة الخصوصية ستُضاف قريبًا.' }),
  failed: Object.freeze({ title: 'سياسة الخصوصية', body: 'تعذّر فتح سياسة الخصوصية. حاول مجددًا.' }),
} as const);

export type PrivacyPolicyDeps = {
  url: string | null;
  openBrowser: (url: string) => Promise<unknown>;
  alert: (title: string, body: string) => void;
};
/** 'busy': a tap arrived while the browser from an earlier tap was still open. */
export type PrivacyPolicyOutcome = 'opened' | 'pending' | 'failed' | 'busy';

// expo-web-browser rejects a second openBrowserAsync while one is presented, so
// without this a double tap would show the "تعذّر فتح" alert over a browser that
// did open. Module-level because there is one in-app browser per app.
let browserInFlight = false;

export async function openPrivacyPolicy(deps: PrivacyPolicyDeps): Promise<PrivacyPolicyOutcome> {
  if (!deps.url) {
    deps.alert(PRIVACY_POLICY_ALERTS.pending.title, PRIVACY_POLICY_ALERTS.pending.body);
    return 'pending';
  }
  if (browserInFlight) return 'busy';
  browserInFlight = true;
  try {
    await deps.openBrowser(deps.url);
    return 'opened';
  } catch {
    deps.alert(PRIVACY_POLICY_ALERTS.failed.title, PRIVACY_POLICY_ALERTS.failed.body);
    return 'failed';
  } finally {
    browserInFlight = false;
  }
}
