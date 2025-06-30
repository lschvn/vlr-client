import * as cheerio from 'cheerio';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';
import { TeamMatchesParser } from '../parsers/team/TeamMatchesParser';
import type { Envelope } from '../types';
import type { TeamMatch } from '../models/TeamMatch';

export class TeamMatchesService {
  private readonly BASE_URL = 'https://www.vlr.gg/team/matches';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics
  ) {}

  async getByTeamId(
    teamId: string,
    useCache = true
  ): Promise<Envelope<TeamMatch[]>> {
    const t0 = performance.now();
    const allMatches: TeamMatch[] = [];
    let page = 1;
    let hasNextPage = true;

    try {
      while (hasNextPage) {
        const url = `${this.BASE_URL}/${teamId}/?page=${page}`;
        const cacheKey = url;
        const SHOULD_CACHE = Boolean(useCache && this.cache);
        let html = '';

        if (SHOULD_CACHE) {
          const hit = this.cache!.get<string>(cacheKey);
          if (hit) {
            html = hit;
          }
        }

        if (!html) {
          this.log.debug(`GET ${url}`);
          html = await this.http.get(url);
          if (SHOULD_CACHE) {
            this.cache!.set(cacheKey, html);
          }
        }

        const $ = cheerio.load(html);
        const parser = new TeamMatchesParser($);
        const { matches, hasNextPage: nextPageExists } = parser.parse();

        allMatches.push(...matches);
        hasNextPage = nextPageExists;
        page++;
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: allMatches,
        info: { ...this.metrics.report(), fromCache: false }, // Simplified cache info
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('Failed to get team matches', { err, teamId });
      throw err;
    }
  }
} 
