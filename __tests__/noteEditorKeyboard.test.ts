import fs from 'fs';
import path from 'path';

// The note editor is a bottom sheet that auto-focuses its input. A
// KeyboardAvoidingView inside the content-sized sheet only pads the sheet's own
// content — it cannot move the sheet — so the input and «حفظ» ended up behind
// the keyboard. The KAV must wrap the full-screen backdrop instead, so the
// backdrop shrinks above the keyboard and the bottom-anchored sheet rides up.

/** Strip `//` and `/* *\/` comments so prose about the KAV cannot satisfy a check. */
const src = fs
  .readFileSync(path.resolve(__dirname, '..', 'app/note-editor.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const editor = src.slice(
  src.indexOf('export default function NoteEditor'),
  src.indexOf('\n}\n', src.indexOf('export default function NoteEditor')),
);
// The component's own return sits at two-space indent; the recent-notes map
// has a nested `return (` deeper in.
const rendered = editor.slice(editor.indexOf('\n  return (') + 3);

describe('note editor keyboard avoidance', () => {
  it('renders a KeyboardAvoidingView, padding on iOS, as its outermost element', () => {
    // `([^>]*)>` stops at the first `>`, so a prop value containing one (e.g.
    // an arrow function) would cut the captured attributes short.
    const outer = rendered.match(/^return \(\s*<(\w+)([^>]*)>/);
    expect(outer?.[1]).toBe('KeyboardAvoidingView');
    expect(outer?.[2]).toMatch(/behavior=\{[^}]*'padding'/);
  });

  it('puts the dismiss backdrop inside it', () => {
    const open = rendered.indexOf('<KeyboardAvoidingView');
    const backdrop = rendered.indexOf('accessibilityLabel="إغلاق"');
    const close = rendered.lastIndexOf('</KeyboardAvoidingView>');
    expect(open).toBeGreaterThanOrEqual(0);
    expect(backdrop).toBeGreaterThan(open);
    expect(close).toBeGreaterThan(backdrop);
  });

  it('has exactly one KeyboardAvoidingView, so none is left inside the sheet', () =>
    expect(src.match(/<KeyboardAvoidingView/g)).toHaveLength(1));
});
