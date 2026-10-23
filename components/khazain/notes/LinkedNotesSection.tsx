import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
import type { Note } from '@/store/notesStore';

import { linkedNoteRow, noteRowA11y } from './linkedNotesModel';
import { NoteRefLink } from './NoteRefLink';

type Props = {
  title?: string;
  notes: readonly Note[];
  onOpenNote: (id: string) => void;
  /** Tapping the label link; omit for a static label. */
  onOpenSource?: (note: Note) => void;
  /** Drop the section's own side padding when the parent already pads. */
  flush?: boolean;
};

/**
 * Notes linked to the content on screen. Renders nothing when there are none,
 * so a screen without notes keeps its Figma layout.
 */
export function LinkedNotesSection({ title, notes, onOpenNote, onOpenSource, flush }: Props) {
  const oneLine = useLineClamp(1);
  if (notes.length === 0) return null;
  return (
    <View style={[styles.box, flush && styles.flush]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {notes.map((note) => {
        const row = linkedNoteRow(note);
        const openSource = onOpenSource ? () => onOpenSource(note) : undefined;
        return (
          <Pressable
            key={row.id}
            onPress={() => onOpenNote(row.id)}
            accessibilityRole="button"
            {...noteRowA11y(row, openSource)}
            style={styles.row}
          >
            {/* Physical left -> right: time, then title + source label. */}
            <Text style={styles.time} numberOfLines={oneLine}>
              {row.time}
            </Text>
            <View style={styles.column}>
              <Text style={styles.noteTitle} numberOfLines={oneLine}>
                {row.title}
              </Text>
              {row.label ? (
                <NoteRefLink
                  label={row.label}
                  onPress={row.linkable ? openSource : undefined}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { ...PHYSICAL_BOX, paddingHorizontal: 18, paddingVertical: 12, gap: 10 },
  flush: { paddingHorizontal: 0, paddingVertical: 0 },
  title: { ...RTL_TEXT, ...textStyle('sectionTitle', { color: KhazainColors.ink900 }) },
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  time: textStyle('caption', { color: KhazainColors.ink400 }),
  column: { flex: 1, gap: 2 },
  noteTitle: { ...RTL_TEXT, ...textStyle('cardTitle', { color: KhazainColors.ink900 }) },
});
