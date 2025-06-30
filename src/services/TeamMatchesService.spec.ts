import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import { Metrics } from '../core/metrics/Metrics';
import type { TeamMatch } from '../models/TeamMatch';

import { TeamMatchesService } from './TeamMatchesService';

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
 * Mock TeamMatchesParser
 * ------------------------------------------------------------------------- */

const mockMatch: TeamMatch = {
  id: 'm1',
  url: 'https://www.vlr.gg/m1',
  event: { name: 'Event', stage: 'Stage' },
  opponent: { name: 'Opp', tag: 'TAG', logoUrl: undefined },
  result: { own: 13, opponent: 10, status: 'win' },
  vods: [],
  date: 'Today',
  games: [],
  status: 'completed',
};

vi.mock('../parsers/team/TeamMatchesParser', () => {
  return {
    TeamMatchesParser: class {
      constructor() {}
      parse() {
        return { matches: [mockMatch], hasNextPage: false };
      }
    },
  };
});

/* ------------------------------------------------------------------------- */

let cache: DummyCacheAdapter;
let metrics: Metrics;
let http: MockHttpClient;
let service: TeamMatchesService;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
  http = new MockHttpClient();
  service = new TeamMatchesService(http, cache, dummyLogger, metrics);
});

describe('TeamMatchesService', () => {
  it('fetches matches list', async () => {
    const envelope = await service.getByTeamId('1337', true);

    expect(http.calls).toBe(1);
    expect(http.lastUrl).toBe('https://www.vlr.gg/team/matches/1337/?page=1');

    expect(envelope.data).toEqual([mockMatch]);
    expect(envelope.info.fromCache).toBe(false);
  });
});