import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IHttpClient } from '../core/http/HttpClient.js';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter.js';
import type { ILogger } from '../core/log/ILogger.js';
import { Metrics } from '../core/metrics/Metrics.js';

import { MatchService } from './Match.js';
import { UpcomingMatchService } from './UpcomingMatch.js';

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

const liveMatchHtml = readFileSync(
  join(__dirname, 'fixtures', 'liveMatchFixture.html'),
  'utf8',
);

const listingHtml = readFileSync(
  join(__dirname, 'fixtures', 'liveMatchesListingFixture.html'),
  'utf8',
);

let cache: DummyCacheAdapter;
let metrics: Metrics;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
});

describe('UpcomingMatchService.listLive', () => {
  it('returns only matches whose status is LIVE', async () => {
    const http = new MockHttpClient(listingHtml);
    const service = new UpcomingMatchService(http, cache, dummyLogger, metrics);

    const envelope = await service.listLive(true);

    expect(http.calls).toBe(1);
    expect(envelope.data).toHaveLength(1);
    const live = envelope.data[0]!;
    expect(live.id).toBe('598123');
    expect(live.status).toBe('LIVE');
    expect(live.teams[0]!.score).toBe(1);
    expect(live.teams[1]!.score).toBe(0);
  });

  it('caches live results under a dedicated key', async () => {
    const http = new MockHttpClient(listingHtml);
    const service = new UpcomingMatchService(http, cache, dummyLogger, metrics);

    await service.listLive(true);
    const second = await service.listLive(true);

    expect(http.calls).toBe(1);
    expect(second.info.fromCache).toBe(true);
  });
});

describe('MatchService', () => {
  it('parses a live match page with status live', async () => {
    const http = new MockHttpClient(liveMatchHtml);
    const service = new MatchService(http, cache, dummyLogger, metrics);

    const envelope = await service.getById('598123');

    expect(http.lastUrl).toBe('https://www.vlr.gg/598123');
    const match = envelope.data!;
    expect(match).not.toBeNull();
    expect(match.id).toBe('598123');
    expect(match.status).toBe('live');
    expect(match.bestOf).toBe('Bo3');
    expect(match.event.name).toBe('VCT 2025: EMEA Stage 2');
    expect(match.utcTimestamp).toBe('2025-07-25 18:00:00');

    const names = [match.team1.name, match.team2.name];
    expect(names).toContain('FNATIC');
    expect(names).toContain('Team Liquid');
    expect(match.team1.score).toBe(1);
    expect(match.team2.score).toBe(0);

    expect(match.maps.length).toBeGreaterThanOrEqual(1);
    const ascent = match.maps.find((m) => m.name === 'Ascent');
    expect(ascent).toBeDefined();
    expect(ascent!.rounds.length).toBe(2);
    expect(ascent!.rounds[0]!.roundNum).toBe(1);
    expect(ascent!.rounds[0]!.winningTeamSide).toBe('t');
  });

  it('caches live matches and serves them from cache', async () => {
    const http = new MockHttpClient(liveMatchHtml);
    const service = new MatchService(http, cache, dummyLogger, metrics);

    await service.getById('598123');
    const second = await service.getById('598123');

    expect(http.calls).toBe(1);
    expect(second.info.fromCache).toBe(true);
  });

  it('derives upcoming status and returns header data with empty maps', async () => {
    const upcomingHtml = liveMatchHtml
      .replace('<div class="match-header-vs-note">LIVE</div>', '<div class="match-header-vs-note">Upcoming</div>')
      .replace('<span class="js-spoiler match-header-vs-score-winner">1</span>', '<span class="js-spoiler">-</span>')
      .replace('<span class="js-spoiler match-header-vs-score-loser">0</span>', '<span class="js-spoiler">-</span>');
    const http = new MockHttpClient(upcomingHtml);
    const service = new MatchService(http, cache, dummyLogger, metrics);

    const envelope = await service.getById('598124');

    const match = envelope.data!;
    expect(match.status).toBe('upcoming');
    expect(match.maps).toEqual([]);
    expect(match.team1.score).toBe(0);
    expect(match.team2.score).toBe(0);
    expect(match.event.name).toBe('VCT 2025: EMEA Stage 2');
  });
});
