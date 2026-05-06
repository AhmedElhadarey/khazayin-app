/**
 * EmptyState — cream card with centered Arabic empty message.
 *
 * C4 per-domain copy (caller passes the message):
 *   sections:  لا يوجد أقسام متاحة
 *   scholars:  لا يوجد علماء
 *   lectures:  لا يوجد محاضرات
 *   books:     لا يوجد كتب
 *   dawah:     لا يوجد ملصقات دعوية
 *   fallback:  لا يوجد محتوى حالياً  (default when message is omitted)
 *
 * Track: khazain-content-service_20260506  Phase 3 / T3.2
 */
import { KhazainColors, KhazainRadius, KhazainSpacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type EmptyStateProps = {
  /** Arabic empty-state copy. Defaults to 'لا يوجد محتوى حالياً'. */
  message?: string;
  /** Reserved icon slot — not yet rendered; kept for API forward-compat. */
  iconKey?: string;
};

export function EmptyState({ message, iconKey: _iconKey }: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.text}>{message ?? 'لا يوجد محتوى حالياً'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: KhazainColors.cardBg,
    borderRadius: KhazainRadius.md,
    borderWidth: 1,
    borderColor: KhazainColors.cardBorder,
    paddingVertical: KhazainSpacing.x6,
    paddingHorizontal: KhazainSpacing.x4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 96,
  },
  text: {
    // TheMixArab — proprietary name intentionally kept per CLAUDE.md §Fonts
    fontFamily: 'TheMixArab',
    fontSize: 14,
    color: KhazainColors.inkSubtle,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
