import * as cheerio from 'cheerio';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';
import { PlayerParser } from '../parsers/player/PlayerParser';
import type { Envelope } from '../types';
import type { Player } from '../models/Player';

export class PlayerService {
  private readonly BASE_URL = 'https://www.vlr.gg/player';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics
  ) {}

  async getById(
    playerId: string,
    useCache = true
  ): Promise<Envelope<Player | null>> {
    const t0 = performance.now();
    const url = `${this.BASE_URL}/${playerId}`;
    const cacheKey = url;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<Player>(cacheKey);
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
      const parser = new PlayerParser($);
      const player = parser.parse();

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, player, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: player,
        info: { ...this.metrics.report(), fromCache: false },
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('Failed to get player', { err, url });
      throw err;
    }
  }
} 
