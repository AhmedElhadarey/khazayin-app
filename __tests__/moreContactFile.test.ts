import fs from 'fs';
import path from 'path';
import { KhazainShadows } from '@/constants/theme';

const src = fs.readFileSync(path.join(__dirname, '../app/(tabs)/more/contact.tsx'), 'utf8');

describe('contact screen is honest (store 2.3.1)', () => {
  it('has no fake form: no inputs, no send path', () => {
    expect(src).not.toContain('TextInput');
    expect(src).not.toContain('CONTACT_SENT_ALERT');
    expect(src).not.toContain('تم الإرسال');
    expect(src).not.toContain('contactForm');
  });
  it('reads its values from the Foundation contact module', () => {
    expect(src).toContain('contactRowsFor(__DEV__)');
    expect(src).toContain('FOUNDATION_CONTACT.telegramMain');
  });
});

describe('file shadows as boxShadow (MORE-14 / GLOBAL-13)', () => {
  it('input is 0 4 16 at 8%', () => {
    expect(KhazainShadows.input.boxShadow).toBe('0px 4px 16px rgba(0,0,0,0.08)');
  });
  it('listRow is 0 1 2 at 5%', () => {
    expect(KhazainShadows.listRow.boxShadow).toBe('0px 1px 2px rgba(0,0,0,0.05)');
  });
  it('floating bookmark bubble keeps its legacy shadow, not the file boxShadow', () => {
    const t = KhazainShadows.floatingBubble as Record<string, unknown>;
    expect(t).toMatchObject({ shadowOpacity: 0.08, shadowRadius: 16, elevation: 1 });
    expect(t).not.toHaveProperty('boxShadow');
    const bm = fs.readFileSync(path.join(__dirname, '../components/khazain/primitives/BookmarkButton.tsx'), 'utf8');
    expect(bm).toContain('KhazainShadows.floatingBubble');
    expect(bm).not.toContain('KhazainShadows.input');
  });
  it.each(['input', 'listRow'] as const)('%s carries no legacy shadow or elevation', (k) => {
    const t = KhazainShadows[k] as Record<string, unknown>;
    for (const key of ['elevation', 'shadowColor', 'shadowOpacity', 'shadowRadius', 'shadowOffset']) {
      expect(t).not.toHaveProperty(key);
    }
  });
});
