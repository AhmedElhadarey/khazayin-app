/**
 * types/content.ts
 * ----------------
 * Domain model interfaces for the Khazain content service abstraction layer.
 * These types are NEW and deliberately do NOT collide with the legacy
 * types/index.ts (which is used only by legacy screens and must not be
 * modified).
 *
 * Track: khazain-content-service_20260506  Phase 0 / T0.1
 */

import type { ImageSourcePropType } from 'react-native';

// ---------------------------------------------------------------------------
// Generic async helpers
// ---------------------------------------------------------------------------

/** All possible states a remote-backed resource can be in. */
export type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

/** Generic async resource envelope — exported for consumers who want to pass
 *  the whole bundle as a prop; stores themselves keep `data / status / error`
 *  as separate fields for React equality granularity. */
export interface AsyncResource<T> {
  data: T;
  status: LoadState;
  error: Error | null;
}

/** Id-keyed lookup map — shorthand used in mock-data modules. */
export type Lookup<T> = Record<string, T>;

// ---------------------------------------------------------------------------
// Quran domain
// ---------------------------------------------------------------------------

export interface Surah {
  id: string;           // zero-padded, e.g. "001"
  number: number;       // 1..114
  displayNumber: string; // Arabic-Indic, two-digit, e.g. "٠١" — shown in the surah-list index badge
  name: string;         // e.g. "البقرة"
  meta: string;         // e.g. "مكية • 286 آية"
  revelationType: 'meccan' | 'medinan';
  ayahCount: number;
}

export interface Ayah {
  surahId: string;
  number: number;       // ayah number within surah
  text: string;         // diacritised Arabic
}

export interface Reciter {
  id: string;
  name: string;         // e.g. "محمد صديق المنشاوي"
  style: string;        // tab-key: "tajweed" | "murattal" | "mujawwad" | "hafs"
  styleLabel: string;   // Arabic label shown in the UI
  /**
   * Internet Archive series id for this reciter's recitation, mirroring
   * `Lecture.archiveId`. Absent until a reciter audio source exists, in which
   * case the surah list reports "no recording" and stays on the screen.
   */
  archiveId?: string;
}

export interface Qiraat {
  id: string;           // slug, e.g. "hafs-asim"
  name: string;         // e.g. "قراءة حفص عن عاصم"
}

// ---------------------------------------------------------------------------
// People domain
// ---------------------------------------------------------------------------

export interface Scholar {
  id: string;
  name: string;         // e.g. "عبد العزيز بن عبد الله بن باز"
  bio?: string;         // reserved for backend swap; unused by mock
  era?: string;         // reserved for backend swap; unused by mock
}

// ---------------------------------------------------------------------------
// Lecture / catalogue item
// ---------------------------------------------------------------------------

/**
 * Canonical catalogue row shape reused across prophet / books / queen / radio
 * screens. The same repeated inline shape appears four times in the codebase;
 * this consolidates it.
 */
export interface Lecture {
  id: string;
  title: string;
  scholar: string;
  duration: string;     // formatted ar-EG, e.g. "٤٥ د"
  category: 'prophet' | 'book' | 'queen' | 'radio' | 'scholar' | 'general';
  scholarId?: string;   // forward-link for joins after API swap
  archiveId?: string;   // Internet Archive item id (a lecture = one audio series). Episodes resolved at play time.
}

// ---------------------------------------------------------------------------
// Book domain
// ---------------------------------------------------------------------------

export interface Book {
  id: string;
  title: string;
  // Reserved for backend swap: author, coverUrl. Mock keeps minimal shape.
}

// ---------------------------------------------------------------------------
// Dawah domain
// ---------------------------------------------------------------------------

export interface DawahPoster {
  id: string;
  tone: string;         // hex colour driving card background
  title: string;        // short headline (was `t` in legacy inline shape)
  body: string;         // longer supporting line (was `b`)
  imageSource?: ImageSourcePropType; // bundled require()'d number OR { uri: string } from a CDN URL — see docs/api-contract.md §9.1
  month?: string;       // slug for grouping in dawah/[month].tsx
}

// ---------------------------------------------------------------------------
// Navigation / UI taxonomy
// ---------------------------------------------------------------------------

/**
 * One entry in the 9-item sections list screen.
 * Not "content" in the strictest sense but uses the same async-load pattern.
 */
export interface SectionEntry {
  id: string;
  route: string | null; // null = "coming soon"
  title: string;
  subtitle: string;
  count: string | null;
  iconKey: string;      // resolved at render-time via SECTION_ICONS map
}

/** One row in the More tab list. */
export interface MoreRow {
  id: string;
  title: string;
  subtitle?: string;
  iconKey: string;
  route?: string;       // internal route; undefined if external
  externalKey?: string; // key into MORE_EXTERNAL_URLS for Linking.openURL
  isExternal?: boolean;
}

/** One chip in the Library filter bar. */
export interface LibraryFilter {
  id: string;
  label: string;
  /** Display count shown alongside the label in the filter pill (e.g. "١٢").
   *  Optional — screens that don't render a count can ignore it. */
  count?: string;
}

// ---------------------------------------------------------------------------
// Saved items (added 2026-05-11 — savedStore track)
// ---------------------------------------------------------------------------

/** Content types that can be saved. Mirrors content domains except Ayah
 *  (deferred to v2). */
export type SavedType = 'surah' | 'scholar' | 'book' | 'lecture' | 'dawah';

/** Per-type minimum display snapshot. Captured at save time so the Library
 *  list renders correctly without the source domain store being loaded. */
export type SavedSnapshot =
  | { type: 'surah';   name: string; displayNumber: string; meta: string }
  | { type: 'scholar'; name: string }
  | { type: 'book';    title: string }
  | { type: 'lecture'; title: string; scholar: string; duration: string;
                       category: Lecture['category'] }
  | { type: 'dawah';   title: string; body: string; tone: string;
                       imageSource?: ImageSourcePropType };

/** Persisted shape. The `id` is the composite `${type}:${entityId}`. */
export interface SavedItem {
  id: string;
  type: SavedType;
  entityId: string;       // domain id: surah '001', scholar 's4', etc.
  savedAt: number;        // Date.now() at save
  snapshot: SavedSnapshot;
}
