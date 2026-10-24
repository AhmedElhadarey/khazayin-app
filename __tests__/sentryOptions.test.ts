import {
  ANONYMOUS_USER,
  anonymizeEvent,
  applyAnonymousUser,
  buildSentryOptions,
} from '@/services/sentryOptions';

describe('buildSentryOptions', () => {
  it('never sends default PII and keeps the existing sampling/enablement', () => {
    const prod = buildSentryOptions('https://k@o.ingest.sentry.io/1', false);
    expect(prod.sendDefaultPii).toBe(false);
    expect(prod.enabled).toBe(true);
    expect(prod.tracesSampleRate).toBe(0.2);
    const dev = buildSentryOptions('https://k@o.ingest.sentry.io/1', true);
    expect(dev.enabled).toBe(false);
    expect(dev.tracesSampleRate).toBe(1.0);
    expect(buildSentryOptions(undefined, false).enabled).toBe(false);
  });

  it('rewrites the user on JS errors and transactions', () => {
    const o = buildSentryOptions('d', false);
    const ev = { user: { id: 'install-123', ip_address: '1.2.3.4', email: 'a@b.c' } } as any;
    expect(o.beforeSend(ev)).toEqual({ user: { id: 'anonymous' } });
    expect(o.beforeSendTransaction({ user: { id: 'x' } } as any)).toEqual({
      user: { id: 'anonymous' },
    });
  });
});

describe('anonymizeEvent', () => {
  it('sets the anonymous user even when none was present', () => {
    expect(anonymizeEvent({ message: 'm' } as any)).toEqual({
      message: 'm',
      user: { id: 'anonymous' },
    });
  });
});

describe('applyAnonymousUser', () => {
  it('sets the anonymous user on the scope that syncs to native', () => {
    const setUser = jest.fn();
    applyAnonymousUser({ setUser });
    expect(setUser).toHaveBeenCalledWith(ANONYMOUS_USER);
    expect(ANONYMOUS_USER).toEqual({ id: 'anonymous' });
  });
});
