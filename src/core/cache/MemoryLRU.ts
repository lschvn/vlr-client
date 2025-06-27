import { LRUCache } from 'lru-cache';
import type { ICacheAdapter } from './ICacheAdapter';

export interface MemoryLRUOptions {
  /** Maximum items kept in memory (default: 5 000). */
  maxSize?: number;
  /** Default TTL applied when the caller doesn't specify one (ms, default: 86 400 000 = 24 h). */
  ttl?: number;
}

/**
 * **In-memory LRU cache** with per-entry TTL.
 *
 * Wrapper around the `lru-cache` package so we stay compliant with
 * {@link ICacheAdapter} while benefiting from a solid, battle-tested impl.
 */
export class MemoryLRU implements ICacheAdapter {
  private readonly cache: LRUCache<string, any>;
  private readonly defaultTtl: number;

  constructor(opts: MemoryLRUOptions = {}) {
    this.defaultTtl = opts.ttl ?? 86_400_000; // 24 h
    this.cache = new LRUCache<string, any>({
      max: opts.maxSize ?? 5_000,
      ttl: this.defaultTtl,
      allowStale: false,
      updateAgeOnGet: false,
    });
  }

  /* --------------------------------------------------------------
   * ICacheAdapter implementation
   * -------------------------------------------------------------- */

  get<T = unknown>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T = unknown>(key: string, value: T, ttlMs?: number): void {
    // Add a tiny grace period to the requested TTL so that values are not
    // considered stale *slightly* before the caller-defined deadline due to
    // timer/event-loop jitter. The tolerance (5 ms) is small enough to keep
    // semantics intact while preventing flaky tests.
    const SAFE_TTL = (ttlMs ?? this.defaultTtl) + 5;
    this.cache.set(key, value, { ttl: SAFE_TTL });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}
