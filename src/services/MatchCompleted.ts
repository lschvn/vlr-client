import * as cheerio from 'cheerio';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';

import type { Envelope } from '../types.d';
import type { CompletedMatch } from '../models/MatchCompleted';
import { CompletedMatchParser } from '../parsers/match/CompletedMatchParser';

export class CompletedMatchService {
  private readonly VLR_URL = 'https://www.vlr.gg';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics,
  ) {}

  async getById(
    matchId: string,
    useCache = true,
  ): Promise<Envelope<CompletedMatch | null>> {
    const t0 = performance.now();
    const url = `${this.VLR_URL}/${matchId}`;
    const cacheKey = url;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<CompletedMatch>(cacheKey);
        if (hit) {
          this.metrics.trackSuccess(performance.now() - t0);
          return {
            data: hit,
            info: { ...this.metrics.report(), fromCache: true },
          };
        }
      }

      this.log.debug(`GET /${matchId}`);
      const html = await this.http.get(url);
      const $ = cheerio.load(html);

      const status = $('.match-header-vs-note').first().text().trim();
      if (status.toLowerCase() !== 'final') {
        this.log.debug(`Match ${matchId} is not final, skipping.`);
        this.metrics.trackSuccess(performance.now() - t0);
        return {
          data: null,
          info: { ...this.metrics.report(), fromCache: false },
        };
      }

      const parser = new CompletedMatchParser($);
      const match = parser.parse(matchId);

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, match, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: match,
        info: { ...this.metrics.report(), fromCache: false },
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error(`getById failed for match ${matchId}`, { err });
      throw err;
    }
  }
} 
