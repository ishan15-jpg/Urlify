import { redisClient } from '../config/redis.config';
import { logger } from './logger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

const TOKEN_BUCKET_LUA_SCRIPT = `
local capacity = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', KEYS[1], 'tokens', 'last_updated')
local tokens = tonumber(data[1])
local last_updated = tonumber(data[2])

if not tokens then
    tokens = capacity
    last_updated = now
else
    local elapsed = math.max(0, now - last_updated)
    local refill_rate = capacity / window_ms
    tokens = math.min(capacity, tokens + (elapsed * refill_rate))
    last_updated = now
end

local allowed = 0
local remaining = 0
local reset_sec = 0

if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
    remaining = math.floor(tokens)
    reset_sec = math.ceil((now + ((capacity - tokens) * (window_ms / capacity))) / 1000)
else
    allowed = 0
    remaining = 0
    reset_sec = math.ceil((now + ((1 - tokens) * (window_ms / capacity))) / 1000)
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'last_updated', last_updated)
redis.call('PEXPIRE', KEYS[1], window_ms)

return { allowed, remaining, reset_sec }
`;

export class RateLimiter {
  constructor(private readonly keyPrefix: string = 'ratelimit:') {}

  /**
   * Consumes a single token from the bucket.
   *
   * @param identifier - Unique identifier (e.g. IP address, User ID, Email)
   * @param capacity - Max tokens allowed in the window
   * @param windowMs - Duration of the rate limit window in milliseconds
   * @returns Promise<RateLimitResult>
   */
  async consume(identifier: string, capacity: number, windowMs: number): Promise<RateLimitResult> {
    try {
      const key = `${this.keyPrefix}${identifier}`;
      const now = Date.now();

      const result = (await redisClient.eval(
        TOKEN_BUCKET_LUA_SCRIPT,
        1,
        key,
        capacity.toString(),
        windowMs.toString(),
        now.toString()
      )) as [number, number, number];

      const [allowed, remaining, reset] = result;
      return {
        allowed: allowed === 1,
        remaining,
        reset
      };
    } catch (error) {
      logger.error('Redis token bucket evaluation error. Defaulting to allow request.', { error });
      // In case Redis fails, open fail-safe architecture to not block users completely.
      return {
        allowed: true,
        remaining: Math.max(0, capacity - 1),
        reset: Math.ceil((Date.now() + windowMs) / 1000)
      };
    }
  }
}
