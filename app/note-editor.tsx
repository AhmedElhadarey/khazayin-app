import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { formatRelativeAr, useNotesStore } from '@/store/notesStore';
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
import Svg, { Path } from 'react-native-svg';

type Params = { id?: string; title?: string };

// Bottom-sheet styled note editor (Figma page-07).
// Visual contract:
//   - Top: grey handle pill, then right-aligned title "إضافة ملاحظة" / "تعديل الملاحظة"
//   - Single body input (placeholder "اكتب ملاحظتك هنا...")
//   - Footer toolbar: حفظ (navy pill) on the LEFT, format buttons B/I/list on the RIGHT
//   - "آخر الملاحظات" header + last 2 note rows below
//   - In edit mode: a small "حذف" link replaces "آخر الملاحظات"
export default function NoteEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const editingId = typeof params.id === 'string' ? params.id : undefined;
  const seedTitle = typeof params.title === 'string' ? params.title : undefined;

  const addNote = useNotesStore((s) => s.addNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const deleteNote = useNotesStore((s) => s.deleteNote);
  const allNotes = useNotesStore((s) => s.notes);
  const existing = useNotesStore((s) =>
    editingId ? s.notes.find((n) => n.id === editingId) : undefined,
  );

  // Body holds the full note text. When creating new notes we derive a short
  // title from the first line; when editing we preserve the stored title.
  const [body, setBody] = useState(
    existing?.body || seedTitle || '',
  );
  // Preserved-title state for edit mode; we keep it in sync silently so the
  // notesStore public API (title + body) is unchanged.
  const titleRef = useRef<string>(existing?.title ?? seedTitle ?? '');

  const didUnmount = useRef(false);
  useEffect(() => () => {
    didUnmount.current = true;
  }, []);

  const recentNotes = allNotes
    .filter((n) => n.id !== editingId) // exclude the one we are editing
    .slice(0, 2);

  const close = () => router.back();

  const save = () => {
    const cleanBody = body.trim();
    if (!cleanBody) {
      close();
      return;
    }
    // Derive a title from the first line / first ~60 chars when creating new notes.
    const derivedTitle =
      titleRef.current.trim() ||
      cleanBody.split('\n')[0].slice(0, 60).trim() ||
      'ملاحظة بلا عنوان';
    if (editingId) {
      updateNote(editingId, { title: derivedTitle, body: cleanBody });
    } else {
      addNote(derivedTitle, cleanBody);
    }
    close();
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
          if (!didUnmount.current) close();
        },
      },
    ]);
  };

  return (
    // Backdrop — tap outside the sheet to dismiss.
    <Pressable accessibilityLabel="إغلاق" onPress={close} style={styles.backdrop}>
      {/* Stop touches from propagating into the dismiss handler. */}
      <Pressable onPress={() => {}} style={styles.sheetOuter}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetTitle}>
                {editingId ? 'تعديل الملاحظة' : 'إضافة ملاحظة'}
              </Text>

              <View style={styles.bodyCard}>
                <TextInput
                  value={body}
                  onChangeText={setBody}
                  placeholder="اكتب ملاحظتك هنا..."
                  placeholderTextColor={KhazainColors.inkPlaceholder}
                  style={styles.bodyInput}
                  textAlign="right"
                  multiline
                  textAlignVertical="top"
                  autoFocus={!editingId}
                />
              </View>

              {/*
                Toolbar: format buttons on the RIGHT (RTL leading), حفظ on the LEFT.
                JSX-first lands visually on the right under forceRTL+row.
              */}
              <View style={styles.toolbar}>
                <FormatBtn bold>B</FormatBtn>
                <FormatBtn italic>I</FormatBtn>
                <FormatBtn>
                  <ListGlyph />
                </FormatBtn>
                <View style={{ flex: 1 }} />
                <Pressable
                  onPress={save}
                  style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityLabel="حفظ الملاحظة"
                >
                  <Text style={styles.saveLabel}>حفظ</Text>
                </Pressable>
              </View>

              {editingId ? (
                <Pressable
                  onPress={confirmDelete}
                  hitSlop={6}
                  style={({ pressed }) => [styles.deleteRow, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityLabel="حذف الملاحظة"
                >
                  <Text style={styles.deleteLabel}>حذف الملاحظة</Text>
                </Pressable>
              ) : null}

              {recentNotes.length > 0 ? (
                <View style={styles.recentBlock}>
                  <Text style={styles.recentHeader}>آخر الملاحظات</Text>
                  {recentNotes.map((n) => (
                    <View key={n.id} style={[styles.recentRow, KhazainShadows.card]}>
                      {/*
                        JSX-first → visual RIGHT under forceRTL+row. Figma shows title on the RIGHT,
                        relative time on the LEFT — so title goes first.
                      */}
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {n.title || 'ملاحظة بلا عنوان'}
                      </Text>
                      <Text style={styles.recentTime} numberOfLines={1}>
                        {formatRelativeAr(n.updatedAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Pressable>
    </Pressable>
  );
}

// ── Inline glyphs / small components ────────────────────────────────────

function FormatBtn({
  children,
  bold,
  italic,
}: {
  children: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [formatStyles.btn, { opacity: pressed ? 0.75 : 1 }]}>
      {typeof children === 'string' ? (
        <Text
          style={[
            formatStyles.label,
            bold && { fontWeight: '700' },
            italic && { fontStyle: 'italic' },
          ]}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

function ListGlyph() {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Path
        d="M2 3h10M2 7h10M2 11h10"
        stroke={KhazainColors.ink700}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  sheetTitle: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.ink900,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  bodyCard: {
    backgroundColor: KhazainColors.cream50,
    borderRadius: KhazainRadius.lg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    minHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  bodyInput: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    color: KhazainColors.ink900,
    minHeight: 110,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveBtn: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    color: '#fff',
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  deleteRow: {
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  deleteLabel: {
    color: '#B43838',
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    fontWeight: '600',
    writingDirection: 'rtl',
  },
  recentBlock: {
    marginTop: 4,
    gap: 8,
  },
  recentHeader: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink700,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  // Recent row visual: title right, relative time left.
  // JSX-first → visual right under forceRTL+row, so we put time first, title after.
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: KhazainColors.cream50,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  recentTime: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    color: KhazainColors.ink400,
    writingDirection: 'rtl',
  },
  recentTitle: {
    flex: 1,
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});

const formatStyles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: KhazainColors.cream50,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'System',
    fontSize: 14,
    color: KhazainColors.ink700,
  },
});
