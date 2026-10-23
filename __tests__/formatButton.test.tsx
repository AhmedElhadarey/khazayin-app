import React from 'react';
import { FormatButton } from '@/components/khazain/primitives/FormatButton';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => {
    root: { findAll: (p: (n: any) => boolean) => any[] };
  };
};

function mount(onPress?: () => void) {
  let tree!: ReturnType<typeof create>;
  act(() => {
    tree = create(<FormatButton mark="NoteBold" accessibilityLabel="عريض" onPress={onPress} />);
  });
  return tree.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.type !== 'string')[0];
}

describe('FormatButton', () => {
  it('is a labelled button', () => {
    const btn = mount();
    expect(btn.props.accessibilityRole).toBe('button');
    expect(btn.props.accessibilityLabel).toBe('عريض');
  });
  it('is disabled with a hint when nothing is wired', () => {
    const btn = mount();
    expect(btn.props.disabled).toBe(true);
    expect(btn.props.accessibilityState).toEqual({ disabled: true });
    expect(btn.props.accessibilityHint).toBe('قريبًا');
  });
  it('is live without a hint once it has an action', () => {
    const btn = mount(() => undefined);
    expect(btn.props.disabled).toBe(false);
    expect(btn.props.accessibilityState).toEqual({ disabled: false });
    expect(btn.props.accessibilityHint).toBeUndefined();
  });
  it('keeps the 32pt disc reachable at 44', () => {
    expect(mount().props.hitSlop).toBe(6);
  });
});
