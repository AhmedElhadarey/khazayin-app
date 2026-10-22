import { PreviewBanner } from '@/components/khazain/community';
import { PillButton } from '@/components/khazain/primitives';
import { SheetRow } from '@/components/khazain/sheets/SheetRow';
import { SheetShell } from '@/components/khazain/sheets/SheetShell';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { CARD_DENSITY, PHYSICAL_BOX, RTL_TEXT } from '@/constants/layout';
import { toArabicDigits } from '@/constants/progress';
import { Colors, KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { arabicCopyForCode, isApiError } from '@/services/api/errors';
import { communityService } from '@/services/community';
import { codePointLength, counterAnnouncement, normalizePostInput } from '@/services/community/postForm';
import { reportListMaxHeight, sheetKeyboardLift, shouldRevealNote } from '@/services/community/reportSheetLayout';
import { REPORT_REASON_ORDER, closeOnce, newGuard, runSubmitReport } from '@/services/community/threadActions';
import { runMutation } from '@/store/communityMutations';
import { communityGeneration, findThreadPost } from '@/store/communityStores';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { useToastStore } from '@/store/toastStore';
import type { ReportReason } from '@/types/community';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

const NOTE_MAX = COMMUNITY_LIMITS.reportNote.max;

/** The radio mark inside the row's navy disc. */
function RadioGlyph({ checked }: { checked: boolean }) {
  const c = KhazainColors.cream100;
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7.5} stroke={c} strokeWidth={1.5} />
      {checked ? <Circle cx={10} cy={10} r={4} fill={c} /> : null}
    </Svg>
  );
}

/**
 * Report a post (design §7.3). The target comes only from the `postId` param
 * and the thread store; if the post is gone (or is the member's own) the sheet
 * just closes. On submit the post is hidden locally and a toast thanks them.
 */
export default function CommunityReportSheet() {
  const allowed = useCommunityGuard('open');
  const router = useRouter();
  const { height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Set when the keyboard shows; consumed by the list's next layout.
  const revealOnResize = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    // `will` events run with the animation on iOS; Android only emits `did`.
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(show, (e) => {
      // The list is about to shrink; iOS Fabric does not keep the focused child visible.
      revealOnResize.current = true;
      setKeyboardHeight(e.endCoordinates.height);
    });
    const b = Keyboard.addListener(hide, () => setKeyboardHeight(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const params = useLocalSearchParams<{ postId?: string | string[] }>();
  const postId = typeof params.postId === 'string' ? params.postId : '';
  // Read once: a refresh of the thread behind the sheet must not pull its target away.
  const [post] = useState(() => findThreadPost(postId));
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guard = useRef(newGuard());

  const listMaxHeight = reportListMaxHeight({
    windowHeight: height,
    topInset: insets.top,
    bottomInset: insets.bottom,
    keyboardHeight,
    fontScale,
    errorShown: !!error,
  });
  const scroller = useRef<ScrollView>(null);
  // Set when «سبب آخر» is picked; consumed once the note field has been laid out.
  const revealNote = useRef(false);

  // Closing twice (a backdrop tap while the report is in flight, then its success) would pop the thread too.
  const latch = useRef({ closed: false });
  useEffect(() => {
    const state = latch.current;
    state.closed = false;
    return () => {
      state.closed = true;
    };
  }, []);
  const close = useCallback(
    () =>
      closeOnce(latch.current, () => {
        if (router.canGoBack()) router.back();
        else router.replace('/(tabs)/sections' as any);
      }),
    [router],
  );

  const gone = allowed && (!post || post.isMine);
  useEffect(() => {
    if (gone) close();
  }, [gone, close]);

  // `accessibilityRole="alert"` is not spoken on iOS, so the message is announced too.
  useEffect(() => {
    if (error) void AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const submit = () => {
    if (!reason || !post) return;
    const gen = communityGeneration();
    return runSubmitReport(
      guard.current,
      { postId: post.id, reason, note },
      {
        perform: (r, n) =>
          runMutation('report', post.id, { reason: r, note: n }, (requestId) =>
            communityService.threads.report({ requestId, postId: post.id, reason: r, ...(n ? { note: n } : {}) }),
          ),
        hide: (id) => useCommunityLocalStore.getState().hidePost(id),
        notify: (message) => useToastStore.getState().show({ message, durationMs: 4000 }),
        close,
        isCurrent: () => gen === communityGeneration(),
        onRefused: setError,
        onStart: () => {
          setBusy(true);
          setError(null);
        },
        onError: (e) => setError(arabicCopyForCode(isApiError(e) ? e.code : 'unknown')),
        onSettled: () => setBusy(false),
      },
    );
  };

  if (!allowed || !post || post.isMine) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { paddingBottom: sheetKeyboardLift(Platform.OS, keyboardHeight) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SheetShell title={COMMUNITY_COPY.reportTitle} onClose={close}>
        <View style={styles.body}>
          <PreviewBanner />
          {/* The list scrolls and is capped by the keyboard and status bar; the button below stays pinned. */}
          <ScrollView
            ref={scroller}
            style={{ maxHeight: listMaxHeight }}
            contentContainerStyle={styles.rows}
            keyboardShouldPersistTaps="handled"
            onLayout={() => {
              // The keyboard resized the list: the offset it kept may now hide the note.
              if (!revealOnResize.current) return;
              revealOnResize.current = false;
              if (reason === 'other') scroller.current?.scrollToEnd({ animated: true });
            }}
            onContentSizeChange={() => {
              if (!revealNote.current) return;
              revealNote.current = false;
              scroller.current?.scrollToEnd({ animated: true });
            }}
          >
            {REPORT_REASON_ORDER.map((r) => (
              <SheetRow
                key={r}
                icon={<RadioGlyph checked={reason === r} />}
                title={COMMUNITY_COPY.reportReasons[r]}
                checked={reason === r}
                onPress={() => {
                  revealNote.current = shouldRevealNote(reason, r);
                  setReason(r);
                  setError(null);
                }}
              />
            ))}
            {reason === 'other' ? (
              <View style={styles.noteBox}>
                <Text style={styles.label}>{COMMUNITY_COPY.reportNoteLabel}</Text>
                <TextInput
                  value={note}
                  onChangeText={(v) => {
                    const next = normalizePostInput(v, NOTE_MAX);
                    const spoken = counterAnnouncement(codePointLength(note), codePointLength(next), NOTE_MAX);
                    if (spoken) void AccessibilityInfo.announceForAccessibility(spoken);
                    setNote(next);
                    setError(null);
                  }}
                  onFocus={() => scroller.current?.scrollToEnd({ animated: true })}
                  multiline
                  textAlign="right"
                  accessibilityLabel={COMMUNITY_COPY.reportNoteLabel}
                  style={styles.input}
                />
                <Text style={styles.counter}>
                  {`${toArabicDigits(codePointLength(note))} / ${toArabicDigits(NOTE_MAX)}`}
                </Text>
              </View>
            ) : null}
          </ScrollView>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <PillButton
            label={COMMUNITY_COPY.reportSubmit}
            onPress={() => void submit()}
            disabled={!reason || busy}
          />
          {!reason ? <Text style={styles.counter}>{COMMUNITY_COPY.reportPickReason}</Text> : null}
        </View>
      </SheetShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { ...PHYSICAL_BOX, gap: 16, paddingBottom: 12 },
  rows: { ...PHYSICAL_BOX, gap: 8 },
  // Bottom padding keeps the counter clear of the submit button when scrolled to the end.
  noteBox: { ...PHYSICAL_BOX, gap: 6, paddingTop: 4, paddingBottom: 8 },
  label: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  input: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    minHeight: 76,
    maxHeight: 120,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlignVertical: 'top',
  },
  counter: { ...RTL_TEXT, ...textStyle('caption', { color: KhazainColors.ink500 }) },
  // Legacy palette: the Khazain tokens carry no error colour.
  error: { ...RTL_TEXT, ...textStyle('label', { color: Colors.light.error }) },
});
