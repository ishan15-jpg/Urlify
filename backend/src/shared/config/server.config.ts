import http from 'http';
import { Application } from 'express';
import { logger } from '../utils/logger';
import { closeDatabasePool, db } from './database.config';
import { redisClient } from './redis.config';

/**
 * Singleton that owns the HTTP server lifecycle.
 *
 * Responsibilities:
 *  - Create and hold the single `http.Server` instance.
 *  - Expose `start()` to bind the server to a port.
 *  - Expose `gracefulShutdown()` to drain in-flight requests, close the
 *    database pool, and exit the process cleanly on SIGTERM / SIGINT.
 *
 * Usage:
 *   import { serverConfig } from '@/shared/config/server.config';
 *   serverConfig.start(app);
 */
class ServerConfig {
  private static instance: ServerConfig;
  private server: http.Server | null = null;

  /** Prevent direct construction — use `ServerConfig.getInstance()`. */
  private constructor() {}

  /** Returns the single shared ServerConfig instance, creating it on first call. */
  public static getInstance(): ServerConfig {
    if (!ServerConfig.instance) {
      ServerConfig.instance = new ServerConfig();
    }
    return ServerConfig.instance;
  }

  /**
   * Attach the Express app to an HTTP server and start listening.
   * Registers SIGTERM and SIGINT handlers for graceful shutdown.
   *
   * @param app - The Express application to serve.
   */
  public async start(app: Application): Promise<void> {
    logger.debug(`Server config initiated`);

    const PORT = Number(process.env.PORT) || 3000;

    this.server = http.createServer(app);

    logger.debug(`Server is about to start on port ${PORT}`);
    this.server.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });

    await db.query('SELECT 1')
      .then(() => logger.info('Connected to database'))
      .catch((err) => logger.error('Failed to connect to database', err));

    // Handle unexpected server-level errors (e.g. EADDRINUSE).
    this.server.on('error', (err: NodeJS.ErrnoException) => {
      logger.error(`HTTP server error: ${err.message}`, { code: err.code });
      process.exit(1);
    });

    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
  }

  /**
   * Gracefully drain in-flight requests, close the database pool,
   * then exit the process cleanly.
   *
   * A 10-second hard-kill timeout is started immediately — if shutdown
   * takes longer, the process is force-terminated with exit code 1.
   *
   * @param signal - The OS signal that triggered the shutdown.
   */
  public gracefulShutdown(signal: string): void {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    if (!this.server) {
      logger.warn('gracefulShutdown called before server was started.');
      process.exit(0);
    }

    // Force-exit guard: kill the process if shutdown exceeds 10 seconds.
    const forceExitTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing process exit.');
      process.exit(1);
    }, 10_000);

    this.server.close(async () => {
      logger.info('HTTP server closed successfully.');
      clearTimeout(forceExitTimeout);

      await closeDatabasePool();
      logger.info('Database pool closed successfully.');

      try {
        await redisClient.quit();
        logger.info('Redis connection closed successfully.');
      } catch (err) {
        logger.error('Error closing Redis connection:', err);
      }

      process.exit(0);
    });
  }
}

export const serverConfig = ServerConfig.getInstance();
