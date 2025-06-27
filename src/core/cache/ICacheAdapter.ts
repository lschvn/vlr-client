/**
 * **Tiny contract** adopted by any cache layer.
 * Kept minimal so you can swap MemoryLRU for Redis, a file cache, etc.
 */
export interface ICacheAdapter {
  /**
   * Retrieve a value or `undefined` if the key is not present / expired.
   */
  get<T = unknown>(key: string): T | undefined;

  /**
   * Store a value with an optional TTL (ms).
   * If `ttlMs` is omitted, use the cache’s default TTL.
   */
  set<T = unknown>(key: string, value: T, ttlMs?: number): void;

  /**
   * Remove a single entry.
   */
  delete(key: string): void;

  /**
   * Purge every entry (rarely used in production, handy for tests).
   */
  clear(): void;
}
