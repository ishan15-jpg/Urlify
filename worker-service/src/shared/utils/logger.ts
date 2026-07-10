import winston from 'winston';
import { loggerConfig } from '../config/logger.config';

export const logger = winston.createLogger(loggerConfig);
