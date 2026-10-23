import { PHYSICAL_BOX, PHYSICAL_ROW, SHEET_CHROME } from '@/constants/layout';
import { SheetHandle } from '@/components/khazain/sheets';
import { sheetColumn } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { textStyle } from '@/constants/typography';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { linkedNoteRow, NoteRefLink, noteRowA11y } from '@/components/khazain/notes';
import { startLecturePlayback } from '@/services/lecturePlayback';
import { viewerSourceAction } from '@/services/noteNavigation';
import { Note, useNotesStore } from '@/store/notesStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Bottom-sheet styled notes viewer (Figma page-08).
// Visual contract:
//   - Top: grey handle pill, then centered title "عرض الملاحظات"
//   - Vertical list of one-line note rows: title (right) + relative time (left)
//   - Tapping a row opens it in the editor
//   - No FAB / no close button — backdrop tap or handle drag (visual cue only) dismisses
export default function NotesViewer() {
  const router = useRouter();
  const { width, sideInsets } = useResponsiveLayout();
  const notes = useNotesStore((s) => s.notes);

  // expo-router typed routes haven't regenerated for the new modals yet — cast to any.
  const openExisting = (id: string) =>
    router.push({ pathname: '/note-editor' as any, params: { id } });

  const close = () => router.back();

  // Close the sheet, then navigate. The viewer owns its own dismissal; the
  // target runner never dismisses anything.
  const openSource = (note: Note) =>
    viewerSourceAction(note.ref, {
      back: () => router.back(),
      navigate: (href) => router.navigate(href as any),
      play: startLecturePlayback,
    });

  return (
    <Pressable accessibilityLabel="إغلاق" onPress={close} style={styles.backdrop}>
      <Pressable
        onPress={() => {}}
        style={[styles.sheetOuter, sheetColumn(width, sideInsets)]}
      >
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <View style={styles.handleWrap}>
            <SheetHandle />
          </View>
          <Text style={styles.sheetTitle}>عرض الملاحظات</Text>

          {notes.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>لا توجد ملاحظات بعد</Text>
              <Text style={styles.emptyBody}>
                ابدأ بتدوين خواطرك وأفكارك. ملاحظاتك تُحفظ محلياً على جهازك.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              keyExtractor={(n) => n.id}
              renderItem={({ item }) => (
                <NoteRow
                  note={item}
                  onPress={() => openExisting(item.id)}
                  onOpenSource={() => openSource(item)}
                />
              )}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              ListFooterComponent={<View style={{ height: 12 }} />}
              showsVerticalScrollIndicator={false}
            />
          )}
        </SafeAreaView>
      </Pressable>
    </Pressable>
  );
}

function NoteRow({
  note,
  onPress,
  onOpenSource,
}: {
  note: Note;
  onPress: () => void;
  onOpenSource: () => void;
}) {
  const row = linkedNoteRow(note);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      {...noteRowA11y(row, onOpenSource)}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/* Physical left -> right: relative time, then title + source link. */}
      <Text style={styles.rowTime} numberOfLines={1}>
        {row.time}
      </Text>
      <View style={styles.rowColumn}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {row.title}
        </Text>
        {row.label ? (
          <NoteRefLink label={row.label} onPress={row.linkable ? onOpenSource : undefined} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: SHEET_CHROME.backdrop,
    justifyContent: 'flex-end',
  },
  sheetOuter: {
    backgroundColor: KhazainColors.pageBg,
    borderTopLeftRadius: SHEET_CHROME.topRadius,
    borderTopRightRadius: SHEET_CHROME.topRadius,
    maxHeight: '88%',
    minHeight: '50%',
    overflow: 'hidden',
  },
  handleWrap: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  sheetTitle: {
    ...textStyle('bodyLarge', { color: KhazainColors.ink900, textAlign: 'center' }),
    paddingTop: 4,
    paddingBottom: 16,
  },
  listContent: {
    ...PHYSICAL_BOX,
    paddingHorizontal: SHEET_CHROME.paddingHorizontal,
    paddingBottom: 12,
  },
  row: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowColumn: { flex: 1, gap: 2 },
  rowTitle: textStyle('cardTitle', { color: KhazainColors.ink900 }),
  rowTime: textStyle('caption', { color: KhazainColors.ink400 }),
  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: textStyle('bodyLarge', { color: KhazainColors.navy800 }),
  emptyBody: textStyle('bodyCompact', { color: KhazainColors.ink500, textAlign: 'center' }),
});
