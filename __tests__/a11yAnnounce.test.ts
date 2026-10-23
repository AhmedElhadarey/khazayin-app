import { readFileSync } from 'fs';
import { join } from 'path';
import { AccessibilityInfo } from 'react-native';
import { announce } from '@/services/a11yAnnounce';

describe('announce', () => {
  const original = (AccessibilityInfo as any).announceForAccessibilityWithOptions;
  afterEach(() => {
    (AccessibilityInfo as any).announceForAccessibilityWithOptions = original;
    jest.restoreAllMocks();
  });

  it('queues the message where the platform supports it, so it does not cut off the press confirmation', () => {
    const withOptions = jest.fn();
    (AccessibilityInfo as any).announceForAccessibilityWithOptions = withOptions;
    const plain = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    announce('تم');
    expect(withOptions).toHaveBeenCalledWith('تم', { queue: true });
    expect(plain).not.toHaveBeenCalled();
  });

  it('falls back to a plain announcement', () => {
    (AccessibilityInfo as any).announceForAccessibilityWithOptions = undefined;
    const plain = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => undefined);
    announce('تم');
    expect(plain).toHaveBeenCalledWith('تم');
  });

  it('is the one copy: the save, bookmark and dismiss paths import it', () => {
    for (const file of ['services/savedToggle.ts', 'services/mushafBookmark.ts', 'services/recommendations/dismiss.ts']) {
      const src = readFileSync(join(__dirname, '..', file), 'utf8');
      expect(src).toMatch(/from '@\/services\/a11yAnnounce'/);
      expect(src).not.toMatch(/function announce\(/);
      expect(src).not.toMatch(/announceForAccessibilityWithOptions/);
    }
  });
});
