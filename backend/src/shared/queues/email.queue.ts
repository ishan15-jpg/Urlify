import { Queue } from 'bullmq';
import redisConfig from '../config/redis.config';

/**
 * BullMQ Queue for handling email-related asynchronous jobs.
 */
export const emailQueue = new Queue('email-queue', {
  connection: redisConfig,
});
