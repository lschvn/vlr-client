import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { IHttpClient } from '../core/http/HttpClient';
import type { ICacheAdapter } from '../core/cache/ICacheAdapter';
import type { ILogger } from '../core/log/ILogger';
import { Metrics } from '../core/metrics/Metrics';
import type { TeamTransaction } from '../models/TeamTransaction';

import { TeamTransactionService } from './TeamTransactionService';

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
 * Mock TeamTransactionParser
 * ------------------------------------------------------------------------- */

const mockTx: TeamTransaction = {
  date: 'yesterday',
  action: 'join',
  player: { id: 'p1', url: 'https://vlr.gg/player/1', alias: 'Foo', realName: 'Foo Bar', countryCode: 'us' },
  position: 'Duelist',
  referenceUrl: undefined,
};

vi.mock('../parsers/team/TeamTransactionParser', () => {
  return {
    TeamTransactionParser: class {
      constructor() {}
      parse() {
        return [mockTx];
      }
    },
  };
});

/* ------------------------------------------------------------------------- */

let cache: DummyCacheAdapter;
let metrics: Metrics;
let http: MockHttpClient;
let service: TeamTransactionService;

beforeEach(() => {
  cache = new DummyCacheAdapter();
  metrics = new Metrics();
  http = new MockHttpClient();
  service = new TeamTransactionService(http, cache, dummyLogger, metrics);
});

describe('TeamTransactionService', () => {
  it('fetches transactions and caches them', async () => {
    const envelope = await service.getByTeamId('42', true);
    expect(http.calls).toBe(1);
    expect(http.lastUrl).toBe('https://www.vlr.gg/team/transactions/42');
    expect(envelope.data).toEqual([mockTx]);
    expect(envelope.info.fromCache).toBe(false);
  });
});