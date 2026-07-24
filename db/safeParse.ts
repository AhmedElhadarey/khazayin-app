/**
 * Guarded JSON.parse for values read out of SQLite (T2.1). A corrupt aggregate
 * row (manual edit, partial write, disk corruption) must not throw and zero the
 * whole snapshot — it logs once (dev) and returns the caller's fallback.
 */
export function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    if (__DEV__) {
      console.warn('[db] failed to parse stored JSON; using fallback', err);
    }
    return fallback;
  }
}
