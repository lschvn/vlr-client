import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpClient, HttpError, DEFAULT_USER_AGENT } from './HttpClient.js';

describe('HttpClient', () => {
  const URL_OK = 'https://fake.test/ok';
  const URL_404 = 'https://fake.test/404';
  const URL_429 = 'https://fake.test/429';
  const URL_500 = 'https://fake.test/500';
  const URL_TIMEOUT = 'https://fake.test/timeout';

  /** Reset the global fetch mock before every test */
  beforeEach(() => {
    // @ts-ignore – we overwrite global fetch with a vi.fn()
    // Bun <1.2.14 ne dispose pas de vi.mock; on remplace donc directement
    // la fonction globale fetch par un stub créé avec vi.fn().
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
      if (url === URL_404) {
        return Promise.resolve(
          new Response('nope', { status: 404, statusText: 'Not Found' }),
        );
      }
      if (url === URL_429) {
        return Promise.resolve(
          new Response('slow down', {
            status: 429,
            statusText: 'Too Many Requests',
          }),
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

  it('does not retry on 404 and keeps the numeric status', async () => {
    const http = new HttpClient({ retries: 2, retryDelayMs: 1 });
    const err = await http.get(URL_404).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(404);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then throws HttpError with status 429', async () => {
    const http = new HttpClient({ retries: 2, retryDelayMs: 1 });
    const err = await http.get(URL_429).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.status).toBe(429);
    expect(global.fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('sends the default User-Agent header', async () => {
    const http = new HttpClient({ retries: 0 });
    await http.get(URL_OK);
    const init = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('User-Agent')).toBe(DEFAULT_USER_AGENT);
    expect(headers.get('Accept')).toContain('text/html');
  });

  it('allows overriding the default User-Agent', async () => {
    const http = new HttpClient({
      retries: 0,
      headers: { 'User-Agent': 'custom-agent/1.0' },
    });
    await http.get(URL_OK);
    const init = (global.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('User-Agent')).toBe('custom-agent/1.0');
  });
});
