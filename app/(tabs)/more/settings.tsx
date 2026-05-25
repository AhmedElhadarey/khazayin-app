import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KhazainColors } from '@/constants/theme';
import { OrnamentPattern } from '@/components/khazain/patterns';
import { SettingsSection } from '@/components/khazain/settings';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <OrnamentPattern style={StyleSheet.absoluteFillObject} opacity={0.08} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 160 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.h1}>الإعدادات</Text>
        </View>
        <SettingsSection title="التلاوة">{null}</SettingsSection>
        <SettingsSection title="القراءة">{null}</SettingsSection>
        <SettingsSection title="الإشعارات">{null}</SettingsSection>
        <SettingsSection title="التطبيق">{null}</SettingsSection>
        <SettingsSection title="البيانات">{null}</SettingsSection>
        <SettingsSection title="قانوني">{null}</SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KhazainColors.pageBg },
  headerBlock: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 6,
    alignItems: 'flex-end',
  },
  h1: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: KhazainColors.navy800,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
