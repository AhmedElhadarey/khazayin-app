const mockStart = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn().mockResolvedValue(undefined);
const mockCanPreviewAudio = jest.fn().mockReturnValue(true);
jest.mock('@/services/audioEngine', () => ({
  PREVIEW_ERROR_MESSAGE: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
  canPreviewAudio: () => mockCanPreviewAudio(),
  startReciterPreview: (...a: unknown[]) => mockStart(...a),
  stopReciterPreview: () => mockStop(),
}));
const mockToastShow = jest.fn();
jest.mock('@/store/toastStore', () => ({ useToastStore: { getState: () => ({ show: mockToastShow }) } }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/react-native';

import { canPreview, previewSourceFor, stopPreview, toggleReciterPreview } from '@/services/reciterPreview';
import { usePreviewStore } from '@/store/previewStore';

const r = { id: 'r3', name: 'المنشاوي', style: 'murattal', styleLabel: 'x' } as const;
const S = { r3: { archiveId: 'Item_1', file: '001.mp3' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockCanPreviewAudio.mockReturnValue(true);
  usePreviewStore.getState().clear();
});

it('F1: previewSourceFor reads the verified map only', () => {
  expect(previewSourceFor(r, S)).toEqual(S.r3);
  expect(previewSourceFor({ ...r, archiveId: 'series' }, {})).toBeNull(); // a series id is not a file
});
it('F2: canPreview needs a source AND an engine that can preview', () => {
  expect(canPreview(r, {})).toBe(false);
  expect(canPreview(r, S)).toBe(true);
  mockCanPreviewAudio.mockReturnValue(false); // web, or a lecture owns the queue
  expect(canPreview(r, S)).toBe(false);
});
it('F3: toggling the active reciter stops it', async () => {
  usePreviewStore.getState().begin('r3');
  await toggleReciterPreview(r, S);
  expect(mockStop).toHaveBeenCalled();
  expect(mockStart).not.toHaveBeenCalled();
});
it('F4: toggling another reciter starts it with its verified source', async () => {
  await toggleReciterPreview(r, S);
  expect(mockStart).toHaveBeenCalledWith(r, S.r3);
});
it('F5: failure → Arabic network toast, never throws', async () => {
  mockStart.mockRejectedValueOnce(new Error('net'));
  await expect(toggleReciterPreview(r, S)).resolves.toBeUndefined();
  expect(mockToastShow).toHaveBeenCalledWith({
    message: 'تعذّر تشغيل العيّنة. تحقق من اتصالك ثم حاول مجددًا.',
  });
});
it('F6: no source → nothing happens', async () => {
  await toggleReciterPreview(r, {});
  expect(mockStart).not.toHaveBeenCalled();
});
it('F7: stopPreview never throws, and reports the engine error to Sentry', async () => {
  const err = new Error('bridge down');
  mockStop.mockRejectedValueOnce(err);
  await expect(stopPreview()).resolves.toBeUndefined();
  expect(Sentry.captureException).toHaveBeenCalledWith(err);
});
