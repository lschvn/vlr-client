import { HttpClient, type IHttpClient } from './core/http/HttpClient';
import type { ICacheAdapter } from './core/cache/ICacheAdapter';
import { MemoryLRU } from './core/cache/MemoryLRU';
import type { ILogger } from './core/log/ILogger';
import { PinoLogger } from './core/log/PinoLogger';
import { Metrics } from './core/metrics/Metrics';

// Domain service(s)
import { UpcomingMatchService } from './services/UpcomingMatch';
import { CompletedMatchService } from './services/MatchCompleted';
import { TeamService } from './services/TeamService';
import { SearchService } from './services/SearchService';

// Data contracts
import type { Envelope } from './types.d';
import type { MatchUpcoming } from './models/MatchUpcoming';
import type { CompletedMatch } from './models/MatchCompleted';
import type { Team } from './models/Team';
import type { SearchCategory, SearchResult } from './models/Search';


export interface VlrClientOptions {
  /** Enable the built-in in-memory cache. */
  cache?: boolean;
  /** TTL (ms) applied by default to cached entries — ignored if `cache` is false. */
  cacheTTL?: number;
  /** Provide your own HTTP implementation (defaults to {@link HttpClient}). */
  httpClient?: IHttpClient;
  /** Custom logger (defaults to {@link PinoLogger}). */
  logger?: ILogger;
}

/**
 * The main entry point for the VLR API client.
 * 
 * @example
 * ```typescript
 * const vlr = new VlrClient();
 * const matches = await vlr.getIncomingMatches();
 * console.log(matches);
 * ```
 * 
 * @see {@link VlrClientOptions} for configuration options.
 * 
 * @method getIncomingMatches - Retrieve the list of matches that are either *live* or *upcoming*.
 * @method getCompletedMatch - Retrieve the details of a completed match.
 * 
 * @method getTeamMatches - Retrieve the list of matches for a team.
 * @method getTeamBySlug - Retrieve the details of a team.
 * @method getTeamById - Retrieve the details of a team.
 * 
 * @method getMetrics - Return the current aggregated metrics snapshot.
 * @method clearCache - Wipe every entry from the in-memory cache (if enabled).
 */
export class VlrClient {
  /* Private collaborators */
  private readonly http: IHttpClient;
  private readonly cache?: ICacheAdapter;
  private readonly logger: ILogger;
  private readonly metrics = new Metrics();

  /* Domain-level services */
  private readonly upcomingSvc: UpcomingMatchService;
  private readonly completedSvc: CompletedMatchService;
  private readonly teamSvc: TeamService;
  private readonly searchSvc: SearchService;

  constructor(private readonly opts: VlrClientOptions = {}) {
    /* Core adapters */
    this.logger = opts.logger ?? new PinoLogger();
    this.http = opts.httpClient ?? new HttpClient();
    this.cache = opts.cache
      ? new MemoryLRU({ ttl: opts.cacheTTL })
      : undefined;

    /* Wire domain services */
    this.upcomingSvc = new UpcomingMatchService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'incoming' }),
      this.metrics,
    );
    this.completedSvc = new CompletedMatchService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'completed' }),
      this.metrics,
    );
    this.teamSvc = new TeamService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'team' }),
      this.metrics,
    );
    this.searchSvc = new SearchService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'search' }),
      this.metrics,
    );

  }

  /**
   * Retrieve the list of matches that are either *live* or *upcoming*.
   * See {@link MatchUpcoming} for the returned data structure.
   */
  async getIncomingMatches(useCache = true): Promise<Envelope<MatchUpcoming[]>> {
    return await this.upcomingSvc.listIncoming(useCache);
  }

  /**
   * Retrieve the details of a completed match.
   * See {@link CompletedMatch} for the returned data structure.
   */
  async getCompletedMatch(matchId: string): Promise<Envelope<CompletedMatch | null>> {
    return await this.completedSvc.getById(matchId);
  }

  /**
   * Retrieve the details of a team.
   * See {@link Team} for the returned data structure.
   */
  async getTeamById(id: string): Promise<Envelope<Team | null>> {
    return await this.teamSvc.getById(id);
  }

  /**
   * Search for teams, players, events, etc.
   * See {@link SearchResult} for the returned data structure.
   */
  async search(
    query: string,
    category: SearchCategory = 'all'
  ): Promise<Envelope<SearchResult[]>> {
    return await this.searchSvc.getResults(query, category);
  }

  /** Return the current aggregated metrics snapshot. */
  getMetrics() {
    return this.metrics.report();
  }

  /** Wipe every entry from the in-memory cache (if enabled). */
  clearCache(): void {
    this.cache?.clear?.();
  }
}
