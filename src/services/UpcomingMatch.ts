import * as cheerio from 'cheerio';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';

import type { Envelope } from '../types.d';
import type { MatchIncoming } from '../models/MatchIncoming';

import { UpcomingMatchParser } from '../parsers/match/UpcomingMatchParser';

/**
 * Service responsible for retrieving *incoming* matches (live or upcoming)
 * from the `/matches` listing on vlr.gg.
 *
 * The class is designed in the same fashion as {@link CompletedMatchService}:
 *  • The service orchestrates the workflow (HTTP –> cache –> parsing –> metrics).
 *  • The heavy DOM extraction is delegated to a dedicated parser class.
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
   * Fetch the matches list and return the structured data.
   *
   * @param useCache  Re-use the cached value (TTL 5 min) when available.
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
          return {
            data: hit,
            info: { ...this.metrics.report(), fromCache: true },
          };
        }
      }

      this.log.debug('GET /matches');
      const html = await this.http.get(this.LISTING_URL);
      const $ = cheerio.load(html);
      const parser = new UpcomingMatchParser($);
      const matches = parser.parse();

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, matches, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: matches,
        info: { ...this.metrics.report(), fromCache: false },
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('listIncoming failed', { err });
      throw err;
    }
  }
}