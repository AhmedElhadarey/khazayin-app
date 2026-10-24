/**
 * services/foundationLinks.ts
 * ---------------------------
 * Pure visibility rules for Foundation links whose values may still be
 * unverified (see constants/foundationContact.ts). Kept free of React Native so
 * the decisions are unit-testable without a renderer.
 *
 * Rule everywhere: an unverified value is never opened. In production its row
 * is hidden; in __DEV__ it is shown so the screen still looks populated.
 */
import {
  FOUNDATION_CONTACT,
  isPlaceholder,
  type FoundationContact,
  type ScholarChannel,
} from '@/constants/foundationContact';

/** Title of the Foundation's own channel row (always first, always verified). */
export const FOUNDATION_YOUTUBE_TITLE = `قناة ${FOUNDATION_CONTACT.name}`;

export type YoutubeRows = {
  rows: ScholarChannel[];
  /** Dev only: the "and 60 more channels" footer belongs with the stand-in rows. */
  showMoreFooter: boolean;
};

/** Foundation channel first, then scholar channels that may be shown. */
export function visibleYoutubeRows(dev: boolean, contact: FoundationContact = FOUNDATION_CONTACT): YoutubeRows {
  const scholars = contact.scholarYoutube.filter((s) => dev || !isPlaceholder(s.url));
  return {
    rows: [{ title: FOUNDATION_YOUTUBE_TITLE, url: contact.youtube }, ...scholars],
    showMoreFooter: dev,
  };
}

export type ContactRow = {
  kind: 'whatsapp' | 'email';
  url: string;
  subtitle: string;
  /** True when the value is unverified: tapping must not open anything. */
  unavailable: boolean;
};

export type ContactRows = {
  rows: ContactRow[];
  /** Production with nothing verified: point at the official channels instead. */
  showChannelFallback: boolean;
};

export function contactRowsFor(dev: boolean, contact: FoundationContact = FOUNDATION_CONTACT): ContactRows {
  const all: ContactRow[] = [
    {
      kind: 'whatsapp',
      url: `https://wa.me/${contact.phoneE164}`,
      subtitle: contact.phoneDisplayAr,
      unavailable: isPlaceholder(contact.phoneE164) || isPlaceholder(contact.phoneDisplayAr),
    },
    {
      kind: 'email',
      url: `mailto:${contact.email}`,
      subtitle: contact.email,
      unavailable: isPlaceholder(contact.email),
    },
  ];
  const rows = all.filter((r) => dev || !r.unavailable);
  return { rows, showChannelFallback: !dev && rows.length === 0 };
}
