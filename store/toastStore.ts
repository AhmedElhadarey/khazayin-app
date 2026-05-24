/**
 * store/toastStore.ts
 * -------------------
 * Transient singleton store for the global Toast primitive.
 * NOT persisted — toasts are ephemeral.
 *
 * Replacement semantics: each show() bumps `id` and replaces `current`.
 * No queue. The overlay component re-runs its animation when `id` changes.
 *
 * Track: khazain-saved_20260511  T3
 */

import { create } from 'zustand';

export interface ToastAction {
  label: string;          // e.g. 'تراجع'
  onPress: () => void;
}

export interface ToastConfig {
  id: number;             // bumps on each show() — used by overlay to re-trigger animation
  message: string;        // Arabic copy shown in the toast
  action?: ToastAction;   // optional undo button
  durationMs?: number;    // default 5000 for unsave (Board condition #6); 3000 for save
}

export interface ToastState {
  current: ToastConfig | null;
  show(config: Omit<ToastConfig, 'id'>): void;
  dismiss(): void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: (config) => set({ current: { ...config, id: nextId++ } }),
  dismiss: () => set({ current: null }),
}));
