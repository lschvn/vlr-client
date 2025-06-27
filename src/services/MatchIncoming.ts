import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';

import type { Envelope } from '../types.d';
import type { MatchIncoming } from '../models/MatchIncoming';

import { parseUpcomingMatchList } from '../parsers/match/upcomingMatchParser';

/**
 * Service responsible for retrieving *incoming* matches
 * (upcoming or live) from the vlr `/matches` listing.
 *
 * • One public method → full orchestration.
 * • Parsing delegated to a pure function for testability.
 */
export class UpcomingMatchService {
  private readonly LISTING_URL = 'https://www.vlr.gg/matches';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics,
  ) {}

  /**
   * Fetch the matches list and return structured data.
   *
   * @param useCache  When true and cache is enabled, re-use
   *                  a 5-minute TTL entry to reduce load.
   */
  async listIncoming(useCache = true): Promise<Envelope<MatchIncoming[]>> {
    const t0 = performance.now();
    const cacheKey = `${this.LISTING_URL}`;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<MatchIncoming[]>(cacheKey);
        if (hit) {
          this.metrics.trackSuccess(performance.now() - t0);
          return { data: hit, info: { ...this.metrics.report(), fromCache: true } };
        }
      }

      this.log.debug('GET /matches');
      const html = await this.http.get(this.LISTING_URL);
      const matches = parseUpcomingMatchList(html);

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, matches, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return { data: matches, info: { ...this.metrics.report(), fromCache: false } };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('listIncoming failed', { err });
      throw err;
    }
  }
}
