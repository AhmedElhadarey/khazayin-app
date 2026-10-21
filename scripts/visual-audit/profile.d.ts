export type ShiftResult = {
  /** Rows the app must move by to match the reference. Positive = app is lower. */
  shift: number;
  /** Pearson correlation at that shift, in [-1, 1]. */
  score: number;
};

export declare function rowProfile(
  data: ArrayLike<number>,
  width: number,
  height: number,
  channels: number,
): Float64Array;

export declare function pearson(a: ArrayLike<number>, b: ArrayLike<number>): number;

export declare function bestShift(
  ref: ArrayLike<number>,
  app: ArrayLike<number>,
  from: number,
  to: number,
  search: number,
): ShiftResult;
