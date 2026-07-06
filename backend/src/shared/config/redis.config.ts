import { ConnectionOptions } from 'bullmq';

class RedisConfig {
  private static instance: RedisConfig;
  private redisConfig: ConnectionOptions;

  private constructor() {
    this.redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
    };
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
};

export default RedisConfig.getInstance().getConfig();