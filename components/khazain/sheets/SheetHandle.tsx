import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { SHEET_CHROME } from '@/constants/layout';

/** The grab bar shared by every default sheet and modal (SHEET_CHROME). */
export function SheetHandle({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.handle, style]} />;
}

const styles = StyleSheet.create({
  handle: {
    width: SHEET_CHROME.handleWidth,
    height: SHEET_CHROME.handleHeight,
    borderRadius: SHEET_CHROME.handleHeight / 2,
    backgroundColor: SHEET_CHROME.handleColor,
    alignSelf: 'center',
  },
});
