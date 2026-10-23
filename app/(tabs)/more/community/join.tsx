import { InlineHeader } from '@/components/khazain';
import { PreviewBanner } from '@/components/khazain/community';
import { HeaderArt } from '@/components/khazain/patterns';
import { PillButton } from '@/components/khazain/primitives';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { isApiError } from '@/services/api/errors';
import { communityService } from '@/services/community';
import { joinErrorCopy, normalizeJoinCode } from '@/services/community/groupForm';
import { onChallengeJoined } from '@/services/community/progressSync';
import { runMutation } from '@/store/communityMutations';
import { communityGeneration } from '@/store/communityStores';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInputLineHeight } from '@/hooks/useLineClamp';

const groupRoute = (id: string) => `/(tabs)/more/community/group/${encodeURIComponent(id)}`;

/**
 * The first report of a joined challenge is not throttled. It runs after the
 * navigation and never rejects: a failure must not undo the join, and the
 * group screen reports on focus anyway.
 */
async function reportJoined(groupId: string): Promise<void> {
  try {
    const { challenge } = await communityService.groups.get(groupId);
    if (challenge) await onChallengeJoined(challenge);
  } catch {
    /* see above */
  }
}

/** Join a group by its 6-character code (design §8.2). The field stays above the keyboard. */
export default function JoinGroupScreen() {
  const inputLine = useInputLineHeight();
  const allowed = useCommunityGuard('open');
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State is read through a closure, so two taps in one frame both pass it.
  const inFlight = useRef(false);

  const ready = code.length === COMMUNITY_LIMITS.joinCodeLength;

  const submit = async () => {
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const gen = communityGeneration();
    try {
      const group = await runMutation('joinGroup', '-', { code }, (requestId) =>
        communityService.groups.join({ requestId, code }),
      );
      if (gen !== communityGeneration()) return;
      router.replace(groupRoute(group.id) as any);
      void reportJoined(group.id);
    } catch (e) {
      if (gen === communityGeneration()) {
        setError(joinErrorCopy(isApiError(e) ? e.code : 'unknown', isApiError(e) ? e.detail : undefined));
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader title={COMMUNITY_COPY.joinWithCode} onBack={() => router.back()} style={columnStyle} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, columnStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PreviewBanner />
          <View style={styles.card}>
            <Text style={styles.label}>{COMMUNITY_COPY.joinCodeLabel}</Text>
            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
          </View>
        </ScrollView>
        <View style={[styles.inputRow, columnStyle]}>
          <PillButton label={COMMUNITY_COPY.joinSubmit} onPress={submit} disabled={busy || !ready} />
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(normalizeJoinCode(v));
              setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            textAlign="right"
            accessibilityLabel={COMMUNITY_COPY.joinCodeLabel}
            style={[styles.input, inputLine]}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 12 },
  card: { ...PHYSICAL_BOX, gap: 12 },
  label: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  // Physical left to right: the button, then the field at the right edge.
  inputRow: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    flex: 1,
    minHeight: 46,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    letterSpacing: 4,
  },
  error: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.danger }) },
});
