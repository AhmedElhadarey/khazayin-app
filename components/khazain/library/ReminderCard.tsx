import { KhazainColors, KhazainShadows } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Toggle } from '../primitives/Toggle';

// Smart reminder card from design_source/app/library.jsx.
// Layout: toggle on the LEFT, title row on the right with a small round icon badge, body, next-time caption.
// Active state (on + active) gets a navy border.
export function ReminderCard({
  title,
  body,
  next,
  icon,
  on,
  onToggle,
  active,
}: {
  title: string;
  body: string;
  next: string;
  icon: React.ReactNode;
  on: boolean;
  onToggle: (next: boolean) => void;
  active?: boolean;
}) {
  const isActive = !!(active && on);
  return (
    <View
      style={[
        styles.card,
        KhazainShadows.card,
        isActive
          ? { borderWidth: 1.5, borderColor: KhazainColors.navy800 }
          : { borderWidth: 1, borderColor: 'rgba(141,107,52,0.1)' },
      ]}
    >
      <View style={{ marginTop: 2 }}>
        <Toggle on={on} onChange={onToggle} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.titleRow}>
          <View style={styles.titleLeftCol}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <View style={styles.iconBadge}>{icon}</View>
        </View>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.next}>{next}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    backgroundColor: KhazainColors.cream50,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  titleLeftCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: KhazainColors.ink900,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: KhazainColors.cream100,
    borderWidth: 1,
    borderColor: 'rgba(26,53,87,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontSize: 11.5,
    color: KhazainColors.ink500,
    marginTop: 2,
    lineHeight: 18,
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  next: {
    fontSize: 11,
    color: KhazainColors.gold600,
    marginTop: 8,
    fontWeight: '500',
    fontFamily: 'TheSansArabic',
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
