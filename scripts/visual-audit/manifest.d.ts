export type FigmaScreenStatus = 'implemented' | 'missing-route' | 'transition';

export type FigmaScreenRecord = {
  nodeId: string;
  name: string;
  width: number;
  height: number;
  appRoute: string | null;
  state?: Record<string, string>;
  status: FigmaScreenStatus;
  /**
   * A short string that is on screen once this route has actually rendered.
   * Used to reject a capture taken of a splash, a blank screen, or a stale
   * bundle. Diacritics are ignored when matching.
   */
  readyText?: string;
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
  readyText?: string;
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

export type ScreenRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Screen rect inside the 500x880 reference device mockups. */
export declare const REFERENCE_SCREEN: Readonly<ScreenRect>;
/** Points per reference pixel (393 pt across REFERENCE_SCREEN.width). */
export declare const PT_PER_REFERENCE_PX: number;
/** Landmark tolerance from design section 8, in points. */
export declare const TOLERANCE_PT: number;

export declare function loadScreenManifest(manifestPath?: string): FigmaScreenRecord[];
export declare function captureFileName(record: FigmaScreenRecord): string;
export declare function buildDeepLink(scheme: string, record: FigmaScreenRecord): string | null;
export declare function classifyTarget(record: FigmaScreenRecord): TargetClassification;
/** Strips Arabic diacritics and collapses whitespace, for tolerant matching. */
export declare function normalizeArabic(value: string): string;
/** True when an Android view-hierarchy dump actually shows `readyText`. */
export declare function screenHasReadyText(
  hierarchyXml: string,
  readyText: string | undefined,
): boolean;
export declare function buildCaptureTargets(
  manifest: FigmaScreenRecord[],
  scheme?: string,
): CaptureTarget[];
