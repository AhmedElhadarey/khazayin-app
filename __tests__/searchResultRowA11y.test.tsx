/**
 * Saved rows (Library › محفوظاتي) and search results draw a meta chip («٤٨
 * دقيقة») at the physical left of the title. Without a label TalkBack joined
 * the children in physical order: «٤٨ دقيقة, شرح كتاب التوحيد, الشيخ ابن
 * عثيمين». The row is named in reading order, as LectureCard is (90c75b4).
 */
import React from 'react';

import { SearchResultRow } from '@/components/khazain/search/SearchResultRow';

type Node = { type: unknown; props: Record<string, any>; findAll: (p: (n: Node) => boolean) => Node[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { act, create } = require('react-test-renderer') as {
  act: (fn: () => void) => void;
  create: (el: React.ReactElement) => { root: Node };
};

const buttons = (el: React.ReactElement) => {
  let r!: { root: Node };
  act(() => {
    r = create(el);
  });
  return r.root.findAll((n) => n.type === 'View' && n.props.accessibilityRole === 'button');
};

describe('SearchResultRow accessibility', () => {
  it('reads title، subtitle، meta', () => {
    const [row] = buttons(
      <SearchResultRow iconNode={null} title="شرح كتاب التوحيد" subtitle="الشيخ ابن عثيمين" meta="٤٨ دقيقة" onPress={() => {}} />,
    );
    expect(row.props.accessibilityLabel).toBe('شرح كتاب التوحيد، الشيخ ابن عثيمين، ٤٨ دقيقة');
  });

  it('skips the parts a row does not have', () => {
    const [row] = buttons(<SearchResultRow iconNode={null} title="شرح رياض الصالحين" onPress={() => {}} />);
    expect(row.props.accessibilityLabel).toBe('شرح رياض الصالحين');
  });
});
