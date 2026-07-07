import { Worker, Job } from 'bullmq';
import redisConfig from '../config/redis.config';
import { logger } from '../utils/logger';
import transporter from '../config/nodemailer.config';

interface SendPasswordResetEmailJobData {
  to: string;
  resetLink: string;
}

export const passwordResetWorker = new Worker(
  'password-reset-queue',
  async (job: Job<SendPasswordResetEmailJobData>) => {
    logger.info(`Processing background job ${job.id} of type: ${job.name}`);

    if (job.name === 'sendPasswordResetEmail') {
      const { to, resetLink } = job.data;

      logger.info(`[Password Reset Worker] Sending password reset email to: ${to}`);
      logger.info(`[Password Reset Worker] Reset Link: ${resetLink}`);

      // If SMTP credentials are configured, send the actual email
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Urlify Support" <support@urlify.com>',
            to,
            subject: 'Reset your password - Urlify',
            text: `Please reset your password by clicking: ${resetLink}`,
            html: `<p>Forgot your password?</p><p>Please reset your password by clicking the link below:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link is valid for 5 minutes.</p>`,
          });
          logger.info(`[Password Reset Worker] Password reset email sent successfully to ${to}`);
        } catch (err) {
          logger.error(`[Password Reset Worker] Failed to send email via SMTP to ${to}:`, err);
          throw err; // Re-throw to let BullMQ handle retries/failures
        }
      } else {
        logger.info(`[Password Reset Worker] SMTP not configured. Logged password reset link instead.`);
      }
    }
  },
  {
    connection: redisConfig,
  }
);

// Graceful error logging for the worker
passwordResetWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error: ${err.message}`);
});
