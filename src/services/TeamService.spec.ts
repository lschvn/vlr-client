import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import { Metrics } from '../core/metrics/Metrics';
import type { Team } from '../models/Team';

import { TeamService } from './TeamService';

/* ------------------------------------------------------------------------- */

class MockHttpClient implements IHttpClient {
  public calls = 0;
  public lastUrl: string | null = null;
  constructor(private readonly body: string = '<html></html>') {}

  async get(url: string): Promise<string> {
    this.calls += 1;
    this.lastUrl = url;
    return this.body;
  }
}

class DummyCacheAdapter implements ICacheAdapter {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.store.set(key, value);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const dummyLogger: ILogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => dummyLogger,
};

/* ------------------------------------------------------------------------- *
 * Mock TeamParser
 * ------------------------------------------------------------------------- */

const mockTeam: Team = {
  id: 't1',
  url: 'https://www.vlr.gg/team/t1',
  name: 'TeamFoo',
  tag: 'FOO',
  logoUrl: '',
  country: 'Nowhere',
  countryCode: 'nw',
  website: null,
  socials: [],
  totalWinnings: '$0',
  ranking: { rank: 1, region: 'WW', rating: 1000, record: { wins: 1, losses: 0 } },
  roster: { players: [], staff: [] },
  recentResults: [],
  eventPlacements: [],
  relatedNews: [],
};

vi.mock('../parsers/team/TeamParser', () => {
  return {
    TeamParser: class {
      constructor() {}
      parse() {
        return mockTeam;
      }
    },
  };
});

/* ------------------------------------------------------------------------- */

let cache: DummyCacheAdapter;
let metrics: Metrics;
let http: MockHttpClient;
let service: TeamService;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
  http = new MockHttpClient();
  service = new TeamService(http, cache, dummyLogger, metrics);
});

describe('TeamService', () => {
  it('fetches a team and caches it', async () => {
    const envelope = await service.getById('t1', true);
    expect(http.calls).toBe(1);
    expect(http.lastUrl).toBe('https://www.vlr.gg/team/t1');
    expect(envelope.data).toEqual(mockTeam);
    expect(envelope.info.fromCache).toBe(false);

    const cached = cache.get<Team>('https://www.vlr.gg/team/t1');
    expect(cached).toEqual(mockTeam);
  });
});