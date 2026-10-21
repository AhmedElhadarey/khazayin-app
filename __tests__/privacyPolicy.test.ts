/**
 * Privacy-policy link (Settings → قانوني → سياسة الخصوصية).
 *
 * The URL comes from EXPO_PUBLIC_PRIVACY_POLICY_URL and is normalized in
 * constants/config.ts; only https URLs survive, and an unusable value is null.
 */
import { normalizePrivacyPolicyUrl } from '@/constants/config';

describe('normalizePrivacyPolicyUrl', () => {
  it('T-PP-1: returns null for undefined, null, \'\' and whitespace-only', () => {
    expect(normalizePrivacyPolicyUrl(undefined)).toBeNull();
    expect(normalizePrivacyPolicyUrl(null)).toBeNull();
    expect(normalizePrivacyPolicyUrl('')).toBeNull();
    expect(normalizePrivacyPolicyUrl('   ')).toBeNull();
  });

  it('T-PP-2: trims and returns a valid https URL', () => {
    expect(normalizePrivacyPolicyUrl('  https://khazayin.com/privacy  ')).toBe(
      'https://khazayin.com/privacy',
    );
  });

  it('T-PP-3: rejects non-https schemes', () => {
    for (const raw of ['http://khazayin.com/p', 'javascript:alert(1)', 'ftp://x.y', 'khazayin.com/privacy']) {
      expect(normalizePrivacyPolicyUrl(raw)).toBeNull();
    }
  });

  it('T-PP-4: rejects https URLs containing whitespace or with no host', () => {
    expect(normalizePrivacyPolicyUrl('https:// x')).toBeNull();
    expect(normalizePrivacyPolicyUrl('https://')).toBeNull();
  });
});

describe('KhazainConfig.privacyPolicyUrl', () => {
  const ENV_KEY = 'EXPO_PUBLIC_PRIVACY_POLICY_URL';

  afterEach(() => {
    delete process.env[ENV_KEY];
  });

  function loadConfig(): typeof import('@/constants/config') {
    let mod: typeof import('@/constants/config') | undefined;
    jest.isolateModules(() => {
      mod = require('@/constants/config');
    });
    return mod!;
  }

  it('T-PP-5: reads EXPO_PUBLIC_PRIVACY_POLICY_URL at module init', () => {
    process.env[ENV_KEY] = ' https://khazayin.com/privacy ';
    expect(loadConfig().KhazainConfig.privacyPolicyUrl).toBe('https://khazayin.com/privacy');
  });

  it("T-PP-6: is null (never '') when the env var is unset", () => {
    delete process.env[ENV_KEY];
    expect(loadConfig().KhazainConfig.privacyPolicyUrl).toBeNull();
  });
});
