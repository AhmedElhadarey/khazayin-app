/**
 * services/reciterPreview.ts — UI-facing entry for reciter audio previews
 * (onboarding). Mirrors services/lecturePlayback.ts: call straight from onPress;
 * never throws; failures surface as an Arabic toast (root ToastOverlay).
 */
import * as Sentry from '@sentry/react-native';

import { ONBOARDING_RECITER_PREVIEW_SOURCES, type PreviewSource } from '@/constants/settings';
import {
  PREVIEW_ERROR_MESSAGE,
  canPreviewAudio,
  startReciterPreview,
  stopReciterPreview,
} from '@/services/audioEngine';
import { usePreviewStore } from '@/store/previewStore';
import { useToastStore } from '@/store/toastStore';
import type { Reciter } from '@/types/content';

type Sources = Readonly<Record<string, PreviewSource>>;

/** The verified preview file for `reciter`, or null. Never reads `Reciter.archiveId`. */
export function previewSourceFor(
  reciter: Reciter,
  sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES,
): PreviewSource | null {
  return sources[reciter.id] ?? null;
}

/** Show a preview control only for a reciter with a source, on an engine that can preview. */
export function canPreview(
  reciter: Reciter,
  sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES,
): boolean {
  return canPreviewAudio() && previewSourceFor(reciter, sources) !== null;
}

export async function stopPreview(): Promise<void> {
  try {
    await stopReciterPreview();
  } catch (err) {
    // Best effort — the step is going away — but never silent.
    Sentry.captureException(err);
  }
}

/** Play/stop toggle for one row: stops the active reciter, otherwise starts this one. */
export async function toggleReciterPreview(
  reciter: Reciter,
  sources: Sources = ONBOARDING_RECITER_PREVIEW_SOURCES,
): Promise<void> {
  if (usePreviewStore.getState().reciterId === reciter.id) return stopPreview();
  const source = previewSourceFor(reciter, sources);
  if (!source) return;
  try {
    await startReciterPreview(reciter, source);
  } catch (err) {
    Sentry.captureException(err);
    useToastStore.getState().show({ message: PREVIEW_ERROR_MESSAGE });
  }
}
