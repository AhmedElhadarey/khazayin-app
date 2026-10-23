import { KhazainColors } from '@/constants/theme';
import { ayahMarker, type TextLine } from '@/services/mushafNavigation';
import type { MushafA11yAction } from '@/services/mushafChrome';
import type { PageSegment } from '@/services/mushafPageTracking';
import React from 'react';
import { StyleSheet, Text, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';

type Ayat = PageSegment['ayat'];

/**
 * The end-of-ayah medallion. The string is `ayahMarker(n)`, the same one
 * `ayahCharOffset` / `segmentCharLength` count, so deep-link precision holds.
 */
function AyahNum({ n }: { n: number }) {
  return (
    <Text style={styles.ayahNum} suppressHighlighting>
      {ayahMarker(n)}
    </Text>
  );
}

/**
 * The ayah tree of one page: up to a few hundred nested Texts. Memoised on
 * stable props only, so a chrome toggle (new accessibility actions on the
 * outer Text) does not rebuild it.
 */
const SegmentBody = React.memo(function SegmentBody({
  ayat,
  targetAyah,
  noteLongPress,
  takeAyahNote,
}: {
  ayat: Ayat;
  targetAyah: number | null;
  noteLongPress: () => void;
  takeAyahNote: (ayah?: number) => void;
}) {
  return (
    <>
      {ayat.map((a, i) => (
        <React.Fragment key={a.number}>
          <Text
            onLongPress={() => {
              noteLongPress();
              takeAyahNote(a.number);
            }}
            suppressHighlighting
            style={a.number === targetAyah ? styles.ayahHighlight : undefined}
          >
            {a.text}
          </Text>
          <AyahNum n={a.number} />
          {i < ayat.length - 1 ? ' ' : ''}
        </React.Fragment>
      ))}
    </>
  );
});

export type AyatSegmentsProps = {
  segments: readonly PageSegment[];
  type: { fontSize: number; lineHeight: number };
  targetAyah: number | null;
  /** The layout key (`sheetWidth:fontSize`) these segments render under; handed back with each measurement. */
  typeKey: string;
  /** Page-level custom actions; the only prop that follows the chrome. */
  accessibilityActions: readonly MushafA11yAction[];
  onSegmentLayout: (page: number, layout: { y: number; height: number }, typeKey: string) => void;
  onSegmentTextLayout: (page: number, lines: TextLine[], typeKey: string) => void;
  onA11yAction: (e: AccessibilityActionEvent) => void;
  noteLongPress: () => void;
  takeAyahNote: (ayah?: number) => void;
};

/** One Text per Madani page (the unit the tracker and the deep-link scroll measure). */
export const AyatSegments = React.memo(function AyatSegments({
  segments,
  type,
  targetAyah,
  typeKey,
  accessibilityActions,
  onSegmentLayout,
  onSegmentTextLayout,
  onA11yAction,
  noteLongPress,
  takeAyahNote,
}: AyatSegmentsProps) {
  return (
    <>
      {segments.map((segment) => (
        <Text
          key={segment.page}
          onLayout={(e: LayoutChangeEvent) =>
            onSegmentLayout(segment.page, e.nativeEvent.layout, typeKey)
          }
          onTextLayout={(e) => onSegmentTextLayout(segment.page, e.nativeEvent.lines, typeKey)}
          style={[styles.ayatBody, { fontSize: type.fontSize, lineHeight: type.lineHeight }]}
          accessibilityActions={accessibilityActions as MushafA11yAction[]}
          onAccessibilityAction={onA11yAction}
        >
          <SegmentBody
            ayat={segment.ayat}
            targetAyah={targetAyah}
            noteLongPress={noteLongPress}
            takeAyahNote={takeAyahNote}
          />
        </Text>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  ayatBody: {
    fontFamily: 'Amiri-Bold',
    fontSize: 22,
    lineHeight: 48,
    color: KhazainColors.mushafInk,
    fontWeight: '400',
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  ayahHighlight: { backgroundColor: KhazainColors.cream200 },
  // Inherits the body size: Amiri draws the medallion round the digits at the
  // size of the text beside it.
  ayahNum: {
    color: KhazainColors.gold600,
    fontFamily: 'Amiri-Bold',
    fontWeight: '400',
  },
});
