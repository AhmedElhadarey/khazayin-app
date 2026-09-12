import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW } from '@/constants/layout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { LIST_CARD } from './libraryLayout';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FigmaIcon } from '@/components/khazain/icons/FigmaIcon';

export type ReminderSummary = {
  id: string;
  labelAr: string;
  descriptionAr: string;
};

/**
 * A single active reminder, in the shared row density.
 *
 * Physical left → right: nothing, text, bell badge — the same shape as every
 * other list row in the app.
 */
export function ReminderCard({ reminder }: { reminder: ReminderSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {reminder.labelAr}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {reminder.descriptionAr}
        </Text>
      </View>
      <View style={styles.badge}>
        <BellGlyph />
      </View>
    </View>
  );
}

/**
 * The Library's smart-reminders section: every reminder that is both shipped
 * and switched on, plus a route into the notification settings. An empty list
 * is a real state, not a loading state — it means nothing is armed.
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

/**
 * Node 2031:4659 `DIV-46` — the تذكيراتي mark. A vuesax bell whose backing
 * shape sits at 40%; the app had a hand-copy of the same idea.
 */
function BellGlyph() {
  return <FigmaIcon name="LibraryReminders" size={18} color={KhazainColors.navy800} />;
}

const styles = StyleSheet.create({
  list: {
    // PHYSICAL_BOX so the manage link's `flex-end` means the physical right,
    // not the RTL end.
    ...PHYSICAL_BOX,
    gap: CARD_DENSITY.listGap,
  },
  card: {
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    // Figma node 2031:4659: 360 x 114 at radius 20, flat, hairline, no shadow.
    borderRadius: LIST_CARD.radius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.hairline,
  },
  text: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  title: textStyle('cardTitle', { color: KhazainColors.inkHeading }),
  subtitle: textStyle('label', { color: KhazainColors.ink500 }),
  badge: {
    width: CARD_DENSITY.lectureBadgeDisc,
    height: CARD_DENSITY.lectureBadgeDisc,
    borderRadius: CARD_DENSITY.lectureBadgeDisc / 2,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
