import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, HttpError } from './HttpClient';

describe('HttpClient', () => {
  const URL_OK = 'https://fake.test/ok';
  const URL_500 = 'https://fake.test/500';
  const URL_TIMEOUT = 'https://fake.test/timeout';

  /** Reset the global fetch mock before every test */
  beforeEach(() => {
    // @ts-ignore – we overwrite global fetch with a vi.fn()
    global.fetch = vi.fn((url: string, init?: RequestInit) => {
      // Helper to build a never-resolving promise that rejects on abort.
      const neverResolving = (signal?: AbortSignal | null) =>
        new Promise<Response>((_resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              const abortErr = new DOMException();
              // The `name` property is read-only → redefine it for test purposes
              Object.defineProperty(abortErr, 'name', {
                value: 'AbortError',
              });
              reject(abortErr);
            });
          }
          // Do nothing → keeps the promise pending until aborted
        });

      if (url === URL_OK) {
        return Promise.resolve(
          new Response('<html>ok</html>', { status: 200, statusText: 'OK' }),
        );
      }
      if (url === URL_500) {
        return Promise.resolve(
          new Response('boom', { status: 500, statusText: 'Server Error' }),
        );
      }
      if (url === URL_TIMEOUT) {
        return neverResolving(init?.signal);
      }
      return Promise.reject(new Error('unhandled url'));
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns body on 200', async () => {
    const http = new HttpClient({ retries: 0 });
    const html = await http.get(URL_OK);
    expect(html).toBe('<html>ok</html>');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 5xx then throws HttpError', async () => {
    const http = new HttpClient({ retries: 2, retryDelayMs: 1 });
    await expect(http.get(URL_500)).rejects.toBeInstanceOf(HttpError);
    expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('retries on timeout then throws HttpError', async () => {
    const http = new HttpClient({ retries: 1, timeoutMs: 10 });
    await expect(http.get(URL_TIMEOUT)).rejects.toBeInstanceOf(HttpError);
    expect(global.fetch).toHaveBeenCalledTimes(2); // 1 retry
  });
});
