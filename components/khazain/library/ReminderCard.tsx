import { PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { useLineClamp } from '@/hooks/useLineClamp';
import { LIST_CARD, REMINDER_CARD } from './libraryLayout';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';
import { Toggle } from '@/components/khazain/primitives/Toggle';
import type { NotificationCategoryId } from '@/types/settings';

export type ReminderSummary = {
  id: NotificationCategoryId;
  labelAr: string;
  descriptionAr: string;
  /**
   * True only when a notification is really armed (wanted AND permitted) —
   * drives the switch and the highlighted card. Never the stored preference
   * alone: that would advertise a reminder that cannot fire.
   */
  armed: boolean;
  /** «التذكير التالي: …», shown only while armed. */
  nextLabel?: string;
  /** What to say instead while not armed (switched off / permission missing). */
  statusLabel?: string;
  /** Flips the reminder through the same permission path as the settings screen. */
  onToggle: (next: boolean) => void;
};

/** The armed card's gradient and every other card's flat fill (node 2031:4659). */
const ARMED_GRADIENT = ['#EEE8E1', '#D8C9B7'] as const;
/**
 * The armed card's paint transform runs top-left to bottom-right (node
 * 2031:4659). Expo's start/end are fractions of the box; on the 360 x 114 card
 * the file's end point lands at (0.73, 1.99).
 */
const GRADIENT_START = { x: 0, y: 0 } as const;
const GRADIENT_END = { x: 0.73, y: 1.99 } as const;

/**
 * A reminder card (node 2031:4659), a column pinned `ltr`:
 *
 *   header, physical left → right: [ switch ........ title + 32pt navy disc ]
 *   description, then the next-reminder line.
 */
export function ReminderCard({ reminder }: { reminder: ReminderSummary }) {
  const armed = reminder.armed;
  const oneLine = useLineClamp(1);
  const body = (
    <>
      <View style={styles.header}>
        <Toggle on={armed} onChange={reminder.onToggle} label={reminder.labelAr} />
        <View style={styles.titleGroup}>
          <Text style={styles.title} numberOfLines={oneLine}>
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
        <Text style={styles.status}>{reminder.statusLabel}</Text>
      ) : null}
    </>
  );

  if (armed) {
    return (
      <LinearGradient
        colors={[...ARMED_GRADIENT]}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[styles.card, styles.cardArmed]}
      >
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
    gap: REMINDER_CARD.listGap,
  },
  card: {
    ...PHYSICAL_BOX,
    paddingVertical: 17,
    paddingHorizontal: 12,
    borderRadius: LIST_CARD.radius,
    borderWidth: 1,
  },
  cardArmed: { borderColor: KhazainColors.navy800 },
  cardIdle: { backgroundColor: KhazainColors.cardBg, borderColor: KhazainColors.hairline },
  header: {
    ...PHYSICAL_ROW,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  // flex: 1 on the group and the title: a shrink-wrapped Arabic Text can lose
  // its last word on Android 15.
  titleGroup: {
    ...PHYSICAL_ROW,
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  disc: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: KhazainColors.navy800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, ...textStyle('cardTitle', { color: KhazainColors.inkHeading }) },
  description: textStyle('label', { color: KhazainColors.ink500 }),
  status: {
    ...textStyle('label', { color: KhazainColors.ink500 }),
    marginTop: REMINDER_CARD.descriptionToNext,
  },
  next: {
    ...textStyle('label', { color: KhazainColors.navy800 }),
    marginTop: REMINDER_CARD.descriptionToNext,
  },
  empty: textStyle('cardTitle', { color: KhazainColors.ink500 }),
  manage: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  manageLabel: textStyle('label', { color: KhazainColors.goldAccent }),
});
