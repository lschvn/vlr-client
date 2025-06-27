/**
 * Simple in-memory metrics collector.
 *
 * Tracks:
 *  • total number of calls
 *  • number of successful and failed calls
 *  • cumulative elapsed time (ms)
 *
 * Designed to be *cheap* (no Prometheus client) yet sufficient for
 * embedding in the `Envelope.info` object returned by VlrClient.
 */
export class Metrics {
  /** Total calls — success + failure. */
  private callCount = 0;
  /** Calls that completed without throwing. */
  private success = 0;
  /** Calls that threw an error. */
  private failure = 0;
  /** Sum of durations (ms) for all calls. */
  private totalMs = 0;

  /**
   * Record a successful call.
   * @param elapsedMs   Duration for this call in milliseconds.
   */
  trackSuccess(elapsedMs: number): void {
    this.callCount++;
    this.success++;
    this.totalMs += elapsedMs;
  }

  /**
   * Record a failed call.
   * @param elapsedMs   Duration for this call in milliseconds.
   */
  trackFailure(elapsedMs: number): void {
    this.callCount++;
    this.failure++;
    this.totalMs += elapsedMs;
  }

  /**
   * Current aggregated snapshot.
   */
  report(): {
    callCount: number;
    elapsedMs: number;
    successRate: number; // 0-1
  } {
    return {
      callCount: this.callCount,
      elapsedMs: this.totalMs,
      successRate: this.callCount === 0 ? 1 : this.success / this.callCount,
    };
  }

  /** Reset all counters (handy in unit tests). */
  reset(): void {
    this.callCount = this.success = this.failure = this.totalMs = 0;
  }
}
