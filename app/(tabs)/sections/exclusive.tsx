import { SparkleBadge } from '@/components/khazain';
import { RailedLectureList } from '@/components/khazain/sections/RailedLectureList';
import { EXCLUSIVE_ITEMS } from '@/data/content/exclusive';
import { startLecturePlayback } from '@/services/lecturePlayback';
import React from 'react';

// حصريات خزائن الرحمن — Figma node 2869:2306.
//
// Content is the deterministic mock set in data/content/exclusive.ts: there is
// no exclusives endpoint yet, so this screen does not go through the content
// service and has no loading state to settle.
export default function ExclusiveScreen() {
  return (
    <RailedLectureList
      title="حصريات خزائن الرحمن"
      items={EXCLUSIVE_ITEMS}
      badge={(size) => <SparkleBadge size={size} />}
      onPressItem={startLecturePlayback}
    />
  );
}
