import * as cheerio from 'cheerio';
import type { IHttpClient } from '../core/http/HttpClient.js';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter.js';
import type { ILogger } from '../core/log/ILogger.js';
import type { Metrics } from '../core/metrics/Metrics.js';

import type { Envelope } from '../types.js';
import type { MatchUpcoming } from '../models/MatchUpcoming.js';

import { UpcomingMatchParser } from '../parsers/match/UpcomingMatchParser.js';

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
   * @param useCache  Re-use the cached value when available.
   * @param ttlMs     TTL applied when storing the parsed list (default 5 min).
   * @param cacheKeySuffix  Suffix appended to the cache key so callers with
   *                        different TTLs do not share the same entry.
   */
  async listIncoming(
    useCache = true,
    ttlMs = 5 * 60_000,
    cacheKeySuffix = '',
  ): Promise<Envelope<MatchUpcoming[]>> {
    const t0 = performance.now();
    const cacheKey = `${this.LISTING_URL}${cacheKeySuffix}`;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<MatchUpcoming[]>(cacheKey);
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
        this.cache!.set(cacheKey, matches, ttlMs);
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

  /**
   * Same pipeline as {@link listIncoming} but keeps only the matches whose
   * banner status is `LIVE`. Uses a short cache TTL (30 s) since live scores
   * only change when the page is re-fetched.
   */
  async listLive(useCache = true): Promise<Envelope<MatchUpcoming[]>> {
    const envelope = await this.listIncoming(useCache, 30_000, ':live');
    return {
      data: envelope.data.filter((m) => m.status === 'LIVE'),
      info: envelope.info,
    };
  }
}
