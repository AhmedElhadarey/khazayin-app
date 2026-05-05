import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { formatRelativeAr, Note, useNotesStore } from '@/store/notesStore';
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
  const notes = useNotesStore((s) => s.notes);

  // expo-router typed routes haven't regenerated for the new modals yet — cast to any.
  const openExisting = (id: string) =>
    router.push({ pathname: '/note-editor' as any, params: { id } });

  const close = () => router.back();

  return (
    <Pressable accessibilityLabel="إغلاق" onPress={close} style={styles.backdrop}>
      <Pressable onPress={() => {}} style={styles.sheetOuter}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
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
                <NoteRow note={item} onPress={() => openExisting(item.id)} />
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

function NoteRow({ note, onPress }: { note: Note; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        KhazainShadows.card,
        { transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
    >
      {/*
        JSX-first → visual RIGHT under forceRTL+row. Figma shows title on the RIGHT,
        relative time on the LEFT — so title goes first.
      */}
      <Text style={styles.rowTitle} numberOfLines={1}>
        {note.title || 'ملاحظة بلا عنوان'}
      </Text>
      <Text style={styles.rowTime} numberOfLines={1}>
        {formatRelativeAr(note.updatedAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20,30,30,0.35)',
    justifyContent: 'flex-end',
  },
  sheetOuter: {
    backgroundColor: KhazainColors.pageBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    minHeight: '50%',
    overflow: 'hidden',
  },
  handleWrap: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  handle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120,100,80,0.25)',
  },
  sheetTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingTop: 4,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowTitle: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowTime: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink400,
    writingDirection: 'rtl',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
  },
  emptyBody: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    color: KhazainColors.ink500,
    lineHeight: 20,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
