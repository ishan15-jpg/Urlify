import { config } from 'dotenv';
config();
import { emailWorker } from './shared/queues/email.worker';
import { passwordResetWorker } from './shared/queues/password-reset.worker';
import { logger } from './shared/utils/logger';
import { createServer } from 'http';

logger.info('Worker Service is starting up...');

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.statusCode = 200;
    res.end('OK');
  } else {
    res.statusCode = 404;
    res.end('Not Found');
  }
});

const PORT = process.env.PORT;

if (!PORT) {
    logger.error('PORT is not defined');
    process.exit(1);
}

server.listen(PORT, () => {
    logger.info(`Worker service is running on port ${PORT}`);
});

/**
 * Handle graceful shutdown of the worker process.
 * Closes the BullMQ worker connection cleanly on process termination signals.
 */
async function gracefulShutdown(signal: string) {
  logger.info(`Received ${signal}. Starting graceful shutdown of worker service...`);
  
  // Force-exit timeout guard
  const forceExitTimeout = setTimeout(() => {
    logger.error('Worker service graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000);

  try {
    await Promise.all([
      emailWorker.close(),
      passwordResetWorker.close(),
    ]);
    logger.info('All workers closed successfully.');
    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (error) {
    logger.error('Error during worker graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
