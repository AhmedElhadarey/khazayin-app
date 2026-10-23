import React from 'react';
import { StyleSheet } from 'react-native';
import { MushafMetaStrip } from '@/components/khazain/mushaf/MushafMetaStrip';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: any; unmount: () => void };
};

const parts = { revelationType: 'meccan', ayahCount: 7, page: 1 };

function setup() {
  let r!: { root: any; unmount: () => void };
  act(() => {
    r = create(<MushafMetaStrip parts={parts} paddingTop={10} />);
  });
  // The parts are the measured host Views, in reading order. No testIDs: on
  // iOS they would surface the dots as separate accessibility elements.
  const SLOTS = ['revelation', 'ayahs', 'page'];
  const item = (slot: string) =>
    r.root.findAll((n: any) => n.type === 'View' && typeof n.props.onLayout === 'function')[SLOTS.indexOf(slot)];
  const dot = (slot: string) => {
    const found = item(slot).findAll((n: any) => n.type === 'Text' && n.props.children === '•');
    if (found.length !== 1) throw new Error(`no dot on ${slot}`);
    return found[0];
  };
  const dotOpacity = (slot: string) => StyleSheet.flatten(dot(slot).props.style).opacity ?? 1;
  const layout = (slot: string, y: number, height = 21) =>
    act(() => item(slot).props.onLayout({ nativeEvent: { layout: { x: 0, y, width: 80, height } } }));
  return { r, dot, dotOpacity, layout };
}

describe('MushafMetaStrip', () => {
  it('draws the parts in reading order with the later two dotted before anything is measured', () => {
    const t = setup();
    const texts = t.r.root
      .findAll((n: any) => n.type === 'Text' && typeof n.props.children === 'string')
      .map((n: any) => n.props.children);
    expect(texts).toEqual(['مكية', '•', '٧ آيات', '•', 'صفحة ١ من ٦٠٤']);
    expect(t.dotOpacity('ayahs')).toBe(1);
    expect(t.dotOpacity('page')).toBe(1);
    expect(() => t.dot('revelation')).toThrow();
  });

  it('is one accessible element, announced with Arabic commas', () => {
    const t = setup();
    const strip = t.r.root.find((n: any) => n.type === 'View' && n.props.accessible === true);
    expect(strip.props.accessibilityLabel).toBe('مكية، ٧ آيات، صفحة ١ من ٦٠٤');
  });

  it('hides the dot of a part that wrapped to line 2, keeping the one still on line 1', () => {
    const t = setup();
    t.layout('revelation', 0);
    t.layout('ayahs', 0);
    t.layout('page', 21);
    expect(t.dotOpacity('ayahs')).toBe(1);
    expect(t.dotOpacity('page')).toBe(0);
  });

  it('hides both dots when every part sits on its own line', () => {
    const t = setup();
    t.layout('revelation', 0);
    t.layout('ayahs', 21);
    t.layout('page', 42);
    expect(t.dotOpacity('ayahs')).toBe(0);
    expect(t.dotOpacity('page')).toBe(0);
  });

  it('keeps a hidden dot in the layout, so hiding it cannot pull the part back onto line 1', () => {
    const t = setup();
    t.layout('revelation', 0);
    t.layout('ayahs', 0);
    t.layout('page', 21);
    // Still rendered (opacity, not removal): the part's width, and so the wrap, is unchanged.
    expect(t.dot('page')).toBeTruthy();
  });

  it('shows the dots again when the strip unwraps (a wider window)', () => {
    const t = setup();
    t.layout('revelation', 0);
    t.layout('ayahs', 0);
    t.layout('page', 21);
    t.layout('page', 0);
    expect(t.dotOpacity('page')).toBe(1);
  });
});
