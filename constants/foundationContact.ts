/**
 * Foundation contact details and official channels — the single source.
 *
 * Every screen that opens a Foundation link or shows a contact value reads it
 * from here; no other file may carry these literals.
 *
 * RELEASE-GATE CONTRACT: a value that has NOT been verified with the Foundation
 * is a quoted string starting with `PLACEHOLDER_` followed by a suffix naming
 * the field. The store-release gate (scripts/store/check-release-config.mjs)
 * reads this file as text and counts quoted values matching
 * /'PLACEHOLDER_[A-Z0-9_]+'/g; it stays open while the count is above zero.
 * Comments are free to mention the word: only quoted values count. Never
 * invent a plausible value for an unverified field; replace the whole string
 * with the confirmed value to clear it.
 *
 * Verified 2026-10-24 against the khazayin.com footer: name, website, both
 * Telegram channels, the WhatsApp channel, SoundCloud, YouTube, Instagram, X.
 * Unverified: email, phone, and the scholar YouTube channels.
 */

/** Marker carried by every unverified value; see the release-gate contract. */
export const UNVERIFIED_MARKER = 'PLACEHOLDER_';

/** True when `value` is an unverified stand-in and must never be opened or shown. */
export function isPlaceholder(value: string): boolean {
  return value.startsWith(UNVERIFIED_MARKER);
}

export type ScholarChannel = {
  readonly title: string;
  readonly url: string;
};

export type ContactField =
  | 'name'
  | 'website'
  | 'telegramMain'
  | 'telegramSecondary'
  | 'whatsappChannel'
  | 'soundcloud'
  | 'youtube'
  | 'instagram'
  | 'x'
  | 'email'
  | 'phoneE164'
  | 'phoneDisplayAr';

export type FoundationContact = Readonly<Record<ContactField, string>> & {
  readonly scholarYoutube: readonly ScholarChannel[];
};

export const FOUNDATION_CONTACT: FoundationContact = Object.freeze({
  name: 'مؤسسة خزائن الرحمن العلمية',
  website: 'https://khazayin.com',
  telegramMain: 'https://t.me/Alrahmn',
  telegramSecondary: 'https://t.me/khazayinsci',
  whatsappChannel: 'https://whatsapp.com/channel/0029Va5gnMH7dmec2xxICO0a',
  soundcloud: 'https://soundcloud.com/khazayin',
  youtube: 'https://youtube.com/@khazayin',
  instagram: 'https://www.instagram.com/khazayinalrahman',
  x: 'https://twitter.com/khazayinalrrahm',
  email: 'PLACEHOLDER_CONTACT_EMAIL',
  /** Digits only with country code, no `+`: what `wa.me/<n>` needs. */
  phoneE164: 'PLACEHOLDER_CONTACT_PHONE_E164',
  /** The number as it is displayed, in Arabic-Indic digits. */
  phoneDisplayAr: 'PLACEHOLDER_CONTACT_PHONE_DISPLAY',
  scholarYoutube: Object.freeze([
    Object.freeze({ title: 'قناة الشيخ محمد العريفي', url: 'PLACEHOLDER_YOUTUBE_ALAREFE' }),
    Object.freeze({ title: 'قناة الشيخ عبد الرحمن السديس', url: 'PLACEHOLDER_YOUTUBE_ALSUDAIS' }),
    Object.freeze({ title: 'قناة الشيخ صالح المغامسي', url: 'PLACEHOLDER_YOUTUBE_ALMAGHAMSI' }),
    Object.freeze({ title: 'قناة الشيخ خالد الراشد', url: 'PLACEHOLDER_YOUTUBE_ALRASHED' }),
    Object.freeze({ title: 'قناة الشيخ نبيل العوضي', url: 'PLACEHOLDER_YOUTUBE_ALAWADI' }),
  ]),
});
