import { Queue } from 'bullmq';
import redisConfig from '../config/redis.config';

/**
 * BullMQ Queue for handling password-reset-related asynchronous jobs.
 */
export const passwordResetQueue = new Queue('password-reset-queue', {
  connection: redisConfig,
});
