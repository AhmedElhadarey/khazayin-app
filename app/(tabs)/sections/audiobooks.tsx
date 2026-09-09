import { AudioWaveBadge } from '@/components/khazain';
import { RailedLectureList } from '@/components/khazain/sections/RailedLectureList';
import { AUDIOBOOKS } from '@/data/content/audiobooks';
import { startLecturePlayback } from '@/services/lecturePlayback';
import React from 'react';

// كتب صوتية — Figma node 2869:2088.
//
// Content is the deterministic mock set in data/content/audiobooks.ts: there
// is no audiobook endpoint yet, so this screen does not go through the content
// service and has no loading state to settle.
export default function AudiobooksScreen() {
  return (
    <RailedLectureList
      title="كتب صوتية"
      items={AUDIOBOOKS}
      badge={(size) => <AudioWaveBadge size={size} />}
      onPressItem={startLecturePlayback}
    />
  );
}
