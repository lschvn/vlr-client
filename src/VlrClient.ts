import { HttpClient, type IHttpClient } from './core/http/HttpClient';
import type { ICacheAdapter } from './core/cache/ICacheAdapter';
import { MemoryLRU } from './core/cache/MemoryLRU';
import type { ILogger } from './core/log/ILogger';
import { PinoLogger } from './core/log/PinoLogger';
import { Metrics } from './core/metrics/Metrics';

// Domain service(s)
import { UpcomingMatchService } from './services/UpcomingMatch';

// Data contracts
import type { Envelope } from './types.d';
import type { MatchIncoming } from './models/MatchIncoming';


export interface VlrClientOptions {
  /** Enable the built-in in-memory cache. */
  cache?: boolean;
  /** TTL (ms) applied by default to cached entries — ignored if `cache` is false. */
  cacheTTL?: number;
  /** Provide your own HTTP implementation (defaults to {@link HttpClient}). */
  httpClient?: IHttpClient;
  /** Custom logger (defaults to {@link PinoLogger}). */
  logger?: ILogger;
}

export class VlrClient {
  /* Private collaborators */
  private readonly http: IHttpClient;
  private readonly cache?: ICacheAdapter;
  private readonly logger: ILogger;
  private readonly metrics = new Metrics();

  /* Domain-level services */
  private readonly upcomingSvc: UpcomingMatchService;

  constructor(private readonly opts: VlrClientOptions = {}) {
    /* Core adapters */
    this.logger = opts.logger ?? new PinoLogger();
    this.http = opts.httpClient ?? new HttpClient();
    this.cache = opts.cache
      ? new MemoryLRU({ ttl: opts.cacheTTL })
      : undefined;

    /* Wire domain services */
    this.upcomingSvc = new UpcomingMatchService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'incoming' }),
      this.metrics,
    );
  }

  /**
   * Retrieve the list of matches that are either *live* or *upcoming*.
   * See {@link MatchIncoming} for the returned data structure.
   */
  listIncomingMatches(useCache = true): Promise<Envelope<MatchIncoming[]>> {
    return this.upcomingSvc.listIncoming(useCache);
  }

  /** Return the current aggregated metrics snapshot. */
  getMetrics() {
    return this.metrics.report();
  }

  /** Wipe every entry from the in-memory cache (if enabled). */
  clearCache(): void {
    this.cache?.clear?.();
  }
}
