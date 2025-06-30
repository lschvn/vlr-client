import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import { Metrics } from '../core/metrics/Metrics';
import type { SearchResult } from '../models/Search';

import { SearchService } from './SearchService';

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
 * Mock SearchParser
 * ------------------------------------------------------------------------- */

const mockResults: SearchResult[] = [
  {
    id: '42',
    url: 'https://www.vlr.gg/player/42',
    name: 'Foo',
    imageUrl: '',
    description: 'bar',
    type: 'player',
  },
];

vi.mock('../parsers/search/SearchParser', () => {
  return {
    SearchParser: class {
      constructor() {}
      parse() {
        return mockResults;
      }
    },
  };
});

/* ------------------------------------------------------------------------- */

let cache: DummyCacheAdapter;
let metrics: Metrics;
let http: MockHttpClient;
let service: SearchService;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
  http = new MockHttpClient();
  service = new SearchService(http, cache, dummyLogger, metrics);
});

describe('SearchService', () => {
  it('fetches results and stores them in cache on first call', async () => {
    const envelope = await service.getResults('foo', 'players', true);

    const expectedUrl = 'https://www.vlr.gg/search/?q=foo&type=players';
    expect(http.calls).toBe(1);
    expect(http.lastUrl).toBe(expectedUrl);

    expect(envelope.data).toEqual(mockResults);
    expect(envelope.info.fromCache).toBe(false);

    const cached = cache.get<SearchResult[]>(expectedUrl);
    expect(cached).toEqual(mockResults);
  });

  it('uses cache on subsequent calls', async () => {
    await service.getResults('foo', 'players', true);
    expect(http.calls).toBe(1);

    const envelopeCached = await service.getResults('foo', 'players', true);
    expect(http.calls).toBe(1);
    expect(envelopeCached.info.fromCache).toBe(true);
  });

  it('ignores cache when useCache=false', async () => {
    await service.getResults('foo', 'players', true);
    expect(http.calls).toBe(1);

    const envelopeNoCache = await service.getResults('foo', 'players', false);
    expect(http.calls).toBe(2);
    expect(envelopeNoCache.info.fromCache).toBe(false);
  });
});