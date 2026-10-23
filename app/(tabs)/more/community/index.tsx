import { InlineHeader } from '@/components/khazain';
import { GroupRow, PreviewBanner } from '@/components/khazain/community';
import { HeaderArt } from '@/components/khazain/patterns';
import { PillButton } from '@/components/khazain/primitives';
import { AsyncContent } from '@/components/khazain/state/AsyncContent';
import { COMMUNITY_COPY } from '@/constants/communityCopy';
import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW, READING_GRID, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainRadius } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { KhazainConfig } from '@/constants/config';
import { useCommunityAccess, useCommunityGuard } from '@/hooks/useCommunityGuard';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { arabicCopyForCode } from '@/services/api/errors';
import { enrollMember } from '@/services/community/enrollment';
import { openPrivacyPolicy } from '@/services/privacyPolicy';
import { useCommunityLocalStore } from '@/store/communityLocalStore';
import { useMyGroupsStore } from '@/store/communityStores';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';

const GUIDELINES_ROUTE = '/(tabs)/more/community/guidelines';
const CREATE_ROUTE = '/(tabs)/more/community/create';
const JOIN_ROUTE = '/(tabs)/more/community/join';
const groupRoute = (id: string) => `/(tabs)/more/community/group/${encodeURIComponent(id)}`;

/**
 * The community hub (design §8.2): the intro, name and acceptance while access
 * is `intro`; my groups and the two entry buttons once it is `open`.
 */
export default function CommunityHubScreen() {
  const allowed = useCommunityGuard('intro');
  const access = useCommunityAccess();
  const { columnStyle } = useResponsiveLayout();
  const router = useRouter();
  if (!allowed) return null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <HeaderArt />
      <InlineHeader title={COMMUNITY_COPY.screenTitle} onBack={() => router.back()} style={columnStyle} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, columnStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <PreviewBanner />
          {access === 'open' ? <OpenHub /> : <Intro />}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Intro() {
  const router = useRouter();
  const existingName = useCommunityLocalStore((s) => s.profile?.displayName ?? '');
  const [name, setName] = useState(existingName);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // State is read through a closure, so two taps in one frame both pass it.
  const inFlight = useRef(false);

  const onPolicy = () =>
    openPrivacyPolicy({
      url: KhazainConfig.privacyPolicyUrl,
      openBrowser: (url) => WebBrowser.openBrowserAsync(url),
      alert: (title, body) => Alert.alert(title, body),
    });

  const submit = async () => {
    if (inFlight.current || !accepted) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await enrollMember({ name, accepted, now: Date.now() });
      if (!result.ok && (result.reason === 'name' || result.reason === 'request')) setError(result.message);
      // On success access becomes `open` and this component is replaced by the hub.
    } catch {
      setError(arabicCopyForCode('unknown'));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.title}>{COMMUNITY_COPY.introTitle}</Text>
        <Text style={styles.body}>{COMMUNITY_COPY.introBody}</Text>
        <Text style={styles.body}>{COMMUNITY_COPY.introPrivacy}</Text>
        <View style={styles.links}>
          <Pressable
            onPress={() => router.push(GUIDELINES_ROUTE as any)}
            accessibilityRole="button"
            accessibilityLabel={COMMUNITY_COPY.guidelinesLink}
            style={styles.linkBox}
          >
            <Text style={styles.link}>{COMMUNITY_COPY.guidelinesLink}</Text>
          </Pressable>
          <Pressable
            onPress={onPolicy}
            accessibilityRole="button"
            accessibilityLabel={COMMUNITY_COPY.policyLink}
            style={styles.linkBox}
          >
            <Text style={styles.link}>{COMMUNITY_COPY.policyLink}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>{COMMUNITY_COPY.nameLabel}</Text>
        <TextInput
          value={name}
          onChangeText={(v) => {
            setName(v);
            setError(null);
          }}
          placeholder={COMMUNITY_COPY.namePlaceholder}
          placeholderTextColor={KhazainColors.ink400}
          textAlign="right"
          maxLength={COMMUNITY_LIMITS.displayName.max}
          accessibilityLabel={COMMUNITY_COPY.nameLabel}
          style={styles.input}
        />
        {error ? (
          <Text style={styles.error} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Pressable
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          accessibilityLabel={COMMUNITY_COPY.accept}
          style={styles.acceptRow}
        >
          <Text style={styles.acceptLabel}>{COMMUNITY_COPY.accept}</Text>
          <View style={[styles.box, accepted ? styles.boxOn : null]}>
            {accepted ? (
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke={KhazainColors.cream100}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            ) : null}
          </View>
        </Pressable>
        <PillButton
          label={COMMUNITY_COPY.joinCommunity}
          onPress={submit}
          disabled={!accepted || busy || name.trim().length === 0}
        />
      </View>
    </>
  );
}

function OpenHub() {
  const router = useRouter();
  const groups = useMyGroupsStore((s) => s.data);
  const status = useMyGroupsStore((s) => s.status);
  const error = useMyGroupsStore((s) => s.error);
  const fetchGroups = useMyGroupsStore((s) => s.fetch);
  const refreshGroups = useMyGroupsStore((s) => s.refresh);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  return (
    <>
      <View style={styles.actions}>
        <PillButton label={COMMUNITY_COPY.createGroup} onPress={() => router.push(CREATE_ROUTE as any)} />
        <PillButton
          label={COMMUNITY_COPY.joinWithCode}
          variant="cream"
          onPress={() => router.push(JOIN_ROUTE as any)}
        />
      </View>
      <View style={styles.headingBox}>
        <Text style={styles.heading}>{COMMUNITY_COPY.myGroups}</Text>
      </View>
      <AsyncContent
        status={status}
        error={error}
        onRetry={() => void refreshGroups()}
        emptyMessage={COMMUNITY_COPY.noGroupsYet}
        style={styles.list}
      >
        {groups.map((g) => (
          <GroupRow
            key={g.id}
            name={g.name}
            memberCount={g.memberCount}
            onPress={() => router.push(groupRoute(g.id) as any)}
          />
        ))}
      </AsyncContent>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 60, gap: 12 },
  card: {
    ...PHYSICAL_BOX,
    padding: 16,
    gap: 12,
    borderRadius: KhazainRadius.lg,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  title: { ...RTL_TEXT, ...textStyle('bodyTitle', { color: KhazainColors.inkTitle }) },
  body: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.ink900 }) },
  links: { ...READING_GRID, gap: 16 },
  linkBox: { ...PHYSICAL_BOX, minHeight: 44, justifyContent: 'center' },
  link: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.goldAccent }), textDecorationLine: 'underline' },
  headingBox: { ...PHYSICAL_BOX },
  heading: { ...RTL_TEXT, ...textStyle('sectionTitle', { color: KhazainColors.navy900 }) },
  label: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }) },
  input: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    minHeight: 46,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  // Legacy palette: the Khazain tokens carry no error colour.
  error: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.danger }) },
  acceptRow: { ...PHYSICAL_ROW, alignItems: 'center', justifyContent: 'flex-end', gap: 12, minHeight: 44 },
  acceptLabel: { ...RTL_TEXT, ...textStyle('bodyCompact', { color: KhazainColors.ink900 }), flexShrink: 1 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: KhazainColors.navy800 },
  actions: { gap: 8 },
  list: { gap: CARD_DENSITY.moreListGap },
});
