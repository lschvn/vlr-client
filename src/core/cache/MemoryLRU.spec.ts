import { describe, it, expect } from 'vitest';
import { MemoryLRU } from './MemoryLRU';

describe('MemoryLRU', () => {
  // Helper util to wait for real time (ms)
  const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

  it('stores and retrieves a value', () => {
    const cache = new MemoryLRU({ ttl: 5_000 });
    cache.set('k1', 42);
    expect(cache.get('k1')).toBe(42);
  });

  it('returns undefined for missing key', () => {
    const cache = new MemoryLRU();
    expect(cache.get('missing')).toBeUndefined();
  });

  it('expires entries after TTL', async () => {
    const cache = new MemoryLRU({ ttl: 200 }); // 0.2 s
    cache.set('temp', 'foo');

    await wait(180);
    expect(cache.get('temp')).toBe('foo'); // still there

    await wait(30);
    expect(cache.get('temp')).toBeUndefined(); // expired
  });

  it('allows custom per-entry TTL', async () => {
    const cache = new MemoryLRU({ ttl: 10_000 });
    cache.set('short', 'bar', 50); // 0.05 s

    await wait(60);
    expect(cache.get('short')).toBeUndefined();
  });

  it('evicts least-recently-used when maxSize exceeded', () => {
    const cache = new MemoryLRU({ maxSize: 2, ttl: 60_000 });

    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a');       // 'a' becomes most-recent
    cache.set('c', 3);    // pushes out 'b'

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
  });

  it('delete() removes a single entry', () => {
    const cache = new MemoryLRU();
    cache.set('x', 99);
    cache.delete('x');
    expect(cache.get('x')).toBeUndefined();
  });

  it('clear() purges all entries', () => {
    const cache = new MemoryLRU();
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.clear();
    expect(cache.get('k1')).toBeUndefined();
    expect(cache.get('k2')).toBeUndefined();
  });
});
