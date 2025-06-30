import * as cheerio from 'cheerio';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';
import { TeamParser } from '../parsers/team/TeamParser';
import type { Envelope } from '../types';
import type { Team } from '../models/Team';

export class TeamService {
  private readonly BASE_URL = 'https://www.vlr.gg/team';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics
  ) {}

  private async fetchAndParse(
    url: string,
    useCache: boolean
  ): Promise<Envelope<Team>> {
    const t0 = performance.now();
    const cacheKey = `${url}`;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<Team>(cacheKey);
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
      const parser = new TeamParser($);
      const team = parser.parse();

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, team, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: team,
        info: { ...this.metrics.report(), fromCache: false },
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('Failed to get team', { err, url });
      throw err;
    }
  }

  async getById(id: string, useCache = true): Promise<Envelope<Team>> {
    const url = `${this.BASE_URL}/${id}`;
    return this.fetchAndParse(url, useCache);
  }
}
