/**
 * Onboarding welcome highlights: the diamond bullet leads the FIRST line of
 * its item. Centring it on the row put it beside the gap between the two
 * lines of a wrapped item (seen on iPhone 17e). No Figma frame; contract:
 * the `body` role's line box, scaled by the system font scale.
 */
import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { WelcomeStep, WELCOME_HIGHLIGHTS } from '@/components/khazain/onboarding/WelcomeStep';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';

jest.mock('expo-linear-gradient', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { LinearGradient: View };
});
jest.mock('@/components/khazain/home/FoundationMark', () => ({ FoundationMark: () => null }));
jest.mock('@/components/khazain/primitives', () => ({ Wordmark: () => null }));
jest.mock('@/hooks/useResponsiveLayout', () => ({ useResponsiveLayout: () => ({ columnStyle: null }) }));

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

describe('WelcomeStep highlight bullets', () => {
  it('sit on the centre of the first line, not the centre of a wrapped item', () => {
    let r!: { root: Node };
    act(() => {
      r = create(<WelcomeStep />);
    });
    const flat = (n: Node) => StyleSheet.flatten(n.props.style) ?? {};
    const bullets = r.root.findAll(
      (n) => n.type === 'View' && flat(n).backgroundColor === KhazainColors.goldAccent,
    );
    expect(bullets).toHaveLength(WELCOME_HIGHLIGHTS.length);

    const line = (textStyle('body').lineHeight as number) * Dimensions.get('window').fontScale;
    for (const b of bullets) {
      expect(flat(b).marginTop).toBeCloseTo((line - flat(b).height) / 2, 5);
    }
    const rows = r.root.findAll((n) => n.type === 'View' && flat(n).direction === 'ltr');
    expect(rows.length).toBeGreaterThanOrEqual(WELCOME_HIGHLIGHTS.length);
    for (const row of rows) expect(flat(row).alignItems).toBe('flex-start');
  });
});
