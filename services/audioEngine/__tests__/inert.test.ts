/**
 * Inert-engine path: Expo Go (native react-native-track-player module absent).
 * The loader (../rntp) reports `nativeAudioAvailable: false`; the engine must
 * load without throwing and every entry point must no-op — user-initiated
 * playback surfaces an Arabic toast instead of touching the missing native
 * module.
 */
const mockToastShow = jest.fn();
const mockSetTrack = jest.fn();
const mockSetVisible = jest.fn();
const mockSetIsPlaying = jest.fn();

// Simulate a build where the native module never loaded.
jest.mock('../rntp', () => ({
  nativeAudioAvailable: false,
  TrackPlayer: undefined,
  Capability: undefined,
  State: undefined,
  Event: undefined,
  AppKilledPlaybackBehavior: undefined,
}));
jest.mock('@/store/toastStore', () => ({
  useToastStore: { getState: () => ({ show: mockToastShow }) },
}));
jest.mock('@/store/playerStore', () => ({
  usePlayerStore: {
    getState: () => ({
      setTrack: mockSetTrack,
      setVisible: mockSetVisible,
      setIsPlaying: mockSetIsPlaying,
      track: { id: 'ABC/001.mp3', title: 'ح1', reciter: 'شيخ' },
    }),
  },
}));
jest.mock('@/store/progressStore', () => ({
  useProgressStore: { getState: () => ({ inProgressLecture: null }) },
}));
jest.mock('../../archive/archiveClient', () => ({ fetchItemMetadata: jest.fn() }));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import { Platform } from 'react-native';
import * as engine from '../../audioEngine';

describe('audioEngine (inert — native module missing, e.g. Expo Go)', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios'; // NOT web — the module is simply absent.
    jest.clearAllMocks();
    engine.__resetForTests();
  });

  it('imports without throwing even though the native module is undefined', () => {
    expect(typeof engine.togglePlayback).toBe('function');
  });

  it('togglePlayback no-ops and shows an Arabic toast', async () => {
    await expect(engine.togglePlayback()).resolves.toBeUndefined();
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockToastShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(mockSetIsPlaying).not.toHaveBeenCalledWith(true);
  });

  it('playLecture no-ops without throwing and shows a toast', async () => {
    await expect(engine.playLecture({ archiveId: 'ABC' } as any)).resolves.toBeUndefined();
    expect(mockToastShow).toHaveBeenCalledTimes(1);
    expect(mockSetVisible).not.toHaveBeenCalled();
  });

  it('lifecycle calls are silent no-ops (no toast, no throw)', async () => {
    await expect(engine.setupPlayer()).resolves.toBeUndefined();
    await expect(engine.play()).resolves.toBeUndefined();
    await expect(engine.stop()).resolves.toBeUndefined();
    expect(() => engine.registerPlaybackService()).not.toThrow();
    engine.restoreLastLecture();
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockSetTrack).not.toHaveBeenCalled();
  });
});
