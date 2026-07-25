import * as cheerio from 'cheerio';
import type { IHttpClient } from '../core/http/HttpClient.js';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter.js';
import type { ILogger } from '../core/log/ILogger.js';
import type { Metrics } from '../core/metrics/Metrics.js';

import type { Envelope } from '../types.js';
import type { CompletedMatch } from '../models/MatchCompleted.js';
import { CompletedMatchParser } from '../parsers/match/CompletedMatchParser.js';

export type MatchStatus = 'upcoming' | 'live' | 'completed';

/**
 * Status-agnostic view of a match page — same shape as {@link CompletedMatch}
 * but `status` reflects the real header note instead of a hard-coded 'final'.
 */
export type Match = Omit<CompletedMatch, 'status'> & { status: MatchStatus };

/**
 * Service fetching a single match page (`/{id}`) whatever its status:
 * upcoming, live or completed. The DOM extraction is delegated to
 * {@link CompletedMatchParser}; this class only derives the real status from
 * the header note and sanitises fields that are absent on non-final pages.
 */
export class MatchService {
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
  ): Promise<Envelope<Match | null>> {
    const t0 = performance.now();
    const url = `${this.VLR_URL}/${matchId}`;
    const cacheKey = `${url}#any-status`;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<Match>(cacheKey);
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

      const note = $('.match-header-vs-note').first().text().trim().toLowerCase();
      const status: MatchStatus =
        note === 'final' ? 'completed' : note === 'live' ? 'live' : 'upcoming';

      const parsed = new CompletedMatchParser($).parse(matchId);
      const match: Match = { ...parsed, status };

      const sanitize = (n: number): number => (Number.isFinite(n) ? n : 0);
      match.team1 = { ...match.team1, score: sanitize(match.team1.score) };
      match.team2 = { ...match.team2, score: sanitize(match.team2.score) };
      if (status === 'upcoming') match.maps = [];

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, match, status === 'live' ? 30_000 : 5 * 60_000);
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
