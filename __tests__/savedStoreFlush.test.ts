/**
 * T2.4 — a pending (debounced) saved-store write is flushed immediately by
 * flushSavedWritesNow() (called on AppState background), instead of waiting out
 * the 100ms debounce window — which a hard-quit could cut short.
 */
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDebouncedStorage, flushSavedWritesNow } from '../store/savedStore';

describe('savedStore background flush (T2.4)', () => {
  it('T2.4-1: flushSavedWritesNow persists a pending debounced write immediately', async () => {
    const storage = createDebouncedStorage();
    (AsyncStorage.setItem as jest.Mock).mockClear();

    storage.setItem('@khazain/saved', '{"items":[]}');
    // Debounced — not yet written.
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await flushSavedWritesNow();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@khazain/saved', '{"items":[]}');
  });

  it('T2.4-2: flush with nothing pending is a no-op', async () => {
    createDebouncedStorage();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    await flushSavedWritesNow();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
