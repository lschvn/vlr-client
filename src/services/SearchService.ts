import * as cheerio from 'cheerio';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ILogger } from '../core/log/ILogger';
import type { Metrics } from '../core/metrics/Metrics';
import { SearchParser } from '../parsers/search/SearchParser';
import type { Envelope } from '../types';
import type { SearchResult, SearchCategory } from '../models/Search';

export class SearchService {
  private readonly BASE_URL = 'https://www.vlr.gg/search';

  constructor(
    private readonly http: IHttpClient,
    private readonly cache: ICacheAdapter | undefined,
    private readonly log: ILogger,
    private readonly metrics: Metrics
  ) {}

  private async fetchAndParse(
    url: string,
    useCache: boolean
  ): Promise<Envelope<SearchResult[]>> {
    const t0 = performance.now();
    const cacheKey = `${url}`;
    const SHOULD_CACHE = Boolean(useCache && this.cache);

    try {
      if (SHOULD_CACHE) {
        const hit = this.cache!.get<SearchResult[]>(cacheKey);
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
      const parser = new SearchParser($);
      const data = parser.parse();

      if (SHOULD_CACHE) {
        this.cache!.set(cacheKey, data, 5 * 60_000); // 5 min TTL
      }

      this.metrics.trackSuccess(performance.now() - t0);
      return {
        data: data,
        info: { ...this.metrics.report(), fromCache: false },
      };
    } catch (err) {
      this.metrics.trackFailure(performance.now() - t0);
      this.log.error('Failed to get search results', { err, url });
      throw err;
    }
  }

  async getResults(
    query: string,
    category: SearchCategory = 'all',
    useCache = true
  ): Promise<Envelope<SearchResult[]>> {
    const url = `${this.BASE_URL}/?q=${encodeURIComponent(
      query
    )}&type=${category}`;
    return this.fetchAndParse(url, useCache);
  }
} 
