/**
 * Web stub for the SQLite client. Never used at runtime — `db/index.ts`
 * routes web platform to `web-shim.ts` BEFORE attempting to import this
 * module. The stub exists only so Metro's web bundler doesn't follow the
 * `expo-sqlite` import chain into the WASM worker (which fails to bundle).
 */

export async function openDb(): Promise<never> {
  throw new Error('[db] openDb() must not be called on web — use the web shim');
}

export function __resetDbForTesting(): void {
  // no-op on web
}
