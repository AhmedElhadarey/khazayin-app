/**
 * services/audioEngine/rntp.ts
 * ----------------------------
 * THE guarded loader for react-native-track-player — the ONLY module that
 * imports the package directly. Every other engine-boundary module imports the
 * re-exports below instead.
 *
 * Why this exists: RNTP is a native module. Expo Go does not bundle it, and
 * merely importing the package evaluates a `NativeEventEmitter` at module scope,
 * which throws "a native module that doesn't exist" and takes the WHOLE app down
 * at startup (the import is pulled in transitively by the MiniPlayer). We load it
 * through `require()` inside a try/catch so the app degrades to an INERT audio
 * engine — every screen loads, playback is a no-op — in Expo Go and on web, and
 * behaves normally in a development/production build where the module is present.
 *
 * `nativeAudioAvailable` is false on web and in Expo Go, true in a real build.
 * Callers MUST guard on it (the engine's `isInert()`) before touching the
 * re-exported `TrackPlayer` or the enums — when the module is absent they are
 * `undefined`.
 */
import { Platform } from 'react-native';

type RNTPModule = typeof import('react-native-track-player');

let mod: RNTPModule | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-track-player') as RNTPModule;
  } catch {
    mod = null; // Expo Go / missing native module — degrade to inert.
  }
}

export const nativeAudioAvailable = mod != null;

// When the native module is absent these are `undefined`; every caller guards on
// `nativeAudioAvailable` before use, so the casts hold at the call sites.
export const TrackPlayer = mod?.default as RNTPModule['default'];
export const Capability = mod?.Capability as RNTPModule['Capability'];
export const State = mod?.State as RNTPModule['State'];
export const Event = mod?.Event as RNTPModule['Event'];
export const AppKilledPlaybackBehavior =
  mod?.AppKilledPlaybackBehavior as RNTPModule['AppKilledPlaybackBehavior'];

export type { Track } from 'react-native-track-player';
