import * as cheerio from 'cheerio';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';
import { TeamTransactionParser } from '../parsers/team/TeamTransactionParser';
import type { Envelope } from '../types';
import type { TeamTransaction } from '../models/TeamTransaction';

export class TeamTransactionService {
  private readonly BASE_URL = 'https://www.vlr.gg/team/transactions';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics
  ) {}

  async getByTeamId(
    teamId: string,
    useCache = true
  ): Promise<Envelope<TeamTransaction[]>> {
    const t0 = performance.now();
    const url = `${this.BASE_URL}/${teamId}`;
    const cacheKey = url;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<TeamTransaction[]>(cacheKey);
        if (hit) {
          this.metrics.trackSuccess(performance.now() - t0);
          return {
            data: hit,
            info: { ...this.metrics.report(), fromCache: true },
          };
        }
      }

      this.log.debug(`GET ${url}`);
      const html = await this.http.get(url);
      const $ = cheerio.load(html);
      const parser = new TeamTransactionParser($);
      const transactions = parser.parse();

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, transactions, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: transactions,
        info: { ...this.metrics.report(), fromCache: false },
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('Failed to get team transactions', { err, url });
      throw err;
    }
  }
} 
