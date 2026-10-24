import fs from 'fs';
import path from 'path';
import { FOUNDATION_CONTACT, isPlaceholder } from '@/constants/foundationContact';
import { MORE_EXTERNAL_URLS } from '@/data/content/sections';
import { ONBOARDING_CHANNELS } from '@/constants/settings';
import {
  contactRowsFor,
  visibleYoutubeRows,
} from '@/services/foundationLinks';

const read = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

describe('FOUNDATION_CONTACT', () => {
  it('is frozen and carries the verified channels', () => {
    expect(Object.isFrozen(FOUNDATION_CONTACT)).toBe(true);
    expect(FOUNDATION_CONTACT.name).toBe('مؤسسة خزائن الرحمن العلمية');
    expect(FOUNDATION_CONTACT.telegramMain).toBe('https://t.me/Alrahmn');
    expect(FOUNDATION_CONTACT.telegramSecondary).toBe('https://t.me/khazayinsci');
    expect(FOUNDATION_CONTACT.soundcloud).toBe('https://soundcloud.com/khazayin');
    expect(FOUNDATION_CONTACT.youtube).toBe('https://youtube.com/@khazayin');
  });

  it('marks unverified values with the PLACEHOLDER_ prefix and nothing else does', () => {
    expect(isPlaceholder(FOUNDATION_CONTACT.email)).toBe(true);
    expect(isPlaceholder(FOUNDATION_CONTACT.phoneE164)).toBe(true);
    expect(isPlaceholder(FOUNDATION_CONTACT.phoneDisplayAr)).toBe(true);
    FOUNDATION_CONTACT.scholarYoutube.forEach((s) => expect(isPlaceholder(s.url)).toBe(true));
    expect(isPlaceholder(FOUNDATION_CONTACT.website)).toBe(false);
    expect(isPlaceholder(FOUNDATION_CONTACT.whatsappChannel)).toBe(false);
  });

  it('keeps the release-gate contract: the gate counts exactly the unverified values', () => {
    const values = [
      ...Object.values(FOUNDATION_CONTACT).filter((v): v is string => typeof v === 'string'),
      ...FOUNDATION_CONTACT.scholarYoutube.flatMap((s) => [s.title, s.url]),
    ];
    const expected = values.filter(isPlaceholder).length;
    expect(expected).toBeGreaterThan(0);
    const gateCount = (read('constants/foundationContact.ts').match(/'PLACEHOLDER_[A-Z0-9_]+'/g) ?? []).length;
    expect(gateCount).toBe(expected);
  });
});

describe('consumers read the single source', () => {
  it('MORE_EXTERNAL_URLS', () => {
    expect(MORE_EXTERNAL_URLS.web).toBe(FOUNDATION_CONTACT.website);
    expect(MORE_EXTERNAL_URLS.whatsapp).toBe(FOUNDATION_CONTACT.whatsappChannel);
    expect(MORE_EXTERNAL_URLS.soundcloud).toBe(FOUNDATION_CONTACT.soundcloud);
  });
  it('ONBOARDING_CHANNELS', () => {
    expect(ONBOARDING_CHANNELS.telegramUrl).toBe(FOUNDATION_CONTACT.telegramMain);
    expect(ONBOARDING_CHANNELS.youtubeUrl).toBe(FOUNDATION_CONTACT.youtube);
    expect(ONBOARDING_CHANNELS.whatsappUrl).toBe(FOUNDATION_CONTACT.whatsappChannel);
  });
  it('no screen re-declares a Foundation URL or the old wrong name', () => {
    for (const f of [
      'app/telegram-sheet.tsx',
      'app/youtube-sheet.tsx',
      'app/share-sheet.tsx',
      'app/(tabs)/more/contact.tsx',
      'constants/settings.ts',
      'data/content/sections.ts',
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/t\.me\/(khazain|Alrahmn|khazayinsci)/);
      expect(src).not.toContain('soundcloud.com/khazain');
      expect(src).not.toContain('wa.me/\'');
      expect(src).not.toContain('العالمية');
    }
  });
});

describe('visibleYoutubeRows', () => {
  it('puts the Foundation channel first, then scholars', () => {
    const { rows, showMoreFooter } = visibleYoutubeRows(true);
    expect(showMoreFooter).toBe(true);
    expect(rows[0].url).toBe(FOUNDATION_CONTACT.youtube);
    expect(rows[0].title).toBe(`قناة ${FOUNDATION_CONTACT.name}`);
    expect(rows).toHaveLength(1 + FOUNDATION_CONTACT.scholarYoutube.length);
  });
  it('drops placeholder scholar rows in production', () => {
    const { rows, showMoreFooter } = visibleYoutubeRows(false);
    expect(showMoreFooter).toBe(false);
    expect(rows).toEqual([
      { title: 'قناة مؤسسة خزائن الرحمن العلمية', url: FOUNDATION_CONTACT.youtube },
    ]);
  });
  it('keeps verified scholar rows in production', () => {
    const { rows } = visibleYoutubeRows(false, {
      ...FOUNDATION_CONTACT,
      scholarYoutube: [{ title: 'x', url: 'https://youtube.com/@x' }],
    });
    expect(rows.map((r) => r.url)).toEqual([FOUNDATION_CONTACT.youtube, 'https://youtube.com/@x']);
  });
});

describe('contactRowsFor', () => {
  it('hides unverified rows in production and asks for the channel fallback', () => {
    expect(contactRowsFor(false)).toEqual({ rows: [], showChannelFallback: true });
  });
  it('shows them flagged in dev, without a fallback', () => {
    const r = contactRowsFor(true);
    expect(r.rows.map((x) => [x.kind, x.unavailable])).toEqual([
      ['whatsapp', true],
      ['email', true],
    ]);
    expect(r.showChannelFallback).toBe(false);
  });
  it('shows a verified row in production, hides the other, no fallback', () => {
    const r = contactRowsFor(false, {
      ...FOUNDATION_CONTACT,
      email: 'info@example.org',
    });
    expect(r.rows).toEqual([
      { kind: 'email', url: 'mailto:info@example.org', subtitle: 'info@example.org', unavailable: false },
    ]);
    expect(r.showChannelFallback).toBe(false);
  });
  it('builds wa.me from the verified phone', () => {
    const r = contactRowsFor(false, {
      ...FOUNDATION_CONTACT,
      phoneE164: '201000000000',
      phoneDisplayAr: '٠١٠٠٠٠٠٠٠٠٠٠',
    });
    expect(r.rows[0]).toEqual({
      kind: 'whatsapp',
      url: 'https://wa.me/201000000000',
      subtitle: '٠١٠٠٠٠٠٠٠٠٠٠',
      unavailable: false,
    });
  });
});
