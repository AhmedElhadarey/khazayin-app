import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sheetColumn } from '@/constants/responsive';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { KhazainColors } from '@/constants/theme';
import { textStyle } from '@/constants/typography';
import { SHEET_CHROME } from '@/constants/layout';
import { SheetHandle } from './SheetHandle';

/**
 * The list-sheet frame (Figma 2457:954): top radius 16, a 1pt `#D7B995` @ 16%
 * stroke, a 36 x 4 grabber at y 8, a centred 20pt title box at y 28-48, the
 * first row at y 56, and a height of 712 of the 844pt frame.
 */
export const SHEET_LIST_GEOMETRY = {
  radius: 16,
  strokeWidth: 1,
  strokeColor: KhazainColors.sheetStroke,
  grabberWidth: 36,
  grabberHeight: 4,
  grabberTop: 8,
  titleTop: 28,
  titleBottom: 48,
  firstRowTop: 56,
  heightOfFrame: 712,
  frameHeight: 844,
} as const;

export function sheetListHeight(windowHeight: number): number {
  return Math.round(
    (windowHeight * SHEET_LIST_GEOMETRY.heightOfFrame) / SHEET_LIST_GEOMETRY.frameHeight,
  );
}

/** The fixed-height list layout (frame 2457:954). Owns the window-size and title-height state. */
function ListSheetFrame({
  title,
  onClose,
  children,
  column,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  column: StyleProp<ViewStyle>;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const [titleHeight, setTitleHeight] = React.useState(0);
  const g = SHEET_LIST_GEOMETRY;
  // Scale 1: the 20pt box leaves the first row at 56. At large font scales
  // the title grows past 20, so the rows move down with it (8pt gap).
  const listBodyTop = Math.max(
    g.firstRowTop,
    g.titleTop + titleHeight + (g.firstRowTop - g.titleBottom),
  );
  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
      />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.listWrap, { height: sheetListHeight(windowHeight) }, column]}
      >
        <View style={styles.listGrabber} />
        <View
          style={styles.listTitleBox}
          onLayout={(e) => setTitleHeight(e.nativeEvent.layout.height)}
        >
          <Text style={styles.listTitle}>{title}</Text>
        </View>
        <View style={[styles.listBody, { paddingTop: listBodyTop }]}>{children}</View>
        <View pointerEvents="none" style={styles.listStroke} />
      </SafeAreaView>
    </View>
  );
}

// Bottom-sheet shell for transparent modal routes.
// Renders a dark backdrop + cream card pinned to the bottom with a drag-handle and centered title.
export function SheetShell({
  title,
  onClose,
  children,
  layout = 'default',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** `list`: the fixed-height frame geometry above; children fill it (scroll inside). */
  layout?: 'default' | 'list';
}) {
  const { width, sideInsets } = useResponsiveLayout();
  // Tablets: a centred 600pt card, still pinned to the bottom by `root`.
  const column = sheetColumn(width, sideInsets);
  return layout === 'list' ? (
    <ListSheetFrame title={title} onClose={onClose} column={column}>
      {children}
    </ListSheetFrame>
  ) : (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
      />
      <SafeAreaView edges={['bottom']} style={[styles.sheetWrap, column]}>
        <View style={styles.sheet}>
          <SheetHandle />
          <Text style={styles.title}>{title}</Text>
          <View>{children}</View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SHEET_CHROME.backdrop,
  },
  sheetWrap: {
    backgroundColor: KhazainColors.cream50,
    borderTopLeftRadius: SHEET_CHROME.topRadius,
    borderTopRightRadius: SHEET_CHROME.topRadius,
    shadowColor: 'rgba(20,15,8,0.15)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
  },
  listWrap: {
    backgroundColor: KhazainColors.pageBg,
    borderTopLeftRadius: SHEET_LIST_GEOMETRY.radius,
    borderTopRightRadius: SHEET_LIST_GEOMETRY.radius,
    overflow: 'hidden',
  },
  listGrabber: {
    position: 'absolute',
    top: SHEET_LIST_GEOMETRY.grabberTop,
    alignSelf: 'center',
    width: SHEET_LIST_GEOMETRY.grabberWidth,
    height: SHEET_LIST_GEOMETRY.grabberHeight,
    borderRadius: 2.5,
    backgroundColor: KhazainColors.hairlineWarm,
  },
  listTitleBox: {
    position: 'absolute',
    top: SHEET_LIST_GEOMETRY.titleTop,
    left: 0,
    right: 0,
    minHeight: SHEET_LIST_GEOMETRY.titleBottom - SHEET_LIST_GEOMETRY.titleTop,
    justifyContent: 'center',
  },
  listTitle: {
    ...textStyle('body', { color: KhazainColors.inkTitle, textAlign: 'center' }),
  },
  listBody: { flex: 1 },
  // Drawn as an overlay so the 1pt stroke does not inset the absolute offsets.
  listStroke: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: SHEET_LIST_GEOMETRY.radius,
    borderTopRightRadius: SHEET_LIST_GEOMETRY.radius,
    borderWidth: SHEET_LIST_GEOMETRY.strokeWidth,
    borderBottomWidth: 0,
    borderColor: SHEET_LIST_GEOMETRY.strokeColor,
  },
  sheet: {
    paddingTop: 10,
    paddingHorizontal: SHEET_CHROME.paddingHorizontal,
    paddingBottom: 4,
  },
  title: {
    ...textStyle('bodyLarge', { color: KhazainColors.inkTitle, textAlign: 'center' }),
    marginTop: 10,
    marginBottom: 10,
  },
});
