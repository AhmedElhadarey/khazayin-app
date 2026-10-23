/**
 * Unicode directional isolates. Digits, times and versions are inherently LTR;
 * wrapping them in an isolate stops the bidi algorithm reordering them when
 * they sit inside an RTL `Text`.
 */
export const LRI = '⁦'; // Left-to-Right Isolate
export const PDI = '⁩'; // Pop Directional Isolate

/** `text` kept in LTR reading order inside RTL text. */
export function isolateLtr(text: string): string {
  return `${LRI}${text}${PDI}`;
}
