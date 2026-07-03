import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

/**
 * Singleton that owns the application-wide PostgreSQL connection pool.
 *
 * Construct the pool once per process, share it everywhere — creating a new
 * Pool for every request wastes connections and defeats the purpose of pooling.
 *
 * Usage:
 *   import { db } from '@/shared/config/database.config';
 *   const result = await db.query('SELECT NOW()');
 */
class DatabaseConfig {
  private static instance: DatabaseConfig;
  private readonly pool: Pool;

  private constructor() {
    const poolConfig: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'urlify',

      // Maximum number of clients the pool should hold.
      max: Number(process.env.DB_MAX_POOL) || 10,

      // How long (ms) a client can sit idle in the pool before being released.
      idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS) || 30_000,

      // How long (ms) to wait when acquiring a connection before throwing.
      connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS) || 2_000,
    };

    this.pool = new Pool(poolConfig);

    // Surface unexpected pool-level errors so they don't go silently missing.
    this.pool.on('error', (err: Error) => {
      logger.error('[DatabaseConfig] Unexpected pool error:', err);
    });
  }

  /** Returns the single shared DatabaseConfig instance, creating it on first call. */
  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  /** Returns the underlying pg Pool so callers can run queries directly. */
  public getPool(): Pool {
    return this.pool;
  }

  /**
   * Gracefully drain and close all pool connections.
   * Call this during application shutdown (SIGTERM / SIGINT).
   */
  public async end(): Promise<void> {
    await this.pool.end();
  }
}

export const db = DatabaseConfig.getInstance().getPool();
export const closeDatabasePool = () => DatabaseConfig.getInstance().end();