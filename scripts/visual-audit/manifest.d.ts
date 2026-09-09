export type FigmaScreenStatus = 'implemented' | 'missing-route' | 'transition';

export type FigmaScreenRecord = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  appRoute: string | null;
  state?: Record<string, string>;
  status: FigmaScreenStatus;
  referenceImage: string;
};

export type CaptureKind = 'deep-link' | 'manual' | 'skip';

export type TargetClassification = {
  kind: CaptureKind;
  /** Operator-facing explanation; `null` only for fully automatic targets. */
  reason: string | null;
};

export type CaptureTarget = TargetClassification & {
  nodeId: string;
  name: string;
  appRoute: string | null;
  state: Record<string, string> | null;
  deepLink: string | null;
  fileName: string;
  referenceImage: string;
};

export type MaskRegion = {
  label: string;
  edge: 'top' | 'bottom';
  heightRatio: number;
};

export declare const DEEP_LINKABLE_STATE_KEYS: ReadonlySet<string>;
export declare const DEFAULT_SCREEN_STATE: Record<string, Record<string, string>>;
export declare const MANIFEST_PATH: string;
export declare const REPO_ROOT: string;
export declare const MASK_REGIONS: Record<'ios' | 'android', MaskRegion[]>;

export declare function loadScreenManifest(manifestPath?: string): FigmaScreenRecord[];
export declare function captureFileName(record: FigmaScreenRecord): string;
export declare function buildDeepLink(scheme: string, record: FigmaScreenRecord): string | null;
export declare function classifyTarget(record: FigmaScreenRecord): TargetClassification;
export declare function buildCaptureTargets(
  manifest: FigmaScreenRecord[],
  scheme?: string,
): CaptureTarget[];
