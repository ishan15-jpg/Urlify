import winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Unstructured format for console output (dev, test, and production console)
const unstructuredFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  const metaString = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaString}`;
});

const env = process.env.NODE_ENV || 'development';
const transports: winston.transport[] = [];

if (env === 'production') {
  // Production configuration:
  // - Unstructured console logs for info and above (common events)
  // - Structured JSON logs saved to backend/logs/ combined and error files
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
  // Testing configuration:
  // - Focused console logging to pinpoint failures or errors explicitly
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
  // Development configuration:
  // - Verbose debug logging, colorized and unstructured for easy debugging
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

export const loggerConfig: winston.LoggerOptions = {
  format: combine(
    errors({ stack: true }), // capture error stack trace automatically
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports,
};
