import { ChevronIcon, CloseIcon, PillButton } from '@/components/khazain';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import { formatRelativeAr, Note, useNotesStore } from '@/store/notesStore';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotesViewer() {
  const router = useRouter();
  const notes = useNotesStore((s) => s.notes);

  // expo-router typed routes haven't regenerated for the new modals yet — cast to any.
  const openNew = () => router.push('/note-editor' as any);
  const openExisting = (id: string) =>
    router.push({ pathname: '/note-editor' as any, params: { id } });

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityLabel="إغلاق"
          style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <CloseIcon size={20} color={KhazainColors.navy800} />
        </Pressable>
        <Text style={styles.screenTitle}>ملاحظاتي</Text>
        <View style={{ width: 36 }} />
      </View>

      {notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>لا توجد ملاحظات بعد</Text>
          <Text style={styles.emptyBody}>
            ابدأ بتدوين خواطرك وأفكارك. ملاحظاتك تُحفظ محلياً على جهازك.
          </Text>
          <PillButton label="ملاحظة جديدة" variant="navy" size="lg" onPress={openNew} />
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
          ListFooterComponent={<View style={{ height: 20 }} />}
        />
      )}

      {notes.length > 0 ? (
        <View style={styles.fab}>
          <PillButton label="ملاحظة جديدة" variant="navy" size="lg" onPress={openNew} />
        </View>
      ) : null}
    </SafeAreaView>
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
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {note.title || 'ملاحظة بلا عنوان'}
        </Text>
        {note.body ? (
          <Text style={styles.rowPreview} numberOfLines={2}>
            {note.body}
          </Text>
        ) : null}
        <Text style={styles.rowTime}>{formatRelativeAr(note.updatedAt)}</Text>
      </View>
      <ChevronIcon size={14} color={KhazainColors.ink400} direction="start" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: 'rgba(141,107,52,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    flex: 1,
    fontFamily: 'Amiri-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: KhazainColors.navy800,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  listContent: {
    padding: 14,
    paddingBottom: 90,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  rowTitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 15,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowPreview: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink500,
    lineHeight: 18,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  rowTime: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    color: KhazainColors.ink400,
    marginTop: 2,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
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
    marginBottom: 10,
  },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
});
