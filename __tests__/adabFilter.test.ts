import { checkText } from '@/services/community/adabFilter';
import { foldArabic, normalize } from '@/services/search/normalize';
import { ADAB_TERMS } from '@/data/community/adabTerms';
import { ADAB_ALLOWLIST } from './fixtures/adabAllowlist';

const OK = { ok: true, review: false };
const stripTashkeel = (s: string) => s.replace(/[ً-ْٰ]/g, '');
const ARABIC_LETTER = /[ء-ي]/g;
const phrase = (tokens: readonly string[]) => tokens.join(' ');
const blocks = ADAB_TERMS.filter((t) => t.tier === 'block');
const reviews = ADAB_TERMS.filter((t) => t.tier === 'review');

describe('adab allowlist', () => {
  it.each(ADAB_ALLOWLIST.map((p) => [p]))('passes with tashkeel: %s', (p) => {
    expect(checkText(p, 'post')).toEqual(OK);
  });
  it.each(ADAB_ALLOWLIST.map((p) => [stripTashkeel(p)]))('passes without tashkeel: %s', (p) => {
    expect(checkText(p, 'post')).toEqual(OK);
  });
});

describe('adab folds', () => {
  const blockPhrases = blocks.map((t) => [phrase(t.tokens)]);

  it('has block and review placeholders', () => {
    expect(blocks.length).toBeGreaterThan(0);
    expect(reviews.length).toBeGreaterThan(0);
  });

  it.each(blockPhrases)('blocks the plain entry: %s', (p) => {
    expect(checkText(p, 'post')).toEqual({ ok: false, reason: 'term' });
  });

  it.each(blockPhrases)('blocks through bidi and zero-width controls: %s', (p) => {
    const wrapped = `‏${p.replace(/ /g, '‌ ⁦')}⁩‎`;
    expect(checkText(wrapped, 'post')).toEqual({ ok: false, reason: 'term' });
  });

  it.each(blockPhrases)('blocks with Persian ک / ی: %s', (p) => {
    expect(checkText(p.replace(/ك/g, 'ک').replace(/ي/g, 'ی'), 'post')).toEqual({
      ok: false,
      reason: 'term',
    });
  });

  it.each([['ؐ'], ['ٓ'], ['ٟ'], ['ۖ'], ['ۭ']])(
    'blocks with the mark U+%s inserted',
    (mark) => {
      const p = phrase(blocks[0].tokens).replace(ARABIC_LETTER, (m) => m + mark);
      expect(checkText(p, 'post')).toEqual({ ok: false, reason: 'term' });
    },
  );

  it.each(blockPhrases)('blocks with a letter stretched x4: %s', (p) => {
    expect(checkText(p.replace(ARABIC_LETTER, (m) => m.repeat(4)), 'post')).toEqual({
      ok: false,
      reason: 'term',
    });
  });

  it('blocks with a و or ال clitic on the last token', () => {
    const [first, ...rest] = blocks[0].tokens;
    const last = rest[rest.length - 1];
    const lead = rest.slice(0, -1);
    for (const clitic of ['و', 'ال']) {
      expect(checkText(phrase([first, ...lead, clitic + last]), 'post')).toEqual({
        ok: false,
        reason: 'term',
      });
    }
  });

  it.each(reviews.map((t) => [phrase(t.tokens)]))('flags a review entry: %s', (p) => {
    expect(checkText(p, 'post')).toEqual({ ok: true, review: true });
  });
});

describe('review hold', () => {
  // known review hold; scholars clear it in moderation
  it('holds a hadith that quotes the vocative', () => {
    expect(checkText('إذا قال الرجل لأخيه يا كافر فقد باء بها أحدهما', 'post')).toEqual({
      ok: true,
      review: true,
    });
  });
});

describe('consonant pairs', () => {
  it.each([['الله'], ['اللغة'], ['للعلماء'], ['اللّه']])('%s is ok', (p) => {
    expect(checkText(p, 'post')).toEqual(OK);
  });
});

describe('links', () => {
  it.each([['https://x.co'], ['www.example.com'], ['t.me/abc'], ['wa.me/2010'], ['@abcd'], ['a@b.com']])(
    '%s is a link',
    (p) => {
      expect(checkText(p, 'post')).toEqual({ ok: false, reason: 'link' });
    },
  );
});

describe('phones', () => {
  it.each([
    ['+201012345678'],
    ['00966512345678'],
    ['010 1234 5678'],
    ['٠١٠١٢٣٤٥٦٧٨'],
    ['۰۱۰۱۲۳۴۵۶۷۸'],
    ['الصفحة 12 01012345678'],
    ['5 01012345678'],
  ])('%s is a phone', (p) => {
    expect(checkText(p, 'post')).toEqual({ ok: false, reason: 'phone' });
  });
  it.each([['٢:٢٥٥'], ['1447/03/15'], ['2026-10-22'], ['123456789']])('%s is ok', (p) => {
    expect(checkText(p, 'post')).toEqual(OK);
  });
});

describe('repetition', () => {
  it('flags a token above 30% of 10 qualifying tokens', () => {
    const t = 'سلام سلام سلام سلام كتاب مسجد قرآن فقهاء حديث تفسير';
    expect(checkText(t, 'post')).toEqual({ ok: false, reason: 'repetition' });
  });
  it('ignores stopwords that carry a clitic', () => {
    const t = 'والله والله والله والله أحببت درسكم الجميل وأسأل ربنا التوفيق للجميع';
    expect(checkText(t, 'post')).toEqual(OK);
  });
  it('lets a lone لا through', () => expect(checkText('لا', 'post')).toEqual(OK));
  it('ignores stopwords', () => {
    expect(checkText(Array(12).fill('الله').join(' '), 'post')).toEqual(OK);
  });
  it('stays below the 10-token threshold', () => {
    const t = 'سلام سلام سلام سلام سلام كتاب مسجد قرآن فقهاء';
    expect(checkText(t, 'post')).toEqual(OK);
  });
});

describe('lengths', () => {
  it('empty post', () => expect(checkText('', 'post')).toEqual({ ok: false, reason: 'empty' }));
  it('whitespace-only post', () =>
    expect(checkText('  \n ', 'post')).toEqual({ ok: false, reason: 'empty' }));
  it('too long post', () =>
    expect(checkText('ب'.repeat(1001), 'post')).toEqual({ ok: false, reason: 'tooLong' }));
  it('too short name', () =>
    expect(checkText('ب', 'name')).toEqual({ ok: false, reason: 'tooShort' }));
  it('too long name', () =>
    expect(checkText('ب'.repeat(25), 'name')).toEqual({ ok: false, reason: 'tooLong' }));
  it('empty report note is allowed', () => expect(checkText('', 'reportNote')).toEqual(OK));
});

describe('foldArabic flag', () => {
  it('keeps ابن when ibnBin is off', () => {
    expect(foldArabic('ابن باز', { ibnBin: false })).toBe('ابن باز');
  });
  it('search normalize still rewrites it', () => expect(normalize('ابن باز')).toBe('بن باز'));
});
