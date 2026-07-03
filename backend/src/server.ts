import app from './app';
import { logger } from './shared/utils/logger';
import { closeDatabasePool } from './shared/config/database.config';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Set a timeout to force exit if connections don't close in time (10s)
  const forceExitTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    logger.info('HTTP server closed successfully.');
    clearTimeout(forceExitTimeout);
    await closeDatabasePool();
    logger.info('Database pool closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));