import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

class LoggerConfig {
  private static instance: LoggerConfig;
  private readonly config: winston.LoggerOptions;

  private constructor() {
    const unstructuredFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
      const metaString = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
      return `${timestamp} [${level}]: ${stack || message}${metaString}`;
    });

    const env = process.env.NODE_ENV || 'development';
    const transports: winston.transport[] = [];

    if (env === 'production') {
      transports.push(
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'info',
          format: combine(
            colorize(),
            unstructuredFormat
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: combine(
            json()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          level: 'info',
          format: combine(
            json()
          ),
        })
      );
    } else if (env === 'test' || env === 'testing') {
      transports.push(
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'error',
          format: combine(
            colorize(),
            unstructuredFormat
          ),
        })
      );
    } else {
      transports.push(
        new winston.transports.Console({
          level: process.env.LOG_LEVEL || 'debug',
          format: combine(
            colorize(),
            unstructuredFormat
          ),
        })
      );
    }

    this.config = {
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
      ),
      transports,
    };
  }

  public static getInstance(): LoggerConfig {
    if (!LoggerConfig.instance) {
      LoggerConfig.instance = new LoggerConfig();
    }
    return LoggerConfig.instance;
  }

  public getOptions(): winston.LoggerOptions {
    return this.config;
  }
}

export const loggerConfig = LoggerConfig.getInstance().getOptions();
