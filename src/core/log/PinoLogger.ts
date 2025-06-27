import pino, { type Logger, type LoggerOptions } from 'pino';
import type { ILogger } from './ILogger';

/**
 * Thin wrapper around **pino** that fulfils {@link ILogger}.
 * It exposes only the required methods and hides the rest of pino's surface,
 * keeping the rest of the codebase decoupled from the actual logging library.
 */
export class PinoLogger implements ILogger {
  /** Underlying pino instance. */
  private readonly log: Logger;

  constructor(opts: LoggerOptions = {}) {
    // Disable all output by default. Callers can override by providing
    // `opts.level` or setting it later via pino APIs.
    this.log = pino({
      level: opts.level ?? 'silent',
      timestamp: pino.stdTimeFunctions.isoTime,
      ...opts,
    });
  }

  /* --------------------------------------------------------------
   * ILogger implementation
   * -------------------------------------------------------------- */

  debug(msg: string, ctx: Record<string, unknown> = {}): void {
    this.log.debug(ctx, msg);
  }

  info(msg: string, ctx: Record<string, unknown> = {}): void {
    this.log.info(ctx, msg);
  }

  warn(msg: string, ctx: Record<string, unknown> = {}): void {
    this.log.warn(ctx, msg);
  }

  error(msg: string, ctx: Record<string, unknown> = {}): void {
    this.log.error(ctx, msg);
  }

  child(bindings: Record<string, unknown>): ILogger {
    const child = this.log.child(bindings);
    const wrapper = new PinoLogger();
    // @ts-ignore – inject the child instance while re-using the same class
    wrapper.log = child;
    return wrapper;
  }
}
