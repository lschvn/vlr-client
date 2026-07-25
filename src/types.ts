/**
 * Standard wrapper returned by every public VlrClient method.
 * Makes it easy to surface both the **data** and **runtime metrics**
 * (perf + cache) without extra parameters.
 */
export interface Envelope<T> {
  /** Parsed or computed result. */
  data: T;

  /** Execution metadata – useful for logging and monitoring. */
  info: {
    /** Total calls performed by the underlying Metrics instance. */
    callCount: number;
    /** Cumulative duration for all calls (ms). */
    elapsedMs: number;
    /** Success ratio in the range 0-1. */
    successRate: number;
    /** True when the response came from the local cache. */
    fromCache: boolean;
  };
}
