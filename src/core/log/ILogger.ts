/**
 * Lightweight logging contract used across the project.
 * Keeps the surface minimal yet compatible with pino-style APIs.
 */
export interface ILogger {
  /**
   * Detailed diagnostic information – never shown in production by default.
   */
  debug(message: string, ctx?: Record<string, unknown>): void;

  /**
   * Routine operational messages – the “normal” log level.
   */
  info(message: string, ctx?: Record<string, unknown>): void;

  /**
   * Something unexpected or recoverable happened, but the process can continue.
   */
  warn(message: string, ctx?: Record<string, unknown>): void;

  /**
   * A serious error – the current operation failed.
   */
  error(message: string, ctx?: Record<string, unknown>): void;

  /**
   * Create a child logger inheriting the current bindings.
   * Useful inside classes/services to append a contextual label once.
   */
  child(bindings: Record<string, unknown>): ILogger;
}
