export * from './icons';
export * from './patterns';
export * from './primitives';
export * from './art';
export * from './home';
export * from './library';
export * from './sheets';
export * from './state';
// Explicit re-export to disambiguate `SurahRow` from primitives barrel.
// The sections variant is the canonical one (track: khazain-saved_20260511 T13).
export { SurahRow } from './sections';
