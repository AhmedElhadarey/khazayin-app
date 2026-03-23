import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows } from '@/constants/theme';
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
          borderTopWidth: 1,
          borderTopColor: Colors[theme].tabBarBorder,
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
      }}
    >
      {/* الرئيسية - Home (rightmost in RTL) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons 
                name={focused ? 'home' : 'home-outline'} 
                color={color} 
                size={22} 
              />
            </View>
          ),
        }}
      />
      
      {/* مكتبتي - My Library */}
      <Tabs.Screen
        name="saved"
        options={{
          title: 'مكتبتي',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons 
                name={focused ? 'library' : 'library-outline'} 
                color={color} 
                size={22} 
              />
            </View>
          ),
        }}
      />
      
      {/* الأقسام - Categories */}
      <Tabs.Screen
        name="browse"
        options={{
          title: 'الأقسام',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons 
                name={focused ? 'grid' : 'grid-outline'} 
                color={color} 
                size={22} 
              />
            </View>
          ),
        }}
      />
      
      {/* المزيد - More (leftmost in RTL) */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'المزيد',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconContainer : undefined}>
              <Ionicons
                name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
                color={color}
                size={22}
              />
            </View>
          ),
        }}
      />
      
      {/* Hide search from tabs - it's accessed via the home search bar */}
      <Tabs.Screen
        name="search"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    // Subtle indicator for active tab
  },
});
