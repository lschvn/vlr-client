import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import { Metrics } from '../core/metrics/Metrics';
import type { Player } from '../models/Player';

import { PlayerService } from './PlayerService';

/* ------------------------------------------------------------------------- *
 * Test doubles
 * ------------------------------------------------------------------------- */

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
 * Mock the heavy DOM parser so we don't rely on large HTML fixtures.
 * ------------------------------------------------------------------------- */

const mockPlayer: Player = {
  id: '23',
  url: 'https://www.vlr.gg/player/23',
  alias: 'TestPlayer',
  realName: 'Test Real',
  avatarUrl: '',
  country: { name: 'Neverland', code: 'nl' },
  socials: [],
  totalWinnings: '$0',
  agentStats: { timespan: '60d', stats: [] },
  recentMatches: [],
  teams: [],
  eventPlacements: [],
  news: [],
};

vi.mock('../parsers/player/PlayerParser', () => {
  return {
    PlayerParser: class {
      constructor() {}
      parse() {
        return mockPlayer;
      }
    },
  };
});

/* ------------------------------------------------------------------------- */

let cache: DummyCacheAdapter;
let metrics: Metrics;
let http: MockHttpClient;
let service: PlayerService;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
  http = new MockHttpClient();
  service = new PlayerService(http, cache, dummyLogger, metrics);
});

describe('PlayerService', () => {
  it('fetches a player and stores it in cache on first call', async () => {
    const envelope = await service.getById('23', true);

    expect(http.calls).toBe(1);
    expect(http.lastUrl).toBe('https://www.vlr.gg/player/23');

    expect(envelope.data).toEqual(mockPlayer);
    expect(envelope.info.fromCache).toBe(false);

    const cached = cache.get<Player>('https://www.vlr.gg/player/23');
    expect(cached).toEqual(mockPlayer);
  });

  it('uses cache on subsequent calls', async () => {
    await service.getById('23', true);
    expect(http.calls).toBe(1);

    const envelopeCached = await service.getById('23', true);
    expect(http.calls).toBe(1); // still one call
    expect(envelopeCached.info.fromCache).toBe(true);
  });

  it('ignores cache when useCache=false', async () => {
    await service.getById('23', true);
    expect(http.calls).toBe(1);

    const envelopeNoCache = await service.getById('23', false);
    expect(http.calls).toBe(2);
    expect(envelopeNoCache.info.fromCache).toBe(false);
  });
});