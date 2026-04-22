import { CloseIcon, PillButton } from '@/components/khazain';
import { KhazainColors } from '@/constants/theme';
import { useNotesStore } from '@/store/notesStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Params = { id?: string; title?: string };

export default function NoteEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const editingId = typeof params.id === 'string' ? params.id : undefined;
  const seedTitle = typeof params.title === 'string' ? params.title : undefined;

  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const existing = useNotesStore((s) =>
    editingId ? s.notes.find((n) => n.id === editingId) : undefined,
  );

  const [title, setTitle] = useState(existing?.title ?? seedTitle ?? '');
  const [body, setBody] = useState(existing?.body ?? '');

  // Guard against the note being deleted externally while the editor is open.
  const didUnmount = useRef(false);
  useEffect(() => () => {
    didUnmount.current = true;
  }, []);

  const save = () => {
    const clean = { title: title.trim(), body: body.trim() };
    if (!clean.title && !clean.body) {
      router.back();
      return;
    }
    if (editingId) {
      updateNote(editingId, clean);
    } else {
      addNote(clean.title || 'ملاحظة بلا عنوان', clean.body);
    }
    router.back();
  };

  const confirmDelete = () => {
    if (!editingId) return;
    Alert.alert('حذف الملاحظة', 'هل تريد حذف هذه الملاحظة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          deleteNote(editingId);
          if (!didUnmount.current) router.back();
        },
      },
    ]);
  };

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
        <Text style={styles.screenTitle}>
          {editingId ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>العنوان</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="اكتب عنواناً.."
            placeholderTextColor={KhazainColors.inkPlaceholder}
            style={styles.titleInput}
            textAlign="right"
          />
          <Text style={styles.label}>الملاحظة</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="اكتب ملاحظتك هنا..."
            placeholderTextColor={KhazainColors.inkPlaceholder}
            style={styles.bodyInput}
            textAlign="right"
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        <View style={styles.actions}>
          {editingId ? (
            <PillButton
              label="حذف"
              variant="ghost"
              size="lg"
              onPress={confirmDelete}
              labelStyle={{ color: '#D94040' }}
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <PillButton label="حفظ" variant="navy" size="lg" onPress={save} style={{ flex: 2 }} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  body: {
    padding: 16,
    gap: 10,
  },
  label: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '600',
    color: KhazainColors.ink500,
    writingDirection: 'rtl',
    textAlign: 'right',
    marginTop: 8,
  },
  titleInput: {
    backgroundColor: KhazainColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'TheSansArabic',
    fontSize: 16,
    fontWeight: '600',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
  },
  bodyInput: {
    backgroundColor: KhazainColors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink900,
    minHeight: 240,
    writingDirection: 'rtl',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: KhazainColors.cardBorder,
    backgroundColor: KhazainColors.cream50,
  },
});
