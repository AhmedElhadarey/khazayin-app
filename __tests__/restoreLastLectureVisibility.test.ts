/**
 * MUSHAF-05: `restoreLastLecture()` lands after hydration, which on a cold start
 * is after the Mushaf took focus and hid the MiniPlayer. It must not undo that.
 * Real playerStore here (the engine suite mocks it), so the final `isVisible`
 * is observed, not an assertion about a call.
 */
let mockInProgress: any = null;
jest.mock('@/store/progressStore', () => ({
  useProgressStore: { getState: () => ({ inProgressLecture: mockInProgress }) },
}));
jest.mock('@/store/toastStore', () => ({
  useToastStore: { getState: () => ({ show: jest.fn() }) },
}));
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

import { Platform } from 'react-native';
import { restoreLastLecture } from '@/services/audioEngine';
import { usePlayerStore } from '@/store/playerStore';

describe('restoreLastLecture and the Mushaf-hidden MiniPlayer', () => {
  beforeEach(() => {
    (Platform as any).OS = 'ios';
    mockInProgress = {
      lectureId: 'ABC/002.mp3',
      title: 'ح2',
      author: 'شيخ',
      durationSec: 900,
      positionSec: 180,
      completed: false,
    };
  });

  it('leaves the player hidden when the Mushaf already hid it', () => {
    usePlayerStore.getState().setVisible(false); // Mushaf focus effect
    restoreLastLecture();
    expect(usePlayerStore.getState().isVisible).toBe(false);
    expect(usePlayerStore.getState().track?.id).toBe('ABC/002.mp3');
    expect(usePlayerStore.getState().isPlaying).toBe(false);
  });

  it('the player is visible by default, so restore on another screen still shows it', () => {
    // The fresh store's own default, not a value this test set.
    expect(usePlayerStore.getInitialState().isVisible).toBe(true);
    usePlayerStore.setState({ isVisible: usePlayerStore.getInitialState().isVisible });
    restoreLastLecture();
    expect(usePlayerStore.getState().isVisible).toBe(true);
  });
});
