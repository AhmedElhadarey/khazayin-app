/**
 * Behaviour of the discussion components under a renderer: which actions a
 * post offers, and what the composer does with input.
 */
import React from 'react';
import { AccessibilityInfo, Pressable, Text, TextInput } from 'react-native';
import { Composer } from '@/components/khazain/community/Composer';
import { SheetRow } from '@/components/khazain/sheets/SheetRow';
import { PostRow } from '@/components/khazain/community/PostRow';
import { COMMUNITY_COPY, muteA11y, reportA11y } from '@/constants/communityCopy';

// react-test-renderer ships with jest-expo but has no type declarations in the repo.
type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[]; findByType: (t: unknown) => Node };
type Renderer = { root: Node; unmount: () => void };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => Renderer;
};

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const buttons = (r: Renderer) => r.root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
const labels = (r: Renderer) => buttons(r).map((n) => n.props.accessibilityLabel);

describe('PostRow', () => {
  const base = { authorName: 'أحمد', body: 'نص', timeLabel: 'الآن', status: 'visible' as const };

  it("offers «حذف» on a member's own post and nothing else", () => {
    const onDelete = jest.fn();
    let r!: Renderer;
    act(() => {
      r = create(<PostRow {...base} isMine onDelete={onDelete} />);
    });
    expect(labels(r)).toEqual([COMMUNITY_COPY.deletePost]);
    act(() => buttons(r)[0].props.onPress());
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("offers report and mute, named for the author, on someone else's post", () => {
    const onReport = jest.fn();
    const onMute = jest.fn();
    let r!: Renderer;
    act(() => {
      r = create(<PostRow {...base} isMine={false} onReport={onReport} onMute={onMute} />);
    });
    expect(labels(r)).toEqual([reportA11y('أحمد'), muteA11y('أحمد')]);
    act(() => buttons(r).forEach((b) => b.props.onPress()));
    expect(onReport).toHaveBeenCalledTimes(1);
    expect(onMute).toHaveBeenCalledTimes(1);
  });

  it('disables the actions while a write is in flight', () => {
    let r!: Renderer;
    act(() => {
      r = create(<PostRow {...base} isMine={false} busy />);
    });
    expect(buttons(r).every((b) => b.props.disabled)).toBe(true);
  });

  it('reads the pending badge as part of the one text element', () => {
    let r!: Renderer;
    act(() => {
      r = create(<PostRow {...base} status="pending" isMine />);
    });
    const text = r.root.findAll(
      (n) => n.props.accessible === true && String(n.props.accessibilityLabel).includes(COMMUNITY_COPY.pendingBadge),
    );
    expect(text.length).toBeGreaterThan(0);
    expect(text[0].props.accessibilityLabel).toBe(`أحمد، الآن، ${COMMUNITY_COPY.pendingBadge}، نص`);
  });

  it('gives every action a 44pt target', () => {
    let r!: Renderer;
    act(() => {
      r = create(<PostRow {...base} isMine={false} />);
    });
    const style = (p: any) => (typeof p.props.style === 'function' ? p.props.style({ pressed: false }) : p.props.style);
    const flat = (s: unknown): Record<string, number> => Object.assign({}, ...[s].flat(5).filter(Boolean));
    for (const b of r.root.findAll((n) => n.type === Pressable)) {
      expect(flat(style(b)).minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});

describe('Composer', () => {
  const setup = (value = '') => {
    const onChangeText = jest.fn();
    let r!: Renderer;
    act(() => {
      r = create(<Composer value={value} onChangeText={onChangeText} onSubmit={jest.fn()} />);
    });
    return { r, onChangeText, input: () => r.root.findByType(TextInput) };
  };

  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('has no native maxLength, so a paste is cleaned before it is capped', () => {
    expect(setup().input().props.maxLength).toBeUndefined();
  });

  it('strips invisibles from what is typed before handing it up', () => {
    const { input, onChangeText } = setup();
    act(() => input().props.onChangeText('ا​ب'));
    expect(onChangeText).toHaveBeenCalledWith('اب');
  });

  it('caps a long paste at 1000 code points', () => {
    const { input, onChangeText } = setup();
    act(() => input().props.onChangeText('😀'.repeat(1200)));
    expect([...onChangeText.mock.calls[0][0]]).toHaveLength(1000);
  });

  it('announces the remaining characters once, when 90% is crossed', () => {
    const { input } = setup('ب'.repeat(899));
    act(() => input().props.onChangeText('ب'.repeat(900)));
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('الحروف المتبقية: ١٠٠');
    (AccessibilityInfo.announceForAccessibility as jest.Mock).mockClear();
    const again = setup('ب'.repeat(900));
    act(() => again.input().props.onChangeText('ب'.repeat(901)));
    expect(AccessibilityInfo.announceForAccessibility).not.toHaveBeenCalled();
  });

  it('shows a visible label above the field', () => {
    const { r } = setup();
    const texts = r.root.findAll((n) => n.type === Text).map((n) => n.props.children);
    expect(texts).toContain(COMMUNITY_COPY.composerLabel);
  });

  it('shows the counter and announces an error', () => {
    let r!: Renderer;
    act(() => {
      r = create(<Composer value="abc" onChangeText={jest.fn()} onSubmit={jest.fn()} error="خطأ" />);
    });
    const texts = r.root.findAll((n) => n.type === Text).map((n) => n.props.children);
    expect(texts).toContain('٣ / ١٠٠٠');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith('خطأ');
  });
});

describe('SheetRow checked', () => {
  const row = (checked?: boolean) => {
    let r!: Renderer;
    act(() => {
      r = create(<SheetRow icon={null} title="سبب" checked={checked} onPress={jest.fn()} />);
    });
    return r.root.findAll((n) => typeof n.props.onPress === 'function' && n.props.accessibilityLabel === 'سبب')[0];
  };

  it('is a radio that exposes whether it is chosen', () => {
    expect(row(true).props).toMatchObject({ accessibilityRole: 'radio', accessibilityState: { checked: true } });
    expect(row(false).props).toMatchObject({ accessibilityRole: 'radio', accessibilityState: { checked: false } });
  });

  it('stays a plain button without it', () => {
    const p = row().props;
    expect(p.accessibilityRole).toBe('button');
    expect(p.accessibilityState).toBeUndefined();
  });
});
