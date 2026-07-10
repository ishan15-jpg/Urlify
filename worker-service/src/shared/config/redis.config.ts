import { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

class RedisConfig {
  private static instance: RedisConfig;
  private redisConfig: ConnectionOptions;
  private client: Redis;

  private constructor() {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number(process.env.REDIS_PORT) || 6379;

    this.redisConfig = { host, port };
    this.client = new Redis({ host, port });
  }

  public static getInstance(): RedisConfig {
    if (!RedisConfig.instance) {
      RedisConfig.instance = new RedisConfig();
    }
    return RedisConfig.instance;
  }

  public getConfig(): ConnectionOptions {
    return this.redisConfig;
  }

  public getClient(): Redis {
    return this.client;
  }
}

export const redisClient = RedisConfig.getInstance().getClient();
export default RedisConfig.getInstance().getConfig();
