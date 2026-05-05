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

// Visual RTL order (right → left): home, library, sections, more.
// With forceRTL auto-flip + flexDirection:'row', the first JSX child lands on the right.
const TAB_ORDER: TabKey[] = ['more', 'sections', 'library', 'index'];

// Colors pulled from the new spec.
const BAR_BG = '#184B76'; // KhazainColors.navy
const INACTIVE = 'rgba(241, 231, 221, 0.85)'; // #F1E7DD at 85%
const ACTIVE_INK = '#281E13';
const ACTIVE_CHIP_BG = '#F1E7DD';
const GOLD_BAR = '#C1A584';

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
                style={styles.tabWrap}
              >
                {active ? (
                  // Active: cream chip with gold top bar + drop shadow.
                  // Branched render so shadow/gold bar can't leak onto inactive tabs.
                  <View style={styles.activeChip}>
                    <View style={styles.goldBar} />
                    <Icon size={20} color={ACTIVE_INK} strokeWidth={1.6} />
                    <Text style={styles.activeLabel} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                ) : (
                  // Inactive: glyph + label sit directly on navy.
                  <View style={styles.inactive}>
                    <Icon size={20} color={INACTIVE} strokeWidth={1.6} />
                    <Text style={styles.inactiveLabel} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                )}
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
    backgroundColor: BAR_BG,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 14,
    paddingHorizontal: 10,
    // paddingBottom: 22 + safe-area, injected at call site
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  tabWrap: {
    flex: 1,
  },
  inactive: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 6,
  },
  inactiveLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    fontWeight: '500',
    color: INACTIVE,
    writingDirection: 'rtl',
  },
  activeChip: {
    backgroundColor: ACTIVE_CHIP_BG,
    borderRadius: 14,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    overflow: 'hidden', // clips gold bar to match chip's rounded top corners
    // Drop shadow per spec: 0 2 6 rgba(0,0,0,0.18)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  goldBar: {
    position: 'absolute',
    top: 0,
    left: '18%',
    right: '18%',
    height: 4,
    backgroundColor: GOLD_BAR,
    // Bottom corners rounded only — top stays square/flush with the chip's top edge.
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  activeLabel: {
    fontFamily: 'TheSansArabic',
    fontSize: 11,
    fontWeight: '700',
    color: ACTIVE_INK,
    writingDirection: 'rtl',
  },
});
