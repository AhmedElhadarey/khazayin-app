/**
 * The recent-search list on content-search (iPhone ax tree, 2026-10-23): the
 * query itself read as a plain group, every remove button said only «إزالة»
 * so rows could not be told apart, and «مسح» (clear all) was a group too. No
 * frame governs a11y; the contract is the app's other rows: the tappable query
 * is a button named by the query, its remove action names it as well (as the
 * recommendation dismiss does), and clear-all is a named button.
 */
import { readFileSync } from 'fs';
import path from 'path';
import React from 'react';

import { RecentSearchRow } from '@/components/khazain/search/RecentSearchRow';

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

describe('RecentSearchRow accessibility', () => {
  const onPress = jest.fn();
  const onRemove = jest.fn();
  let r!: { root: Node };
  act(() => {
    r = create(<RecentSearchRow query="التوحيد" onPress={onPress} onRemove={onRemove} />);
  });
  const root = r.root;
  const buttons = root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'button');

  it('has two buttons: the query, and a remove named by the query', () => {
    expect(buttons.map((b) => b.props.accessibilityLabel).sort()).toEqual(['إزالة: التوحيد', 'التوحيد'].sort());
  });

  it('the query button runs the search and the remove button removes', () => {
    const pressables = root.findAll((n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    act(() => pressables.find((p) => p.props.accessibilityLabel === 'التوحيد')!.props.onPress());
    act(() => pressables.find((p) => p.props.accessibilityLabel === 'إزالة: التوحيد')!.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('content-search clear-all', () => {
  const source = readFileSync(path.join(__dirname, '..', 'app', 'content-search.tsx'), 'utf8');
  it('is a named button', () => {
    const at = source.indexOf('onPress={onClearAllRecents}');
    expect(at).toBeGreaterThan(-1);
    const tag = source.slice(source.lastIndexOf('<Pressable', at), source.indexOf('>', at) + 1);
    expect(tag).toMatch(/accessibilityRole="button"/);
    expect(tag).toMatch(/accessibilityLabel="مسح البحث الأخير"/);
  });
});
