/**
 * Type declaration for the platform-resolved `./client` module.
 * Metro picks `client.native.ts` on iOS/Android and `client.web.ts` on web;
 * both export the same surface, declared once here for TypeScript.
 */

import type * as SQLite from 'expo-sqlite';

export function openDb(): Promise<SQLite.SQLiteDatabase>;
export function __resetDbForTesting(): void;
