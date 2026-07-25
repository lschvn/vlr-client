import { HttpClient, type IHttpClient } from './core/http/HttpClient.js';
import type { ICacheAdapter } from './core/cache/ICacheAdapter.js';
import { MemoryLRU } from './core/cache/MemoryLRU.js';
import type { ILogger } from './core/log/ILogger.js';
import { PinoLogger } from './core/log/PinoLogger.js';
import { Metrics } from './core/metrics/Metrics.js';

// Domain service(s)
import { UpcomingMatchService } from './services/UpcomingMatch.js';
import { CompletedMatchService } from './services/MatchCompleted.js';
import { MatchService } from './services/Match.js';
import { TeamService } from './services/TeamService.js';
import { SearchService } from './services/SearchService.js';
import { TeamMatchesService } from './services/TeamMatchesService.js';
import { TeamTransactionService } from './services/TeamTransactionService.js';
import { PlayerService } from './services/PlayerService.js';

// Data contracts
import type { Envelope } from './types.js';
import type { MatchUpcoming } from './models/MatchUpcoming.js';
import type { CompletedMatch } from './models/MatchCompleted.js';
import type { Match, MatchStatus } from './services/Match.js';
import type { Team } from './models/Team.js';
import type { SearchCategory, SearchResult } from './models/Search.js';
import type { TeamMatch } from './models/TeamMatch.js';
import type { TeamTransaction } from './models/TeamTransaction.js';
import type { Player } from './models/Player.js';


export type { Match, MatchStatus };

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
 * @method getUpcomingMatches - Retrieve the list of matches that are either *live* or *upcoming*.
 * @method getLiveMatches - Retrieve only the matches currently *live* (short cache TTL).
 * @method getCompletedMatch - Retrieve the details of a completed match.
 * @method getMatchById - Retrieve the details of a match whatever its status (upcoming, live or completed).
 * 
 * @method getTeamMatches - Retrieve the list of matches for a team.
 * @method getTeamById - Retrieve the details of a team.
 * 
 * @method getTeamTransactions - Retrieve the list of transactions for a team.
 * 
 * @method getPlayerById - Retrieve the details of a player.
 * 
 * @method search - Search for teams, players, events, etc.
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
  private readonly matchSvc: MatchService;
  private readonly teamSvc: TeamService;
  private readonly searchSvc: SearchService;
  private readonly teamMatchesSvc: TeamMatchesService;
  private readonly teamTransactionSvc: TeamTransactionService;
  private readonly playerSvc: PlayerService;

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
    this.matchSvc = new MatchService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'match' }),
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
    this.teamMatchesSvc = new TeamMatchesService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'team-matches' }),
      this.metrics,
    );
    this.teamTransactionSvc = new TeamTransactionService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'team-transaction' }),
      this.metrics,
    );
    this.playerSvc = new PlayerService(
      this.http,
      this.cache,
      this.logger.child({ svc: 'player' }),
      this.metrics,
    );
  }

  /**
   * Retrieve the list of matches that are either *live* or *upcoming*.
   * See {@link MatchUpcoming} for the returned data structure.
   */
  async getUpcomingMatches(useCache = true): Promise<Envelope<MatchUpcoming[]>> {
    return await this.upcomingSvc.listIncoming(useCache);
  }

  /**
   * Retrieve only the matches currently *live*.
   * Same card shape as {@link getUpcomingMatches} (see {@link MatchUpcoming}),
   * filtered on the `LIVE` banner status. Cached with a short TTL (30 s)
   * since live scores only change when the page is re-fetched.
   */
  async getLiveMatches(useCache = true): Promise<Envelope<MatchUpcoming[]>> {
    return await this.upcomingSvc.listLive(useCache);
  }

  /**
   * Retrieve the details of a match whatever its status
   * (`upcoming`, `live` or `completed`). See {@link Match}.
   * Live matches are cached with a short TTL (30 s), others for 5 min.
   */
  async getMatchById(matchId: string, useCache = true): Promise<Envelope<Match | null>> {
    return await this.matchSvc.getById(matchId, useCache);
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
   * Retrieve the list of matches for a team.
   * See {@link TeamMatch} for the returned data structure.
   */
  async getTeamMatches(teamId: string): Promise<Envelope<TeamMatch[]>> {
    return await this.teamMatchesSvc.getByTeamId(teamId);
  }

  /**
   * Retrieve the list of transactions for a team.
   * See {@link TeamTransaction} for the returned data structure.
   */
  async getTeamTransactions(teamId: string): Promise<Envelope<TeamTransaction[]>> {
    return await this.teamTransactionSvc.getByTeamId(teamId);
  }

  /**
   * Retrieve the details of a player.
   * See {@link Player} for the returned data structure.
   */
  async getPlayerById(playerId: string): Promise<Envelope<Player | null>> {
    return await this.playerSvc.getById(playerId);
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
