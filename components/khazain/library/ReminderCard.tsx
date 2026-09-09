import { CARD_DENSITY, PHYSICAL_BOX, PHYSICAL_ROW, RTL_TEXT } from '@/constants/layout';
import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

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
    <View style={[styles.card, KhazainShadows.card]}>
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

function BellGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.44 17.29c-.78 0-1.22-1.05-.66-1.62l1.12-1.12c.3-.3.48-.75.48-1.2v-3.24c0-3.95 3.21-7.16 7.16-7.16 3.94 0 7.16 3.21 7.16 7.16v3.24c0 .45.18.9.48 1.2l1.12 1.12c.57.57.17 1.62-.66 1.62H3.44z"
        fill={KhazainColors.navy800}
        opacity={0.4}
      />
      <Path
        d="M14.83 18.3a2.85 2.85 0 0 1-5.66 0"
        stroke={KhazainColors.navy800}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
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
    ...PHYSICAL_ROW,
    minHeight: CARD_DENSITY.reciterRowMinHeight,
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: CARD_DENSITY.lectureCardRadius,
    backgroundColor: KhazainColors.cardBg,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
  },
  text: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
    gap: 2,
  },
  title: {
    fontFamily: 'TheSansArabic',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: KhazainColors.ink900,
    ...RTL_TEXT,
  },
  subtitle: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
  badge: {
    width: CARD_DENSITY.lectureBadgeDisc,
    height: CARD_DENSITY.lectureBadgeDisc,
    borderRadius: CARD_DENSITY.lectureBadgeDisc / 2,
    backgroundColor: KhazainColors.iconChipBg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  empty: {
    fontFamily: 'TheSansArabic',
    fontSize: 13,
    lineHeight: 18,
    color: KhazainColors.ink500,
    ...RTL_TEXT,
  },
  manage: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  manageLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    color: KhazainColors.goldAccent,
    ...RTL_TEXT,
  },
});
