import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { LIST_CARD } from './libraryLayout';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { Toggle } from '@/components/khazain/primitives/Toggle';

export type ReminderSummary = {
  id: string;
  labelAr: string;
  descriptionAr: string;
  /**
   * True only when a notification is really armed (wanted AND permitted) —
   * drives the switch and the highlighted card. Never the stored preference
   * alone: that would advertise a reminder that cannot fire.
   */
  armed?: boolean;
  /** «التذكير التالي: …», shown only while armed. */
  nextLabel?: string;
  /** What to say instead while not armed (switched off / permission missing). */
  statusLabel?: string;
  /** Flips the reminder through the same permission path as the settings screen. */
  onToggle?: (next: boolean) => void;
};

/** The armed card's gradient and every other card's flat fill (node 2031:4659). */
const ARMED_GRADIENT = ['#EEE8E1', '#D8C9B7'] as const;

/**
 * A reminder card (node 2031:4659), a column pinned `ltr`:
 *
 *   header, physical left → right: [ switch ........ title + 32pt navy disc ]
 *   description, then the next-reminder line.
 */
export function ReminderCard({ reminder }: { reminder: ReminderSummary }) {
  const armed = reminder.armed === true;
  const body = (
    <>
      <View style={styles.header}>
        {reminder.onToggle ? (
          <Toggle on={armed} onChange={reminder.onToggle} label={reminder.labelAr} />
        ) : (
          <View />
        )}
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={1}>
            {reminder.labelAr}
          </Text>
          <View style={styles.disc}>
            <FigmaIcon name="LibraryWirdReminder" size={16} color={KhazainColors.pageBg} />
          </View>
        </View>
      </View>
      <Text style={styles.description}>{reminder.descriptionAr}</Text>
      {armed && reminder.nextLabel ? (
        <Text style={styles.next}>{reminder.nextLabel}</Text>
      ) : reminder.statusLabel ? (
        <Text style={styles.description}>{reminder.statusLabel}</Text>
      ) : null}
    </>
  );

  if (armed) {
    return (
      <LinearGradient colors={[...ARMED_GRADIENT]} style={[styles.card, styles.cardArmed]}>
        {body}
      </LinearGradient>
    );
  }
  return <View style={[styles.card, styles.cardIdle]}>{body}</View>;
}

/**
 * The Library's smart-reminders section: every shipped reminder, each with its
 * own switch, plus a route into the notification settings. An empty list is a
 * real state, not a loading state — it means no reminder is shipped.
 */
export function ReminderList({
  reminders,
  onManage,
}: {
  reminders: ReminderSummary[];
  onManage?: () => void;
}) {
  return (
    <View style={styles.list}>
      {reminders.length === 0 ? (
        <Text style={styles.empty}>لا توجد تذكيرات نشطة</Text>
      ) : (
        reminders.map((reminder) => <ReminderCard key={reminder.id} reminder={reminder} />)
      )}
      {onManage ? (
        <Pressable
          onPress={onManage}
          accessibilityRole="button"
          accessibilityLabel="إدارة التذكيرات"
          style={({ pressed }) => [styles.manage, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.manageLabel}>إدارة التذكيرات</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    // PHYSICAL_BOX so the manage link's `flex-end` means the physical right,
    // not the RTL end.
    ...PHYSICAL_BOX,
    gap: CARD_DENSITY.listGap,
  },
  card: {
    ...PHYSICAL_BOX,
    paddingVertical: 17,
    paddingHorizontal: 12,
    borderRadius: LIST_CARD.radius,
    borderWidth: 1,
    gap: 4,
  },
  cardArmed: { borderColor: KhazainColors.navy800 },
  cardIdle: { backgroundColor: KhazainColors.cardBg, borderColor: KhazainColors.hairline },
  header: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleGroup: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  disc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: textStyle('cardTitle', { color: KhazainColors.inkHeading }),
  description: textStyle('label', { color: KhazainColors.ink500 }),
  next: textStyle('label', { color: KhazainColors.navy800 }),
  empty: textStyle('cardTitle', { color: KhazainColors.ink500 }),
  manage: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  manageLabel: textStyle('label', { color: KhazainColors.goldAccent }),
});
