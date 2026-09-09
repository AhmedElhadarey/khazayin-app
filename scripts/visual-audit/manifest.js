'use strict';

/**
 * Pure helpers shared by the iOS and Android capture harnesses.
 *
 * Written as CommonJS with a sibling `manifest.d.ts` so that the same file is
 * loaded unchanged by Node (from the `.mjs` capture CLIs), by Jest, and by the
 * TypeScript compiler — no build step and no extra dev dependency.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  'docs/visual-regression/figma-mobile-screen-map.json',
);

/**
 * State keys that expo-router actually reads off the URL. Every other state key
 * describes in-screen interaction (a segmented tab, a selected row) that a deep
 * link cannot reach, so those frames are captured by a documented tap sequence.
 */
const DEEP_LINKABLE_STATE_KEYS = new Set(['surah']);

/**
 * In-screen state a route already shows on arrival. A frame pinned to one of
 * these needs no tap sequence, so it stays fully automatic.
 */
const DEFAULT_SCREEN_STATE = {
  '/sections/reciter': { tab: 'tajweed' },
};

/**
 * Device chrome only. Masking app content would hide the very regressions this
 * harness exists to catch, so these regions are anchored to the screen edges
 * and expressed as a fraction of screen height.
 */
const MASK_REGIONS = {
  ios: [
    { label: 'status bar', edge: 'top', heightRatio: 0.06 },
    { label: 'home indicator', edge: 'bottom', heightRatio: 0.025 },
  ],
  android: [
    { label: 'status bar', edge: 'top', heightRatio: 0.045 },
    { label: 'navigation bar', edge: 'bottom', heightRatio: 0.035 },
  ],
};

/** Reads the frozen 28-frame manifest produced by Task 0.1. */
function loadScreenManifest(manifestPath = MANIFEST_PATH) {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/** `docs/.../16-2349-982.png` → `16-2349-982`. */
function referenceSlug(record) {
  return path.basename(record.referenceImage, '.png');
}

function routeSlug(route) {
  const trimmed = route.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
}

function stateSlug(state) {
  return Object.keys(state)
    .sort()
    .map((key) => `${key}-${state[key]}`)
    .join('_');
}

/**
 * Capture filename. Prefixed with the audit sequence + node ID so a capture
 * directory sorts alongside `docs/audit/2026-09-09/figma-reference`, and
 * suffixed with the state so two states of one route never collide.
 */
function captureFileName(record) {
  const parts = [referenceSlug(record)];
  parts.push(record.appRoute === null ? frameKind(record) : routeSlug(record.appRoute));
  if (record.state) parts.push(stateSlug(record.state));
  return `${parts.join('__')}.png`;
}

function frameKind(record) {
  return record.name.toLowerCase().startsWith('splash') ? 'splash' : 'no-route';
}

/** Deep link for a record, or null when there is no route to open. */
function buildDeepLink(scheme, record) {
  if (record.appRoute === null) return null;
  const query = Object.keys(record.state || {})
    .filter((key) => DEEP_LINKABLE_STATE_KEYS.has(key))
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(record.state[key])}`)
    .join('&');
  const base = `${scheme}://${record.appRoute}`;
  return query === '' ? base : `${base}?${query}`;
}

/**
 * Decides how a frame is reached: automatically by deep link, manually by a
 * documented tap sequence, or not at all.
 */
function classifyTarget(record) {
  if (record.status === 'transition') {
    return {
      kind: 'skip',
      reason: `${record.nodeId} is a transition frame; capture it from a cold-start screen recording instead.`,
    };
  }
  if (record.status === 'missing-route' || record.appRoute === null) {
    return {
      kind: 'skip',
      reason: `${record.nodeId} is missing-route; no app route exists yet.`,
    };
  }
  const defaults = DEFAULT_SCREEN_STATE[record.appRoute] || {};
  const interactionKeys = Object.keys(record.state || {}).filter(
    (key) => !DEEP_LINKABLE_STATE_KEYS.has(key) && defaults[key] !== record.state[key],
  );
  if (interactionKeys.length > 0) {
    return {
      kind: 'manual',
      reason: `${record.nodeId} needs a manual tap sequence: open ${record.appRoute}, then select ${interactionKeys
        .map((key) => `${key}=${record.state[key]}`)
        .join(', ')}.`,
    };
  }
  return { kind: 'deep-link', reason: null };
}

/**
 * One target per manifest record — including skipped ones, so a run can report
 * exactly which frames it did not cover rather than silently shrinking.
 */
function buildCaptureTargets(manifest, scheme = 'khazayinapp') {
  return manifest.map((record) => {
    const { kind, reason } = classifyTarget(record);
    return {
      nodeId: record.nodeId,
      name: record.name,
      appRoute: record.appRoute,
      state: record.state || null,
      kind,
      reason,
      deepLink: kind === 'deep-link' ? buildDeepLink(scheme, record) : null,
      fileName: captureFileName(record),
      referenceImage: record.referenceImage,
    };
  });
}

module.exports = {
  DEEP_LINKABLE_STATE_KEYS,
  DEFAULT_SCREEN_STATE,
  MANIFEST_PATH,
  MASK_REGIONS,
  REPO_ROOT,
  buildCaptureTargets,
  buildDeepLink,
  captureFileName,
  classifyTarget,
  loadScreenManifest,
};
