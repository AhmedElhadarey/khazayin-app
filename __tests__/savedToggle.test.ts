jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined) },
}));

import { AccessibilityInfo, type AccessibilityActionEvent } from 'react-native';
import {
  lectureSaveTarget, saveGestureProps, SAVE_ACTION_NAME, SAVE_TOAST_MS,
  SAVED_COPY, toggleSaved, UNSAVE_TOAST_MS, type SaveTarget,
} from '../services/savedToggle';
import { useSavedStore } from '../store/savedStore';
import { useToastStore } from '../store/toastStore';

const target = (id: string): SaveTarget => lectureSaveTarget({
  id, title: 'غزوة بدر', scholar: 'الشيخ عبد المحسن العباد', duration: '٣٢ دقيقة', category: 'prophet',
});

let now = 1_000;
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  useSavedStore.setState({ items: [] });
  useToastStore.setState({ current: null });
});
afterEach(() => jest.restoreAllMocks());

describe('toggleSaved', () => {
  it('saves an unsaved target, returns true and shows the 3s Arabic save toast with undo', () => {
    expect(toggleSaved(target('p1'))).toBe(true);
    expect(useSavedStore.getState().isSaved('lecture', 'p1')).toBe(true);
    const toast = useToastStore.getState().current!;
    expect(toast.message).toBe('تمت الإضافة إلى المحفوظات');
    expect(toast.durationMs).toBe(SAVE_TOAST_MS);
    expect(toast.action?.label).toBe('تراجع');
  });

  it('the save toast undo removes the item again', () => {
    toggleSaved(target('p1'));
    useToastStore.getState().current!.action!.onPress();
    expect(useSavedStore.getState().items).toEqual([]);
  });

  it('unsaves a saved target, returns false and shows the 5s Arabic unsave toast with undo', () => {
    toggleSaved(target('p1'));
    expect(toggleSaved(target('p1'))).toBe(false);
    expect(useSavedStore.getState().isSaved('lecture', 'p1')).toBe(false);
    const toast = useToastStore.getState().current!;
    expect(toast.message).toBe('تم الحذف من المحفوظات');
    expect(toast.durationMs).toBe(UNSAVE_TOAST_MS);
    expect(toast.action?.label).toBe('تراجع');
  });

  it('the unsave toast undo restores the original entry at its original position', () => {
    now = 1; toggleSaved(target('a'));
    now = 2; toggleSaved(target('b'));
    now = 3; toggleSaved(target('c'));            // c, b, a
    now = 4; toggleSaved(target('b'));            // unsave b
    now = 50; useToastStore.getState().current!.action!.onPress();
    const items = useSavedStore.getState().items;
    expect(items.map((i) => i.entityId)).toEqual(['c', 'b', 'a']);
    expect(items[1].savedAt).toBe(2);
  });
});

describe('saveGestureProps', () => {
  const action = (actionName: string) => ({ nativeEvent: { actionName } }) as AccessibilityActionEvent;
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    // jest-expo already mocks this as a jest.fn, so spyOn reuses it and
    // restoreAllMocks does not reset its calls — clear them per test.
    announce.mockClear();
  });

  it('wires long-press to onToggle', () => {
    const onToggle = jest.fn(() => true);
    const props = saveGestureProps(false, onToggle);
    expect(props.onLongPress).toBeDefined();
    props.onLongPress!({} as never);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('the toggleSave custom action calls onToggle exactly once and announces the result', () => {
    const onSave = jest.fn(() => true);
    saveGestureProps(false, onSave).onAccessibilityAction!(action(SAVE_ACTION_NAME));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('تمت الإضافة إلى المحفوظات');

    const onUnsave = jest.fn(() => false);
    saveGestureProps(true, onUnsave).onAccessibilityAction!(action(SAVE_ACTION_NAME));
    expect(onUnsave).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenLastCalledWith('تم الحذف من المحفوظات');
  });

  it('activate and longpress actions do not toggle (a double-tap still plays)', () => {
    const onToggle = jest.fn(() => true);
    const props = saveGestureProps(false, onToggle);
    props.onAccessibilityAction!(action('activate'));
    props.onAccessibilityAction!(action('longpress'));
    expect(onToggle).not.toHaveBeenCalled();
    expect(announce).not.toHaveBeenCalled();
  });

  it('labels, hint and value flip with saved state', () => {
    const unsaved = saveGestureProps(false, () => true);
    expect(unsaved.accessibilityActions).toEqual([{ name: SAVE_ACTION_NAME, label: 'حفظ في المكتبة' }]);
    expect(unsaved.accessibilityHint).toBe('اضغط مطوّلاً للحفظ في المكتبة');
    expect(unsaved.accessibilityValue).toEqual({ text: undefined });

    const saved = saveGestureProps(true, () => false);
    expect(saved.accessibilityActions).toEqual([{ name: SAVE_ACTION_NAME, label: 'إزالة من المحفوظات' }]);
    expect(saved.accessibilityHint).toBe('اضغط مطوّلاً للإزالة من المحفوظات');
    expect(saved.accessibilityValue).toEqual({ text: 'محفوظة' });
  });
});

describe('lectureSaveTarget', () => {
  it('builds a lecture snapshot and defaults missing scholar/duration to empty strings', () => {
    expect(lectureSaveTarget({ id: 'ab1', title: 'كتاب صوتي', category: 'general' })).toEqual({
      type: 'lecture', entityId: 'ab1',
      snapshot: { type: 'lecture', title: 'كتاب صوتي', scholar: '', duration: '', category: 'general' },
    });
  });

  it('exposes Arabic copy only', () => {
    for (const s of Object.values(SAVED_COPY)) expect(s).toMatch(/[؀-ۿ]/);
  });
});
