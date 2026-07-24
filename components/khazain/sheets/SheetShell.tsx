import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KhazainColors } from '@/constants/theme';

// Bottom-sheet shell for transparent modal routes.
// Renders a dark backdrop + cream card pinned to the bottom with a drag-handle and centered title.
export function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="إغلاق"
      />
      <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
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
    backgroundColor: 'rgba(20,15,8,0.45)',
  },
  sheetWrap: {
    backgroundColor: KhazainColors.cream50,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: 'rgba(20,15,8,0.15)',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 20,
  },
  sheet: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(141,107,52,0.25)',
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Amiri-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: KhazainColors.navy800,
    textAlign: 'center',
    marginBottom: 10,
    writingDirection: 'rtl',
  },
});
