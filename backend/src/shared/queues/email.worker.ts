import { Worker, Job } from 'bullmq';
import redisConfig from '../config/redis.config';
import { logger } from '../utils/logger';
import transporter from '../config/nodemailer.config';

interface SendEmailJobData {
  to: string;
  verificationLink: string;
}

export const emailWorker = new Worker(
  'email-queue',
  async (job: Job<SendEmailJobData>) => {
    logger.info(`Processing background job ${job.id} of type: ${job.name}`);

    if (job.name === 'sendVerificationEmail') {
      const { to, verificationLink } = job.data;

      logger.info(`[Email Worker] Sending verification email to: ${to}`);
      logger.info(`[Email Worker] Verification Link: ${verificationLink}`);

      // If SMTP credentials are configured, send the actual email
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Urlify Support" <support@urlify.com>',
            to,
            subject: 'Verify your email address - Urlify',
            text: `Welcome to Urlify! Please verify your email by clicking: ${verificationLink}`,
            html: `<p>Welcome to Urlify!</p><p>Please verify your email by clicking the link below:</p><p><a href="${verificationLink}">${verificationLink}</a></p><p>This link is valid for 10 minutes.</p>`,
          });
          logger.info(`[Email Worker] Verification email sent successfully to ${to}`);
        } catch (err) {
          logger.error(`[Email Worker] Failed to send email via SMTP to ${to}:`, err);
          throw err; // Re-throw to let BullMQ handle retries/failures
        }
      } else {
        logger.info(`[Email Worker] SMTP not configured. Logged verification link instead.`);
      }
    }
  },
  {
    connection: redisConfig,
  }
);

// Graceful error logging for the worker
emailWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed with error: ${err.message}`);
});
