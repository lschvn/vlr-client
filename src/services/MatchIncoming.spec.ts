import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import { Metrics } from '../core/metrics/Metrics';
import type { MatchIncoming } from '../models/MatchIncoming';

import { UpcomingMatchService } from './MatchIncoming';

/* ------------------------------------------------------------------------- *
 * Test doubles (very lightweight – sufficient for unit-tests).
 * ------------------------------------------------------------------------- */

class MockHttpClient implements IHttpClient {
  public calls = 0;
  public lastUrl: string | null = null;
  constructor(private readonly body: string) {}

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

/* ------------------------------------------------------------------------- */

const fixtureHtml = readFileSync(
  join(__dirname, '..', 'parsers', 'match', 'fixtures', 'upcomingMatchFixture.html'),
  'utf8',
);

let cache: DummyCacheAdapter;
let metrics: Metrics;
let http: MockHttpClient;
let service: UpcomingMatchService;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
  http = new MockHttpClient(fixtureHtml);
  service = new UpcomingMatchService(http, cache, dummyLogger, metrics);
});

describe('UpcomingMatchService', () => {
  it('fetches matches and stores them in cache on first call', async () => {
    const envelope = await service.listIncoming(true);

    // HTTP should be hit once
    expect(http.calls).toBe(1);
    expect(http.lastUrl).toBe('https://www.vlr.gg/matches');

    // Data is parsed
    expect(envelope.data.length).toBeGreaterThan(0);
    const first: MatchIncoming = envelope.data[0]!;
    expect(first.id).toBe('509209');

    // Returned info
    expect(envelope.info.fromCache).toBe(false);

    // Cache now contains parsed data
    const cached = cache.get<MatchIncoming[]>('https://www.vlr.gg/matches');
    expect(cached?.length).toBe(envelope.data.length);
  });

  it('uses cache on subsequent calls', async () => {
    // First call populates the cache
    await service.listIncoming(true);
    expect(http.calls).toBe(1);

    // Second call should not trigger HTTP request
    const envelopeCached = await service.listIncoming(true);
    expect(http.calls).toBe(1);
    expect(envelopeCached.info.fromCache).toBe(true);
  });

  it('ignores cache when useCache=false', async () => {
    // Populate cache first
    await service.listIncoming(true);
    expect(http.calls).toBe(1);

    // Disable cache – should fetch again
    const envelopeNoCache = await service.listIncoming(false);
    expect(http.calls).toBe(2);
    expect(envelopeNoCache.info.fromCache).toBe(false);
  });
}); 
