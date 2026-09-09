import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PHYSICAL_ROW, RTL_TEXT, TAB_BAR, TAB_PHYSICAL_ORDER } from '@/constants/layout';
import {
  BookmarkIcon,
  GridIcon,
  HouseIcon,
  IconProps,
  MenuLinesIcon,
} from '../icons';
import { MiniPlayer } from './MiniPlayer';

// "index" is the home tab (expo-router's default route name within the (tabs) group).
type TabKey = 'index' | 'library' | 'sections' | 'more';

const TAB_META: Record<
  TabKey,
  { label: string; Icon: React.ComponentType<IconProps> }
> = {
  index: { label: 'الرئيسية', Icon: HouseIcon },
  library: { label: 'مكتبتي', Icon: BookmarkIcon },
  sections: { label: 'الأقسام', Icon: GridIcon },
  more: { label: 'المزيد', Icon: MenuLinesIcon },
};

// Physical order is authored left → right and pinned with `PHYSICAL_ROW`
// (`direction: 'ltr'`), so it renders identically on iOS, Android, web, a cold
// start, and a Fast Refresh. See the RTL contract in `constants/layout.ts`.
//
// Left → right: More, Sections, Library, Home — matching Figma node 2031:5675.

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  const routesByName = new Map(state.routes.map((r) => [r.name, r]));
  const activeRouteName = state.routes[state.index]?.name;

  return (
    <View>
      <View style={styles.miniPlayerWrap}>
        <MiniPlayer />
      </View>
      <View
        style={[
          styles.bar,
          { paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.row}>
          {TAB_PHYSICAL_ORDER.map((key) => {
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
                style={styles.tabWrap}
              >
                <View style={[styles.item, active && styles.itemActive]}>
                  {active ? <View style={styles.indicator} /> : null}
                  <Icon
                    size={TAB_BAR.iconSize}
                    color={active ? TAB_BAR.indicatorColor : TAB_BAR.inactiveInk}
                    strokeWidth={1.6}
                  />
                  <Text
                    style={[styles.label, active && styles.labelActive]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Keep a helper re-export for screens that hide the MiniPlayer (e.g., Mushaf).
export { usePlayerStore } from '@/store/playerStore';

const styles = StyleSheet.create({
  miniPlayerWrap: {
    marginHorizontal: 10,
    marginBottom: 8,
  },
  bar: {
    backgroundColor: TAB_BAR.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 10,
    // paddingBottom: the safe-area inset, injected once at the call site.
  },
  row: {
    ...PHYSICAL_ROW,
    height: TAB_BAR.controlsHeight,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabWrap: {
    // Each item caps at the reference 67pt and `space-between` spreads the
    // leftover width, so the four tabs stay evenly placed from 320pt to 480pt
    // without any item stretching into a slab.
    flex: 1,
    maxWidth: TAB_BAR.itemWidth,
  },
  item: {
    height: TAB_BAR.itemHeight,
    borderRadius: TAB_BAR.itemRadius,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  itemActive: {
    backgroundColor: TAB_BAR.activeFill,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: TAB_BAR.indicatorWidth,
    height: TAB_BAR.indicatorHeight,
    borderRadius: TAB_BAR.indicatorHeight / 2,
    backgroundColor: TAB_BAR.indicatorColor,
  },
  label: {
    ...RTL_TEXT,
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    fontWeight: '500',
    color: TAB_BAR.inactiveInk,
  },
  labelActive: {
    fontWeight: '700',
    color: TAB_BAR.activeInk,
  },
});
