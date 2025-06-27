/**
 * Options accepted by {@link HttpClient}.
 */
export interface HttpClientOptions {
  /** Maximum number of retry attempts when a request fails (default: 2). */
  retries?: number;
  /** Base delay (ms) for the exponential back-off (default: 500 ms). */
  retryDelayMs?: number;
  /** Timeout (ms) for the underlying `fetch` (default: 10 000 ms). */
  timeoutMs?: number;
}

/**
 * Minimal interface the rest of the application depends on.
 * Only `GET` is needed for scraping.
 */
export interface IHttpClient {
  /**
   * Download the given URL and return its body as **string**.
   *
   * @throws {@link HttpError} if the request fails after the configured retries.
   */
  get(url: string): Promise<string>;
}

/**
 * Error thrown by {@link HttpClient} when all retries fail.
 */
export class HttpError extends Error {
  constructor(
    public readonly url: string,
    public readonly status: number | null,
    public readonly cause: unknown,
  ) {
    super(
      `HTTP request failed (${status ?? 'timeout'}) for ${url}: ${String(
        cause,
      )}`,
    );
    this.name = 'HttpError';
  }
}


/**
 * Simple, robust HTTP client — tailored for HTML scraping.
 *
 *  - auto-retries with exponential back-off on network errors or 5xx/429,
 *  - configurable timeout using `AbortController`,
 *  - minimal surface : only `GET` returning `string`.
 */
export class HttpClient implements IHttpClient {
  private readonly retries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(opts: HttpClientOptions = {}) {
    this.retries = opts.retries ?? 2;
    this.retryDelayMs = opts.retryDelayMs ?? 500;
    this.timeoutMs = opts.timeoutMs ?? 10_000;
  }

  /* --------------------------------------------------------------
   * Public API
   * -------------------------------------------------------------- */

  public async get(url: string): Promise<string> {
    return this.requestWithRetry(url, this.retries);
  }

  /* --------------------------------------------------------------
   * Internal helpers
   * -------------------------------------------------------------- */

  /** Single fetch attempt with timeout handling. */
  private async fetchOnce(url: string): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);

    try {
      return await fetch(url, { signal: ctrl.signal, redirect: 'follow' });
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Retry wrapper with exponential back-off.
   *
   * @param url   Target URL.
   * @param left  Attempts remaining.
   */
  private async requestWithRetry(url: string, left: number): Promise<string> {
    try {
      const res = await this.fetchOnce(url);

      // 2xx/3xx are accepted; 4xx (except 429) bubble up immediately.
      if (res.ok) return res.text();

      if (this.shouldRetry(res.status) && left > 0) {
        await this.delay(this.backoffDelayMs(left));
        return this.requestWithRetry(url, left - 1);
      }

      throw new HttpError(url, res.status, `status ${res.status}`);
    } catch (err) {
      // abort/time-out triggers DOMException whose `name === 'AbortError'`
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';

      if (left > 0 && (isTimeout || this.isNetworkError(err))) {
        await this.delay(this.backoffDelayMs(left));
        return this.requestWithRetry(url, left - 1);
      }

      throw new HttpError(url, null, err);
    }
  }

  /** Back-off formula: `delay = retryDelayMs * 2^(retriesLeftInitial - retriesLeft)` */
  private backoffDelayMs(attemptsLeft: number): number {
    const exp = this.retries - attemptsLeft + 1;
    return this.retryDelayMs * 2 ** (exp - 1);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  /** 5xx or “Too Many Requests” can be retried. */
  private shouldRetry(status: number): boolean {
    return status >= 500 || status === 429;
  }

  /** Heuristics: any error without a numeric `statusCode` is network-level. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private isNetworkError(err: any): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      !Number.isFinite((err as { statusCode?: unknown }).statusCode)
    );
  }
}
