import { KhazainColors, KhazainRadius } from '@/constants/theme';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    BookmarkIcon,
    GridIcon,
    HouseIcon,
    IconProps,
    MenuLinesIcon,
} from '../icons';
import { GeoNavyPattern } from '../patterns';
import { MiniPlayer } from './MiniPlayer';

// "index" is the home tab (expo-router's default route name within the (tabs) group).
type TabKey = 'index' | 'sections' | 'library' | 'more';

const TAB_META: Record<
  TabKey,
  { label: string; Icon: React.ComponentType<IconProps & { filled?: boolean }> }
> = {
  index: { label: 'الرئيسية', Icon: HouseIcon as React.ComponentType<IconProps & { filled?: boolean }> },
  sections: { label: 'الأقسام', Icon: GridIcon as React.ComponentType<IconProps & { filled?: boolean }> },
  library: { label: 'مكتبتي', Icon: BookmarkIcon as React.ComponentType<IconProps & { filled?: boolean }> },
  more: { label: 'المزيد', Icon: MenuLinesIcon as React.ComponentType<IconProps & { filled?: boolean }> },
};

const TAB_ORDER: TabKey[] = ['index', 'sections', 'library', 'more'];

const BAR_HEIGHT = 72;

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const routesByName = new Map(state.routes.map((r) => [r.name, r]));
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View>
      <View style={styles.miniPlayerWrap}>
        <MiniPlayer />
      </View>
      <GeoNavyPattern
        style={[styles.bar, { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}
        opacity={0.14}
      >
        <View style={styles.row}>
          {TAB_ORDER.map((key) => {
            const route = routesByName.get(key);
            if (!route) return null;
            const active = activeRouteName === key;
            const { label, Icon } = TAB_META[key];

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!active && !event.defaultPrevented) {
                navigation.navigate(route.name as never);
              }
            };

            return (
              <Pressable
                key={key}
                onPress={onPress}
                accessibilityRole="button"
                accessibilityState={active ? { selected: true } : {}}
                accessibilityLabel={label}
                style={styles.tab}
              >
                {active ? (
                  <View style={styles.activePill}>
                    <Icon size={18} color={KhazainColors.navy900} filled />
                    <Text style={styles.activeLabel} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.inactiveCol}>
                    <Icon size={20} color={KhazainColors.navLabel} />
                    <Text style={styles.inactiveLabel} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </GeoNavyPattern>
    </View>
  );
}

// Expose a hook helper for future use (e.g., Mushaf screen hiding the player).
// Kept here colocated so consumers import { setMiniPlayerVisible } alongside <CustomTabBar />.
export { usePlayerStore } from '@/store/playerStore';

const styles = StyleSheet.create({
  bar: {
    width: '100%',
  },
  miniPlayerWrap: {
    marginHorizontal: 10,
    marginBottom: 8,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    minWidth: 56,
    height: 34,
    borderRadius: KhazainRadius.pill,
    backgroundColor: KhazainColors.navPill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 6,
  },
  activeLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    fontWeight: '600',
    color: KhazainColors.navy900,
    writingDirection: 'rtl',
  },
  inactiveCol: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  inactiveLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    fontWeight: '500',
    color: KhazainColors.navLabel,
    writingDirection: 'rtl',
  },
});
