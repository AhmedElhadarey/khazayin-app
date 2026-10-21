import { usePreviewStore } from '@/store/previewStore';

beforeEach(() => usePreviewStore.getState().clear());

it('starts idle', () => {
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});
it('begin → loading; markPlaying only for the active reciter', () => {
  usePreviewStore.getState().begin('r1');
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: 'r1', status: 'loading' });
  usePreviewStore.getState().markPlaying('r2');
  expect(usePreviewStore.getState().status).toBe('loading');
  usePreviewStore.getState().markPlaying('r1');
  expect(usePreviewStore.getState().status).toBe('playing');
});
it('clear returns to idle', () => {
  usePreviewStore.getState().begin('r1');
  usePreviewStore.getState().clear();
  expect(usePreviewStore.getState()).toMatchObject({ reciterId: null, status: 'idle' });
});
