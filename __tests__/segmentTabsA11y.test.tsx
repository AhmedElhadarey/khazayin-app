/**
 * The reciter tab strip (2031:6193) set `accessibilityRole="tab"` on each tab,
 * but React Native only gives iOS tab semantics ("tab, 2 of 4", selected) when
 * the tabs sit inside an `accessibilityRole="tablist"` container. Without it
 * VoiceOver read the four tabs as plain groups. No frame governs a11y; contract:
 * one tablist holding one selectable tab per entry.
 */
import React from 'react';

import { SegmentTabs } from '@/components/khazain/primitives/SegmentTabs';

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

const TABS = [
  { key: 'a', label: 'المصحف المجوَّد' },
  { key: 'b', label: 'المصحف المرتَّل' },
  { key: 'c', label: 'قراءات' },
];

describe('SegmentTabs accessibility', () => {
  it('wraps its tabs in a tablist and marks exactly the active one selected', () => {
    let r!: { root: Node };
    act(() => {
      r = create(<SegmentTabs tabs={TABS} active="b" onChange={() => {}} />);
    });
    const lists = r.root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'tablist');
    expect(lists).toHaveLength(1);
    const tabs = lists[0].findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'tab');
    expect(tabs.map((t) => t.props.accessibilityLabel).sort()).toEqual(TABS.map((t) => t.label).sort());
    expect(tabs.filter((t) => t.props.accessibilityState?.selected).map((t) => t.props.accessibilityLabel)).toEqual([
      'المصحف المرتَّل',
    ]);
  });
});
