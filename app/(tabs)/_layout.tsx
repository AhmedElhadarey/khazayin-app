import { Tabs } from 'expo-router';
import React from 'react';
import { CustomTabBar } from '@/components/khazain';

// 4-tab shell. Home is the group's `index.tsx`, so expo-router lands there by default.
// `_legacy-home.tsx` is underscore-prefixed and not routable — archived code only.
// Legacy siblings (saved/browse/settings/search) stay on disk but are hidden from the tab bar.
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      {/* Visible tabs (RTL order: home is rendered first → appears on the right). */}
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="sections" options={{ title: 'الأقسام' }} />
      <Tabs.Screen name="library" options={{ title: 'مكتبتي' }} />
      <Tabs.Screen name="more" options={{ title: 'المزيد' }} />

      {/* Legacy siblings — hidden from the tab bar, kept routable for existing deep links. */}
      <Tabs.Screen name="saved" options={{ href: null }} />
      <Tabs.Screen name="browse" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
