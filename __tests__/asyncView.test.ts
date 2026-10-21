import fs from 'fs';
import path from 'path';
import { resolveAsyncView, userFacingErrorMessage } from '@/components/khazain/state/asyncView';
import { toApiError } from '@/services/api/errors';

describe('resolveAsyncView', () => {
  it.each(['idle', 'loading'] as const)('%s → skeleton (C5a: idle shares the loading path)', (s) => {
    expect(resolveAsyncView(s)).toEqual({ kind: 'skeleton' });
  });
  it('empty → empty', () => {
    expect(resolveAsyncView('empty')).toEqual({ kind: 'empty' });
  });
  it('success → content', () => {
    expect(resolveAsyncView('success')).toEqual({ kind: 'content' });
  });
  it('error with an ApiError → its Arabic message', () => {
    const err = toApiError(new TypeError('offline'));
    expect(resolveAsyncView('error', { error: err })).toEqual({ kind: 'error', message: err.message });
  });
  it('error with a plain English Error → undefined, so ErrorState uses its Arabic default', () => {
    expect(resolveAsyncView('error', { error: new Error('Unexpected 304 with no cached entry') }))
      .toEqual({ kind: 'error', message: undefined });
  });
  it('an explicit errorMessage wins over any error', () => {
    expect(resolveAsyncView('error', { error: toApiError(undefined, 500), errorMessage: 'رسالة' }))
      .toEqual({ kind: 'error', message: 'رسالة' });
  });
});

describe('userFacingErrorMessage', () => {
  it('returns undefined for null and undefined errors', () => {
    expect(userFacingErrorMessage(null)).toBeUndefined();
    expect(userFacingErrorMessage(undefined)).toBeUndefined();
  });
});

describe('AsyncContent delegates to resolveAsyncView', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'components/khazain/state/AsyncContent.tsx'), 'utf8');
  it('branches on the resolved view, not on raw status', () => {
    expect(src).toContain('resolveAsyncView(');
    // Neither `error?.message` nor `error.message` may be read in the component.
    expect(src).not.toMatch(/error\??\.message/);
  });
  it('warns in dev when a non-ApiError reaches the error state', () => {
    expect(src).toMatch(/__DEV__[\s\S]{0,200}isApiError\(error\)/);
    expect(src).toContain('console.warn(');
  });
});

describe('foundations sandbox drives the error state with an ApiError', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'app/foundations-sandbox.tsx'), 'utf8');
  it('does not hand AsyncContent a plain Error', () => {
    expect(src).not.toContain("new Error('خطأ تجريبي')");
    expect(src).toContain('toApiError(');
  });
});
