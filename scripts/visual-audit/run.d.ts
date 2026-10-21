import type { CaptureTarget, MaskRegion } from './manifest';

export declare function parseArgs<T extends Record<string, string | number>>(
  argv: string[],
  defaults: T,
): T;

export declare function parseCliArgs<T extends Record<string, string | number>>(
  argv: string[],
  defaults: T,
): T;

export declare function settle(ms: number): Promise<void>;

export declare function reportRun(run: {
  platform: 'ios' | 'android';
  out: string;
  captured: CaptureTarget[];
  skipped: CaptureTarget[];
  masks: MaskRegion[];
}): void;
