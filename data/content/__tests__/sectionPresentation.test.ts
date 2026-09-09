import { PENDING_SECTION_ROUTES, SECTIONS } from '../sections';

/**
 * Figma node 2031:5675. The mock adapter is the reference dataset for the
 * parity screenshots, so its copy and counts are part of the contract.
 */
describe('Sections root fixtures', () => {
  it('lists nine sections in reference order', () => {
    expect(SECTIONS.map((section) => section.id)).toEqual([
      'quran',
      'prophet',
      'scholars',
      'books',
      'queen',
      'audiobooks',
      'exclusive',
      'radio',
      'dawah',
    ]);
  });

  it('has unique ids', () => {
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(SECTIONS.length);
  });

  it.each([
    ['quran', 'القرآن حياة', 'تلاوات وتفسير وتدبر القرآن الكريم', '١٥٦ حلقة'],
    ['prophet', 'رسول الله ﷺ', 'محاضرات ودروس كبار العلماء', '٢٤٣ حلقة'],
    ['scholars', 'العلماء والمشايخ', 'محاضرات ودروس كبار العلماء', '٢٤٣ حلقة'],
    ['books', 'الكتب العلمية', 'شروحات الكتب الإسلامية المهمة', '٨٩ حلقة'],
    ['queen', 'أنتِ ملكة', 'ملكةٌ أنتِ لا سواكِ', '١٢٨ حلقة'],
    ['audiobooks', 'كتب صوتية', 'كتب إسلامية مقروءة بصوت عذب', '٦٧ كتاب'],
  ])('reproduces the reference copy for %s', (id, title, subtitle, count) => {
    const section = SECTIONS.find((s) => s.id === id);
    expect([section?.title, section?.subtitle, section?.count]).toEqual([
      title,
      subtitle,
      count,
    ]);
  });

  it('gives every section a count string, so no card renders a shorter body', () => {
    SECTIONS.forEach((section) => {
      expect([section.id, typeof section.count]).toEqual([section.id, 'string']);
    });
  });

  it('routes every section that has a screen, and names the ones that do not', () => {
    const routeless = SECTIONS.filter((section) => section.route === null).map((s) => s.id);
    expect(routeless).toEqual([...PENDING_SECTION_ROUTES]);
  });

  it('tracks exactly the sections Task 4.5 still has to implement', () => {
    // Emptied when /sections/audiobooks and /sections/exclusive exist.
    expect([...PENDING_SECTION_ROUTES]).toEqual(['audiobooks', 'exclusive']);
  });

  it('points every routed section at a section or tab path', () => {
    SECTIONS.filter((s) => s.route !== null).forEach((section) => {
      expect([section.id, section.route]).toEqual([
        section.id,
        expect.stringMatching(/^\/sections\//),
      ]);
    });
  });
});
