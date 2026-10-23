/**
 * The thread composer (design §8.4, §10). Physical order, left to right, comes
 * from `COMPOSER_ORDER` inside a `PHYSICAL_ROW`: the send button, then the
 * field at the right edge. Notices and the counter sit above the row.
 *
 * No native `maxLength`: the field is cleaned and capped by code points in
 * `normalizePostInput`, so a paste is not cut before its invisibles go.
 */
import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, TextInput, View } from 'react-native';
import { PillButton } from '@/components/khazain/primitives/PillButton';
import { COMMUNITY_COPY, charsLeftLabel } from '@/constants/communityCopy';
import { COMMUNITY_LIMITS } from '@/constants/communityLimits';
import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { toArabicDigits } from '@/constants/progress';
import { COMPOSER_ORDER, type ComposerSlot } from '@/constants/rtlContracts';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { codePointLength, counterAnnouncement, normalizePostInput } from '@/services/community/postForm';

const MAX = COMMUNITY_LIMITS.post.max;

export function Composer({
  value,
  onChangeText,
  onSubmit,
  sendDisabled,
  notice,
  wait,
  error,
}: {
  value: string;
  onChangeText: (next: string) => void;
  onSubmit: () => void;
  sendDisabled?: boolean;
  /** «ستُراجَع مشاركتك قبل ظهورها». */
  notice?: string | null;
  /** The cooldown or hourly-cap copy. */
  wait?: string | null;
  error?: string | null;
}) {
  const length = codePointLength(value);

  // `accessibilityRole="alert"` is not spoken on iOS, so the message is announced too.
  useEffect(() => {
    if (error) void AccessibilityInfo.announceForAccessibility(error);
  }, [error]);

  const handleChange = (raw: string) => {
    const next = normalizePostInput(raw);
    const spoken = counterAnnouncement(length, codePointLength(next), MAX);
    if (spoken) void AccessibilityInfo.announceForAccessibility(spoken);
    onChangeText(next);
  };

  const slots: Record<ComposerSlot, React.ReactNode> = {
    send: (
      <PillButton label={COMMUNITY_COPY.sendPost} onPress={onSubmit} disabled={sendDisabled} style={styles.send} />
    ),
    field: (
      <TextInput
        value={value}
        onChangeText={handleChange}
        multiline
        textAlign="right"
        placeholder={COMMUNITY_COPY.composerPlaceholder}
        placeholderTextColor={KhazainColors.inkSubtle}
        accessibilityLabel={COMMUNITY_COPY.composerLabel}
        style={styles.input}
      />
    ),
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{COMMUNITY_COPY.composerLabel}</Text>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      {wait ? <Text style={styles.note}>{wait}</Text> : null}
      {notice ? <Text style={styles.note}>{notice}</Text> : null}
      <View style={styles.row}>
        {COMPOSER_ORDER.map((slot) => (
          <React.Fragment key={slot}>{slots[slot]}</React.Fragment>
        ))}
      </View>
      <Text style={styles.counter} accessibilityLabel={charsLeftLabel(MAX - length)}>
        {`${toArabicDigits(length)} / ${toArabicDigits(MAX)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...PHYSICAL_BOX, gap: 6 },
  row: { ...PHYSICAL_ROW, alignItems: 'flex-end', gap: 12 },
  send: { flexShrink: 0 },
  input: {
    ...textStyle('bodyCompact', { color: KhazainColors.inkTitle }),
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    backgroundColor: KhazainColors.cardBg,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlignVertical: 'top',
  },
  label: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.inkTitle }) },
  counter: { ...RTL_TEXT, ...textStyle('caption', { color: KhazainColors.ink500 }) },
  note: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.ink900 }) },
  // Legacy palette: the Khazain tokens carry no error colour.
  error: { ...RTL_TEXT, ...textStyle('label', { color: KhazainColors.danger }) },
});
