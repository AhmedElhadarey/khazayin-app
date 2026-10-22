/**
 * Where the scholar profile renders the scholar's linked notes. In the
 * landscape-tablet split the side panel owns them (the lecture list keeps no
 * footer); everywhere else they stay under the lectures, as on phones.
 * Exactly one of the two places renders them in either mode.
 */
export type ScholarNotesPlacement = 'panel' | 'footer';

export function scholarNotesPlacement(split: boolean): ScholarNotesPlacement {
  return split ? 'panel' : 'footer';
}
