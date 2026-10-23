import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { noteEditorSheetExtra, sheetColumn } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { textStyle } from '@/constants/typography';
import { KhazainColors, KhazainRadius, KhazainShadows } from '@/constants/theme';
import { editorSeed, linkedNoteRow, NoteRefLink } from '@/components/khazain/notes';
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
import Svg, { Path } from 'react-native-svg';

// `id`/`title` predate linked notes; the `ref*` keys are written by
// services/noteRefs.ts `noteRefToParams` (prefixed to avoid clashing with them).
type Params = {
  id?: string;
  title?: string;
  refType?: string;
  refId?: string;
  refPos?: string;
  refPage?: string;
  refLabel?: string;
  refContext?: string;
  refTitle?: string;
  refSpeaker?: string;
};

// Bottom-sheet styled note editor (Figma page-07).
// Visual contract:
//   - Top: grey handle pill, then right-aligned title "إضافة ملاحظة" / "تعديل الملاحظة"
//   - Single body input (placeholder "اكتب ملاحظتك هنا...")
//   - Footer toolbar: حفظ (navy pill) on the LEFT, format buttons B/I/list on the RIGHT
//   - "آخر الملاحظات" header + last 2 note rows below
//   - In edit mode: a small "حذف" link replaces "آخر الملاحظات"
export default function NoteEditor() {
  const router = useRouter();
  const { width, height, sideInsets } = useResponsiveLayout();
  const params = useLocalSearchParams<Params>();
  const editingId = typeof params.id === 'string' ? params.id : undefined;
  const { ref: seedRef, legacyTitle: seedTitle } = editorSeed(params);

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
  const shownRef = existing?.ref ?? seedRef;
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
      addNote(derivedTitle, cleanBody, seedRef);
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
    // Wraps the full-screen backdrop: inside the content-sized sheet a KAV can
    // only pad the sheet's content, not move the sheet above the keyboard.
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Backdrop — tap outside the sheet to dismiss. */}
      <Pressable accessibilityLabel="إغلاق" onPress={close} style={styles.backdrop}>
        {/* Stop touches from propagating into the dismiss handler. */}
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheetOuter,
            sheetColumn(width, sideInsets),
            noteEditorSheetExtra(width, height),
          ]}
        >
          <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
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

              {shownRef ? <NoteRefLink label={`مرتبطة بـ ${shownRef.label}`} /> : null}

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
                Authored physical left -> right inside PHYSICAL_ROW, so the order
                is fixed rather than left to forceRTL's row auto-flip — which
                CLAUDE.md bans because it differs between a cold start, Fast
                Refresh and web.
              */}
              <View style={styles.toolbar}>
                <Pressable
                  onPress={save}
                  style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
                  accessibilityLabel="حفظ الملاحظة"
                >
                  <Text style={styles.saveLabel}>حفظ</Text>
                </Pressable>
                <View style={{ flex: 1 }} />
                <FormatBtn>
                  <ListGlyph />
                </FormatBtn>
                <FormatBtn italic>I</FormatBtn>
                <FormatBtn bold>B</FormatBtn>
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
                  {recentNotes.map((n) => {
                    const row = linkedNoteRow(n);
                    return (
                      <View key={n.id} style={[styles.recentRow, KhazainShadows.card]}>
                        {/* Physical left -> right: relative time, title (+ source label). */}
                        <Text style={styles.recentTime} numberOfLines={1}>
                          {row.time}
                        </Text>
                        <View style={styles.recentColumn}>
                          <Text style={styles.recentTitle} numberOfLines={1}>
                            {row.title}
                          </Text>
                          {row.label ? <NoteRefLink label={row.label} /> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
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
            // The toolbar glyph is the platform 'System' face, not a registered family.
            bold && { fontWeight: '700' }, // fontweight-ok
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
  // The dim lives on the KAV so its padding strip under the keyboard is dimmed
  // too (it shows through translucent keyboard corners and while animating).
  root: {
    flex: 1,
    backgroundColor: 'rgba(20,30,30,0.35)',
  },
  backdrop: {
    flex: 1,
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
    // Pinned so the sheet title and the "آخر الملاحظات" heading resolve
    // `textAlign: 'right'` to the physical right. Unpinned they rendered left.
    ...PHYSICAL_BOX,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 14,
  },
  sheetTitle: textStyle('bodyLarge', { color: KhazainColors.ink900 }),
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
    ...textStyle('bodyCompact', { color: KhazainColors.ink900 }),
    minHeight: 110,
  },
  toolbar: {
    ...PHYSICAL_ROW,
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
  saveLabel: textStyle('cardTitle', { color: '#fff' }),
  deleteRow: {
    ...PHYSICAL_BOX,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  deleteLabel: textStyle('label', { color: '#B43838' }),
  recentBlock: {
    marginTop: 4,
    gap: 8,
  },
  recentHeader: textStyle('cardTitle', { color: KhazainColors.ink700 }),
  // Recent row visual: title right, relative time left — authored physical
  // left -> right inside PHYSICAL_ROW.
  recentRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    backgroundColor: KhazainColors.cream50,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  recentTime: textStyle('caption', { color: KhazainColors.ink400 }),
  recentColumn: { flex: 1, gap: 2 },
  recentTitle: textStyle('cardTitle', { color: KhazainColors.ink900 }),
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
