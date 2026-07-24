/**
 * notesExporter — pure formatting + share-sheet glue for the Settings screen.
 *
 * `formatNotesExport` is a side-effect-free string builder that follows the
 * exact template documented in `specs/002-settings-screen/contracts/notes-exporter.contract.md`.
 *
 * `shareNotes` is the thin glue that invokes the system share sheet. It
 * intentionally swallows errors and dismissals, returning `{ shared: false }`
 * so the caller (settings screen) can stay declarative.
 */

import { Share } from 'react-native';

import { formatRelativeAr, type Note } from '@/store/notesStore';

const TITLE_PLACEHOLDER = 'بدون عنوان';
const EMPTY_BODY = '(لا يوجد محتوى)';
const DIVIDER = '───────';

/** Builds the Arabic text export. Pure function; no side effects. */
export function formatNotesExport(
  notes: ReadonlyArray<Note>,
  now: Date = new Date(),
): string {
  if (notes.length === 0) return '';

  const date = now.toISOString().slice(0, 10);
  const header =
    'خزائن — تصدير الملاحظات\n' +
    `عدد الملاحظات: ${notes.length}\n` +
    `التاريخ: ${date}\n`;

  const body = notes
    .map((n) => {
      const title = n.title.length > 0 ? n.title : TITLE_PLACEHOLDER;
      const content = n.body.length > 0 ? n.body : EMPTY_BODY;
      return (
        `\n── ${title} ──\n` +
        `${formatRelativeAr(n.createdAt)}\n` +
        '\n' +
        `${content}\n` +
        '\n' +
        `${DIVIDER}\n`
      );
    })
    .join('');

  return header + body;
}

/**
 * Builds the export and presents the system share sheet.
 * Returns `{ shared: false }` if there are zero notes OR if the user dismisses
 * the sheet OR if Share throws. Errors are caught and dev-logged.
 */
export async function shareNotes(
  notes: ReadonlyArray<Note>,
): Promise<{ shared: boolean }> {
  if (notes.length === 0) return { shared: false };

  const message = formatNotesExport(notes);

  try {
    const result = await Share.share({ message });
    return { shared: result.action === 'sharedAction' };
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[notesExporter] Share failed', err);
    }
    return { shared: false };
  }
}
