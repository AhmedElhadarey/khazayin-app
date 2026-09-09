import { PHYSICAL_ROW } from '@/constants/layout';
import {
  BACK_CHEVRON_DIRECTION,
  INLINE_HEADER_ORDER,
  LECTURE_CARD_ORDER,
  LETTER_INDEX_EDGE,
  LIST_ROW_ORDER,
  MUSHAF_FOOTER_ORDER,
  RECITER_ROW_ORDER,
  SEARCH_PILL_ORDER,
  backAccessibilityLabel,
  listRowAccessibilityLabel,
} from '@/constants/rtlContracts';

/**
 * Guards the physical placement contract from design specification section 5.1.
 * A reversal shows up here as a failing array rather than as a screenshot
 * someone has to notice.
 */
describe('physical order contracts', () => {
  it('places the section-card disclosure left, text centre, icon badge right', () => {
    expect(LIST_ROW_ORDER).toEqual(['disclosure', 'text', 'iconBadge']);
  });

  it('places lecture duration and actions left, text centre, section badge right', () => {
    expect(LECTURE_CARD_ORDER).toEqual(['meta', 'text', 'badge']);
  });

  it('places the reciter disclosure left, then text and Quran badge right', () => {
    expect(RECITER_ROW_ORDER).toEqual(['disclosure', 'text', 'quranBadge']);
  });

  it('anchors the inline header title at the physical right with the chevron beyond it', () => {
    expect(INLINE_HEADER_ORDER).toEqual(['title', 'back']);
    expect(INLINE_HEADER_ORDER.indexOf('back')).toBeGreaterThan(
      INLINE_HEADER_ORDER.indexOf('title'),
    );
  });

  it('places the search magnifier at the physical left of the field', () => {
    expect(SEARCH_PILL_ORDER).toEqual(['icon', 'field', 'clear']);
  });

  it('orders the Mushaf footer Index, Go to bookmark, Save bookmark', () => {
    expect(MUSHAF_FOOTER_ORDER).toEqual(['index', 'goToBookmark', 'saveBookmark']);
  });

  it('keeps the letter rail on the physical right edge', () => {
    expect(LETTER_INDEX_EDGE).toBe('right');
  });

  it('points every back affordance right, the RTL back direction', () => {
    expect(BACK_CHEVRON_DIRECTION).toBe('right');
  });

  it('freezes every order so a caller cannot mutate the contract at runtime', () => {
    [
      LIST_ROW_ORDER,
      LECTURE_CARD_ORDER,
      RECITER_ROW_ORDER,
      INLINE_HEADER_ORDER,
      SEARCH_PILL_ORDER,
      MUSHAF_FOOTER_ORDER,
    ].forEach((order) => {
      expect(Object.isFrozen(order)).toBe(true);
    });
  });

  it('renders inside a container that pins physical direction', () => {
    // Without this, the arrays above are advisory and React Native is free to
    // reverse them under forceRTL — exactly the audited defect.
    expect(PHYSICAL_ROW.direction).toBe('ltr');
  });
});

describe('accessibility label contracts', () => {
  it('joins a section row with the Arabic comma and drops empty parts', () => {
    expect(
      listRowAccessibilityLabel({
        title: 'القرآن حياة',
        subtitle: 'تلاوات وتفسير وتدبر القرآن الكريم',
        count: '١٥١ حلقة',
      }),
    ).toBe('القرآن حياة، تلاوات وتفسير وتدبر القرآن الكريم، ١٥١ حلقة');
  });

  it('omits a missing subtitle and a null count', () => {
    expect(listRowAccessibilityLabel({ title: 'أنتِ ملكة', count: null })).toBe('أنتِ ملكة');
  });

  it('names the screen a back affordance returns from', () => {
    expect(backAccessibilityLabel('القرآن حياة')).toBe('رجوع، القرآن حياة');
  });
});
