import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PHYSICAL_ROW, TAB_BAR, TAB_PHYSICAL_ORDER } from '@/constants/layout';
import { CHROME_MAX_FONT_SCALE, textStyle } from '@/constants/typography';
import {
  NavHomeIcon,
  NavLibraryIcon,
  NavMoreIcon,
  NavSectionsIcon,
  type NavIconProps,
} from '../icons/nav';
import { usePlayerStore as usePlayerStoreLocal } from '@/store/playerStore';
import { MiniPlayer } from './MiniPlayer';

// "index" is the home tab (expo-router's default route name within the (tabs) group).
type TabKey = 'index' | 'library' | 'sections' | 'more';

// Figma component 2001:17457 pairs each tab with a Vuesax icon and ships two
// variants of it — outline while inactive, solid (`bulk`) while active.
const TAB_META: Record<
  TabKey,
  { label: string; Icon: React.ComponentType<NavIconProps> }
> = {
  index: { label: 'الرئيسية', Icon: NavHomeIcon },
  library: { label: 'مكتبتي', Icon: NavLibraryIcon },
  sections: { label: 'الأقسام', Icon: NavSectionsIcon },
  more: { label: 'المزيد', Icon: NavMoreIcon },
};

// Physical order is authored left → right and pinned with `PHYSICAL_ROW`
// (`direction: 'ltr'`), so it renders identically on iOS, Android, web, a cold
// start, and a Fast Refresh. See the RTL contract in `constants/layout.ts`.
//
// Left → right: More, Sections, Library, Home — matching the `navigation`
// instance in Figma node 2031:5675 (the Sections frame that carries the bar).

/**
 * The MiniPlayer on its own, for the routes that do not carry the navy bar.
 *
 * The bar is a four-root control — `shouldShowMainTabBar` keeps it to `/`,
 * `/library`, `/sections` and `/more`, which is what the frames draw. But the
 * MiniPlayer used to live *inside* it, and playback always starts on a nested
 * route (a scholar's lectures, a reciter's surahs). So audio would start, the
 * foreground service would come up, and the screen would show no player at
 * all: nothing to pause, nothing naming the track. Verified on device —
 * `MusicService` foregrounded and `AudioTrack` running with no control on
 * screen.
 *
 * Rendering the dock instead of `null` puts the player wherever it is playing
 * without putting the bar where the design does not want it. It returns `null`
 * when nothing is playing, so React Navigation measures no inset and a quiet
 * nested screen is laid out exactly as before.
 */
export function MiniPlayerDock() {
  const insets = useSafeAreaInsets();
  const isVisible = usePlayerStoreLocal((s) => s.isVisible);
  const track = usePlayerStoreLocal((s) => s.track);
  if (!isVisible || !track) return null;
  return (
    <View style={[styles.miniPlayerWrap, { marginBottom: 8 + insets.bottom }]}>
      <MiniPlayer />
    </View>
  );
}

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
                    color={active ? TAB_BAR.activeInk : TAB_BAR.inactiveInk}
                    active={active}
                  />
                  <Text
                    style={[styles.label, active && styles.labelActive]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={CHROME_MAX_FONT_SCALE}
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
    // minHeight, not height: at a large system font scale the label's line box
    // grows and a fixed height clipped the icon straight out of the item.
    minHeight: TAB_BAR.controlsHeight,
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
    minHeight: TAB_BAR.itemHeight,
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
    // Figma 2001:17457 sets this in TheSansArabic Bold 12; `label` is that
    // role. It was 11 at weight 500.
    ...textStyle('label', { color: TAB_BAR.inactiveInk }),
  },
  labelActive: {
    color: TAB_BAR.activeInk,
  },
});
