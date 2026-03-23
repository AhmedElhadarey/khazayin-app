import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const theme = useColorScheme() ?? 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[theme].tabBarActive,
        tabBarInactiveTintColor: Colors[theme].tabBarInactive,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors[theme].tabBar,
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          writingDirection: 'rtl',
        },
        tabBarItemStyle: {
          gap: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: '\u0627\u0644\u0623\u0642\u0633\u0627\u0645',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: '\u0645\u0643\u062A\u0628\u062A\u064A',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'library' : 'library-outline'} color={color} size={22} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '\u0627\u0644\u0645\u0632\u064A\u062F',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
              color={color}
              size={22}
            />
          ),
        }}
      />
      {/* Hide search from tabs - it's accessed via the home header */}
      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
