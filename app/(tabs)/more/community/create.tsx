import { InlineHeader } from '@/components/khazain';
import { PreviewBanner } from '@/components/khazain/community';
import { HeaderArt } from '@/components/khazain/patterns';
import { PillButton } from '@/components/khazain/primitives';
import { COMMUNITY_COPY, rangeHint } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { CARD_DENSITY, PHYSICAL_BOX, READING_GRID, RTL_TEXT } from '@/constants/layout';
import { toLocalDay } from '@/constants/progress';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { inputTextStyle, textStyle } from '@/constants/typography';
import { useCommunityGuard } from '@/hooks/useCommunityGuard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { arabicCopyForCode, isApiError } from '@/services/api/errors';
import { checkText } from '@/services/community/adabFilter';
import { communityService } from '@/services/community';
import { runCreateFlow, type CreateFlowState } from '@/services/community/groupActions';
import { parseBounded } from '@/services/community/groupForm';
import { onChallengeJoined } from '@/services/community/progressSync';
import { runMutation } from '@/store/communityMutations';
import { communityGeneration } from '@/store/communityStores';
import type { ChallengeKind, Group } from '@/types/community';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
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

const groupRoute = (id: string) => `/(tabs)/more/community/group/${encodeURIComponent(id)}`;

type Kind = ChallengeKind['kind'];

/**
 * Create a group and start its challenge (design §8.2): a name filtered by the
 * adab filter, then a khatm or a daily wird. The two writes are separate
 * calls, so a failed start keeps the created group and retries only the start.
 */
export default function CreateGroupScreen() {
  const allowed = useCommunityGuard('open');
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<Kind>('khatm');
  const [pagesText, setPagesText] = useState('');
  const [daysText, setDaysText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Group | null>(null);
  // State is read through a closure, so two taps in one frame both pass it.
  const inFlight = useRef(false);
  // The created group, kept across submits so a retry repeats only the failed start.
  const flow = useRef<CreateFlowState>({ group: null });

  const pages = parseBounded(pagesText, COMMUNITY_LIMITS.wirdPages);
  const days = parseBounded(daysText, COMMUNITY_LIMITS.wirdDays);
  const wirdReady = kind === 'khatm' || (pages !== null && days !== null);

  const spec = (): ChallengeKind | null => {
    if (kind === 'khatm') return { kind: 'khatm' };
    return pages !== null && days !== null ? { kind: 'daily-wird', pagesPerDay: pages, days } : null;
  };

  const submit = async () => {
    const challengeSpec = spec();
    if (inFlight.current || !challengeSpec) return;
    const trimmed = name.trim();
    if (!created) {
      const checked = checkText(trimmed, 'groupName');
      if (!checked.ok) return setError(COMMUNITY_COPY.filterReason[checked.reason]);
      if (checked.review) return setError(COMMUNITY_COPY.pickAnotherName);
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    const gen = communityGeneration();
    try {
      const title = kind === 'khatm' ? COMMUNITY_COPY.khatmTitle : COMMUNITY_COPY.wirdTitle;
      const startsOn = toLocalDay();
      const { group, challenge } = await runCreateFlow(flow.current, {
        create: async () => {
          const made = await runMutation('createGroup', '-', { name: trimmed }, (requestId) =>
            communityService.groups.create({ requestId, name: trimmed }),
          );
          setCreated(made);
          return made;
        },
        start: (made) =>
          runMutation('startChallenge', made.id, { title, startsOn, ...challengeSpec }, (requestId) =>
            communityService.challenges.start({ requestId, groupId: made.id, title, startsOn, ...challengeSpec }),
          ),
      });
      if (gen !== communityGeneration()) return;
      // The first report is not throttled and never rejects; do not make the member wait for it.
      router.replace(groupRoute(group.id) as any);
      void onChallengeJoined(challenge);
    } catch (e) {
      if (gen === communityGeneration()) setError(arabicCopyForCode(isApiError(e) ? e.code : 'unknown'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader title={COMMUNITY_COPY.createGroup} onBack={() => router.back()} style={columnStyle} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, columnStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PreviewBanner />
          <View style={styles.card}>
            <Text style={styles.label}>{COMMUNITY_COPY.groupNameLabel}</Text>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setError(null);
              }}
              placeholder={COMMUNITY_COPY.groupNamePlaceholder}
              placeholderTextColor={KhazainColors.ink400}
              textAlign="right"
              maxLength={COMMUNITY_LIMITS.groupName.max}
              editable={!created}
              accessibilityLabel={COMMUNITY_COPY.groupNameLabel}
              style={styles.input}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{COMMUNITY_COPY.challengeLabel}</Text>
            <View style={styles.options}>
              <Option label={COMMUNITY_COPY.khatmOption} selected={kind === 'khatm'} onPress={() => setKind('khatm')} />
              <Option
                label={COMMUNITY_COPY.wirdOption}
                selected={kind === 'daily-wird'}
                onPress={() => setKind('daily-wird')}
              />
            </View>
            {kind === 'daily-wird' ? (
              <>
                <NumberField
                  label={COMMUNITY_COPY.pagesPerDayLabel}
                  value={pagesText}
                  onChange={setPagesText}
                  range={COMMUNITY_LIMITS.wirdPages}
                />
                <NumberField
                  label={COMMUNITY_COPY.daysLabel}
                  value={daysText}
                  onChange={setDaysText}
                  range={COMMUNITY_LIMITS.wirdDays}
                />
              </>
            ) : null}
            <Text style={styles.note}>{COMMUNITY_COPY.challengeStarts}</Text>
          </View>

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <PillButton
            label={COMMUNITY_COPY.createGroup}
            onPress={submit}
            disabled={busy || !wirdReady || (!created && name.trim().length === 0)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Option({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[styles.option, selected ? styles.optionOn : null]}
    >
      <Text style={[styles.optionLabel, selected ? styles.optionLabelOn : null]}>{label}</Text>
    </Pressable>
  );
}

function NumberField({
  label,
  value,
  onChange,
  range,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  range: { min: number; max: number };
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        textAlign="right"
        maxLength={String(range.max).length}
        accessibilityLabel={label}
        style={styles.input}
      />
      <Text style={styles.note}>{rangeHint(range.min, range.max)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  // Pinned so a bare RTL_TEXT child (the error) aligns to the physical right.
  content: { ...PHYSICAL_BOX, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 60, gap: 12 },
  card: {
    ...PHYSICAL_BOX,
    padding: 16,
    gap: 12,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  field: { ...PHYSICAL_BOX, gap: 6 },
  label: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  note: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.inkSubtle }) },
  input: {
    ...inputTextStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    minHeight: 46,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  // Reading order: the first option sits at the physical right.
  options: { ...READING_GRID, gap: 8 },
  option: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: KhazainRadius.pill,
    borderWidth: 1,
    borderColor: KhazainColors.navy800,
    backgroundColor: KhazainColors.cardBg,
  },
  optionOn: { backgroundColor: KhazainColors.navy800 },
  optionLabel: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.navy800 }) },
  optionLabelOn: { color: KhazainColors.cream100 },
  error: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.danger }) },
});
